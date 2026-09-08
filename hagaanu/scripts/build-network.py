#!/usr/bin/env python3
"""
Regenerate src/components/map/network.generated.ts — the roads and light rail
the demo map draws.

Where it comes from: every bus and light-rail route in the Ministry of
Transport's GTFS feed carries a shape, the actual path the vehicle drives. Trace
all of them and you have traced the road network, because that is what buses
drive on. Israel Railways publishes no shapes, so heavy rail is not here.

shapes.txt is 230 MB uncompressed and never lands on disk: the archive's one
member is read over HTTP range requests, inflated in a stream, and thinned as it
goes. What survives is the corridors — for each shape in order of how far it
reaches, keep it only if it covers ground the ones already kept do not. One
highway carrying fifty routes is then drawn once rather than fifty times.

  python3 scripts/build-network.py            # today's feed
  python3 scripts/build-network.py 2026/09/08 # a specific day

A cached network.json beside this script is reused; delete it to re-stream.
"""
import collections
import datetime as dt
import json
import math
import pathlib
import re
import struct
import subprocess
import sys
import zlib

BUCKET = 'https://openbus-stride-public.s3.eu-west-1.amazonaws.com'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'src/components/map/network.generated.ts'
CACHE = pathlib.Path(__file__).resolve().parent / 'network.json'

# Thin while streaming. Intercity shapes carry thousands of points at a spacing
# far below anything a phone screen can show.
KEEP_EVERY = 12
# About 440m. Two corridors sharing this many cells are the same road.
CELL = 0.004
COVER = 0.72
# A shape that does not reach 6km is a town loop, not a corridor.
MIN_REACH_KM = 6
# About 180m, which is under a pixel at every zoom the country view uses.
TOLERANCE = 0.0016
MAX_ROADS = 320


