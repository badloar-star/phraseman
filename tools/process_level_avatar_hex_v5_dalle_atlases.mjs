import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const version = 'generated-v5-dalle';
const srcDir = path.join(root, 'tmp', 'avatar-generation-v5-dalle', 'source-atlases');
const outDir = path.join(root, 'assets', 'images', 'levels', version);
const tmpDir = path.join(root, 'tmp', 'avatar-generation-v5-dalle', 'processed-png');
const qaDir = path.join(root, 'qa-artifacts');
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const finalCanvasSize = 512;
const normalizedArtBoxSize = 432;

const ranges = [
  { file: 'levels-1-10.png', start: 1, end: 10 },
  { file: 'levels-11-20.png', start: 11, end: 20 },
  { file: 'levels-21-30.png', start: 21, end: 30 },
  { file: 'levels-31-40.png', start: 31, end: 40 },
  { file: 'levels-41-50.png', start: 41, end: 50 },
  { file: 'levels-51-60.png', start: 51, end: 60 },
];

function ensureDirs() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(qaDir, { recursive: true });
}

function isForeground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (luminance < 28) return 0;
  if (luminance < 90 && saturation < 32) return 0;
  if (luminance < 70 && saturation < 44) return 0;
  if (luminance < 42 && saturation < 46) return 0;

  const lightAlpha = Math.max(0, Math.min(255, (luminance - 30) * 5.2));
  const colorAlpha = Math.max(0, Math.min(255, (saturation - 18) * 5.4));
  return Math.max(lightAlpha, colorAlpha);
}

async function extractBadge(input) {
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
      const sourceAlpha = data[idx + 3];
      const fgAlpha = Math.min(sourceAlpha, isForeground(r, g, b));

      data[idx + 3] = fgAlpha;
      if (fgAlpha > 14) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error('Could not find the badge foreground in atlas cell.');
  }

  const pad = Math.max(16, Math.round(Math.min(info.width, info.height) * 0.045));
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

async function readAlphaBounds(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error('Could not find visible pixels in normalized badge.');
  }

  return {
    centerX: (minX + maxX + 1) / 2,
    centerY: (minY + maxY + 1) / 2,
  };
}

async function processLevel(atlasPath, level, row, col, cellWidth, cellHeight) {
  const left = Math.round(col * cellWidth);
  const top = Math.round(row * cellHeight);
  const width = Math.round((col + 1) * cellWidth) - left;
  const height = Math.round((row + 1) * cellHeight) - top;
  const cell = sharp(atlasPath).extract({ left, top, width, height });
  const badge = await extractBadge(cell);
  const badgePng = await badge
    .resize({ width: normalizedArtBoxSize, height: normalizedArtBoxSize, fit: 'contain', background: transparent })
    .png()
    .toBuffer();
  const bounds = await readAlphaBounds(badgePng);
  const badgeLeft = Math.round(finalCanvasSize / 2 - bounds.centerX);
  const badgeTop = Math.round(finalCanvasSize / 2 - bounds.centerY);

  const finalPng = await sharp({
    create: {
      width: finalCanvasSize,
      height: finalCanvasSize,
      channels: 4,
      background: transparent,
    },
  })
    .composite([{ input: badgePng, left: badgeLeft, top: badgeTop }])
    .png()
    .toBuffer();

  const pngPath = path.join(tmpDir, `${level}.png`);
  const webpPath = path.join(outDir, `${level}.webp`);
  await sharp(finalPng).png().toFile(pngPath);
  await sharp(finalPng).webp({ quality: 92, effort: 5, smartSubsample: true }).toFile(webpPath);

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

async function createMilestoneSheet() {
  const levels = [1, 10, 20, 30, 40, 50, 60];
  const size = 150;
  const gap = 22;
  const pad = 18;
  const width = pad * 2 + levels.length * size + (levels.length - 1) * gap;
  const height = pad * 2 + size;
  const composites = [];

  for (const [index, level] of levels.entries()) {
    const input = await sharp(path.join(outDir, `${level}.webp`))
      .resize(size, size, { fit: 'contain', background: transparent })
      .png()
      .toBuffer();
    composites.push({
      input,
      left: pad + index * (size + gap),
      top: pad,
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
    .toFile(path.join(qaDir, 'level-avatars-generated-v5-dalle-milestones.png'));
}

async function main() {
  ensureDirs();
  const missing = ranges.map((range) => path.join(srcDir, range.file)).filter((file) => !fs.existsSync(file));
  if (missing.length > 0) throw new Error(`Missing source atlases:\n${missing.join('\n')}`);

  const levels = [];
  for (const range of ranges) {
    const atlasPath = path.join(srcDir, range.file);
    const meta = await sharp(atlasPath).metadata();
    if (!meta.width || !meta.height) throw new Error(`Could not read atlas metadata: ${atlasPath}`);
    const cellWidth = meta.width / 5;
    const cellHeight = meta.height / 2;

    for (let level = range.start; level <= range.end; level += 1) {
      const offset = level - range.start;
      levels.push(await processLevel(atlasPath, level, Math.floor(offset / 5), offset % 5, cellWidth, cellHeight));
    }
  }

  await createContactSheet(96, 'level-avatars-generated-v5-dalle-96px.png');
  await createContactSheet(44, 'level-avatars-generated-v5-dalle-44px.png');
  await createMilestoneSheet();

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    `${JSON.stringify(
      {
        version,
        generatedAt: new Date().toISOString(),
        intent:
          'DALL-E selected style level avatars: faceted regular hex crystal badges with generated embedded readable numbers, decade hue progression, and gift/shard-scale 432px normalized art box.',
        finalCanvasSize,
        normalizedArtBoxSize,
        sourceAtlases: ranges.map((range) => path.relative(root, path.join(srcDir, range.file)).replaceAll(path.sep, '/')),
        levels,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Generated ${levels.length} DALL-E level avatars in ${path.relative(root, outDir)}`);
  console.log('QA sheets: qa-artifacts/level-avatars-generated-v5-dalle-96px.png, qa-artifacts/level-avatars-generated-v5-dalle-44px.png, qa-artifacts/level-avatars-generated-v5-dalle-milestones.png');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
