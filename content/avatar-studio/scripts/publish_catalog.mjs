// зачем (паспорт v2, зелёный канон): базы публикуются С ПРОЗРАЧНЫМ фоном
// (хромакей) — фон портрета рисует приложение (вкладка «Сцена» бесплатно).
// На каждую деталь запекается ГОТОВЫЙ ПОРТРЕТ: пиксели эталона + разница
// детали + стирание убранного, затем кеинг. Всё вне детали — пиксели эталона,
// «дрожание» генераций исключено. Единственный путь в приложение:
// check_render --accept → publish_catalog → assets/avatar-25d.
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const pipelineRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(pipelineRoot, '..', '..');
const assetsRoot = path.join(repoRoot, 'assets', 'avatar-25d');

const manifest = JSON.parse(await readFile(path.join(pipelineRoot, 'manifest.json'), 'utf8'));
const passport = JSON.parse(await readFile(path.join(pipelineRoot, 'frame_passport.v1.json'), 'utf8'));
const CANON_W = passport.canvas.width, CANON_H = passport.canvas.height;
// ~половина канона: webp с альфой лёгкий, на телефоне неотличим.
const PUBLISH_WIDTH = 658, PUBLISH_HEIGHT = 598, WEBP_QUALITY = 82;
const LAYER_DELTA = 11; // ниже — шум генерации, не деталь

const greenness = (data, at) => data[at + 1] - Math.max(data[at], data[at + 2]);
const isGreen = (data, at) => greenness(data, at) > 40;

const rawCache = new Map();
async function loadRaw(file) {
  if (!rawCache.has(file)) {
    const { data } = await sharp(file).removeAlpha().resize(CANON_W, CANON_H, { fit: 'fill' })
      .raw().toBuffer({ resolveWithObject: true });
    rawCache.set(file, data);
  }
  return rawCache.get(file);
}

// Хромакей RGB-буфера → RGBA с деспиллом на полукраях.
function keyGreen(data) {
  const rgba = Buffer.alloc(CANON_W * CANON_H * 4);
  for (let at = 0; at < CANON_W * CANON_H; at += 1) {
    const g = greenness(data, at * 3);
    let alpha;
    if (g > 90) alpha = 0;
    else if (g < 20) alpha = 255;
    else alpha = Math.round(255 * (1 - (g - 20) / 70));
    rgba[at * 4] = data[at * 3];
    rgba[at * 4 + 1] = alpha === 255 ? data[at * 3 + 1] : Math.min(data[at * 3 + 1], Math.max(data[at * 3], data[at * 3 + 2]));
    rgba[at * 4 + 2] = data[at * 3 + 2];
    rgba[at * 4 + 3] = alpha;
  }
  return rgba;
}

const raw1 = { raw: { width: CANON_W, height: CANON_H, channels: 1 } };
// зачем: sharp разворачивает 1-канальный вход в многоканальный выход —
// забираем только первый канал, иначе маска читается со сдвигом.
async function maskOperation(input, work) {
  const { data, info } = await work(sharp(input, raw1)).raw().toBuffer({ resolveWithObject: true });
  if (info.channels === 1) return data;
  const single = Buffer.alloc(CANON_W * CANON_H);
  for (let at = 0; at < CANON_W * CANON_H; at += 1) single[at] = data[at * info.channels];
  return single;
}

