import { mkdir } from 'node:fs/promises';
import { extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseMatte(value) {
  const channels = String(value ?? '128,128,128')
    .split(',')
    .map((channel) => Number.parseInt(channel.trim(), 10));
  if (channels.length !== 3 || channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    throw new Error('Expected --matte R,G,B with channels from 0 to 255');
  }
  return channels;
}

const MATTE_MATCH_TOLERANCE = 28;
const DEFINITE_FOREGROUND_DISTANCE = 48;

function assertNeutralMatte(matte) {
  if (Math.max(...matte) - Math.min(...matte) > 16) {
    throw new Error(`neutral-matte gate failed: chromatic matte ${matte.join(',')} can contaminate shadows and edges`);
  }
}

function maxColorDistance(data, offset, color) {
  return Math.max(
    Math.abs(data[offset] - color[0]),
    Math.abs(data[offset + 1] - color[1]),
    Math.abs(data[offset + 2] - color[2]),
  );
}

function isMatteBackgroundCandidate(data, offset, matte) {
  return maxColorDistance(data, offset, matte) <= MATTE_MATCH_TOLERANCE;
}

function assertMatteBorderMatches(data, width, height, channels, matte) {
  let borderPixels = 0;
  let matchingPixels = 0;
  const visit = (x, y) => {
    borderPixels += 1;
    if (isMatteBackgroundCandidate(data, (y * width + x) * channels, matte)) matchingPixels += 1;
  };

  for (let x = 0; x < width; x += 1) {
    visit(x, 0);
    if (height > 1) visit(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    visit(0, y);
    if (width > 1) visit(width - 1, y);
  }

  const ratio = matchingPixels / Math.max(1, borderPixels);
  if (ratio < 0.9) {
    throw new Error(`matte-background gate failed: only ${(ratio * 100).toFixed(1)}% of border pixels match matte ${matte.join(',')}`);
  }
}

function connectedMatteBackground(data, width, height, channels, matte) {
  const pixelCount = width * height;
  const background = new Uint8Array(pixelCount);
  const queued = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (queued[index]) return;
    queued[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const offset = index * channels;
    if (!isMatteBackgroundCandidate(data, offset, matte)) continue;
    background[index] = 1;

    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  return background;
}

function assertForegroundPreserved(sourceData, alphaData, width, height, sourceChannels, alphaChannels, matte) {
  let definiteForegroundPixels = 0;
  let removedForegroundPixels = 0;

  for (let index = 0; index < width * height; index += 1) {
    const sourceOffset = index * sourceChannels;
    if (maxColorDistance(sourceData, sourceOffset, matte) < DEFINITE_FOREGROUND_DISTANCE) continue;
    definiteForegroundPixels += 1;
    if (alphaData[index * alphaChannels + 3] <= 8) removedForegroundPixels += 1;
  }

  const allowedRemoved = Math.max(12, Math.floor(definiteForegroundPixels * 0.001));
  if (removedForegroundPixels > allowedRemoved) {
    throw new Error(
      `foreground-preservation gate failed: ${removedForegroundPixels} definite foreground pixels became transparent (allowed ${allowedRemoved})`,
    );
  }
}

function assertBackgroundRemoved(sourceData, alphaData, width, height, sourceChannels, alphaChannels, matte) {
  let definiteMattePixels = 0;
  let retainedMattePixels = 0;
  for (let index = 0; index < width * height; index += 1) {
    const sourceOffset = index * sourceChannels;
    if (maxColorDistance(sourceData, sourceOffset, matte) > 12) continue;
    definiteMattePixels += 1;
    if (alphaData[index * alphaChannels + 3] >= 192) retainedMattePixels += 1;
  }

  const allowedRetained = Math.max(12, Math.floor(definiteMattePixels * 0.005));
  if (retainedMattePixels > allowedRetained) {
    throw new Error(
      `background-removal gate failed: ${retainedMattePixels} definite matte pixels stayed visible (allowed ${allowedRetained})`,
    );
  }
}

function assertSafeMargin(alphaData, width, height, alphaChannels) {
  const margin = Math.max(2, Math.ceil(Math.min(width, height) * 0.01));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= margin && x < width - margin && y >= margin && y < height - margin) continue;
      if (alphaData[(y * width + x) * alphaChannels + 3] > 8) {
        throw new Error(`safe-margin gate failed: visible foreground enters the outer ${margin}px canvas margin at ${x},${y}`);
      }
    }
  }
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export async function processHomeThemeAsset({ input, output, matte = [128, 128, 128] }) {
  assertNeutralMatte(matte);
  const source = sharp(input).removeAlpha();
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  assertMatteBorderMatches(data, width, height, channels, matte);
  const background = connectedMatteBackground(data, width, height, channels, matte);
  const binaryMask = Buffer.alloc(width * height);

  for (let index = 0; index < binaryMask.length; index += 1) {
    binaryMask[index] = background[index] ? 0 : 255;
  }

  const feathered = await sharp(binaryMask, {
    raw: { width, height, channels: 1 },
  })
    .blur(0.75)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const featheredMask = feathered.data;
  const maskChannels = feathered.info.channels;

  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const sourceOffset = index * channels;
    const outputOffset = index * 4;
    const alphaByte = featheredMask[index * maskChannels];
    const alpha = alphaByte / 255;

    if (alpha <= 0.01) {
      rgba[outputOffset] = 0;
      rgba[outputOffset + 1] = 0;
      rgba[outputOffset + 2] = 0;
      rgba[outputOffset + 3] = 0;
      continue;
    }

    for (let channel = 0; channel < 3; channel += 1) {
      const observed = data[sourceOffset + channel];
      const recovered = (observed - matte[channel] * (1 - alpha)) / alpha;
      rgba[outputOffset + channel] = clampChannel(recovered);
    }
    rgba[outputOffset + 3] = alphaByte;
  }

  await mkdir(dirname(resolve(output)), { recursive: true });
  const pipeline = sharp(rgba, { raw: { width, height, channels: 4 } });
  if (extname(output).toLowerCase() === '.webp') {
    await pipeline.webp({ quality: 74, alphaQuality: 90, effort: 5 }).toFile(output);
  } else {
    await pipeline.png({ compressionLevel: 9 }).toFile(output);
  }

  await validateHomeThemeAlpha({ input, output, matte });
}

