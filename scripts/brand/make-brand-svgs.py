"""
Builds Calcvera's vector brand assets from logo concept A ("true equals"): an equals sign whose lower bar
turns into a check mark. Text is converted to outlined paths so the files never depend on installed fonts.

Run (only needed when the mark, wordmark or share-image text changes):
    python scripts/brand/make-brand-svgs.py
    node scripts/brand/build-icons.mjs      # then rebuild the PNG/ICO files from these SVGs

Needs Python 3 with fontTools (pip install fonttools). Static font instances are downloaded once from
Google Fonts into scripts/brand/.cache (git-ignored); the site itself self-hosts its fonts.

Writes:
    public/brand/logo-mark.svg, logo-mark-mono.svg
    public/brand/logo-horizontal.svg, logo-horizontal-mono.svg, logo-horizontal-on-dark.svg
    public/icon.svg                      (favicon: mark on a navy rounded square, dark-mode aware)
    scripts/brand/og-default.svg         (source for public/og-default.png)
"""
import json
import re
import urllib.request
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'scripts' / 'brand' / '.cache'
NAVY, NAVY_950, JADE, JADE_400, PAPER = '#0F2A4A', '#0A1626', '#12B886', '#3DD9A0', '#F7F7F4'

# The mark on a 32-unit grid. 4-unit round strokes = 2px at 16px.
TOP_BAR = 'M5 12h11'
CHECK = 'M5 20h9.5l4.5 4.5 8.5-17'
STROKE = 'fill="none" stroke-linecap="round" stroke-linejoin="round"'

FONTS = {
    'fraunces-72-600': 'Fraunces:opsz,wght@72,600',
    'fraunces-144-600': 'Fraunces:opsz,wght@144,600',
    'inter-500': 'Inter:wght@500',
}


def font(name: str) -> TTFont:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f'{name}.ttf'
    if not path.exists():
        css = urllib.request.urlopen(
            urllib.request.Request(f'https://fonts.googleapis.com/css2?family={FONTS[name]}', headers={'User-Agent': 'curl/8'})
        ).read().decode()
        url = re.search(r'url\((https://[^)]+\.ttf)\)', css).group(1)
        path.write_bytes(urllib.request.urlopen(url).read())
    return TTFont(path)


def outline(name: str, size: float, tracking_em: float, text: str, x0=0.0, y0=0.0):
    """Path data for `text` with its baseline at (x0, y0), and the advance width."""
    f = font(name)
    scale = size / f['head'].unitsPerEm
    glyphs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
    pen = SVGPathPen(glyphs, lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
    x = x0
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]
        glyphs[g].draw(TransformPen(pen, (scale, 0, 0, -scale, x, y0)))
        x += hmtx[g][0] * scale + (tracking_em * size if i < len(text) - 1 else 0)
    return pen.getCommands(), x - x0


def mark_group(bar: str, check: str, width=4.0, transform='') -> str:
    t = f' transform="{transform}"' if transform else ''
    return (
        f'<g{t} {STROKE} stroke-width="{width}">'
        f'<path d="{TOP_BAR}" stroke="{bar}"/><path d="{CHECK}" stroke="{check}"/></g>'
    )


def write(path: Path, svg: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg + '\n', encoding='utf-8')
    print('wrote', path.relative_to(ROOT))


def main() -> None:
    brand = ROOT / 'public' / 'brand'

    # --- Mark --------------------------------------------------------------------------------------
    svg_open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"'
    write(brand / 'logo-mark.svg', f'{svg_open} role="img" aria-label="Calcvera">{mark_group(NAVY, JADE)}</svg>')
    write(brand / 'logo-mark-mono.svg', f'{svg_open} role="img" aria-label="Calcvera">{mark_group("currentColor", "currentColor")}</svg>')

    # --- Horizontal lockup: mark (40 units) + wordmark (Fraunces 600, opsz 72, -0.025em) ------------
    word, word_w = outline('fraunces-72-600', 40, -0.025, 'Calcvera', x0=50, y0=34)
    w = round(50 + word_w + 2)
    lockup = lambda bar, check, text: (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 44" width="{w}" height="44" role="img" aria-label="Calcvera">'
        f'{mark_group(bar, check, transform="translate(0 2) scale(1.25)")}<path d="{word}" fill="{text}"/></svg>'
    )
    write(brand / 'logo-horizontal.svg', lockup(NAVY, JADE, NAVY))
    write(brand / 'logo-horizontal-mono.svg', lockup('currentColor', 'currentColor', 'currentColor'))
    write(brand / 'logo-horizontal-on-dark.svg', lockup('#FFFFFF', JADE_400, '#FFFFFF'))

    # --- Favicon (SVG): mark on a filled navy rounded square; lighter tile in dark browser chrome ---
    write(
        ROOT / 'public' / 'icon.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<style>.t{fill:#0F2A4A}@media (prefers-color-scheme:dark){.t{fill:#1A3759}}</style>'
        '<rect class="t" width="32" height="32" rx="7"/>'
        f'{mark_group("#FFFFFF", JADE_400, 4.6, "translate(16 16) scale(.74) translate(-16 -16)")}</svg>',
    )

    # --- Share image source, 1200×630 ----------------------------------------------------------------
    tag1, _ = outline('fraunces-144-600', 76, -0.02, 'Money calculators that get', x0=96, y0=318)
    tag2, _ = outline('fraunces-144-600', 76, -0.02, "your country’s rules right.", x0=96, y0=410)
    brand_word, _ = outline('fraunces-72-600', 44, -0.025, 'Calcvera', x0=158, y0=146)
    url, _ = outline('inter-500', 26, 0, 'calc-vera.com', x0=96, y0=538)
    chips = []
    x = 1104
    for code in reversed(['US', 'UK', 'CA', 'AU']):
        d, cw = outline('inter-500', 22, 0.04, code)
        box = cw + 36
        x -= box
        chips.append(
            f'<rect x="{x:.1f}" y="506" width="{box:.1f}" height="44" rx="22" fill="none" stroke="#FFFFFF" stroke-opacity=".28"/>'
            f'<path d="{d}" transform="translate({x + 18:.1f} 536)" fill="#FFFFFF" fill-opacity=".9"/>'
        )
        x -= 12
    grid = ''.join(f'<path d="M{gx} 0V630" />' for gx in range(0, 1201, 40)) + ''.join(f'<path d="M0 {gy}H1200" />' for gy in range(0, 631, 40))
    og = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<defs>
  <radialGradient id="fade" cx="78%" cy="18%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="m"><rect width="1200" height="630" fill="url(#fade)"/></mask>
  <radialGradient id="glow" cx="82%" cy="22%" r="55%"><stop offset="0" stop-color="{JADE}" stop-opacity=".22"/><stop offset="1" stop-color="{JADE}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="{NAVY}"/>
<rect width="1200" height="630" fill="url(#glow)"/>
<g stroke="#FFFFFF" stroke-opacity=".07" stroke-width="1" mask="url(#m)">{grid}</g>
{mark_group("#FFFFFF", JADE_400, 4, "translate(96 92) scale(1.6)")}
<path d="{brand_word}" fill="#FFFFFF"/>
<path d="{tag1}" fill="#FFFFFF"/>
<path d="{tag2}" fill="#FFFFFF"/>
<rect x="96" y="452" width="120" height="4" rx="2" fill="{JADE_400}"/>
<path d="{url}" fill="#A9BCD3"/>
{''.join(chips)}
</svg>'''
    write(ROOT / 'scripts' / 'brand' / 'og-default.svg', og)


if __name__ == '__main__':
    main()
