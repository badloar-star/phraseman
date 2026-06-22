import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const DEFAULT_SOURCE = path.join(
  ROOT,
  '.codex-tmp',
  'league-assets',
  'dalli-sources',
  'league_cards_v1',
  'league_cards_atlas_v1.png',
);
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'levels', 'league-v6-cards');
const REPORT_DIR = path.join(ROOT, '.codex-tmp', 'league-assets');
const CONTACT_SHEET_PATH = path.join(REPORT_DIR, 'league-v6-cards-contact.png');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

const CARD_WIDTH = 768;
const CARD_HEIGHT = 363;
const CARD_ASPECT_RATIO = CARD_WIDTH / CARD_HEIGHT;
const GRID_COLS = 3;
const GRID_ROWS = 4;

const LEAGUES = [
  { id: 0, slug: 'med', title: 'Copper league' },
  { id: 1, slug: 'bronz', title: 'Bronze league' },
  { id: 2, slug: 'serebro', title: 'Silver league' },
  { id: 3, slug: 'zoloto', title: 'Gold league' },
  { id: 4, slug: 'platina', title: 'Platinum league' },
  { id: 5, slug: 'izumrud', title: 'Emerald league' },
  { id: 6, slug: 'sapfir', title: 'Sapphire league' },
  { id: 7, slug: 'rubin', title: 'Ruby league' },
  { id: 8, slug: 'almaz', title: 'Diamond league' },
  { id: 9, slug: 'cherniy-almaz', title: 'Black diamond league' },
  { id: 10, slug: 'efir', title: 'Ether league' },
  { id: 11, slug: 'vishaya', title: 'Supreme league' },
];

const args = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(ROOT, args.source || DEFAULT_SOURCE);