export async function validateHomeThemeAlpha({ input, output, matte = [128, 128, 128] }) {
  assertNeutralMatte(matte);
  const sourceResult = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaResult = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (sourceResult.info.width !== alphaResult.info.width || sourceResult.info.height !== alphaResult.info.height) {
    throw new Error('foreground-preservation gate failed: source and RGBA dimensions differ');
  }
  assertMatteBorderMatches(
    sourceResult.data,
    sourceResult.info.width,
    sourceResult.info.height,
    sourceResult.info.channels,
    matte,
  );
  assertForegroundPreserved(
    sourceResult.data,
    alphaResult.data,
    sourceResult.info.width,
    sourceResult.info.height,
    sourceResult.info.channels,
    alphaResult.info.channels,
    matte,
  );
  assertBackgroundRemoved(
    sourceResult.data,
    alphaResult.data,
    sourceResult.info.width,
    sourceResult.info.height,
    sourceResult.info.channels,
    alphaResult.info.channels,
    matte,
  );
  assertSafeMargin(
    alphaResult.data,
    alphaResult.info.width,
    alphaResult.info.height,
    alphaResult.info.channels,
  );
}

async function main() {
  const input = readArg('--input');
  const output = readArg('--output');
  if (!input || !output) {
    throw new Error('Usage: node scripts/process-home-theme-asset.mjs --input <path> --output <path> [--matte 128,128,128] [--check-only]');
  }
  const options = { input, output, matte: parseMatte(readArg('--matte')) };
  if (process.argv.includes('--check-only')) {
    await validateHomeThemeAlpha(options);
    process.stdout.write(`validated ${output}\n`);
  } else {
    await processHomeThemeAsset(options);
    process.stdout.write(`processed ${output}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main();
}
