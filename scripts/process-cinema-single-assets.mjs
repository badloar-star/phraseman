import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
// зачем: черновики генерации вынесены из assets/ в asset_sources/.
const SOURCE_ROOT = path.join(ROOT, 'asset_sources/cinema_dalle_sources/singles/v1');
const AUDIT_PATH = path.join(ROOT, '.codex-tmp/cinema-single-assets-audit.json');
const PREVIEW_PATH = path.join(ROOT, '.codex-tmp/cinema-single-assets-preview.png');

const STRICT = process.argv.includes('--strict');
const CINEMA_THEMES = ['midnight', 'ember', 'aurora', 'volt'];
const THEME_BACKGROUND = {
  midnight: 'orange',
  ember: 'cyan',
  aurora: 'magenta',
  volt: 'green',
};

const HOME_TARGETS = [
  ['lessons', 384, { width: 326, height: 326, centerX: 192, centerY: 192 }],
  ['cards', 384, { width: 298, height: 326, centerX: 192, centerY: 192 }],
  ['daily-tasks', 384, { width: 302, height: 326, centerX: 192, centerY: 192 }],
  ['league', 384, { width: 240, height: 326, centerX: 191, centerY: 192 }],
  ['diagnostic-test', 384, { width: 281, height: 326, centerX: 192, centerY: 192 }],
  ['practice', 384, { width: 304, height: 326, centerX: 192, centerY: 192 }],
  ['exam', 384, { width: 302, height: 326, centerX: 192, centerY: 192 }],
  ['shop', 384, { width: 302, height: 326, centerX: 192, centerY: 192 }],
  ['hero-map', 384, { width: 302, height: 326, centerX: 192, centerY: 192 }],
];

const TRAINER_TARGETS = [
  ['trainer-phrases', 'assets/images/trainer_theme_icons/{theme}/phrases.webp', 256, 0.78],
  ['trainer-words', 'assets/images/trainer_theme_icons/{theme}/words.webp', 256, 0.78],
  ['trainer-analytics', 'assets/images/trainer_theme_icons/{theme}/analytics.webp', 256, 0.78],
];

const REWARD_TARGETS = [
  ['league-chest', 'assets/images/league_bonus/{theme}-chest.webp', 512, 0.72],
  ['streak-fire', 'assets/images/streak_icons/{theme}/streak-fire-{theme}-100.webp', 80, 0.84],
  ['streak-freeze', 'assets/images/streak_icons/{theme}/streak-freeze-{theme}.webp', 80, 0.84],
  ['shard-single', 'assets/images/shards/{theme}-single.webp', 256, 0.72],
  ['shard-80', 'assets/images/shards/{theme}-80.webp', 256, 0.72],
  ['shard-180', 'assets/images/shards/{theme}-180.webp', 256, 0.72],
  ['shard-420', 'assets/images/shards/{theme}-420.webp', 256, 0.72],
];

function withTheme(template, theme) {
  return template.replaceAll('{theme}', theme);
}

function buildTargets() {
  const targets = [];
  for (const theme of CINEMA_THEMES) {
    for (const [key, size, fitBox] of HOME_TARGETS) {
      targets.push({
        theme,
        key: `home-${key}`,
        source: `${theme}/home-${key}.png`,
        output: `assets/images/home_menu/${theme}/home-${theme}-${key}.webp`,
        size,
        fitBox,
        background: THEME_BACKGROUND[theme],
      });
    }

    for (const [key, output, size, fill] of [
      ...TRAINER_TARGETS,
      ...REWARD_TARGETS,
    ]) {
      targets.push({
        theme,
        key,
        source: `${theme}/${key}.png`,
        output: withTheme(output, theme),
        size,
        fill,
        background: THEME_BACKGROUND[theme],
      });
    }
  }
  return targets;
}

function backgroundPixel(data, pixelIndex, kind) {
  const offset = pixelIndex * 4;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const a = data[offset + 3];
  if (a < 8) return true;

  if (kind === 'orange') {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return (
      r >= 185
      && g >= 35
      && g <= 155
      && b <= 70
      && r > g * 1.35
      && r > b * 3.0
      && max - min > 110
    );
  }

  if (kind === 'cyan') {
    return b >= 130 && g >= 145 && r <= 95 && g > r * 1.8 && b > r * 1.8;
  }

  if (kind === 'magenta') {
    return r >= 160 && b >= 120 && g <= 95 && r > g * 1.6 && b > g * 1.4;
  }

  if (kind === 'green') {
    return g >= 145 && r <= 100 && b <= 100 && g > r * 1.7 && g > b * 1.7;
  }

  throw new Error(`Unknown background classifier: ${kind}`);
}

function removeEdgeConnectedBackground(data, info, kind) {
  const total = info.width * info.height;
  const visited = new Uint8Array(total);
  const stack = [];

  for (let x = 0; x < info.width; x += 1) {
    stack.push(x);
    stack.push((info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    stack.push(y * info.width);
    stack.push(y * info.width + info.width - 1);
  }

  let removed = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null || visited[current]) continue;
    visited[current] = 1;
    if (!backgroundPixel(data, current, kind)) continue;

    const offset = current * 4;
    data[offset + 3] = 0;
    removed += 1;

    const x = current % info.width;
    const y = Math.floor(current / info.width);
    if (x > 0 && !visited[current - 1]) stack.push(current - 1);
    if (x < info.width - 1 && !visited[current + 1]) stack.push(current + 1);
    if (y > 0 && !visited[current - info.width]) stack.push(current - info.width);
    if (y < info.height - 1 && !visited[current + info.width]) stack.push(current + info.width);
  }

  return removed;
}

