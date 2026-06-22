import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const DEFAULT_SOURCE = path.join(
  ROOT,
  '.codex-tmp',
  'league-assets',
  'icon-dalli-sources',
  'league_icons_v1',
  'league_icons_atlas_v1.png',
);
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'levels', 'league-v6-icons');
const REPORT_DIR = path.join(ROOT, '.codex-tmp', 'league-assets');
const CONTACT_SHEET_PATH = path.join(REPORT_DIR, 'league-v6-icons-contact.png');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

const ICON_SIZE = 384;
const INNER_SIZE = 312;
const GRID_COLS = 3;
const GRID_ROWS = 4;
const GUTTER_TRIM = 14;

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
  console.error(`DALL-E icon atlas not found: ${sourcePath}`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const sourceMeta = await sharp(sourcePath).metadata();
if (!sourceMeta.width || !sourceMeta.height) {
  console.error(`Cannot read icon atlas dimensions: ${sourcePath}`);
  process.exit(1);
}

const records = [];

for (const league of LEAGUES) {
  const col = league.id % GRID_COLS;
  const row = Math.floor(league.id / GRID_COLS);
  const leftEdge = Math.round((col * sourceMeta.width) / GRID_COLS);
  const rightEdge = Math.round(((col + 1) * sourceMeta.width) / GRID_COLS);
  const topEdge = Math.round((row * sourceMeta.height) / GRID_ROWS);
  const bottomEdge = Math.round(((row + 1) * sourceMeta.height) / GRID_ROWS);
  const crop = {
    left: leftEdge + GUTTER_TRIM,
    top: topEdge + GUTTER_TRIM,
    width: Math.max(1, rightEdge - leftEdge - GUTTER_TRIM * 2),
    height: Math.max(1, bottomEdge - topEdge - GUTTER_TRIM * 2),
  };

  const extracted = await sharp(sourcePath).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  removeChromaBackground(extracted.data, extracted.info);
  removeSideDividerPixels(extracted.data, extracted.info);
  removeDetachedSideComponents(extracted.data, extracted.info);

  const transparentPng = await sharp(extracted.data, { raw: extracted.info }).png().toBuffer();
  const trimmed = await sharp(transparentPng).trim({ background: '#00000000', threshold: 8 }).png().toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  const icon = await sharp(trimmed)
    .resize(INNER_SIZE, INNER_SIZE, { fit: 'contain', position: 'center' })
    .png()
    .toBuffer();
  const iconMeta = await sharp(icon).metadata();
  const left = Math.round((ICON_SIZE - (iconMeta.width || INNER_SIZE)) / 2);
  const top = Math.round((ICON_SIZE - (iconMeta.height || INNER_SIZE)) / 2);

  const file = `league-icon-${league.slug}.webp`;
  const outputPath = path.join(OUT_DIR, file);

  const finalIcon = await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: '#00000000',
    },
  })
    .composite([{ input: icon, left, top }])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  cleanFinalIconSideBars(finalIcon.data, finalIcon.info);
  await sharp(finalIcon.data, { raw: finalIcon.info })
    .webp({ quality: 96, alphaQuality: 98, effort: 6 })
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  const stat = fs.statSync(outputPath);
  records.push({
    ...league,
    file,
    path: path.relative(ROOT, outputPath).replaceAll('\\', '/'),
    crop,
    sourceVisibleWidth: trimmedMeta.width,
    sourceVisibleHeight: trimmedMeta.height,
    width: outMeta.width,
    height: outMeta.height,
    hasAlpha: outMeta.hasAlpha,
    bytes: stat.size,
  });
}

const manifest = {
  version: 'league-v6-codex-dalli-icons',
  generatedAt: new Date().toISOString(),
  source: path.relative(ROOT, sourcePath).replaceAll('\\', '/'),
  grid: { columns: GRID_COLS, rows: GRID_ROWS, gutterTrim: GUTTER_TRIM },
  output: { width: ICON_SIZE, height: ICON_SIZE, innerSize: INNER_SIZE, format: 'webp', quality: 96 },
  designRules: [
    'Codex/DALL-E atlas is used only as raw source; final app icons are transparent WebP cutouts.',
    'Icons are centered on a stable 384x384 canvas to avoid legacy per-league offsets.',
    'No text, numbers, logos, characters, or UI are allowed in league icons.',
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
  iconSize: `${ICON_SIZE}x${ICON_SIZE}`,
}, null, 2));

