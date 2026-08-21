import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const escapeXml = (value) => String(value).replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]));

export async function buildContactSheet({ catalog: catalogPath, assets, out }) {
  if (!catalogPath || !assets || !out) throw new Error('avatar_contact_sheet_invalid: arguments');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  if (!Array.isArray(catalog.items) || catalog.items.length === 0) throw new Error('avatar_contact_sheet_invalid: catalog');
  const columns = 4; const cellWidth = 224; const cellHeight = 244; const imageSize = 192;
  const rows = Math.ceil(catalog.items.length / columns);
  const canvas = sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: '#FFF3E8' } });
  const composites = [];
  for (let index = 0; index < catalog.items.length; index += 1) {
    const item = catalog.items[index];
    const thumbnailPath = path.join(assets, item.id, String(item.assetVersion), 'thumbnail.webp');
    const thumbnail = await sharp(thumbnailPath).resize(imageSize, imageSize, { fit: 'contain' }).png().toBuffer();
    const x = (index % columns) * cellWidth + 16; const y = Math.floor(index / columns) * cellHeight + 12;
    composites.push({ input: thumbnail, left: x, top: y });
    const label = Buffer.from(`<svg width="${cellWidth}" height="40"><rect width="100%" height="100%" fill="#FFF3E8"/><text x="12" y="24" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#3B2118">${escapeXml(item.id)}</text></svg>`);
    composites.push({ input: label, left: (index % columns) * cellWidth, top: y + imageSize + 4 });
  }
  await mkdir(out, { recursive: true });
  const output = path.join(out, 'avatar-dna-v1-contact-sheet.webp');
  await canvas.composite(composites).webp({ quality: 78, effort: 6 }).toFile(output);
  const inventory = catalog.items.map((item) => ({ id: item.id, assetVersion: item.assetVersion, entitlement: item.entitlement?.kind ?? 'unknown' }));
  await writeFile(path.join(out, 'avatar-dna-v1-contact-sheet.json'), `${JSON.stringify({ manifestVersion: catalog.manifestVersion, items: inventory }, null, 2)}\n`);
  return { output, count: inventory.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const assets = valueFor('--assets') ?? 'admin/v2/avatars/avatar-dna/v1';
  buildContactSheet({ catalog: valueFor('--catalog'), assets, out: valueFor('--out') })
    .then(({ count }) => console.log(`avatar-dna contact sheet: PASS (${count} items)`))
    .catch((error) => { console.error(error instanceof Error ? error.message : 'avatar_contact_sheet_invalid'); process.exitCode = 1; });
}
