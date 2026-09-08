#!/usr/bin/env python3
"""
Draws every icon the app ships, from one mark.

Run:  python3 scripts/make-icons.py

THE MARK is the app's own wake node, scaled up: a ring sitting on the rail,
with the rail green above it and dim below. That is not a decoration borrowed
from somewhere — it is literally what `RouteRail` draws for the point where the
alarm fires, and what the map draws around the destination. The one detail that
makes it this app rather than a generic location pin is where the green stops:
the route is travelled down to the wake point and no further.

Everything is drawn at 4x and downsampled with LANCZOS, because PIL's ellipse
stroking is aliased and an app icon is judged at 40px on a home screen where
one ragged edge is the whole impression.

Colours come from src/theme/colors.ts and are not chosen here. The ground is
the dark scheme's bg, so the accent is the dark scheme's accent — the pairing
those two values were contrast-checked as.
"""
from PIL import Image, ImageDraw

SS = 4  # supersample factor

# ── from src/theme/colors.ts ──────────────────────────────────────
GROUND      = (0x0F, 0x13, 0x15)  # dark.bg
ACCENT      = (0x22, 0xC8, 0x8A)  # dark.accent.base
ACCENT_DEEP = (0x0E, 0xA3, 0x6F)  # light.accent.base — for light grounds
RAIL_DIM    = (0x39, 0x43, 0x47)  # just above dark.lineStrong: it carries the whole line
LIGHT_BG    = (0xF6, 0xF6, 0xF3)  # light.bg
RAIL_LIGHT  = (0xB2, 0xB7, 0xAC)  # darker than light.lineStrong: on the splash the
                                  # mark stands alone with no chrome to sit against
STATION     = (0x62, 0x6E, 0x72)  # the station strokes, a step brighter than the rail
STATION_LIGHT = (0x8E, 0x94, 0x89)

# ── proportions, as fractions of the canvas ───────────────────────
# Three nodes on a line, which is the grammar every transit diagram in the world
# already uses. That plurality is doing real work: one circle on one line reads
# as a pin, a lollipop or a magnifying glass depending on the viewer, and a line
# crossing one circle diagonally is a prohibition sign. Three nodes can only be
# a route, and then the one that is picked out can only be a stop that matters.
RAIL_W    = 0.086
# A station's circle is wider than the rail, so it cuts the line rather than
# sitting on it — which is right, and is how transit maps have always done it.
# The spacing then has to leave the remaining stubs long enough to read as line
# rather than as debris, which is what sets NODE_Y.
NODE_Y    = 0.300   # the minor stops, above and below centre
NODE_OUT  = 0.150   # their outer diameter
NODE_STR  = 0.040   # their stroke
WAKE_D    = 0.245   # the stop you are being woken for
WAKE_GAP  = 0.032   # ground between it and the rail


