import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const fail = (reason) => { throw new Error(`avatar_tint_layers_invalid: ${reason}`); };
const luminance = (r, g, b) => Math.round((r * 0.2126) + (g * 0.7152) + (b * 0.0722));
const percentile = (values, ratio) => values[Math.min(values.length - 1, Math.floor(values.length * ratio))];

export async function prepareTintLayers({ input, mask, shading }) {
  if (![input, mask, shading].every((value) => typeof value === 'string' && value.length > 0)) fail('arguments');
  const image = sharp(path.resolve(input), { failOn: 'error' });
  const metadata = await image.metadata();
  if (metadata.format !== 'png' || !metadata.width || !metadata.height || metadata.width < 64 || metadata.height < 64) fail('source');
  const { data, info } = await image.ensureAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
  const tones = [];
  for (let offset = 0; offset < data.length; offset += 4) if (data[offset + 3] > 15) tones.push(luminance(data[offset], data[offset + 1], data[offset + 2]));
  if (tones.length < 64) fail('empty source');
  tones.sort((left, right) => left - right);
  const low = percentile(tones, 0.1); const high = percentile(tones, 0.9); const pivot = (low + high) / 2;
  if (high - low < 8) fail('flat source');
  const maskPixels = Buffer.alloc(data.length); const shadingPixels = Buffer.alloc(data.length);
  for (let offset = 0; offset < data.length; offset += 4) {
    const sourceAlpha = data[offset + 3];
    if (sourceAlpha === 0) continue;
    maskPixels[offset + 3] = sourceAlpha;
    const tone = luminance(data[offset], data[offset + 1], data[offset + 2]);
    const isShadow = tone < pivot; const range = isShadow ? Math.max(1, pivot - low) : Math.max(1, high - pivot);
    const strength = Math.min(1, Math.abs(tone - pivot) / range);
    const textureAlpha = Math.round(sourceAlpha * strength * (isShadow ? 0.62 : 0.42));
    shadingPixels[offset] = isShadow ? 0 : 240;
    shadingPixels[offset + 1] = isShadow ? 0 : 226;
    shadingPixels[offset + 2] = isShadow ? 0 : 214;
    shadingPixels[offset + 3] = textureAlpha;
  }
  await Promise.all([mkdir(path.dirname(path.resolve(mask)), { recursive: true }), mkdir(path.dirname(path.resolve(shading)), { recursive: true })]);
  const raw = { width: info.width, height: info.height, channels: 4 };
  await sharp(maskPixels, { raw }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.resolve(mask));
  await sharp(shadingPixels, { raw }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.resolve(shading));
  return { width: info.width, height: info.height, low, high };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  prepareTintLayers({ input: valueFor('--input'), mask: valueFor('--mask'), shading: valueFor('--shading') })
    .then(({ width, height }) => console.log(`avatar-dna tint layers: PASS (${width}x${height})`))
    .catch((error) => { console.error(error instanceof Error ? error.message : 'avatar_tint_layers_invalid'); process.exitCode = 1; });
}
