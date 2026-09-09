#!/usr/bin/env python3
"""
Regenerate src/components/map/coastline.generated.ts from Natural Earth.

The browser demo has no map tiles — `react-native-maps` wraps MapKit and the
Google Maps SDK and has no web build, and the page is served from a host whose
CSP blocks images from every outside origin. Without a coastline the demo map is
a grid with dots on it, which does not read as a map at all.

So the demo draws the coastline itself, as vectors, from Natural Earth's 1:10m
physical land layer (public domain) via the `world-atlas` package.

Only PHYSICAL geography: where the land meets the sea, and the two inland seas.
No borders. A border on a map of this region is a political statement, and an
alarm clock has no business making one.

Two sources, because no single package has both at the resolution wanted:
the coast comes from world-atlas at 1:10m, and the two inland seas from
sane-topojson's lakes layer at 1:50m — coarser, but the Dead Sea and the Sea
of Galilee are unmistakable at any resolution.

  npm pack world-atlas && tar xzf world-atlas-*.tgz
  npm pack sane-topojson && tar xzf sane-topojson-*.tgz
  python3 scripts/build-coastline.py package/land-10m.json package/dist/asia_50m.json
"""
import json
import math
import pathlib
import sys

OUT = pathlib.Path(__file__).resolve().parent.parent / 'src/components/map/coastline.generated.ts'

# Deliberately far wider than anything the map shows. Clipping leaves a hard
# straight edge where the box ends, and an edge on screen reads as the map
# being broken rather than being cropped — so the box is kept off screen at
# every zoom the demo uses.
WEST, EAST = 31.0, 39.0
SOUTH, NORTH = 26.5, 36.0

# About 250m. Finer than this is invisible on a phone and costs bundle.
TOLERANCE = 0.0025


def decode(topo: dict) -> list[list[tuple[float, float]]]:
    """TopoJSON arcs are quantised deltas; walk them back into coordinates."""
    sx, sy = topo['transform']['scale']
    tx, ty = topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((x * sx + tx, y * sy + ty))
        arcs.append(points)
    return arcs


def ring_of(arcs: list, indexes: list[int]) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for i in indexes:
        arc = arcs[~i][::-1] if i < 0 else arcs[i]
        points.extend(arc if not points else arc[1:])
    return points


def clip(ring: list, edge: str, value: float) -> list:
    """Sutherland-Hodgman against one edge, so a clipped fill still closes."""
    inside = {
        'w': lambda p: p[0] >= value,
        'e': lambda p: p[0] <= value,
        's': lambda p: p[1] >= value,
        'n': lambda p: p[1] <= value,
    }[edge]

    def cross(a, b):
        if edge in 'we':
            t = (value - a[0]) / (b[0] - a[0])
            return (value, a[1] + t * (b[1] - a[1]))
        t = (value - a[1]) / (b[1] - a[1])
        return (a[0] + t * (b[0] - a[0]), value)

    out = []
    for i, current in enumerate(ring):
        previous = ring[i - 1]
        if inside(current):
            if not inside(previous):
                out.append(cross(previous, current))
            out.append(current)
        elif inside(previous):
            out.append(cross(previous, current))
    return out


def area(ring: list) -> float:
    """Shoelace, in square degrees. Only ever compared against a threshold."""
    total = 0.0
    for i, (x, y) in enumerate(ring):
        px, py = ring[i - 1]
        total += px * y - x * py
    return abs(total) / 2


def simplify(points: list, tolerance: float) -> list:
    """Ramer-Douglas-Peucker."""
    if len(points) < 3:
        return points
    first, last = points[0], points[-1]
    worst, at = 0.0, 0
    dx, dy = last[0] - first[0], last[1] - first[1]
    span = math.hypot(dx, dy)
    for i in range(1, len(points) - 1):
        px, py = points[i]
        if span == 0:
            d = math.hypot(px - first[0], py - first[1])
        else:
            d = abs(dy * px - dx * py + last[0] * first[1] - last[1] * first[0]) / span
        if d > worst:
            worst, at = d, i
    if worst <= tolerance:
        return [first, last]
    return simplify(points[:at + 1], tolerance)[:-1] + simplify(points[at:], tolerance)


def rings_from(path: str, layer: str, smallest: int) -> list[list[tuple[float, float]]]:
    topo = json.loads(pathlib.Path(path).read_text())
    arcs = decode(topo)

    kept: list[list[tuple[float, float]]] = []
    for geometry in topo['objects'][layer]['geometries']:
        polygons = (geometry['arcs'] if geometry['type'] == 'MultiPolygon'
                    else [geometry['arcs']])
        for polygon in polygons:
            for indexes in polygon:
                ring = ring_of(arcs, indexes)
                xs = [p[0] for p in ring]
                ys = [p[1] for p in ring]
                if max(xs) < WEST or min(xs) > EAST or max(ys) < SOUTH or min(ys) > NORTH:
                    continue
                for edge, value in (('w', WEST), ('e', EAST), ('s', SOUTH), ('n', NORTH)):
                    ring = clip(ring, edge, value)
                    if not ring:
                        break
                if len(ring) < 4:
                    continue
                ring = simplify(ring, TOLERANCE)
                if len(ring) >= smallest:
                    kept.append(ring)

    kept.sort(key=len, reverse=True)
    return kept


def main() -> int:
    land_src = sys.argv[1] if len(sys.argv) > 1 else 'package/land-10m.json'
    lakes_src = sys.argv[2] if len(sys.argv) > 2 else 'package/dist/asia_50m.json'

    # A four-point sliver clipped off the edge of the box is not a coastline.
    land = rings_from(land_src, 'land', 8)
    # A lake needs to be worth drawing: the two inland seas, not every pond.
    lakes = [r for r in rings_from(lakes_src, 'lakes', 6) if area(r) > 0.002]

    total = sum(len(r) for r in land + lakes)

    def ring_literal(ring):
        pairs = ', '.join(f'{lon:.4f},{lat:.4f}' for lon, lat in ring)
        return f"  '{pairs}',"

    body = '\n'.join(ring_literal(r) for r in land)
    lake_body = '\n'.join(ring_literal(r) for r in lakes)
    OUT.write_text(f'''/* eslint-disable */
// GENERATED — do not edit. Run `python3 scripts/build-coastline.py` to refresh.
//
// The coastline of the eastern Mediterranean and the two inland seas, from
// Natural Earth's 1:10m physical land layer (public domain), clipped to
// ({SOUTH}, {WEST}) – ({NORTH}, {EAST}) and simplified to about 250 metres.
//
// PHYSICAL geography only — where land meets water. Deliberately no borders:
// a border drawn on a map of this region is a political statement, and an
// alarm clock has no business making one.
//
// {len(land)} land rings and {len(lakes)} lakes, {total} points. Each ring is a
// flat "lon,lat,lon,lat" string rather than an array of objects, because the
// renderer wants numbers in a path and every intermediate object would be
// allocated and thrown away.

export const LAND_RINGS: string[] = [
{body}
];

/** The Sea of Galilee and the Dead Sea. Drawn as water, over the land. */
export const LAKE_RINGS: string[] = [
{lake_body}
];
''', encoding='utf-8')
    print(f'{len(land)} land rings, {len(lakes)} lakes, {total} points → {OUT.name} '
          f'({OUT.stat().st_size / 1024:.0f} KB)', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.setrecursionlimit(10_000)
    raise SystemExit(main())