function removeChromaBackground(data, info) {
  const total = info.width * info.height;
  const visited = new Uint8Array(total);
  const queue = [];

  for (let x = 0; x < info.width; x += 1) {
    queue.push(x);
    queue.push((info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    queue.push(y * info.width);
    queue.push(y * info.width + info.width - 1);
  }

  while (queue.length > 0) {
    const current = queue.pop();
    if (current == null || visited[current]) continue;
    visited[current] = 1;
    if (!isRemovableBackground(data, current)) continue;

    const offset = current * 4;
    data[offset + 3] = 0;

    const x = current % info.width;
    const y = Math.floor(current / info.width);
    if (x > 0 && !visited[current - 1]) queue.push(current - 1);
    if (x < info.width - 1 && !visited[current + 1]) queue.push(current + 1);
    if (y > 0 && !visited[current - info.width]) queue.push(current - info.width);
    if (y < info.height - 1 && !visited[current + info.width]) queue.push(current + info.width);
  }
}

function isRemovableBackground(data, pixelIndex) {
  const offset = pixelIndex * 4;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const a = data[offset + 3];
  if (a < 8) return true;
  const magentaDominance = (r + b) / 2 - g;
  const chromaMagenta = r > 150 && b > 145 && g < 115 && magentaDominance > 75;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const gridGutterBlack = max < 96 && max - min < 50;
  return chromaMagenta || gridGutterBlack;
}

function removeSideDividerPixels(data, info) {
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (x > info.width * 0.22 && x < info.width * 0.78) continue;
      const pixelIndex = y * info.width + x;
      const offset = pixelIndex * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (data[offset + 3] > 0 && max < 132 && max - min < 82) {
        data[offset + 3] = 0;
      }
    }
  }
}

function cleanFinalIconSideBars(data, info) {
  removeTallDarkVerticalArtifacts(data, info);
  removeTallDarkColumnRuns(data, info);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (x > info.width * 0.12 && x < info.width * 0.88) continue;
      const offset = (y * info.width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (data[offset + 3] > 0 && Math.max(r, g, b) < 68) {
        data[offset + 3] = 0;
      }
    }
  }
}

function removeTallDarkColumnRuns(data, info) {
  for (let x = 0; x < info.width; x += 1) {
    const outsideShieldCore = x < info.width * 0.28 || x > info.width * 0.72;
    if (!outsideShieldCore) continue;

    let run = 0;
    let maxRun = 0;
    for (let y = 0; y < info.height; y += 1) {
      const pixel = y * info.width + x;
      if (isDarkArtifactPixel(data, pixel)) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 0;
      }
    }

    if (maxRun < info.height * 0.32) continue;
    for (let y = 0; y < info.height; y += 1) {
      const pixel = y * info.width + x;
      if (isDarkArtifactPixel(data, pixel)) {
        data[pixel * 4 + 3] = 0;
      }
    }
  }
}

