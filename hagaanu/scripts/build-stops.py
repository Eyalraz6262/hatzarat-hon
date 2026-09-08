#!/usr/bin/env python3
"""
Regenerate src/services/places/stops.generated.ts from the official GTFS feed.

The feed is the Ministry of Transport's israel-public-transportation.zip. This
reads it from the Hasadna open-bus public mirror, which keeps a dated archive
and, unlike gtfs.mot.gov.il, is reachable over plain HTTPS.

The zip is ~200 MB and all we want is the 1 MB stops.txt inside it, so this
reads the zip's central directory over HTTP range requests and pulls out that
one member. Nothing else is downloaded.

  python3 scripts/build-stops.py            # today's feed
  python3 scripts/build-stops.py 2026/09/08 # a specific day
  python3 scripts/build-stops.py path/to/stops.txt

Rerun it when the feed moves on. The output is generated — edit this, not it.
"""
import csv
import datetime as dt
import io
import math
import os
import pathlib
import re
import struct
import subprocess
import sys
import zlib

BUCKET = 'https://openbus-stride-public.s3.eu-west-1.amazonaws.com'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'src/services/places/stops.generated.ts'

# Coordinates are stored as offsets from here in hundred-thousandths of a
# degree, which is about a metre — far finer than a stop is defined anyway.
LAT0, LON0, SCALE = 29.0, 34.0, 100_000

# Two stops of the same name this close together are one place to wake up at:
# the pair either side of a road, the three bays of a terminal.
CLUSTER_M = 400


def fetch_stops_txt(day: str) -> bytes:
    url = f'{BUCKET}/gtfs_archive/{day}/israel-public-transportation.zip'

    def rng(a: int, b: int) -> bytes:
        return subprocess.run(
            ['curl', '-sS', '--fail', '-m', '600', '-r', f'{a}-{b}', url],
            capture_output=True, check=True).stdout

    head = subprocess.run(['curl', '-sSI', '--fail', '-m', '60', url],
                          capture_output=True, check=True).stdout.decode()
    size = int(re.search(r'(?im)^content-length:\s*(\d+)', head).group(1))
    print(f'{url}\n  {size / 1e6:.0f} MB', file=sys.stderr)

    tail = rng(size - 70_000, size - 1)
    eocd = tail.rfind(b'PK\x05\x06')
    cd_size, cd_off = struct.unpack_from('<II', tail, eocd + 12)
    if cd_off == 0xFFFFFFFF:  # zip64
        z = tail.rfind(b'PK\x06\x06')
        cd_size = struct.unpack_from('<Q', tail, z + 40)[0]
        cd_off = struct.unpack_from('<Q', tail, z + 48)[0]

    cd, p = rng(cd_off, cd_off + cd_size - 1), 0
    while p < len(cd) and cd[p:p + 4] == b'PK\x01\x02':
        method, = struct.unpack_from('<H', cd, p + 10)
        csize, usize = struct.unpack_from('<II', cd, p + 20)
        nlen, elen, clen = struct.unpack_from('<HHH', cd, p + 28)
        offset, = struct.unpack_from('<I', cd, p + 42)
        name = cd[p + 46:p + 46 + nlen].decode('utf-8', 'replace')
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
        if name == 'stops.txt':
            local = rng(offset, offset + 29)
            nl, el = struct.unpack_from('<HH', local, 26)
            start = offset + 30 + nl + el
            blob = rng(start, start + csize - 1)
            print(f'  stops.txt: {csize / 1e6:.1f} MB transferred', file=sys.stderr)
            return zlib.decompress(blob, -15) if method == 8 else blob
        p += 46 + nlen + elen + clen
    raise SystemExit('stops.txt not found in the archive')


CITY = re.compile(r'עיר:\s*(.*?)\s*רציף:')


def city_of(desc: str) -> str:
    found = CITY.search(desc or '')
    return found.group(1).strip() if found else ''


def normalize(name: str) -> str:
    """Only for deciding which stops are the same place, never for display."""
    name = re.sub(r'["\'`\u05f3\u05f4]', '', name)
    name = re.sub(r'[-\u2013\u2014_,./\\()\[\]]+', ' ', name)
    return ' '.join(name.split())


def base36(n: int) -> str:
    if n < 0:
        raise ValueError(f'coordinate outside the encodable area: {n}')
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    out = ''
    while True:
        out = digits[n % 36] + out
        n //= 36
        if n == 0:
            return out


