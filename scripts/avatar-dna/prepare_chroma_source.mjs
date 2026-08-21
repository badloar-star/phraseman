import { Buffer } from 'node:buffer';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const fail = (reason) => { throw new Error(`avatar_chroma_invalid: ${reason}`); };

const parseKey = (value) => {
  const match = /^#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(value ?? '');
  if (!match) fail('key');
  return match.slice(1).map((part) => Number.parseInt(part, 16));
};

const distance = (r, g, b, key) => Math.hypot(r - key[0], g - key[1], b - key[2]);
const smoothstep = (value) => value * value * (3 - (2 * value));

const fitInsideSafeArea = async (rgba, width, height, rigPath, clip) => {
  const rig = JSON.parse(await readFile(path.resolve(rigPath), 'utf8'));
  const polygon = rig?.safePolygons?.[clip];
  if (!Array.isArray(polygon) || polygon.length < 3 || polygon.some((point) => !Array.isArray(point) || point.length !== 2 || point.some((value) => typeof value !== 'number' || value < 0 || value > 1))) fail('safe area');
  const xs = polygon.map((point) => point[0]); const ys = polygon.map((point) => point[1]);
  const safeLeft = Math.ceil(Math.min(...xs) * width) + 1; const safeTop = Math.ceil(Math.min(...ys) * height) + 1;
  const safeRight = Math.floor(Math.max(...xs) * width) - 1; const safeBottom = Math.floor(Math.max(...ys) * height) - 1;
  const targetWidth = safeRight - safeLeft; const targetHeight = safeBottom - safeTop;
  if (targetWidth < 32 || targetHeight < 32) fail('safe area');
  const trimmed = await sharp(rgba, { raw: { width, height, channels: 4 } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const fitted = await sharp(trimmed).resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  const metadata = await sharp(fitted).metadata();
  if (!metadata.width || !metadata.height) fail('fit');
  const left = safeLeft + Math.floor((targetWidth - metadata.width) / 2);
  const top = safeTop + Math.floor((targetHeight - metadata.height) / 2);
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: fitted, left, top }]).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
};

export async function prepareChromaSource({ input, output, key = '#00ff00', rig, clip }) {
  if (typeof input !== 'string' || input.length === 0 || typeof output !== 'string' || output.length === 0) fail('arguments');
  if ((rig === undefined) !== (clip === undefined)) fail('fit arguments');
  const keyRgb = parseKey(key);
  const source = sharp(path.resolve(input), { failOn: 'error' }).removeAlpha().toColourspace('srgb');
  const metadata = await source.metadata();
  if (metadata.format !== 'png' || !metadata.width || !metadata.height || metadata.width < 512 || metadata.height < 512) fail('source');
  const { data, info } = await source
    .resize(2048, 2048, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cornerOffsets = [0, (info.width - 1) * 3, ((info.height - 1) * info.width) * 3, ((info.height * info.width) - 1) * 3];
  if (cornerOffsets.some((offset) => distance(data[offset], data[offset + 1], data[offset + 2], keyRgb) > 70)) fail('background corners');
  const rgba = Buffer.alloc(info.width * info.height * 4);
  const lower = 26; const upper = 105;
  let opaquePixels = 0;
  for (let sourceOffset = 0, targetOffset = 0; sourceOffset < data.length; sourceOffset += 3, targetOffset += 4) {
    const r = data[sourceOffset]; const g = data[sourceOffset + 1]; const b = data[sourceOffset + 2];
    const chromaDistance = distance(r, g, b, keyRgb);
    const distanceRatio = Math.max(0, Math.min(1, (chromaDistance - lower) / (upper - lower)));
    const greenExcess = g - Math.max(r, b);
    const spillRatio = Math.max(0, Math.min(1, (greenExcess - 6) / 104));
    const alpha = Math.min(Math.round(255 * smoothstep(distanceRatio)), Math.round(255 * (1 - smoothstep(spillRatio))));
    if (alpha === 0) continue;
    rgba[targetOffset] = r;
    rgba[targetOffset + 1] = greenExcess > 6 ? Math.min(g, Math.round((r * 0.65) + (b * 0.35)) + 2) : g;
    rgba[targetOffset + 2] = b;
    rgba[targetOffset + 3] = alpha;
    if (alpha >= 250) opaquePixels += 1;
  }
  if (opaquePixels < 2048) fail('empty subject');
  await mkdir(path.dirname(path.resolve(output)), { recursive: true });
  if (rig && clip) {
    await sharp(await fitInsideSafeArea(rgba, info.width, info.height, rig, clip)).toFile(path.resolve(output));
  } else {
    await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(path.resolve(output));
  }
  return { width: info.width, height: info.height, opaquePixels };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  prepareChromaSource({ input: valueFor('--input'), output: valueFor('--output'), key: valueFor('--key') ?? '#00ff00', rig: valueFor('--rig'), clip: valueFor('--clip') })
    .then(({ width, height }) => console.log(`avatar-dna chroma: PASS (${width}x${height})`))
    .catch((error) => { console.error(error instanceof Error ? error.message : 'avatar_chroma_invalid'); process.exitCode = 1; });
}
