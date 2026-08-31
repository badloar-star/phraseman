#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { PHENOMENA_GENERATION_CATALOG, PHENOMENA_INKS, finalPathFor } from './catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const GRADIENTS = Object.freeze([
  ['#0B3B6F', '#1E7A8C', '#7CF5C4'], ['#3A1C71', '#8E2DE2', '#F0A9FF'],
  ['#4A0E20', '#C42B5F', '#FFB347'], ['#052A4E', '#0E7C8C', '#7BF3D0'],
  ['#6D1B4B', '#E0575B', '#FFC857'], ['#07301F', '#1B8A5A', '#9BE86B'],
  ['#101C4E', '#2E5BFF', '#8FD8FF'], ['#2A1060', '#7B2CBF', '#FFA8E4'],
  ['#3B1F04', '#C8791A', '#FFE066'], ['#4A0E38', '#D6336C', '#FFAFCF'],
]);

function escapeXml(value) { return String(value).replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character])); }

async function cellFor(item, ink, index, size = 220) {
  const art = await sharp(path.join(ROOT, finalPathFor(item.id, ink))).resize(size, size, { fit: 'fill' }).png().toBuffer();
  const colors = GRADIENTS[index % GRADIENTS.length];
  const svg = Buffer.from(`<svg width="${size}" height="${size + 42}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset=".55" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient><clipPath id="h"><polygon points="110,2 205,56 205,164 110,218 15,164 15,56"/></clipPath></defs><rect width="220" height="262" fill="#090B11"/><polygon points="110,2 205,56 205,164 110,218 15,164 15,56" fill="url(#g)" stroke="#F3C969" stroke-width="3"/><text x="110" y="244" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#F6F0DF">${escapeXml(item.id)} · ${ink} · ${item.price}</text></svg>`);
  return sharp(svg).composite([{ input: art, left: 0, top: 0 }]).png().toBuffer();
}

export async function buildContactSheets({ outDir = path.join(ROOT, '.codex-tmp', 'avatar-phenomena-v1', 'qa') } = {}) {
  await mkdir(outDir, { recursive: true });
  const cells = [];
  for (let index = 0; index < PHENOMENA_GENERATION_CATALOG.length; index += 1) for (const ink of PHENOMENA_INKS) {
    cells.push(await cellFor(PHENOMENA_GENERATION_CATALOG[index], ink, index));
  }
  const columns = 6; const cellWidth = 220; const cellHeight = 262; const rows = Math.ceil(cells.length / columns);
  const composites = cells.map((input, index) => ({ input, left: (index % columns) * cellWidth, top: Math.floor(index / columns) * cellHeight }));
  const output = path.join(outDir, 'all-items-real-hex.webp');
  await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: '#090B11' } }).composite(composites).webp({ quality: 82, effort: 6 }).toFile(output);
  return { output, count: cells.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildContactSheets().then(({ count, output }) => console.log(`avatar phenomena contact sheet: ${count} cells -> ${path.relative(ROOT, output)}`)).catch((error) => { console.error(error); process.exitCode = 1; });
}
