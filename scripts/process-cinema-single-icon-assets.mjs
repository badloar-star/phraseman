import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'assets/images/cinema_single_icon_sources');

const THEME_KEYS = {
  midnight: [255, 106, 0],
  ember: [0, 229, 255],
  aurora: [255, 0, 51],
  volt: [0, 76, 255],
};

function targetFor(theme, id) {
  if (id.startsWith('home-')) {
    return path.join(ROOT, 'assets/images/home_menu', theme, `${id.replace('home-', `home-${theme}-`)}.webp`);
  }
  if (id === 'league-chest') {
    return path.join(ROOT, 'assets/images/league_bonus', `${theme}-chest.webp`);
  }
  throw new Error(`Unknown single icon target: ${theme}:${id}`);
}

function sizeFor(id) {
  if (id === 'league-chest') return 512;
  if (id.startsWith('home-')) return 384;
  return 256;
}

function scaleFor(id) {
  if (id === 'league-chest') return 0.72;
  return 0.76;
}

function distanceSq(r, g, b, key) {
  return (r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2;
}

async function removeSolidBackground(input, theme) {
  const key = THEME_KEYS[theme];
  if (!key) throw new Error(`No key color for theme ${theme}`);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  const visited = new Uint8Array(total);
  const stack = [];
  const threshold = 72 ** 2;

  for (let x = 0; x < info.width; x += 1) {
    stack.push(x, (info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    stack.push(y * info.width, y * info.width + info.width - 1);
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null || visited[current]) continue;
    visited[current] = 1;
    const offset = current * 4;
    if (data[offset + 3] === 0) continue;
    if (distanceSq(data[offset], data[offset + 1], data[offset + 2], key) > threshold) continue;

    data[offset + 3] = 0;
    const x = current % info.width;
    const y = Math.floor(current / info.width);
    const neighbors = [
      x > 0 ? current - 1 : -1,
      x < info.width - 1 ? current + 1 : -1,
      y > 0 ? current - info.width : -1,
      y < info.height - 1 ? current + info.width : -1,
    ];
    for (const next of neighbors) {
      if (next >= 0 && !visited[next]) stack.push(next);
    }
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

async function alphaBounds(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= 12) continue;
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    count,
    canvasWidth: info.width,
    canvasHeight: info.height,
  };
}

function assertFit(bounds, id) {
  const minEdgeGap = Math.min(
    bounds.left,
    bounds.top,
    bounds.canvasWidth - bounds.left - bounds.width,
    bounds.canvasHeight - bounds.top - bounds.height,
  );
  if (minEdgeGap < 6) {
    throw new Error(`${id}: visible object touches source edge (${minEdgeGap}px gap)`);
  }
  const coverage = bounds.count / (bounds.canvasWidth * bounds.canvasHeight);
  if (coverage < 0.08 || coverage > 0.74) {
    throw new Error(`${id}: suspicious source coverage ${coverage.toFixed(3)}`);
  }
}

async function processOne(theme, id) {
  const source = path.join(SOURCE_DIR, theme, `${id}.png`);
  const target = targetFor(theme, id);
  const sourceMeta = await sharp(source).metadata();
  if ((sourceMeta.width ?? 0) < 900 || (sourceMeta.height ?? 0) < 900) {
    throw new Error(`${id}: source too small ${sourceMeta.width}x${sourceMeta.height}`);
  }
  const transparent = await removeSolidBackground(source, theme);
  const bounds = await alphaBounds(transparent);
  if (!bounds) throw new Error(`${id}: no visible pixels after background removal`);
  assertFit(bounds, id);

  const size = sizeFor(id);
  const cropped = await sharp(transparent)
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
    .png()
    .toBuffer();
  const inner = await sharp(cropped)
    .resize(Math.round(size * scaleFor(id)), Math.round(size * scaleFor(id)), {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const innerMeta = await sharp(inner).metadata();

  await fs.mkdir(path.dirname(target), { recursive: true });
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{
      input: inner,
      left: Math.round((size - (innerMeta.width ?? size)) / 2),
      top: Math.round((size - (innerMeta.height ?? size)) / 2),
    }])
    .webp({ quality: 94, alphaQuality: 98, effort: 5 })
    .toFile(target);
}

const [theme, ...ids] = process.argv.slice(2);
if (!theme || ids.length === 0) {
  console.error('usage: node scripts/process-cinema-single-icon-assets.mjs <theme> <asset-id> [asset-id...]');
  process.exit(1);
}

for (const id of ids) {
  await processOne(theme, id);
  console.log(`processed ${theme}:${id}`);
}