function removeTallDarkVerticalArtifacts(data, info) {
  const total = info.width * info.height;
  const visited = new Uint8Array(total);

  for (let start = 0; start < total; start += 1) {
    if (visited[start] || !isDarkArtifactPixel(data, start)) continue;

    const stack = [start];
    const pixels = [];
    let minX = info.width;
    let minY = info.height;
    let maxX = -1;
    let maxY = -1;

    visited[start] = 1;
    while (stack.length > 0) {
      const current = stack.pop();
      if (current == null) continue;
      pixels.push(current);

      const x = current % info.width;
      const y = Math.floor(current / info.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const neighbors = [
        current - 1,
        current + 1,
        current - info.width,
        current + info.width,
      ];
      for (const next of neighbors) {
        if (next < 0 || next >= total || visited[next]) continue;
        const nx = next % info.width;
        const ny = Math.floor(next / info.width);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
        if (!isDarkArtifactPixel(data, next)) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const centerX = (minX + maxX) / 2;
    const outsideShieldCore = centerX < info.width * 0.30 || centerX > info.width * 0.70;
    const tallNeedle = width <= 38 && height >= info.height * 0.42 && pixels.length >= 80;
    if (!outsideShieldCore || !tallNeedle) continue;

    for (const pixel of pixels) {
      data[pixel * 4 + 3] = 0;
    }
  }
}

function isDarkArtifactPixel(data, pixelIndex) {
  const offset = pixelIndex * 4;
  const a = data[offset + 3];
  if (a <= 18) return false;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  return Math.max(r, g, b) <= 46;
}

function removeDetachedSideComponents(data, info) {
  const total = info.width * info.height;
  const visited = new Uint8Array(total);
  const components = [];

  for (let start = 0; start < total; start += 1) {
    if (visited[start] || alphaAt(data, start) <= 12) continue;

    const stack = [start];
    const pixels = [];
    let minX = info.width;
    let minY = info.height;
    let maxX = -1;
    let maxY = -1;

    visited[start] = 1;
    while (stack.length > 0) {
      const current = stack.pop();
      if (current == null) continue;
      pixels.push(current);
      const x = current % info.width;
      const y = Math.floor(current / info.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height) continue;
          const next = ny * info.width + nx;
          if (visited[next] || alphaAt(data, next) <= 12) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }
    }

    components.push({ pixels, area: pixels.length, minX, minY, maxX, maxY });
  }

  const largestArea = Math.max(0, ...components.map(component => component.area));
  for (const component of components) {
    const centerX = (component.minX + component.maxX) / 2;
    const centerY = (component.minY + component.maxY) / 2;
    const width = component.maxX - component.minX + 1;
    const height = component.maxY - component.minY + 1;
    const sideDivider = (
      width <= info.width * 0.12 &&
      height >= info.height * 0.42 &&
      (centerX < info.width * 0.30 || centerX > info.width * 0.70)
    );
    const central = (
      centerX >= info.width * 0.16 &&
      centerX <= info.width * 0.84 &&
      centerY >= info.height * 0.04 &&
      centerY <= info.height * 0.96
    );
    const keep = !sideDivider && (component.area === largestArea || (central && component.area > 12));
    if (keep) continue;
    for (const pixel of component.pixels) {
      data[pixel * 4 + 3] = 0;
    }
  }
}

function alphaAt(data, pixelIndex) {
  return data[pixelIndex * 4 + 3];
}

async function writeContactSheet(recordsForSheet) {
  const cell = 190;
  const labelH = 26;
  const cols = 4;
  const rows = Math.ceil(recordsForSheet.length / cols);
  const composites = [];

  for (let i = 0; i < recordsForSheet.length; i += 1) {
    const record = recordsForSheet[i];
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * (cell + labelH);
    const bg = Buffer.from(`
<svg width="${cell}" height="${cell}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="18" fill="#10151D"/>
  <circle cx="${cell / 2}" cy="${cell / 2}" r="72" fill="#1B2430"/>
</svg>`);
    const icon = await sharp(path.join(ROOT, record.path))
      .resize(150, 150, { fit: 'contain' })
      .png()
      .toBuffer();
    const label = Buffer.from(`
<svg width="${cell}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#05070A"/>
  <text x="${cell / 2}" y="18" text-anchor="middle" fill="#E7EDF5" font-family="Arial" font-size="13" font-weight="700">${escapeXml(record.id)} / ${escapeXml(record.slug)}</text>
</svg>`);
    composites.push({ input: bg, left: x, top: y });
    composites.push({ input: icon, left: x + 20, top: y + 20 });
    composites.push({ input: label, left: x, top: y + cell });
  }

  await sharp({
    create: {
      width: cols * cell,
      height: rows * (cell + labelH),
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
