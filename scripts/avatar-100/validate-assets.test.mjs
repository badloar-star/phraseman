import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

import { checkDirectory, checkFile } from './validate-portrait-assets.mjs';

function circle(fill, radius) {
  return Buffer.from(`<svg width="512" height="512"><circle cx="256" cy="256" r="${radius}" fill="${fill}"/></svg>`);
}

test('accepts independently generated dark and light variants with different alpha masks', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-independent-pair-'));
  await sharp(circle('#30343b', 120)).webp().toFile(path.join(dir, 'custom-idea-64-black.webp'));
  await sharp(circle('#ece7dc', 96)).webp().toFile(path.join(dir, 'custom-idea-64-white.webp'));

  const report = await checkDirectory(dir);

  assert.equal(report.rejected, 0);
});

test('rejects byte-identical dark and light variants', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-identical-pair-'));
  const image = await sharp(circle('#828282', 110)).webp().toBuffer();
  fs.writeFileSync(path.join(dir, 'custom-idea-64-black.webp'), image);
  fs.writeFileSync(path.join(dir, 'custom-idea-64-white.webp'), image);

  const report = await checkDirectory(dir);

  assert.ok(report.rejected > 0);
  assert.ok(report.results.some(({ errors }) => errors.some((error) => error.includes('independent'))));
});

test('allows upper portrait overflow but still rejects lower-frame spill', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-overlay-validation-'));
  const upperPath = path.join(dir, 'custom-idea-64-black.webp');
  const lowerPath = path.join(dir, 'custom-idea-64-white.webp');
  const upper = Buffer.from(`<svg width="512" height="512">
    <path fill="#30343b" d="M150 170 L80 40 L200 100 L256 40 L312 100 L432 40 L362 170 L340 370 Q256 410 172 370 Z"/>
  </svg>`);
  const lower = Buffer.from(`<svg width="512" height="512">
    <circle cx="256" cy="470" r="90" fill="#ece7dc"/>
  </svg>`);
  await sharp(upper).webp().toFile(upperPath);
  await sharp(lower).webp().toFile(lowerPath);

  const upperResult = await checkFile(upperPath);
  const lowerResult = await checkFile(lowerPath);

  assert.equal(upperResult.errors.some((error) => error.includes('lower hex frame')), false);
  assert.equal(lowerResult.errors.some((error) => error.includes('lower hex frame')), true);
});