def main() -> int:
    arg = sys.argv[1] if len(sys.argv) > 1 else dt.date.today().strftime('%Y/%m/%d')
    if os.path.exists(arg):
        raw = pathlib.Path(arg).read_bytes()
        source = arg
    else:
        raw = fetch_stops_txt(arg)
        source = f'MOT GTFS {arg}'

    rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    print(f'  {len(rows)} stops in the feed', file=sys.stderr)

    # Group by name and town, then split any group whose members are too far
    # apart to be one place — a street name repeated across a long road.
    groups: dict[tuple[str, str], list[dict]] = {}
    for row in rows:
        if not row['stop_name'].strip():
            continue
        groups.setdefault((normalize(row['stop_name']), city_of(row['stop_desc'])), []).append(row)

    places = []
    for (_, town), members in groups.items():
        clusters: list[list[dict]] = []
        for row in members:
            lat, lon = float(row['stop_lat']), float(row['stop_lon'])
            for cluster in clusters:
                first = cluster[0]
                dy = (lat - float(first['stop_lat'])) * 111_000
                dx = (lon - float(first['stop_lon'])) * 111_000 * math.cos(math.radians(lat))
                if math.hypot(dy, dx) <= CLUSTER_M:
                    cluster.append(row)
                    break
            else:
                clusters.append([row])
        for cluster in clusters:
            # The displayed name is the feed's own spelling, from the first
            # member; only the grouping used the normalised form.
            places.append((
                cluster[0]['stop_name'].strip(),
                town,
                sum(float(x['stop_lat']) for x in cluster) / len(cluster),
                sum(float(x['stop_lon']) for x in cluster) / len(cluster),
            ))

    places.sort(key=lambda p: (p[1], p[0]))
    towns = sorted({p[1] for p in places})
    town_index = {name: i for i, name in enumerate(towns)}
    print(f'  {len(places)} distinct places in {len(towns)} towns', file=sys.stderr)

    lines = []
    for name, town, lat, lon in places:
        if '\t' in name or '\n' in name:
            raise SystemExit(f'separator inside a stop name: {name!r}')
        lines.append('\t'.join((
            name,
            base36(town_index[town]),
            base36(round((lat - LAT0) * SCALE)),
            base36(round((lon - LON0) * SCALE)),
        )))

    blob = '\n'.join(lines)
    header = f'''/* eslint-disable */
// GENERATED — do not edit. Run `python3 scripts/build-stops.py` to refresh.
//
// Every bus and railway stop served by public transport in Israel, from the
// Ministry of Transport's GTFS feed ({source}), read through the Hasadna
// open-bus public mirror. Israeli government open data.
//
// {len(rows)} stops in the feed collapse to {len(places)} distinct places: the
// pair either side of a road and the bays of a terminal are one place to be
// woken at, so stops sharing a name within {CLUSTER_M}m of each other are merged
// and the coordinate is their centroid.
//
// Packed as one string rather than an array of objects because this is
// {len(places)} records: the objects would cost several megabytes of bundle and
// a parse of every one of them at startup, where this costs a split. Fields are
// tab separated — name, town index, latitude, longitude — and the two
// coordinates are base-36 offsets from ({LAT0}, {LON0}) in units of
// 1/{SCALE} of a degree, which is close enough to a metre.
//
// Decoded lazily by ./stops.ts, which is also where the units are undone.

export const LAT_ORIGIN = {LAT0};
export const LON_ORIGIN = {LON0};
export const COORD_SCALE = {SCALE};

/** Town names, indexed by the second field of each record below. */
export const TOWNS = {json_dump(towns)};

/** One record per line: name, town index, latitude, longitude. */
export const STOPS =
'''
    OUT.write_text(header + js_string(blob) + ';\n', encoding='utf-8')
    print(f'  wrote {OUT.relative_to(OUT.parent.parent.parent.parent)} '
          f'({OUT.stat().st_size / 1e6:.2f} MB)', file=sys.stderr)
    return 0


def json_dump(items: list[str]) -> str:
    import json
    return json.dumps(items, ensure_ascii=False)


def js_string(text: str) -> str:
    """A JS string literal, split across lines so the file stays openable."""
    escaped = (text.replace('\\', '\\\\').replace("'", "\\'")
               .replace('\t', '\\t').replace('\n', '\\n'))
    chunks = [escaped[i:i + 4000] for i in range(0, len(escaped), 4000)]
    # Never split an escape sequence across two literals.
    fixed = []
    carry = ''
    for chunk in chunks:
        chunk = carry + chunk
        carry = ''
        while chunk.endswith('\\') and not chunk.endswith('\\\\'):
            carry = chunk[-1] + carry
            chunk = chunk[:-1]
        fixed.append(chunk)
    if carry:
        fixed.append(carry)
    return '\n  '.join(f"'{c}' +" for c in fixed)[:-2]


if __name__ == '__main__':
    raise SystemExit(main())