if (!fs.existsSync(sourcePath)) {
  console.error(`DALL-E atlas not found: ${sourcePath}`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const sourceMeta = await sharp(sourcePath).metadata();
if (!sourceMeta.width || !sourceMeta.height) {
  console.error(`Cannot read atlas dimensions: ${sourcePath}`);
  process.exit(1);
}

const tileWidth = Math.floor(sourceMeta.width / GRID_COLS);
const tileHeight = Math.floor(sourceMeta.height / GRID_ROWS);
const trimX = Math.max(4, Math.round(tileWidth * 0.012));
const trimY = Math.max(10, Math.round(tileHeight * 0.04));
const records = [];

for (const league of LEAGUES) {
  const col = league.id % GRID_COLS;
  const row = Math.floor(league.id / GRID_COLS);
  const crop = {
    left: col * tileWidth + trimX,
    top: row * tileHeight + trimY,
    width: tileWidth - trimX * 2,
    height: tileHeight - trimY * 2,
  };
  const file = `league-card-${league.slug}.webp`;
  const outputPath = path.join(OUT_DIR, file);
  const finalCard = await sharp(sourcePath)
    .extract(crop)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  removeHorizontalGutterBands(finalCard.data, finalCard.info);

  await sharp(finalCard.data, { raw: finalCard.info })
    .webp({ quality: 94, effort: 6 })
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  const stat = fs.statSync(outputPath);
  records.push({
    ...league,
    file,
    path: path.relative(ROOT, outputPath).replaceAll('\\', '/'),
    crop,
    width: outMeta.width,
    height: outMeta.height,
    bytes: stat.size,
  });
}

const manifest = {
  version: 'league-v6-codex-dalli-cards',
  generatedAt: new Date().toISOString(),
  source: path.relative(ROOT, sourcePath).replaceAll('\\', '/'),
  grid: { columns: GRID_COLS, rows: GRID_ROWS, tileWidth, tileHeight, trimX, trimY },
  output: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    aspectRatio: CARD_ASPECT_RATIO,
    fit: 'native atlas tile crop',
    format: 'webp',
    quality: 94,
  },
  designRules: [
    'DALL-E/Codex atlas is used as background art only; UI text stays native and localized.',
    'Each card keeps the native atlas tile crop; final assets must not add padding, seams, or cover-crop extensions.',
    'Each card keeps a centered safe area for the existing transparent league heraldry overlay.',
    'No text, numbers, logos, characters, or foreground crests are allowed in card backgrounds.',
  ],
  leagues: records,
};

fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

await writeContactSheet(records);

console.log(JSON.stringify({
  source: manifest.source,
  outputDir: path.relative(ROOT, OUT_DIR).replaceAll('\\', '/'),
  manifest: path.relative(ROOT, MANIFEST_PATH).replaceAll('\\', '/'),
  contactSheet: path.relative(ROOT, CONTACT_SHEET_PATH).replaceAll('\\', '/'),
  count: records.length,
  cardSize: `${CARD_WIDTH}x${CARD_HEIGHT}`,
}, null, 2));

function removeHorizontalGutterBands(data, info) {
  const segments = [];
  let current = null;

  for (let y = 0; y < info.height; y += 1) {
    const edgeZone = y < info.height * 0.18 || y > info.height * 0.82;
    const darkRatio = edgeZone ? horizontalDarkRatio(data, info, y) : 0;
    const gutterRow = edgeZone && darkRatio >= 0.55;

    if (gutterRow && !current) {
      current = { start: y, end: y };
    } else if (gutterRow && current) {
      current.end = y;
    } else if (!gutterRow && current) {
      segments.push(current);
      current = null;
    }
  }
  if (current) segments.push(current);

  for (const segment of segments) {
    const height = segment.end - segment.start + 1;
    if (segment.start <= 4 || segment.end >= info.height - 5) continue;
    if (height > Math.round(info.height * 0.16)) continue;

    const replacementY = segment.start < info.height / 2
      ? Math.min(info.height - 1, segment.end + 1)
      : Math.max(0, segment.start - 1);
    for (let y = segment.start; y <= segment.end; y += 1) {
      copyRow(data, info, replacementY, y);
    }
  }
}

function horizontalDarkRatio(data, info, y) {
  let dark = 0;
  for (let x = 0; x < info.width; x += 1) {
    const offset = (y * info.width + x) * info.channels;
    if (Math.max(data[offset], data[offset + 1], data[offset + 2]) < 45) {
      dark += 1;
    }
  }
  return dark / info.width;
}

function copyRow(data, info, fromY, toY) {
  const fromOffset = fromY * info.width * info.channels;
  const toOffset = toY * info.width * info.channels;
  data.copyWithin(toOffset, fromOffset, fromOffset + info.width * info.channels);
}

async function writeContactSheet(recordsForSheet) {
  const cellW = 384;
  const cellH = 246;
  const labelH = 30;
  const cols = 3;
  const rows = Math.ceil(recordsForSheet.length / cols);
  const composites = [];

  for (let i = 0; i < recordsForSheet.length; i += 1) {
    const record = recordsForSheet[i];
    const x = (i % cols) * cellW;
    const y = Math.floor(i / cols) * (cellH + labelH);
    const card = await sharp(path.join(ROOT, record.path))
      .resize(cellW, cellH, { fit: 'cover' })
      .png()
      .toBuffer();
    const label = Buffer.from(`
<svg width="${cellW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#05070A"/>
  <text x="${cellW / 2}" y="20" text-anchor="middle" fill="#E7EDF5" font-family="Arial" font-size="15" font-weight="700">${escapeXml(record.id)} / ${escapeXml(record.slug)}</text>
</svg>`);
    composites.push({ input: card, left: x, top: y });
    composites.push({ input: label, left: x, top: y + cellH });
  }

  await sharp({
    create: {
      width: cols * cellW,
      height: rows * (cellH + labelH),
      channels: 4,
      background: '#05070A',
    },
  })
    .composite(composites)
    .png()
    .toFile(CONTACT_SHEET_PATH);
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    parsed[key] = rawArgs[i + 1];
    i += 1;
  }
  return parsed;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[char]));
}