function alphaBBox(data, info, alphaThreshold = 12) {
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let pixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;
      pixels += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (pixels === 0) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pixels,
  };
}

async function matteSource(inputPath, background) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const removedPixels = removeEdgeConnectedBackground(data, info, background);
  const bbox = alphaBBox(data, info);
  if (!bbox) {
    throw new Error(`No visible icon pixels after matte: ${inputPath}`);
  }

  return {
    buffer: await sharp(data, { raw: info }).png().toBuffer(),
    info,
    bbox,
    removedPixels,
  };
}

async function renderTarget(target) {
  const inputPath = path.join(SOURCE_ROOT, target.source);
  const outputPath = path.join(ROOT, target.output);
  const tempOutputPath = `${outputPath}.tmp-${process.pid}-${Date.now()}.webp`;
  const source = await matteSource(inputPath, target.background);

  const cropBuffer = await sharp(source.buffer)
    .extract({
      left: source.bbox.minX,
      top: source.bbox.minY,
      width: source.bbox.width,
      height: source.bbox.height,
    })
    .png()
    .toBuffer();

  const maxContent = Math.round(target.size * target.fill);
  const fitWidth = target.fitBox?.width ?? maxContent;
  const fitHeight = target.fitBox?.height ?? maxContent;
  const scale = Math.min(fitWidth / source.bbox.width, fitHeight / source.bbox.height);
  const contentWidth = Math.max(1, Math.round(source.bbox.width * scale));
  const contentHeight = Math.max(1, Math.round(source.bbox.height * scale));
  const centerX = target.fitBox?.centerX ?? target.size / 2;
  const centerY = target.fitBox?.centerY ?? target.size / 2;
  const left = Math.round(centerX - contentWidth / 2);
  const top = Math.round(centerY - contentHeight / 2);
  const right = target.size - left - contentWidth;
  const bottom = target.size - top - contentHeight;

  if (Math.min(left, top, right, bottom) < Math.round(target.size * 0.06)) {
    throw new Error(
      `${target.theme}:${target.key} unsafe margins ${JSON.stringify({ left, top, right, bottom })}`,
    );
  }

  const resized = await sharp(cropBuffer)
    .resize(contentWidth, contentHeight, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp({
    create: {
      width: target.size,
      height: target.size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .webp({ quality: 95, effort: 6 })
    .toFile(tempOutputPath);

  const rendered = await sharp(tempOutputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const outBBox = alphaBBox(rendered.data, rendered.info);
  if (!outBBox) {
    await fs.rm(tempOutputPath, { force: true });
    throw new Error(`No visible pixels in output: ${outputPath}`);
  }
  await fs.rename(tempOutputPath, outputPath);
  const centerDelta = {
    x: (outBBox.minX + outBBox.maxX + 1) / 2 - target.size / 2,
    y: (outBBox.minY + outBBox.maxY + 1) / 2 - target.size / 2,
  };
  if (Math.abs(centerDelta.x) > 2 || Math.abs(centerDelta.y) > 2) {
    throw new Error(`${target.theme}:${target.key} off-center ${JSON.stringify(centerDelta)}`);
  }

  return {
    ...target,
    output: target.output,
    sourcePixels: source.info.width * source.info.height,
    removedPixels: source.removedPixels,
    sourceBBox: source.bbox,
    outputBBox: outBBox,
    outputMargins: {
      left: outBBox.minX,
      top: outBBox.minY,
      right: target.size - 1 - outBBox.maxX,
      bottom: target.size - 1 - outBBox.maxY,
    },
    centerDelta,
  };
}

async function makePreview(audits) {
  const cells = [];
  for (const audit of audits) {
    const sourcePath = path.join(SOURCE_ROOT, audit.source);
    const outputPath = path.join(ROOT, audit.output);
    cells.push(
      await sharp(sourcePath).resize(256, 256, { fit: 'contain' }).png().toBuffer(),
      await sharp(outputPath).resize(256, 256, { fit: 'contain' }).png().toBuffer(),
    );
  }

  if (cells.length === 0) return;
  await fs.mkdir(path.dirname(PREVIEW_PATH), { recursive: true });
  await sharp({
    create: {
      width: cells.length * 256,
      height: 256,
      channels: 4,
      background: { r: 20, g: 20, b: 24, alpha: 1 },
    },
  })
    .composite(cells.map((input, index) => ({ input, left: index * 256, top: 0 })))
    .png()
    .toFile(PREVIEW_PATH);
}

async function main() {
  const audits = [];
  const missing = [];
  for (const target of buildTargets()) {
    const inputPath = path.join(SOURCE_ROOT, target.source);
    const exists = await fs.access(inputPath).then(() => true, () => false);
    if (!exists) {
      missing.push(target.source);
      continue;
    }
    audits.push(await renderTarget(target));
  }

  if (STRICT && missing.length > 0) {
    throw new Error(`Missing ${missing.length} single source file(s):\n${missing.join('\n')}`);
  }

  await fs.mkdir(path.dirname(AUDIT_PATH), { recursive: true });
  await fs.writeFile(AUDIT_PATH, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    processed: audits.length,
    missing: missing.length,
    missingSources: missing,
    audits,
  }, null, 2)}\n`);
  await makePreview(audits);
  console.log(`Processed ${audits.length} single cinema asset(s).`);
  console.log(`Audit: ${path.relative(ROOT, AUDIT_PATH)}`);
  console.log(`Preview: ${path.relative(ROOT, PREVIEW_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
