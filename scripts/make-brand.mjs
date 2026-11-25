// Builds every Wakeel Pro logo file from the master artwork (assets/logo.png).
// Run with: node scripts/make-brand.mjs   (commit the generated files)
//
// Writes to public/brand/:
//   mark.png                 the calligraphy mark alone, transparent (used as a CSS mask by <Logo />)
//   mark-{beige,bronze,ink,ivory}.png
//   lockup-{beige,bronze,ink,ivory}.png      mark + "WAKEEL PRO" side by side
//   stacked-{bronze,ink}.png                 mark above the wordmark
//   badge-dark.png / badge-light.png         mark on a rounded tile (social / WhatsApp profile)
// and the app icons: public/icon.png, public/icons/*.png, src/app/favicon.ico
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets', 'logo.png');
const BRAND = path.join(root, 'public', 'brand');
const ICONS = path.join(root, 'public', 'icons');

const COLORS = { beige: '#ead2bd', bronze: '#8c5e34', ink: '#3a2a1d', ivory: '#f7f1e7' };
const NIGHT = '#2e2117';
const CREAM = '#f4eee4';
const SPLIT_X = 1028; // gap between the mark (x 168–989) and the wordmark (x 1066–1881)

await mkdir(BRAND, { recursive: true });
await mkdir(ICONS, { recursive: true });

const meta = await sharp(SRC).metadata();
/** Alpha channel of a region, trimmed to its ink. */
async function alphaOf(left, width) {
  const region = await sharp(SRC).extract({ left, top: 0, width, height: meta.height }).png().toBuffer();
  return sharp(region).trim({ threshold: 1 }).extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
}

/** Solid `hex` shape cut out by `alpha` (raw 1-channel buffer). */
async function tint({ data, info }, hex) {
  return sharp({ create: { width: info.width, height: info.height, channels: 3, background: hex } })
    .joinChannel(data, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png()
    .toBuffer();
}

const mark = await alphaOf(0, SPLIT_X);
const word = await alphaOf(SPLIT_X, meta.width - SPLIT_X);
const pad = (buf, px) => sharp(buf).extend({ top: px, bottom: px, left: px, right: px, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

/** Compose images (transparent canvas) at positions. */
async function canvas(w, h, layers, background = { r: 0, g: 0, b: 0, alpha: 0 }) {
  return sharp({ create: { width: w, height: h, channels: 4, background } }).composite(layers).png().toBuffer();
}

// Marks
await writeFile(path.join(BRAND, 'mark.png'), await pad(await tint(mark, '#000000'), 8));
for (const [name, hex] of Object.entries(COLORS)) {
  await writeFile(path.join(BRAND, `mark-${name}.png`), await pad(await tint(mark, hex), 8));
}

// Horizontal lockups: wordmark scaled to ~62% of the mark height, centred vertically
const mh = mark.info.height;
async function lockup(hex) {
  const wh = Math.round(mh * 0.5);
  const w = await sharp(await tint(word, hex)).resize({ height: wh }).png().toBuffer();
  const ww = (await sharp(w).metadata()).width;
  const gap = Math.round(mh * 0.12);
  const m = await tint(mark, hex);
  return pad(await canvas(mark.info.width + gap + ww, mh, [
    { input: m, left: 0, top: 0 },
    { input: w, left: mark.info.width + gap, top: Math.round((mh - wh) / 2) },
  ]), 24);
}
for (const [name, hex] of Object.entries(COLORS)) await writeFile(path.join(BRAND, `lockup-${name}.png`), await lockup(hex));

// Stacked: mark on top, wordmark below
async function stacked(hex) {
  const ww0 = Math.round(mark.info.width * 0.9);
  const w = await sharp(await tint(word, hex)).resize({ width: ww0 }).png().toBuffer();
  const wm = await sharp(w).metadata();
  const gap = Math.round(mh * 0.12);
  const W = Math.max(mark.info.width, wm.width);
  return pad(await canvas(W, mh + gap + wm.height, [
    { input: await tint(mark, hex), left: Math.round((W - mark.info.width) / 2), top: 0 },
    { input: w, left: Math.round((W - wm.width) / 2), top: mh + gap },
  ]), 24);
}
await writeFile(path.join(BRAND, 'stacked-bronze.png'), await stacked(COLORS.bronze));
await writeFile(path.join(BRAND, 'stacked-ink.png'), await stacked(COLORS.ink));

/** Square tile with the mark centred at `ratio` of the side. */
async function tile(size, ratio, bg, fg, radius) {
  const m = await sharp(await tint(mark, fg)).resize({ width: Math.round(size * ratio), height: Math.round(size * ratio), fit: 'inside' }).png().toBuffer();
  const mm = await sharp(m).metadata();
  const rect = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/></svg>`);
  return sharp(rect)
    .composite([{ input: m, left: Math.round((size - mm.width) / 2), top: Math.round((size - mm.height) / 2) }])
    .png()
    .toBuffer();
}
await writeFile(path.join(BRAND, 'badge-dark.png'), await tile(1024, 0.66, NIGHT, COLORS.beige, 220));
await writeFile(path.join(BRAND, 'badge-light.png'), await tile(1024, 0.66, CREAM, COLORS.bronze, 220));

// App icons
await writeFile(path.join(root, 'public', 'icon.png'), await tile(512, 0.68, NIGHT, COLORS.beige, 112));
await writeFile(path.join(ICONS, 'icon-192.png'), await tile(192, 0.68, NIGHT, COLORS.beige, 42));
await writeFile(path.join(ICONS, 'icon-512.png'), await tile(512, 0.68, NIGHT, COLORS.beige, 112));
await writeFile(path.join(ICONS, 'icon-maskable-512.png'), await tile(512, 0.56, NIGHT, COLORS.beige, 0)); // inside the 80% safe zone
await writeFile(path.join(ICONS, 'apple-touch-icon.png'), await tile(180, 0.66, NIGHT, COLORS.beige, 0)); // iOS rounds it itself

// favicon.ico (PNG-in-ICO, 32 and 48 px)
const sizes = [32, 48];
const pngs = await Promise.all(sizes.map((s) => tile(s, 0.78, NIGHT, COLORS.beige, Math.round(s * 0.2))));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
await writeFile(path.join(root, 'src', 'app', 'favicon.ico'), Buffer.concat([header, ...pngs]));

console.log('Wrote brand files to', BRAND);
