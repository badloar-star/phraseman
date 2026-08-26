import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

import {
  cleanMatteArtifacts,
  normalizePortraitOverlay,
  removeBorderBackground,
} from './normalize-portrait-overlay.mjs';

const WIDTH = 96;
const HEIGHT = 96;

function makeNestedFixture({ background, foreground }) {
  const data = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4;
      const insideOutline = x >= 26 && x <= 69 && y >= 26 && y <= 69;
      const insideSubject = x >= 31 && x <= 64 && y >= 31 && y <= 64;
      const color = insideSubject ? foreground : insideOutline ? [24, 28, 35, 255] : background;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }

  return data;
}

function alphaAt(data, x, y) {
  return data[(y * WIDTH + x) * 4 + 3];
}

test('preserves magenta foreground disconnected from a magenta border background', () => {
  const data = makeNestedFixture({
    background: [255, 0, 255, 255],
    foreground: [210, 40, 205, 255],
  });

  const output = removeBorderBackground(data, WIDTH, HEIGHT, { mode: 'legacy-neutral' });

  assert.equal(alphaAt(output, 0, 0), 0);
  assert.equal(alphaAt(output, 48, 48), 255);
});

test('preserves pale-neutral foreground disconnected from a pale border background', () => {
  const data = makeNestedFixture({
    background: [242, 241, 239, 255],
    foreground: [246, 244, 240, 255],
  });

  const output = removeBorderBackground(data, WIDTH, HEIGHT, { mode: 'legacy-neutral' });

  assert.equal(alphaAt(output, 0, 0), 0);
  assert.equal(alphaAt(output, 48, 48), 255);
});

test('removes a saturated edge matte without eroding pale foreground anatomy', () => {
  const data = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4;
      const isSubject = x >= 26 && x <= 69 && y >= 18 && y <= 77;
      const color = isSubject ? [247, 244, 238, 255] : [236, 0, 210, 255];
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }

  const output = removeBorderBackground(data, WIDTH, HEIGHT, { mode: 'saturated-matte' });

  assert.equal(alphaAt(output, 0, 0), 0);
  assert.equal(alphaAt(output, 26, 48), 255);
  assert.equal(alphaAt(output, 48, 48), 255);
});

test('removes pale chroma spill connected to the matte edge', () => {
  const data = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4;
      const isSubject = x >= 27 && x <= 68 && y >= 19 && y <= 76;
      const isSpill = x >= 26 && x <= 69 && y >= 18 && y <= 77;
      const color = isSubject
        ? [247, 244, 238, 255]
        : isSpill ? [120, 246, 170, 255] : [0, 245, 106, 255];
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }

  const output = removeBorderBackground(data, WIDTH, HEIGHT, { mode: 'saturated-matte' });

  assert.equal(alphaAt(output, 26, 48), 0);
  assert.equal(output[(48 * WIDTH + 26) * 4], 0);
  assert.equal(alphaAt(output, 27, 48), 255);
});

test('removes isolated chroma spill enclosed by pale anatomy', () => {
  const data = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4;
      const isSubject = x >= 26 && x <= 69 && y >= 18 && y <= 77;
      const color = isSubject ? [247, 244, 238, 255] : [0, 245, 106, 255];
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }
  const spillOffset = (48 * WIDTH + 48) * 4;
  data.set([120, 246, 170, 255], spillOffset);

  const output = removeBorderBackground(data, WIDTH, HEIGHT, { mode: 'saturated-matte' });

  assert.equal(alphaAt(output, 48, 48), 0);
  assert.equal(alphaAt(output, 47, 48), 255);
});

test('neutralizes low-saturation matte tint without changing foreground alpha', () => {
  const data = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4;
      const isSubject = x >= 26 && x <= 69 && y >= 18 && y <= 77;
      const color = isSubject ? [247, 244, 238, 255] : [0, 245, 106, 255];
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }
  const tintOffset = (48 * WIDTH + 48) * 4;
  data.set([240, 250, 226, 180], tintOffset);

  const output = removeBorderBackground(data, WIDTH, HEIGHT, { mode: 'saturated-matte' });

  assert.equal(alphaAt(output, 48, 48), 180);
  assert.ok(output[tintOffset + 1] <= Math.max(output[tintOffset], output[tintOffset + 2]));
});

test('cleans matte tint reintroduced by final resize', () => {
  const data = Buffer.from([
    167, 215, 158, 30,
    134, 255, 134, 19,
    247, 244, 238, 255,
  ]);

  cleanMatteArtifacts(data, { r: 0, g: 245, b: 106 });

  assert.equal(data[3], 30);
  assert.ok(data[1] <= Math.max(data[0], data[2]));
  assert.equal(data[7], 19);
  assert.ok(data[5] <= Math.max(data[4], data[6]));
  assert.deepEqual([...data.subarray(8)], [247, 244, 238, 255]);
});

test('removes saturated green matte tint from a semitransparent fur fringe', () => {
  const data = Buffer.from([140, 181, 71, 128]);

  cleanMatteArtifacts(data, { r: 0, g: 245, b: 106 });

  assert.equal(data[3], 128);
  assert.ok(data[1] <= Math.max(data[0], data[2]));
});

test('applies the final alpha floor only to barely visible fringe pixels', () => {
  const data = Buffer.from([
    140, 255, 140, 64,
    247, 244, 238, 65,
  ]);

  cleanMatteArtifacts(data, { r: 0, g: 245, b: 106 }, { alphaFloor: 64 });

  assert.deepEqual([...data.subarray(0, 4)], [0, 0, 0, 0]);
  assert.equal(data[7], 65);
});

test('keeps an already transparent background transparent', () => {
  const data = makeNestedFixture({
    background: [0, 0, 0, 0],
    foreground: [80, 160, 210, 255],
  });

  const output = removeBorderBackground(data, WIDTH, HEIGHT);

  assert.equal(alphaAt(output, 0, 0), 0);
  assert.equal(alphaAt(output, 48, 48), 255);
});

test('portrait overlay keeps upper silhouette over the frame while lower torso stays inside', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-portrait-overlay-'));
  const inputPath = path.join(dir, 'input.png');
  const outputPath = path.join(dir, 'output.png');
  const fixture = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect width="512" height="512" fill="#FF00D4"/>
    <path fill="#173A62" d="M150 170 L80 40 L200 100 L256 40 L312 100 L432 40 L362 170 L340 370 Q256 410 172 370 Z"/>
  </svg>`);
  await sharp(fixture).png().toFile(inputPath);

  await normalizePortraitOverlay({
    inputPath,
    outputPath,
    backgroundMode: 'saturated-matte',
  });

  const { data, info } = await sharp(outputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const safeHex = [[256, 37], [458, 135], [458, 377], [256, 475], [54, 377], [54, 135]];
  const inPoly = (x, y) => {
    let inside = false;
    for (let index = 0, previous = safeHex.length - 1; index < safeHex.length; previous = index, index += 1) {
      const [xi, yi] = safeHex[index];
      const [xj, yj] = safeHex[previous];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  let upperOutside = 0;
  let lowerOutside = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] <= 10 || inPoly(x + 0.5, y + 0.5)) continue;
      if (y < 256) upperOutside += 1;
      else lowerOutside += 1;
    }
  }

  assert.ok(upperOutside > 0, 'expected ears to overlap the upper hex frame');
  assert.equal(lowerOutside, 0, 'lower torso must remain inside the hex frame');
});
