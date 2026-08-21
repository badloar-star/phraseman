import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ID = /^[a-z][a-z0-9_.-]{1,79}$/;
const SOURCE_FILE = /^[a-z0-9][a-z0-9_.-]*\.png$/;
const SLOT = new Set(['background','outfit.back','hood.back','hair.back','body','outfit','ears','face','skin.detail','makeup','eyes','iris','brows','nose','mouth','facial.hair','hair.side','hair.front','eyewear','ear.accessory','mask','headwear.front','neck.accessory','outfit.front','aura','frame','foreground.fx']);
const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const fail = (reason) => { throw new Error(`avatar_asset_invalid: ${reason}`); };
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const pointInPolygon = (x, y, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
    const intersects = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const alphaBounds = (data, width, height) => {
  let left = width; let top = height; let right = -1; let bottom = -1; let count = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] === 0) continue;
    count += 1; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return count === 0 ? null : { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, alphaPixels: count };
};

const hasOpaqueWhiteNeighbor = (data, width, height, x, y) => {
  for (let nearbyY = Math.max(0, y - 3); nearbyY <= Math.min(height - 1, y + 3); nearbyY += 1) {
    for (let nearbyX = Math.max(0, x - 3); nearbyX <= Math.min(width - 1, x + 3); nearbyX += 1) {
      const offset = (nearbyY * width + nearbyX) * 4;
      if (data[offset + 3] >= 96 && data[offset] > 220 && data[offset + 1] > 220 && data[offset + 2] > 220) return true;
    }
  }
  return false;
};

async function inspectSource(filePath, rig, clip) {
  const image = sharp(filePath, { failOn: 'error' });
  const metadata = await image.metadata();
  if (metadata.format !== 'png' || metadata.width !== rig.canvas.width || metadata.height !== rig.canvas.height || metadata.channels !== 4) fail('wrong source dimension or format');
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const polygon = clip ? rig.safePolygons?.[clip] : null;
  if (clip && !Array.isArray(polygon)) fail('unknown safe polygon');
  let alphaCount = 0;
  let alphaLeft = info.width; let alphaTop = info.height; let alphaRight = -1; let alphaBottom = -1;
  const whiteEdgeCandidates = [];
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    const offset = (y * info.width + x) * 4;
    const alpha = data[offset + 3];
    if (alpha === 0) continue;
    alphaCount += 1;
    alphaLeft = Math.min(alphaLeft, x); alphaTop = Math.min(alphaTop, y); alphaRight = Math.max(alphaRight, x); alphaBottom = Math.max(alphaBottom, y);
    if (alpha < 16 && data[offset] > 245 && data[offset + 1] > 245 && data[offset + 2] > 245) whiteEdgeCandidates.push([x, y]);
    if (polygon && !pointInPolygon((x + 0.5) / info.width, (y + 0.5) / info.height, polygon)) fail('alpha outside safe polygon');
  }
  if (alphaCount === 0) fail('empty layer');
  if (whiteEdgeCandidates.some(([x, y]) => !hasOpaqueWhiteNeighbor(data, info.width, info.height, x, y))) fail('edge halo');
  if (alphaRight - alphaLeft + 1 < 32 || alphaBottom - alphaTop + 1 < 32) fail('unreadable 64px portrait');
}

const clipRuntimeLayer = async (filePath, rig, clip) => {
  const resized = await sharp(filePath)
    .resize(rig.runtime.width, rig.runtime.height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const polygon = clip ? rig.safePolygons?.[clip] : null;
  if (clip && !Array.isArray(polygon)) fail('unknown safe polygon');
  if (polygon) {
    for (let y = 0; y < resized.info.height; y += 1) for (let x = 0; x < resized.info.width; x += 1) {
      if (pointInPolygon((x + 0.5) / resized.info.width, (y + 0.5) / resized.info.height, polygon)) continue;
      const offset = (y * resized.info.width + x) * 4;
      resized.data[offset] = 0;
      resized.data[offset + 1] = 0;
      resized.data[offset + 2] = 0;
      resized.data[offset + 3] = 0;
    }
  }
  return sharp(resized.data, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: 4,
    },
  }).webp({ quality: 72, alphaQuality: 100, effort: 6 }).toBuffer();
};

const inspectRuntimeLayer = async (webp, rig, clip) => {
  const { data, info } = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== rig.runtime.width || info.height !== rig.runtime.height) fail('wrong runtime dimension');
  const polygon = clip ? rig.safePolygons?.[clip] : null;
  if (clip && !Array.isArray(polygon)) fail('unknown safe polygon');
  if (polygon) {
    for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      if (data[offset + 3] > 0 && !pointInPolygon((x + 0.5) / info.width, (y + 0.5) / info.height, polygon)) fail('runtime alpha outside safe polygon');
    }
  }
  return { data, info };
};

const assertPairs = (layers) => {
  const slots = new Set(layers.map((layer) => layer.slot));
  if (slots.has('hair.back') !== slots.has('hair.front')) fail('missing hair front/back layer');
  if (slots.has('hood.back') !== slots.has('headwear.front')) fail('missing hood front/back layer');
};

