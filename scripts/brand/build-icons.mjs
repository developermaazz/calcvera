/**
 * Rasterises the favicon set and the default share image from the brand SVGs.
 *
 *   node scripts/brand/build-icons.mjs
 *
 * Inputs:  public/icon.svg (favicon tile), scripts/brand/og-default.svg (share image), mark paths below
 * Outputs: public/favicon.ico (16/32/48), apple-touch-icon.png (180), icon-192.png, icon-512.png,
 *          icon-maskable-512.png, og-default.png (1200×630)
 * Regenerate the SVGs first with scripts/brand/make-brand-svgs.py if the mark or text changed.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pub = (file) => `${root}public/${file}`;

const NAVY = '#0F2A4A';
const JADE_400 = '#3DD9A0';
// Same geometry as the header mark (src/components/LogoMark.astro) on a 32-unit grid.
const mark = (scale, width = 4.6) =>
  `<g transform="translate(16 16) scale(${scale}) translate(-16 -16)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${width}">` +
  `<path d="M5 12h11" stroke="#FFFFFF"/><path d="M5 20h9.5l4.5 4.5 8.5-17" stroke="${JADE_400}"/></g>`;

/** Square, full-bleed navy (apple-touch and maskable icons must not be transparent). */
const solid = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${NAVY}"/>${mark(scale)}</svg>`;

const png = (svg, size) => sharp(Buffer.from(svg), { density: 72 * Math.ceil(size / 32) * 2 }).resize(size, size).png().toBuffer();

const iconSvg = await readFile(pub('icon.svg'), 'utf8');
// The favicon SVG's dark-mode rule is for browsers; rasters use the light tile.
const tile = iconSvg.replace(/<style>.*?<\/style>/, '').replace('class="t"', `fill="${NAVY}"`);

const icoSizes = await Promise.all([16, 32, 48].map((s) => png(tile, s)));
await writeFile(pub('favicon.ico'), await pngToIco(icoSizes));

await writeFile(pub('icon-192.png'), await png(tile, 192));
await writeFile(pub('icon-512.png'), await png(tile, 512));
// Apple adds its own rounded corners: solid square, mark at ~62% for comfortable padding.
await writeFile(pub('apple-touch-icon.png'), await png(solid(0.62), 180));
// Maskable: artwork kept inside the central 80% safe zone (mark spans ~66% of the canvas here).
await writeFile(pub('icon-maskable-512.png'), await png(solid(0.6), 512));

const og = await readFile(`${root}scripts/brand/og-default.svg`);
await writeFile(pub('og-default.png'), await sharp(og, { density: 144 }).resize(1200, 630).png({ compressionLevel: 9 }).toBuffer());

console.log('Icons and share image written to public/.');
