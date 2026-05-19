import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const srcDir = path.join(root, 'tmp', 'avatar-generation-v4', 'source-atlases');
const outDir = path.join(root, 'assets', 'images', 'levels', 'generated-v4');
const qaDir = path.join(root, 'qa-artifacts');
const tmpDir = path.join(root, 'tmp', 'avatar-generation-v4', 'processed-png');

const ranges = [
  { file: 'levels-1-10.png', start: 1, end: 10 },
  { file: 'levels-11-20.png', start: 11, end: 20 },
  { file: 'levels-21-30.png', start: 21, end: 30 },
  { file: 'levels-31-40.png', start: 31, end: 40 },
  { file: 'levels-41-50.png', start: 41, end: 50 },
  { file: 'levels-51-60.png', start: 51, end: 60 },
];

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

function ensureDirs() {
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(qaDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });
}

function numberSvg(level) {
  const text = String(level);
  const fontSize = text.length === 1 ? 178 : 148;
  const strokeWidth = text.length === 1 ? 9 : 8;
  return Buffer.from(`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <text
    x="256"
    y="258"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Arial Black, Impact, system-ui, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    letter-spacing="-6"
    fill="#FFFFFF"
    stroke="#0B0F14"
    stroke-width="${strokeWidth}"
    paint-order="stroke fill"
    filter="url(#shadow)">${text}</text>
  <text
    x="256"
    y="258"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Arial Black, Impact, system-ui, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    letter-spacing="-6"
    fill="#FFFFFF">${text}</text>
</svg>`);
}

async function chromaKeyCell(input) {
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const idx = (y * info.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const greenDominant = g > 140 && g > r * 1.45 && g > b * 1.45;
      const keyGreen = g > 155 && r < 125 && b < 125 && greenDominant;

      if (keyGreen || a < 4) {
        data[idx + 3] = 0;
        continue;
      }

      if (greenDominant && g > 120) {
        const neutralCap = Math.max(r, b) + 24;
        data[idx + 1] = Math.min(g, neutralCap);
      }

      if (data[idx + 3] > 18) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error('Could not find non-background pixels in atlas cell.');
  }

  const pad = Math.max(8, Math.round(Math.min(info.width, info.height) * 0.025));
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(info.width - 1, maxX + pad);
  maxY = Math.min(info.height - 1, maxY + pad);

  return sharp(data, { raw: info }).extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
}

async function processLevel(atlasPath, level, row, col, cellWidth, cellHeight) {
  const left = Math.round(col * cellWidth);
  const top = Math.round(row * cellHeight);
  const width = Math.round((col + 1) * cellWidth) - left;
  const height = Math.round((row + 1) * cellHeight) - top;

  const cell = sharp(atlasPath).extract({ left, top, width, height });
  const keyed = await chromaKeyCell(cell);
  const badgePng = await keyed
    .resize({ width: 456, height: 456, fit: 'contain', background: transparent })
    .png()
    .toBuffer();

  const basePng = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: transparent,
    },
  })
    .composite([{ input: badgePng, gravity: 'center' }])
    .png()
    .toBuffer();

  const finalPng = await sharp(basePng)
    .composite([{ input: numberSvg(level), gravity: 'center' }])
    .png()
    .toBuffer();

  const pngPath = path.join(tmpDir, `${level}.png`);
  const webpPath = path.join(outDir, `${level}.webp`);
  await sharp(finalPng).png().toFile(pngPath);
  await sharp(finalPng).webp({ quality: 90, effort: 5, smartSubsample: true }).toFile(webpPath);

  const meta = await sharp(webpPath).metadata();
  return {
    level,
    file: path.relative(root, webpPath).replaceAll(path.sep, '/'),
    sourceAtlas: path.relative(root, atlasPath).replaceAll(path.sep, '/'),
    width: meta.width,
    height: meta.height,
    hasAlpha: Boolean(meta.hasAlpha),
    bytes: fs.statSync(webpPath).size,
  };
}

function labelSvg(label, width, height) {
  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" rx="4" fill="#0E1728"/>
  <text x="${width / 2}" y="${Math.round(height * 0.72)}" text-anchor="middle"
    font-family="Arial, system-ui, sans-serif" font-size="${Math.max(12, Math.round(height * 0.48))}"
    font-weight="800" fill="#F8FAFC">${label}</text>
</svg>`);
}

async function createContactSheet(size, filename) {
  const cols = 10;
  const rows = 6;
  const gap = size <= 44 ? 10 : 18;
  const labelHeight = size <= 44 ? 18 : 28;
  const pad = size <= 44 ? 10 : 18;
  const cellW = size + gap;
  const cellH = size + labelHeight + 6;
  const width = pad * 2 + cols * cellW - gap;
  const height = pad * 2 + rows * cellH - 6;
  const composites = [];

  for (let level = 1; level <= 60; level += 1) {
    const index = level - 1;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = pad + col * cellW;
    const y = pad + row * cellH;
    const input = await sharp(path.join(outDir, `${level}.webp`))
      .resize(size, size, { fit: 'contain', background: transparent })
      .png()
      .toBuffer();
    composites.push({ input, left: x, top: y });
    composites.push({
      input: labelSvg(String(level), size, labelHeight),
      left: x,
      top: y + size + 2,
    });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#070D1B',
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(qaDir, filename));
}

async function main() {
  ensureDirs();

  const missing = ranges
    .map((range) => path.join(srcDir, range.file))
    .filter((file) => !fs.existsSync(file));
  if (missing.length > 0) {
    throw new Error(`Missing source atlases:\n${missing.join('\n')}`);
  }

  const levels = [];
  for (const range of ranges) {
    const atlasPath = path.join(srcDir, range.file);
    const meta = await sharp(atlasPath).metadata();
    if (!meta.width || !meta.height) throw new Error(`Could not read atlas metadata: ${atlasPath}`);
    const cellWidth = meta.width / 5;
    const cellHeight = meta.height / 2;

    for (let level = range.start; level <= range.end; level += 1) {
      const offset = level - range.start;
      const row = Math.floor(offset / 5);
      const col = offset % 5;
      levels.push(await processLevel(atlasPath, level, row, col, cellWidth, cellHeight));
    }
  }

  await createContactSheet(96, 'level-avatars-generated-v4-96px.png');
  await createContactSheet(44, 'level-avatars-generated-v4-44px.png');

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    `${JSON.stringify(
      {
        version: 'generated-v4',
        generatedAt: new Date().toISOString(),
        intent:
          'Rounded hexagonal hexahedron crystal level badges; improved over v2 by removing laurel/medal spikes and over v3 by avoiding object icons.',
        sourceAtlases: ranges.map((range) =>
          path.relative(root, path.join(srcDir, range.file)).replaceAll(path.sep, '/'),
        ),
        levels,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Generated ${levels.length} level avatars in ${path.relative(root, outDir)}`);
  console.log(`QA sheets: ${path.join('qa-artifacts', 'level-avatars-generated-v4-96px.png')}, ${path.join('qa-artifacts', 'level-avatars-generated-v4-44px.png')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
