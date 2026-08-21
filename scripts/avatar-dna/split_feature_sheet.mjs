import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const fail = (reason) => { throw new Error(`avatar_feature_split_invalid: ${reason}`); };
const ID = /^[a-z][a-z0-9_.-]{1,79}$/;
const FILE = /^[a-z0-9][a-z0-9_.-]*\.png$/;
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const parseRect = (value, name) => {
  if (!Array.isArray(value) || value.length !== 4 || value.some((part) => typeof part !== 'number' || !Number.isFinite(part) || part < 0 || part > 1)) fail(name);
  const [x, y, width, height] = value;
  if (width <= 0 || height <= 0 || x + width > 1 || y + height > 1) fail(name);
  return [x, y, width, height];
};

const parseManifest = (value) => {
  if (!record(value) || value.splitVersion !== 1 || !Array.isArray(value.canvas) || value.canvas.length !== 2 || value.canvas.some((part) => !Number.isInteger(part) || part < 512) || !Array.isArray(value.features) || value.features.length === 0) fail('manifest');
  const ids = new Set(); const files = new Set();
  const features = value.features.map((feature) => {
    if (!record(feature) || !ID.test(feature.id) || ids.has(feature.id) || typeof feature.file !== 'string' || !FILE.test(feature.file) || files.has(feature.file)) fail('feature');
    ids.add(feature.id); files.add(feature.file);
    return { id: feature.id, file: feature.file, sourceRect: parseRect(feature.sourceRect, 'source rect'), targetBox: parseRect(feature.targetBox, 'target box') };
  });
  return { splitVersion: 1, canvas: value.canvas, features };
};

const pixelRect = ([x, y, width, height], canvasWidth, canvasHeight) => {
  const left = Math.floor(x * canvasWidth); const top = Math.floor(y * canvasHeight);
  const right = Math.ceil((x + width) * canvasWidth); const bottom = Math.ceil((y + height) * canvasHeight);
  return { left, top, width: right - left, height: bottom - top };
};

const assertVisible = async (input) => {
  const { channels } = await sharp(input).stats();
  const alpha = channels[3];
  if (!alpha || alpha.max === 0) fail('empty feature');
};

const clearInvisibleFringe = async (input) => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] > 3) continue;
    data[offset] = 0; data[offset + 1] = 0; data[offset + 2] = 0; data[offset + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

export async function splitFeatureSheet({ input, manifest, out }) {
  if (![input, manifest, out].every((value) => typeof value === 'string' && value.length > 0)) fail('arguments');
  const spec = parseManifest(JSON.parse(await readFile(path.resolve(manifest), 'utf8')));
  const inputPath = path.resolve(input); const outRoot = path.resolve(out);
  const metadata = await sharp(inputPath, { failOn: 'error' }).metadata();
  const [canvasWidth, canvasHeight] = spec.canvas;
  if (metadata.format !== 'png' || metadata.width !== canvasWidth || metadata.height !== canvasHeight || metadata.channels !== 4) fail('source');
  await mkdir(outRoot, { recursive: true });
  const results = [];
  for (const feature of spec.features) {
    const outputPath = path.resolve(outRoot, feature.file);
    if (path.dirname(outputPath) !== outRoot) fail('unsafe output path');
    const sourceRect = pixelRect(feature.sourceRect, canvasWidth, canvasHeight);
    const targetBox = pixelRect(feature.targetBox, canvasWidth, canvasHeight);
    const extracted = await sharp(inputPath).extract(sourceRect).png().toBuffer();
    await assertVisible(extracted);
    const trimmed = await sharp(extracted).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const fitted = await clearInvisibleFringe(await sharp(trimmed).resize(targetBox.width, targetBox.height, { fit: 'inside', withoutEnlargement: false, kernel: sharp.kernel.lanczos3 }).png().toBuffer());
    const fittedMeta = await sharp(fitted).metadata();
    if (!fittedMeta.width || !fittedMeta.height) fail('fit');
    const left = targetBox.left + Math.floor((targetBox.width - fittedMeta.width) / 2);
    const top = targetBox.top + Math.floor((targetBox.height - fittedMeta.height) / 2);
    await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fitted, left, top }])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);
    results.push({ id: feature.id, file: feature.file, targetBox });
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  splitFeatureSheet({ input: valueFor('--input'), manifest: valueFor('--manifest'), out: valueFor('--out') })
    .then((results) => console.log(`avatar-dna feature split: PASS (${results.length} layers)`))
    .catch((error) => { console.error(error instanceof Error ? error.message : 'avatar_feature_split_invalid'); process.exitCode = 1; });
}
