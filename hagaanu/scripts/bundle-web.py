#!/usr/bin/env python3
"""
Folds the Expo web export into ONE self-contained HTML file.

    npx expo export --platform web --output-dir <dir>
    python3 scripts/bundle-web.py <dir> <out.html>

Why this exists: the page is published as an Artifact, which serves a single
document and blocks requests to anything it did not inline. The export is a
document plus a JS bundle plus fonts and alarm sounds fetched by URL at
runtime — every one of which would silently fail to load there. Rather than
degrade (a system font instead of Heebo, silence instead of the alarm), every
asset is turned into a data URI inside the bundle before it ships.

The output is a body fragment, not a document: the Artifact host supplies the
`<!doctype>`, `<head>` and `<body>` around it.
"""
import base64
import mimetypes
import pathlib
import re
import sys

MIME = {'.ttf': 'font/ttf', '.wav': 'audio/wav', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.otf': 'font/otf', '.woff2': 'font/woff2'}


def data_uri(path: pathlib.Path) -> str:
    mime = MIME.get(path.suffix) or mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


def main() -> int:
    root = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])

    scripts = sorted((root / '_expo/static/js/web').glob('*.js'))
    if len(scripts) != 1:
        print(f'expected exactly one bundle, found {len(scripts)}', file=sys.stderr)
        return 1
    bundle = scripts[0].read_text()

    # Every "/assets/..." the bundle would have fetched, replaced in place.
    inlined = 0
    for ref in sorted(set(re.findall(r'"(/assets/[^"]+)"', bundle))):
        asset = root / ref.lstrip('/')
        if not asset.exists():
            print(f'missing asset: {ref}', file=sys.stderr)
            return 1
        bundle = bundle.replace(f'"{ref}"', '"' + data_uri(asset) + '"')
        inlined += 1

    left = re.findall(r'"(/assets/[^"]+)"', bundle)
    if left:
        print(f'still referencing {left[:3]}', file=sys.stderr)
        return 1

    # The reset react-native-web needs. The Artifact host's own reset zeroes the
    # body margin already; these three rules are what make a full-height flex
    # root, which is what every screen in the app assumes.
    page = f"""<title>הגענו?</title>

<style>
  html, body {{ height: 100%; }}
  /* The app scrolls inside its own ScrollViews, never the page. */
  body {{ overflow: hidden; }}
  #root {{ display: flex; height: 100%; flex: 1; }}
</style>

<div id="root"></div>

<script>
{bundle}
</script>
"""
    out.write_text(page)
    print(f'inlined {inlined} assets → {out} ({len(page) / 1_048_576:.1f} MB)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