// Маска детали: разница с эталоном, очищенная морфологией; куски, не связанные
// с верхней половиной кадра (голова), отбрасываются как «пятна ткани».
async function detailMask(asset, base) {
  const binary = Buffer.alloc(CANON_W * CANON_H);
  for (let at = 0; at < CANON_W * CANON_H; at += 1) {
    const delta = Math.hypot(
      asset[at * 3] - base[at * 3],
      asset[at * 3 + 1] - base[at * 3 + 1],
      asset[at * 3 + 2] - base[at * 3 + 2],
    ) / 4.4167;
    if (delta <= LAYER_DELTA) continue;
    if (isGreen(asset, at * 3) && isGreen(base, at * 3)) continue; // фон-в-фон
    binary[at] = 255;
  }
  const opened = await maskOperation(binary, image => image.blur(2).threshold(140));
  const closed = await maskOperation(opened, image => image.blur(1.6).threshold(72));
  const scale = 4, lowWidth = Math.ceil(CANON_W / scale), lowHeight = Math.ceil(CANON_H / scale);
  const low = new Uint8Array(lowWidth * lowHeight);
  for (let y = 0; y < CANON_H; y += 1) for (let x = 0; x < CANON_W; x += 1)
    if (closed[y * CANON_W + x] > 127) low[Math.floor(y / scale) * lowWidth + Math.floor(x / scale)] = 1;
  const label = new Int32Array(lowWidth * lowHeight).fill(-1);
  const touchesHead = [];
  let components = 0;
  for (let seed = 0; seed < low.length; seed += 1) {
    if (!low[seed] || label[seed] >= 0) continue;
    const stack = [seed]; label[seed] = components; let head = false;
    while (stack.length) {
      const at = stack.pop();
      const yAt = Math.floor(at / lowWidth), xAt = at % lowWidth;
      if (yAt < lowHeight * 0.5) head = true;
      for (const next of [at - 1, at + 1, at - lowWidth, at + lowWidth]) {
        if (next < 0 || next >= low.length || !low[next] || label[next] >= 0) continue;
        if (Math.abs((next % lowWidth) - xAt) > 1) continue;
        label[next] = components; stack.push(next);
      }
    }
    touchesHead.push(head); components += 1;
  }
  for (let y = 0; y < CANON_H; y += 1) for (let x = 0; x < CANON_W; x += 1) {
    const l = label[Math.floor(y / scale) * lowWidth + Math.floor(x / scale)];
    if (l < 0 || !touchesHead[l]) closed[y * CANON_W + x] = 0;
  }
  const dilated = await maskOperation(closed, image => image.blur(1.4).threshold(28));
  return maskOperation(dilated, image => image.blur(0.8));
}

// Запечь портрет детали: эталон + (пиксели детали из ассета) + стирание
// (там, где у эталона была деталь, а у ассета зелёный) → кеинг → RGBA.
async function bakePortrait(item) {
  const asset = await loadRaw(path.join(pipelineRoot, item.file));
  const base = await loadRaw(path.join(pipelineRoot, 'base', item.base));
  const mask = await detailMask(asset, base);
  const manualLayerPath = path.join(pipelineRoot, 'layers-src', item.slot, `${item.id}.png`);
  const manual = existsSync(manualLayerPath)
    ? await sharp(manualLayerPath).ensureAlpha().resize(CANON_W, CANON_H, { fit: 'fill' }).raw().toBuffer()
    : null;
  const composed = Buffer.from(base);
  for (let at = 0; at < CANON_W * CANON_H; at += 1) {
    const erase = !isGreen(base, at * 3) && isGreen(asset, at * 3);
    if (erase) { composed[at * 3] = 0; composed[at * 3 + 1] = 255; composed[at * 3 + 2] = 0; continue; }
    if (manual) {
      const alpha = manual[at * 4 + 3];
      if (alpha > 32) {
        const w = alpha / 255;
        composed[at * 3] = Math.round(manual[at * 4] * w + composed[at * 3] * (1 - w));
        composed[at * 3 + 1] = Math.round(manual[at * 4 + 1] * w + composed[at * 3 + 1] * (1 - w));
        composed[at * 3 + 2] = Math.round(manual[at * 4 + 2] * w + composed[at * 3 + 2] * (1 - w));
      }
    } else if (mask[at] > 16) {
      const w = mask[at] / 255;
      composed[at * 3] = Math.round(asset[at * 3] * w + composed[at * 3] * (1 - w));
      composed[at * 3 + 1] = Math.round(asset[at * 3 + 1] * w + composed[at * 3 + 1] * (1 - w));
      composed[at * 3 + 2] = Math.round(asset[at * 3 + 2] * w + composed[at * 3 + 2] * (1 - w));
    }
  }
  return keyGreen(composed);
}

