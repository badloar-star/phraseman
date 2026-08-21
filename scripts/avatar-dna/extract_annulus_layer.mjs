import { Buffer } from 'node:buffer';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const fail = (reason) => { throw new Error(`avatar_annulus_invalid: ${reason}`); };
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const pair = (value) => Array.isArray(value) && value.length === 2 && value.every((part) => typeof part === 'number' && Number.isFinite(part) && part > 0 && part < 1);
const clamp = (value) => Math.max(0, Math.min(1, value));

const parseManifest = (value) => {
  if (!record(value) || value.annulusVersion !== 1 || !Array.isArray(value.canvas) || value.canvas.length !== 2 || value.canvas.some((part) => !Number.isInteger(part) || part < 512) || !Number.isInteger(value.featherPx) || value.featherPx < 0 || value.featherPx > 16 || !Array.isArray(value.ellipses) || value.ellipses.length === 0) fail('manifest');
  const ellipses = value.ellipses.map((ellipse) => {
    if (!record(ellipse) || !pair(ellipse.center) || !pair(ellipse.outerRadius) || !pair(ellipse.innerRadius)) fail('ellipse');
    if (ellipse.innerRadius[0] >= ellipse.outerRadius[0] || ellipse.innerRadius[1] >= ellipse.outerRadius[1]) fail('radii');
    if (ellipse.center[0] - ellipse.outerRadius[0] < 0 || ellipse.center[0] + ellipse.outerRadius[0] > 1 || ellipse.center[1] - ellipse.outerRadius[1] < 0 || ellipse.center[1] + ellipse.outerRadius[1] > 1) fail('bounds');
    return { center: ellipse.center, outerRadius: ellipse.outerRadius, innerRadius: ellipse.innerRadius };
  });
  return { canvas: value.canvas, featherPx: value.featherPx, ellipses };
};

const ellipseCoverage = (x, y, ellipse, width, height, featherPx) => {
  const dx = (x + 0.5) / width - ellipse.center[0]; const dy = (y + 0.5) / height - ellipse.center[1];
  const outerDistance = Math.hypot(dx / ellipse.outerRadius[0], dy / ellipse.outerRadius[1]);
  const innerDistance = Math.hypot(dx / ellipse.innerRadius[0], dy / ellipse.innerRadius[1]);
  const outerFeather = featherPx === 0 ? 0 : featherPx / Math.min(ellipse.outerRadius[0] * width, ellipse.outerRadius[1] * height);
  const innerFeather = featherPx === 0 ? 0 : featherPx / Math.min(ellipse.innerRadius[0] * width, ellipse.innerRadius[1] * height);
  const outer = outerFeather === 0 ? Number(outerDistance <= 1) : clamp((1 - outerDistance) / outerFeather + 0.5);
  const inner = innerFeather === 0 ? Number(innerDistance >= 1) : clamp((innerDistance - 1) / innerFeather + 0.5);
  return Math.min(outer, inner);
};

export async function extractAnnulusLayer({ input, manifest, output }) {
  if (![input, manifest, output].every((value) => typeof value === 'string' && value.length > 0)) fail('arguments');
  const spec = parseManifest(JSON.parse(await readFile(path.resolve(manifest), 'utf8')));
  const image = sharp(path.resolve(input), { failOn: 'error' });
  const metadata = await image.metadata(); const [width, height] = spec.canvas;
  if (metadata.format !== 'png' || metadata.width !== width || metadata.height !== height || metadata.channels !== 4) fail('source');
  const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const outputData = Buffer.alloc(data.length); let alphaPixels = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * 4;
    let coverage = 0;
    for (const ellipse of spec.ellipses) coverage = Math.max(coverage, ellipseCoverage(x, y, ellipse, width, height, spec.featherPx));
    const alpha = Math.round(data[offset + 3] * coverage);
    if (alpha === 0) continue;
    outputData[offset] = data[offset]; outputData[offset + 1] = data[offset + 1]; outputData[offset + 2] = data[offset + 2]; outputData[offset + 3] = alpha;
    alphaPixels += 1;
  }
  if (alphaPixels < 64) fail('empty');
  await mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await sharp(outputData, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.resolve(output));
  return { width, height, alphaPixels };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  extractAnnulusLayer({ input: valueFor('--input'), manifest: valueFor('--manifest'), output: valueFor('--output') })
    .then(({ width, height }) => console.log(`avatar-dna annulus: PASS (${width}x${height})`))
    .catch((error) => { console.error(error instanceof Error ? error.message : 'avatar_annulus_invalid'); process.exitCode = 1; });
}
