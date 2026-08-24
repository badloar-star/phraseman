import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const MIN_CANVAS_SIZE = 1024;
const MAX_CANVAS_SIZE = 1400;
const QA_SIZES = Object.freeze([300, 118]);
const QA_BACKGROUNDS = Object.freeze({
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  blue: { r: 0, g: 87, b: 255 },
  app: { r: 11, g: 16, b: 24 },
});

function alphaAt(data, width, channels, x, y) {
  return data[(y * width + x) * channels + 3];
}

export async function validateRewardSource(sourcePath) {
  const metadata = await sharp(sourcePath).metadata();
  if (
    metadata.width !== metadata.height
    || metadata.width < MIN_CANVAS_SIZE
    || metadata.width > MAX_CANVAS_SIZE
  ) {
    throw new Error('reward_asset_size_invalid');
  }
  if (metadata.channels !== 4 || metadata.hasAlpha !== true) {
    throw new Error('reward_asset_alpha_required');
  }

  const { data, info } = await sharp(sourcePath).raw().toBuffer({ resolveWithObject: true });
  const corners = [
    alphaAt(data, info.width, info.channels, 0, 0),
    alphaAt(data, info.width, info.channels, info.width - 1, 0),
    alphaAt(data, info.width, info.channels, 0, info.height - 1),
    alphaAt(data, info.width, info.channels, info.width - 1, info.height - 1),
  ];
  if (corners.some((alpha) => alpha !== 0)) {
    throw new Error('reward_asset_corner_not_transparent');
  }

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (alphaAt(data, info.width, info.channels, x, y) === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0 || maxY < 0) throw new Error('reward_asset_empty');
  if (minX === 0 || minY === 0 || maxX === info.width - 1 || maxY === info.height - 1) {
    throw new Error('reward_asset_bounds_touch_canvas');
  }

  return {
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    bounds: { minX, minY, maxX, maxY },
  };
}

export async function createRewardQa({ id, sourcePath, qaDir }) {
  await mkdir(qaDir, { recursive: true });
  let qaCount = 0;
  for (const size of QA_SIZES) {
    const overlay = await sharp(sourcePath)
      .resize(size, size, { fit: 'fill' })
      .png()
      .toBuffer();
    for (const [name, background] of Object.entries(QA_BACKGROUNDS)) {
      await sharp({ create: { width: size, height: size, channels: 3, background } })
        .composite([{ input: overlay, left: 0, top: 0 }])
        .png()
        .toFile(join(qaDir, `${id}-${name}-${size}.png`));
      qaCount += 1;
    }
  }
  return qaCount;
}

function readFlag(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] ?? '').trim() : '';
}

async function main() {
  const id = readFlag(process.argv.slice(2), '--id');
  const sourcePath = resolve(readFlag(process.argv.slice(2), '--source'));
  const qaDirInput = readFlag(process.argv.slice(2), '--qa-dir');
  if (!/^[a-z0-9_]+$/.test(id) || !sourcePath) throw new Error('reward_asset_arguments_invalid');
  const qaDir = qaDirInput
    ? resolve(qaDirInput)
    : resolve('.codex-tmp', 'level-spin-rewards', 'qa', id);
  await mkdir(dirname(qaDir), { recursive: true });
  const validation = await validateRewardSource(sourcePath);
  const qaCount = await createRewardQa({ id, sourcePath, qaDir });
  process.stdout.write(`${JSON.stringify({ id, ...validation, qaCount, qaDir })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