def mark(size, ground, accent, rail, station, *, scale=1.0, bleed=True):
    """
    One mark on one ground.

    The rail is a single dim weight all the way through. An earlier version ran
    it green above the wake point and dim below, which is what the app itself
    draws — but at 40px on a home screen the dim half disappears and what is
    left is a green stick with a blob on the end. The icon has to survive that
    size, so it gives up the nuance the screen can afford.

    `scale` shrinks the mark into Android's adaptive-icon safe zone.
    `bleed` runs the rail off the canvas; off, it stops short with round ends so
    the mark stands alone as a logo.
    """
    n = size * SS
    img = Image.new('RGBA', (n, n), (*ground, 255) if ground else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    cx = cy = n / 2
    rail_w = n * RAIL_W * scale
    node_y = n * NODE_Y * scale
    node_r = n * NODE_OUT * scale / 2
    node_s = n * NODE_STR * scale
    wake_r = n * WAKE_D * scale / 2
    gap = n * WAKE_GAP * scale

    reach = node_y + node_r * 1.75
    top = 0 if bleed else cy - reach
    bot = n if bleed else cy + reach

    d.rounded_rectangle([cx - rail_w / 2, top, cx + rail_w / 2, bot],
                        radius=rail_w / 2, fill=(*rail, 255))

    # The stops either side. The ground has to show through the middle — a ring
    # stroked in the rail's own colour just swells the line into a bead, which
    # is why every transit map in the world punches its stations out of the
    # ground rather than drawing them on top.
    hole = (*ground, 255) if ground else (0, 0, 0, 0)
    for y in (cy - node_y, cy + node_y):
        d.ellipse([cx - node_r, y - node_r, cx + node_r, y + node_r], fill=hole)
        d.ellipse([cx - node_r, y - node_r, cx + node_r, y + node_r],
                  outline=(*station, 255), width=int(round(node_s)))

    # The one that matters: solid, and the only coloured thing on the canvas.
    # The gap of ground around it lifts it off the rail instead of letting it
    # read as a swelling — the same reason interchanges get a halo on a map.
    # Solid rather than a ring, because a vertical line through a ring makes a
    # passable Greek phi and a disc cannot be misread as anything.
    d.ellipse([cx - wake_r - gap, cy - wake_r - gap, cx + wake_r + gap, cy + wake_r + gap],
              fill=hole)
    d.ellipse([cx - wake_r, cy - wake_r, cx + wake_r, cy + wake_r],
              fill=(*accent, 255))

    return img.resize((size, size), Image.LANCZOS)


def silhouette(size, *, ring_only=False, scale=1.0):
    """
    White on transparent, for the two places the system tints the alpha itself:
    Android's themed icon and the status bar.

    The status-bar version keeps only the wake node. A notification icon is
    drawn at 24dp, and the rail and its stations turn to mush at that size.
    """
    n = size * SS
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = n / 2
    white = (255, 255, 255, 255)

    if ring_only:
        # Reduced to the two elements that survive 24dp: the line, and the stop
        # on it. The side stations are dropped — at this size they close up into
        # the rail and all three read as one lump. A bare disc was the first
        # attempt and says nothing at all; the line is what makes it a stop.
        bar = n * 0.150
        dot = n * 0.560 / 2
        gap = n * 0.058
        d.rounded_rectangle([cx - bar / 2, n * 0.045, cx + bar / 2, n * 0.955],
                            radius=bar / 2, fill=white)
        d.ellipse([cx - dot - gap, cy - dot - gap, cx + dot + gap, cy + dot + gap],
                  fill=(0, 0, 0, 0))
        d.ellipse([cx - dot, cy - dot, cx + dot, cy + dot], fill=white)
        return img.resize((size, size), Image.LANCZOS)

    rail_w = n * RAIL_W * scale
    node_y = n * NODE_Y * scale
    node_r = n * NODE_OUT * scale / 2
    node_s = n * NODE_STR * scale
    wake_r = n * WAKE_D * scale / 2

    d.rounded_rectangle([cx - rail_w / 2, 0, cx + rail_w / 2, n],
                        radius=rail_w / 2, fill=white)
    # A themed icon is one flat colour, so the stations have to be cut out of
    # the rail rather than drawn on it.
    for y in (cy - node_y, cy + node_y):
        d.ellipse([cx - node_r, y - node_r, cx + node_r, y + node_r], fill=(0, 0, 0, 0))
        d.ellipse([cx - node_r, y - node_r, cx + node_r, y + node_r],
                  outline=white, width=int(round(node_s)))
    gap = n * WAKE_GAP * scale
    d.ellipse([cx - wake_r - gap, cy - wake_r - gap, cx + wake_r + gap, cy + wake_r + gap],
              fill=(0, 0, 0, 0))
    d.ellipse([cx - wake_r, cy - wake_r, cx + wake_r, cy + wake_r], fill=white)

    return img.resize((size, size), Image.LANCZOS)


def main():
    out = 'assets'

    # iOS and the store listing. No alpha: App Store Connect rejects an icon
    # with a transparent channel.
    mark(1024, GROUND, ACCENT, RAIL_DIM, STATION).convert('RGB').save(f'{out}/icon.png')

    # Android adaptive icon. The foreground is masked to a circle with roughly a
    # third trimmed off every edge, so the mark is scaled into that safe zone —
    # the rail still bleeds, which is the point of it.
    # The background is a flat colour declared in app.config.ts, not an image —
    # one less asset to keep in sync with the palette.
    mark(1024, None, ACCENT, RAIL_DIM, STATION, scale=0.68).save(f'{out}/android-icon-foreground.png')
    silhouette(1024, scale=0.66).save(f'{out}/android-icon-monochrome.png')

    # Status bar: the system paints this a single colour, so only the shape
    # survives. Ring alone.
    silhouette(96, ring_only=True).save(f'{out}/notification-icon.png')

    # Splash. Two versions, because the ground now follows the device theme and
    # one mark cannot be legible on both #F6F6F3 and #0F1315.
    mark(512, None, ACCENT_DEEP, RAIL_LIGHT, STATION_LIGHT, bleed=False).save(f'{out}/splash-icon.png')
    mark(512, None, ACCENT, RAIL_DIM, STATION, bleed=False).save(f'{out}/splash-icon-dark.png')

    mark(48, GROUND, ACCENT, RAIL_DIM, STATION).convert('RGB').save(f'{out}/favicon.png')

    print('icons written')


if __name__ == '__main__':
    main()