// Портрет из готового зелёного слоя (без on-model черновика): база + слой.
// Для причёсок/уборов, если есть «лысая» база base_*_bald.png — берём её,
// тогда родные волосы базы не торчат из-под новой причёски.
async function bakeFromLayer(item) {
  const hairLike = item.slot === 'hair' || item.slot === 'headwear';
  const baldPath = path.join(pipelineRoot, 'base', item.base.replace('.png', '_bald.png'));
  const baseFile = hairLike && existsSync(baldPath) ? baldPath : path.join(pipelineRoot, 'base', item.base);
  const composed = Buffer.from(await loadRaw(baseFile));
  const layer = await sharp(path.join(pipelineRoot, item.file)).ensureAlpha()
    .resize(CANON_W, CANON_H, { fit: 'fill' }).raw().toBuffer();
  for (let at = 0; at < CANON_W * CANON_H; at += 1) {
    const alpha = layer[at * 4 + 3];
    if (alpha <= 16) continue;
    const weight = alpha / 255;
    composed[at * 3] = Math.round(layer[at * 4] * weight + composed[at * 3] * (1 - weight));
    composed[at * 3 + 1] = Math.round(layer[at * 4 + 1] * weight + composed[at * 3 + 1] * (1 - weight));
    composed[at * 3 + 2] = Math.round(layer[at * 4 + 2] * weight + composed[at * 3 + 2] * (1 - weight));
  }
  return keyGreen(composed);
}

async function writeWebp(rgba, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  const bytes = await sharp(rgba, { raw: { width: CANON_W, height: CANON_H, channels: 4 } })
    .resize(PUBLISH_WIDTH, PUBLISH_HEIGHT).webp({ quality: WEBP_QUALITY, alphaQuality: 100 }).toBuffer();
  await writeFile(destination, bytes);
  return bytes;
}

const publishedItems = [];
const mapEntries = [];
for (const item of manifest.items) {
  let fileBytes;
  const publishedFile = item.file.replace(/\.png$/, '.webp');
  if (item.slot === 'base') {
    fileBytes = await writeWebp(keyGreen(await loadRaw(path.join(pipelineRoot, item.file))), path.join(assetsRoot, publishedFile));
    publishedItems.push({ ...item, file: publishedFile, portrait: null, sha256: createHash('sha256').update(fileBytes).digest('hex') });
    mapEntries.push(`  '${item.slot}/${item.id}': require('./${publishedFile}'),`);
    continue;
  }
  const layerOnly = item.layerOnly === true || item.file.startsWith('layers-src/');
  const portraitRgba = layerOnly ? await bakeFromLayer(item) : await bakePortrait(item);
  const portraitFile = `portraits/${item.slot}/${item.id}.webp`;
  fileBytes = await writeWebp(portraitRgba, path.join(assetsRoot, portraitFile));
  // Плитка-превью — тот же запечённый портрет (микро-отличий нет по построению).
  publishedItems.push({ ...item, file: portraitFile, portrait: portraitFile, sha256: createHash('sha256').update(fileBytes).digest('hex') });
  mapEntries.push(`  '${item.slot}/${item.id}': require('./${portraitFile}'),`);
  mapEntries.push(`  'portrait:${item.slot}/${item.id}': require('./${portraitFile}'),`);
}

await writeFile(path.join(assetsRoot, 'manifest.json'), JSON.stringify({ ...manifest, items: publishedItems }, null, 2) + '\n');
await writeFile(path.join(assetsRoot, 'asset_map.generated.ts'),
  '// AUTO-GENERATED by content/avatar-studio/scripts/publish_catalog.mjs — не править руками.\n' +
  '// Перегенерация: node content/avatar-studio/scripts/publish_catalog.mjs\n' +
  'export const AVATAR_25D_ASSETS: Record<string, number> = {\n' +
  mapEntries.join('\n') + (mapEntries.length ? '\n' : '') +
  '};\n');
process.stdout.write(`Опубликовано: ${publishedItems.length} ассетов → assets/avatar-25d (прозрачный фон, ${PUBLISH_WIDTH}x${PUBLISH_HEIGHT})\n`);