const parseBundle = (value) => {
  if (!record(value) || value.bundleVersion !== 1 || !Array.isArray(value.items) || value.items.length === 0) fail('bundle manifest');
  const itemIds = new Set(); const layerIds = new Set();
  const items = value.items.map((item) => {
    if (!record(item) || !ID.test(item.id) || itemIds.has(item.id) || item.assetVersion !== 1 || !Array.isArray(item.layers) || item.layers.length === 0) fail('item manifest');
    itemIds.add(item.id);
    const layers = item.layers.map((layer) => {
      if (!record(layer) || !ID.test(layer.id) || layerIds.has(layer.id) || !SLOT.has(layer.slot) || typeof layer.file !== 'string' || !SOURCE_FILE.test(layer.file) || (layer.clip !== undefined && typeof layer.clip !== 'string')) fail('layer manifest');
      layerIds.add(layer.id);
      return { id: layer.id, slot: layer.slot, file: layer.file, ...(layer.clip ? { clip: layer.clip } : {}) };
    });
    assertPairs(layers);
    return { id: item.id, assetVersion: item.assetVersion, layers };
  });
  return { bundleVersion: 1, items };
};

const portraitReadableAt64 = async (layerBuffers, rig) => {
  const canvas = sharp({ create: { width: rig.runtime.width, height: rig.runtime.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const composite = await canvas.composite(layerBuffers.map((input) => ({ input }))).png().toBuffer();
  const [x, y, w, h] = rig.portraitCrop;
  const left = Math.round(x * rig.runtime.width); const top = Math.round(y * rig.runtime.height);
  const width = Math.round(w * rig.runtime.width); const height = Math.round(h * rig.runtime.height);
  const { data, info } = await sharp(composite).extract({ left, top, width, height }).resize(64, 64, { fit: 'contain' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(data, info.width, info.height);
  return Boolean(bounds && bounds.width >= 8 && bounds.height >= 8 && bounds.alphaPixels >= 64);
};

export async function buildBundle({ source, manifest, rig: rigPath, out }) {
  if (![source, manifest, rigPath, out].every((value) => typeof value === 'string' && value.length > 0)) fail('missing arguments');
  const bundle = parseBundle(JSON.parse(await readFile(manifest, 'utf8')));
  const rig = JSON.parse(await readFile(rigPath, 'utf8'));
  if (rig?.runtime?.width !== 512 || rig?.runtime?.height !== 512 || rig?.thumbnail?.width !== 192 || rig?.thumbnail?.height !== 192 || rig?.canvas?.width !== 2048 || rig?.canvas?.height !== 2048) fail('rig dimensions');
  const sourceRoot = path.resolve(source);
  const receipts = [];
  for (const item of bundle.items) {
    const itemOut = path.resolve(out, item.id, String(item.assetVersion));
    await mkdir(itemOut, { recursive: true });
    const files = []; const layerBuffers = [];
    for (const layer of item.layers) {
      const sourcePath = path.resolve(sourceRoot, layer.file);
      if (path.dirname(sourcePath) !== sourceRoot) fail('unsafe source path');
      try {
        await inspectSource(sourcePath, rig, layer.clip);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'avatar_asset_invalid';
        throw new Error(`${message}: ${item.id}/${layer.id}`);
      }
      const webp = await clipRuntimeLayer(sourcePath, rig, layer.clip);
      const outputFile = layer.file.replace(/\.png$/, '.webp');
      const outputPath = path.join(itemOut, outputFile);
      await writeFile(outputPath, webp);
      const { data, info } = await inspectRuntimeLayer(webp, rig, layer.clip);
      files.push({ file: outputFile, bytes: webp.length, sha256: sha256(webp), width: info.width, height: info.height, pixelBounds: alphaBounds(data, info.width, info.height) });
      layerBuffers.push(webp);
    }
    if (!(await portraitReadableAt64(layerBuffers, rig))) fail('unreadable 64px portrait');
    const thumbnailComposite = await sharp({ create: { width: rig.runtime.width, height: rig.runtime.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(layerBuffers.map((input) => ({ input })))
      .png()
      .toBuffer();
    const thumbnail = await sharp(thumbnailComposite)
      .resize(rig.thumbnail.width, rig.thumbnail.height, { fit: 'contain' })
      .webp({ quality: 72, alphaQuality: 100, effort: 6 })
      .toBuffer();
    await writeFile(path.join(itemOut, 'thumbnail.webp'), thumbnail);
    files.push({ file: 'thumbnail.webp', bytes: thumbnail.length, sha256: sha256(thumbnail), width: rig.thumbnail.width, height: rig.thumbnail.height });
    const receipt = { receiptVersion: 1, itemId: item.id, assetVersion: item.assetVersion, rigId: rig.rigId, files };
    await writeFile(path.join(itemOut, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
    receipts.push(receipt);
  }
  return receipts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildBundle({ source: valueFor('--source'), manifest: valueFor('--manifest'), rig: valueFor('--rig'), out: valueFor('--out') })
    .then((receipts) => console.log(`avatar-dna bundle: PASS (${receipts.length} items)`))
    .catch((error) => { console.error(error instanceof Error ? error.message : 'avatar_asset_invalid'); process.exitCode = 1; });
}
