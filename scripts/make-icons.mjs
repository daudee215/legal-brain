// Renders public/icon.svg to the PNG icons phones need for "Add to Home Screen".
// Run once with: node scripts/make-icons.mjs  (commit the generated PNGs)
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'icons');
const BG = '#2e2117';
const svg = await readFile(path.join(root, 'public', 'icon.svg'));
await mkdir(out, { recursive: true });

/** The SVG at `px` pixels square (high density so the edges stay crisp). */
const render = (px) => sharp(svg, { density: Math.ceil((72 * px * 2) / 64) }).resize(px, px).png().toBuffer();

/** Plain icon: the SVG as drawn (rounded corners, transparent outside). */
async function plain(name, size) {
  await sharp(await render(size)).toFile(path.join(out, name));
}

/** Opaque square on the theme colour with the icon scaled to `ratio` and centred. */
async function padded(name, size, ratio) {
  const inner = Math.round(size * ratio);
  const offset = Math.round((size - inner) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: await render(inner), left: offset, top: offset }])
    .flatten({ background: BG })
    .png()
    .toFile(path.join(out, name));
}

await plain('icon-192.png', 192);
await plain('icon-512.png', 512);
await padded('icon-maskable-512.png', 512, 0.7); // survives circle/squircle masks (safe zone is the central 80%)
await padded('apple-touch-icon.png', 180, 0.86); // iOS rounds the corners itself; keep it opaque
console.log('Wrote icons to', out);