def member(url: str, name: str):
    """(offset, compressed size, method) of one member, via the central directory."""
    def rng(a: int, b: int) -> bytes:
        return subprocess.run(['curl', '-sS', '--fail', '-m', '900', '-r', f'{a}-{b}', url],
                              capture_output=True, check=True).stdout

    head = subprocess.run(['curl', '-sSI', '--fail', '-m', '60', url],
                          capture_output=True, check=True).stdout.decode()
    size = int(re.search(r'(?im)^content-length:\s*(\d+)', head).group(1))
    tail = rng(size - 70_000, size - 1)
    eocd = tail.rfind(b'PK\x05\x06')
    cd_size, cd_off = struct.unpack_from('<II', tail, eocd + 12)
    if cd_off == 0xFFFFFFFF:
        z = tail.rfind(b'PK\x06\x06')
        cd_size = struct.unpack_from('<Q', tail, z + 40)[0]
        cd_off = struct.unpack_from('<Q', tail, z + 48)[0]

    cd, p = rng(cd_off, cd_off + cd_size - 1), 0
    while p < len(cd) and cd[p:p + 4] == b'PK\x01\x02':
        method, = struct.unpack_from('<H', cd, p + 10)
        csize, usize = struct.unpack_from('<II', cd, p + 20)
        nlen, elen, clen = struct.unpack_from('<HHH', cd, p + 28)
        offset, = struct.unpack_from('<I', cd, p + 42)
        found = cd[p + 46:p + 46 + nlen].decode('utf-8', 'replace')
        extra = cd[p + 46 + nlen:p + 46 + nlen + elen]
        if 0xFFFFFFFF in (offset, csize, usize):
            q = 0
            while q < len(extra):
                hid, hsz = struct.unpack_from('<HH', extra, q)
                if hid == 1:
                    vals = struct.unpack_from('<' + 'Q' * (hsz // 8), extra, q + 4)
                    k = 0
                    if usize == 0xFFFFFFFF:
                        usize = vals[k]; k += 1
                    if csize == 0xFFFFFFFF:
                        csize = vals[k]; k += 1
                    if offset == 0xFFFFFFFF:
                        offset = vals[k]
                q += 4 + hsz
        if found == name:
            local = rng(offset, offset + 29)
            nl, el = struct.unpack_from('<HH', local, 26)
            return offset + 30 + nl + el, csize, method
        p += 46 + nlen + elen + clen
    raise SystemExit(f'{name} not found in the archive')


def read_member(url: str, name: str) -> bytes:
    start, csize, method = member(url, name)
    blob = subprocess.run(['curl', '-sS', '--fail', '-m', '900', '-r',
                           f'{start}-{start + csize - 1}', url],
                          capture_output=True, check=True).stdout
    return zlib.decompress(blob, -15) if method == 8 else blob


def light_rail_shapes(url: str) -> set[str]:
    """route_type 0 is a tram: the Tel Aviv and Jerusalem light rail."""
    routes = read_member(url, 'routes.txt').decode('utf-8-sig').splitlines()
    header = routes[0].split(',')
    rid, rtype = header.index('route_id'), header.index('route_type')
    tram = {row.split(',')[rid] for row in routes[1:]
            if len(row.split(',')) > rtype and row.split(',')[rtype] == '0'}

    trips = read_member(url, 'trips.txt').decode('utf-8-sig').splitlines()
    header = trips[0].split(',')
    tid, sid = header.index('route_id'), header.index('shape_id')
    found = set()
    for row in trips[1:]:
        f = row.split(',')
        if len(f) > sid and f[tid] in tram and f[sid]:
            found.add(f[sid])
    return found


def stream_shapes(url: str, wanted: set[str]) -> dict[str, list]:
    start, csize, _ = member(url, 'shapes.txt')
    print(f'  shapes.txt: {csize / 1e6:.0f} MB, streaming', file=sys.stderr)
    proc = subprocess.Popen(['curl', '-sS', '--fail', '-m', '3600', '-r',
                             f'{start}-{start + csize - 1}', url],
                            stdout=subprocess.PIPE, bufsize=1 << 20)
    dec = zlib.decompressobj(-15)
    shapes: dict[str, list] = collections.defaultdict(list)
    counts: collections.Counter = collections.Counter()
    carry, header = b'', True
    while True:
        chunk = proc.stdout.read(1 << 20)
        if not chunk:
            break
        lines = (carry + dec.decompress(chunk)).split(b'\n')
        carry = lines.pop()
        for line in lines:
            if header:
                header = False
                continue
            f = line.split(b',')
            if len(f) < 4:
                continue
            key = f[0].decode()
            n = counts[key]
            counts[key] = n + 1
            # Light rail is kept whole; everything else is sampled.
            if key in wanted or n % KEEP_EVERY == 0:
                try:
                    shapes[key].append((float(f[1]), float(f[2])))
                except ValueError:
                    pass
    proc.stdout.close()
    proc.wait()
    print(f'  {sum(counts.values())} points over {len(counts)} shapes', file=sys.stderr)
    return shapes


def reach_km(points: list) -> float:
    lat = [p[0] for p in points]
    lon = [p[1] for p in points]
    dy = (max(lat) - min(lat)) * 111.0
    dx = (max(lon) - min(lon)) * 111.0 * math.cos(math.radians(lat[0]))
    return math.hypot(dy, dx)


def simplify(points: list, tolerance: float) -> list:
    if len(points) < 3:
        return points
    first, last = points[0], points[-1]
    dy, dx = last[0] - first[0], last[1] - first[1]
    span = math.hypot(dy, dx)
    worst, at = 0.0, 0
    for i in range(1, len(points) - 1):
        y, x = points[i]
        d = (math.hypot(y - first[0], x - first[1]) if span == 0
             else abs(dx * y - dy * x + last[0] * first[1] - last[1] * first[0]) / span)
        if d > worst:
            worst, at = d, i
    if worst <= tolerance:
        return [first, last]
    return simplify(points[:at + 1], tolerance)[:-1] + simplify(points[at:], tolerance)


def main() -> int:
    day = sys.argv[1] if len(sys.argv) > 1 else dt.date.today().strftime('%Y/%m/%d')
    url = f'{BUCKET}/gtfs_archive/{day}/israel-public-transportation.zip'

    if CACHE.exists():
        print(f'  reusing {CACHE.name}', file=sys.stderr)
        cached = json.loads(CACHE.read_text())
        shapes = {k: [tuple(p) for p in v] for k, v in cached['shapes'].items()}
        tram = set(cached['tram'])
    else:
        print(url, file=sys.stderr)
        tram = light_rail_shapes(url)
        shapes = stream_shapes(url, tram)
        CACHE.write_text(json.dumps({'shapes': shapes, 'tram': sorted(tram)}))

    ranked = sorted(((reach_km(p), k, p) for k, p in shapes.items() if len(p) >= 4),
                    reverse=True, key=lambda r: r[0])

    covered: set = set()
    roads: list = []
    rail: list = []
    for reach, key, points in ranked:
        cells = {(round(p[0] / CELL), round(p[1] / CELL)) for p in points}
        if key not in tram:
            if reach < MIN_REACH_KM or len(roads) >= MAX_ROADS:
                continue
            if cells and len(cells & covered) / len(cells) > COVER:
                continue
        line = simplify(points, TOLERANCE)
        if len(line) < 3:
            continue
        covered |= cells
        (rail if key in tram else roads).append(line)

    def literal(lines):
        return '\n'.join(
            "  '" + ','.join(f'{lat:.4f},{lon:.4f}' for lat, lon in line) + "',"
            for line in lines)

    OUT.write_text(f'''/* eslint-disable */
// GENERATED — do not edit. Run `python3 scripts/build-network.py` to refresh.
//
// The road and light-rail network the demo map draws, from the Ministry of
// Transport's GTFS feed ({day}) via the Hasadna open-bus mirror.
//
// Every bus route carries a shape: the path the vehicle actually drives. Trace
// them and you have traced the roads, because that is what buses drive on.
// Heavy rail is absent because Israel Railways publishes no shapes.
//
// Deduplicated by coverage rather than by name — for each shape in order of how
// far it reaches, kept only if it covers ground the ones before it did not — so
// one highway carrying fifty routes is drawn once. {len(roads)} road corridors
// and {len(rail)} light-rail lines, simplified to about 180 metres.
//
// Each line is a flat "lat,lon,lat,lon" string, for the same reason the stop
// index is: the renderer wants numbers in a path, and an array of objects would
// allocate every one of them to be thrown away a frame later.

/** Road corridors, longest reach first. */
export const ROADS: string[] = [
{literal(roads)}
];

/** The Tel Aviv and Jerusalem light rail, at full detail. */
export const LIGHT_RAIL: string[] = [
{literal(rail)}
];
''', encoding='utf-8')
    print(f'  {len(roads)} roads ({sum(len(l) for l in roads)} pts), '
          f'{len(rail)} light rail → {OUT.name} ({OUT.stat().st_size / 1024:.0f} KB)',
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.setrecursionlimit(100_000)
    raise SystemExit(main())
