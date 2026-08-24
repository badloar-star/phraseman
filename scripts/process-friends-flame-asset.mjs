import { copyFile, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { processHomeThemeAsset } from './process-home-theme-asset.mjs';

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseMatte(value) {
  const channels = String(value ?? '128,128,128').split(',').map((channel) => channel.trim());
  if (channels.length !== 3 || channels.some((channel) => !/^\d+$/.test(channel))) {
    throw new Error('Expected --matte R,G,B with three integer channels from 0 to 255');
  }
  const numericChannels = channels.map(Number);
  if (numericChannels.some((channel) => channel < 0 || channel > 255)) {
    throw new Error('Expected --matte R,G,B with three integer channels from 0 to 255');
  }
  return numericChannels;
}

async function alphaBounds(output) {
  const { data, info } = await sharp(await readFile(output)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0) throw new Error('12% safe-margin gate failed: empty foreground');
  return { ...info, minX, minY, maxX, maxY };
}

async function assertFlameSafeMargin(output) {
  const bounds = await alphaBounds(output);
  const marginX = Math.ceil(bounds.width * 0.12);
  const marginY = Math.ceil(bounds.height * 0.12);
  const maxAllowedX = bounds.width - 1 - marginX;
  const maxAllowedY = bounds.height - 1 - marginY;
  if (bounds.minX < marginX || bounds.minY < marginY || bounds.maxX > maxAllowedX || bounds.maxY > maxAllowedY) {
    throw new Error(
      `12% safe-margin gate failed: bounds ${bounds.minX},${bounds.minY}-${bounds.maxX},${bounds.maxY}; `
      + `required x >= ${marginX}, y >= ${marginY}, x <= ${maxAllowedX}, y <= ${maxAllowedY}`,
    );
  }
}

async function normalizeFlameCandidate(cutoutOutput, normalizedOutput) {
  await sharp(await readFile(cutoutOutput))
    .ensureAlpha()
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 76, alphaQuality: 90, effort: 5 })
    .toFile(normalizedOutput);
}

function processInIsolatedProcess(options) {
  if (typeof processHomeThemeAsset !== 'function') throw new Error('Home theme processor is unavailable');
  execFileSync(process.execPath, [
    fileURLToPath(new URL('./process-home-theme-asset.mjs', import.meta.url)),
    '--input', options.input,
    '--output', options.output,
    '--matte', options.matte.join(','),
  ], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
}

function testOperationId() {
  const value = process.env.PHRASEMAN_FRIENDS_FLAME_TEST_OPERATION_ID;
  return process.env.NODE_ENV === 'test' && /^[A-Za-z0-9-]+$/.test(value ?? '') ? value : undefined;
}

function shouldSimulateAtomicRenameFailure(operationId) {
  return process.env.NODE_ENV === 'test'
    && process.env.PHRASEMAN_FRIENDS_FLAME_TEST_FAIL_PUBLISH === '1'
    && operationId === testOperationId();
}

async function publishValidatedAsset({ processedOutput, pendingOutput, output, operationId }) {
  await copyFile(processedOutput, pendingOutput);
  if (shouldSimulateAtomicRenameFailure(operationId)) {
    throw new Error('simulated atomic rename failure before publication');
  }
  await rename(pendingOutput, output);
}

async function cleanupTemporaryFiles(paths) {
  const results = await Promise.allSettled(paths.map((path) => rm(path, {
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  })));
  return results.flatMap((result) => result.status === 'rejected' ? [result.reason] : []);
}

export async function processFriendsFlameAsset({ input, output, matte = [128, 128, 128] }) {
  const processingDirectory = resolve('.codex-tmp/friends-shared-flame/processed');
  const operationId = testOperationId() ?? `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const cutoutOutput = join(processingDirectory, `friends-flame-${operationId}.png`);
  const normalizedOutput = join(processingDirectory, `friends-flame-${operationId}.webp`);
  const pendingOutput = join(dirname(resolve(output)), `.${basename(output)}.${operationId}.pending`);
  let primaryError;

  try {
    await mkdir(processingDirectory, { recursive: true });
    await processInIsolatedProcess({ input, output: cutoutOutput, matte });
    await normalizeFlameCandidate(cutoutOutput, normalizedOutput);
    await assertFlameSafeMargin(normalizedOutput);

    await mkdir(dirname(resolve(output)), { recursive: true });
    await publishValidatedAsset({ processedOutput: normalizedOutput, pendingOutput, output, operationId });
  } catch (error) {
    primaryError = error;
  } finally {
    const cleanupErrors = await cleanupTemporaryFiles([cutoutOutput, normalizedOutput, pendingOutput]);
    if (primaryError && cleanupErrors.length) {
      throw new AggregateError([primaryError, ...cleanupErrors], 'Asset processing failed and temporary cleanup also failed');
    }
    if (primaryError) throw primaryError;
    if (cleanupErrors.length === 1) throw cleanupErrors[0];
    if (cleanupErrors.length > 1) throw new AggregateError(cleanupErrors, 'Temporary asset cleanup failed');
  }
}

async function main() {
  const input = readArg('--input');
  const output = readArg('--output');
  if (!input || !output) {
    throw new Error('Usage: node scripts/process-friends-flame-asset.mjs --input <path> --output <path> [--matte 128,128,128]');
  }
  await processFriendsFlameAsset({ input, output, matte: parseMatte(readArg('--matte')) });
  process.stdout.write(`processed ${basename(output)} with 12% safe margin\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main();
}
