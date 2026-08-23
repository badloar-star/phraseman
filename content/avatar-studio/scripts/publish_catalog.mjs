// зачем: владелец увидел «дрожание» при смене причёсок — каждая генерация
// чуть отличается вне своей зоны. Решение: публикуем для каждой детали
// СЛОЙ-РАЗНИЦУ (RGBA: только пиксели, отличающиеся от эталона), а портрет
// в приложении складывается как эталон + слои. Вне детали — пиксели эталона,
// дрожать нечему; комбинации (волосы+глаза+одежда) = стопка слоёв.
// Полный webp остаётся для плиток-превью. Единственный путь в приложение:
// check_render --accept → publish_catalog → assets/avatar-25d.
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const pipelineRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(pipelineRoot, '..', '..');
const assetsRoot = path.join(repoRoot, 'assets', 'avatar-25d');

// 640×800 webp (~25-35 КБ) неотличим на телефоне; исходники остаются в content/.
const PUBLISH_WIDTH = 640, PUBLISH_HEIGHT = 800, WEBP_QUALITY = 82;
// Порог слоя: дельта >11 — деталь; ниже — шум генерации (ткань/фон чуть
// перерисованы). Маску чистим морфологически, иначе полупрозрачные «призраки».
const LAYER_DELTA = 11;

const manifest = JSON.parse(await readFile(path.join(pipelineRoot, 'manifest.json'), 'utf8'));
const passport = JSON.parse(await readFile(path.join(pipelineRoot, 'frame_passport.v1.json'), 'utf8'));
const backgroundHex = passport.background.replace('#', '');
const passportBackground = {
  r: parseInt(backgroundHex.slice(0, 2), 16),
  g: parseInt(backgroundHex.slice(2, 4), 16),
  b: parseInt(backgroundHex.slice(4, 6), 16),
};
await mkdir(assetsRoot, { recursive: true });

const rawCache = new Map();
async function loadRaw(file) {
  if (!rawCache.has(file)) {
    const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    rawCache.set(file, { data, info });
  }
  return rawCache.get(file);
}

async function makeLayer(assetPng, basePng) {
  const asset = await loadRaw(assetPng);
  const base = await loadRaw(basePng);
  const { width, height } = asset.info;
  if (width !== base.info.width || height !== base.info.height) throw new Error('layer_size_mismatch');
  const bgHex = passportBackground;
  const binary = Buffer.alloc(width * height);
  for (let at = 0; at < width * height; at += 1) {
    const delta = Math.hypot(
      asset.data[at * 3] - base.data[at * 3],
      asset.data[at * 3 + 1] - base.data[at * 3 + 1],
      asset.data[at * 3 + 2] - base.data[at * 3 + 2],
    ) / 4.4167;
    if (delta <= LAYER_DELTA) continue;
    // «фон-в-фон» не слой: дрейф оттенка фона между генерациями даёт ореол
    // вокруг силуэта — обе стороны близки к фону, значит это не деталь.
    const assetToBg = Math.hypot(asset.data[at * 3] - bgHex.r, asset.data[at * 3 + 1] - bgHex.g, asset.data[at * 3 + 2] - bgHex.b) / 4.4167;
    const baseToBg = Math.hypot(base.data[at * 3] - bgHex.r, base.data[at * 3 + 1] - bgHex.g, base.data[at * 3 + 2] - bgHex.b) / 4.4167;
    if (assetToBg < 16 && baseToBg < 16) continue;
    binary[at] = 255;
  }
  const raw1 = { raw: { width, height, channels: 1 } };
  // зачем: sharp разворачивает 1-канальный вход в многоканальный выход —
  // забираем только первый канал, иначе маска читается со сдвигом.
  const maskOperation = async (input, work) => {
    const { data, info } = await work(sharp(input, raw1)).raw().toBuffer({ resolveWithObject: true });
    if (info.channels === 1) return data;
    const single = Buffer.alloc(width * height);
    for (let at = 0; at < width * height; at += 1) single[at] = data[at * info.channels];
    return single;
  };
  // «Открытие»: blur+порог 55% убивает одиночные шумовые пиксели и полосы ткани.
  const opened = await maskOperation(binary, image => image.blur(2).threshold(140));
  // «Закрытие»: blur+низкий порог заращивает дырки внутри детали.
  const closed = await maskOperation(opened, image => image.blur(1.6).threshold(72));
  // Связные компоненты: волосы всегда растут от головы, поэтому куски маски,
  // не связанные с верхней половиной кадра, — «пятна ткани», выбрасываем.
  const scale = 4, lowWidth = Math.ceil(width / scale), lowHeight = Math.ceil(height / scale);
  const low = new Uint8Array(lowWidth * lowHeight);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1)
    if (closed[y * width + x] > 127) low[Math.floor(y / scale) * lowWidth + Math.floor(x / scale)] = 1;
  const componentLabel = new Int32Array(lowWidth * lowHeight).fill(-1);
  const touchesHead = [];
  let componentCount = 0;
  for (let seed = 0; seed < low.length; seed += 1) {
    if (!low[seed] || componentLabel[seed] >= 0) continue;
    const stack = [seed]; componentLabel[seed] = componentCount; let head = false;
    while (stack.length) {
      const at = stack.pop();
      const yAt = Math.floor(at / lowWidth), xAt = at % lowWidth;
      if (yAt < lowHeight * 0.5) head = true;
      for (const next of [at - 1, at + 1, at - lowWidth, at + lowWidth]) {
        if (next < 0 || next >= low.length || !low[next] || componentLabel[next] >= 0) continue;
        if (Math.abs((next % lowWidth) - xAt) > 1) continue;
        componentLabel[next] = componentCount; stack.push(next);
      }
    }
    touchesHead.push(head); componentCount += 1;
  }
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const label = componentLabel[Math.floor(y / scale) * lowWidth + Math.floor(x / scale)];
    if (label < 0 || !touchesHead[label]) closed[y * width + x] = 0;
  }
  // Дилатация ~2px наружу: слой накрывает кромку убранной детали базы
  // (иначе на груди остаются «пёрышки» старых волос).
  const dilated = await maskOperation(closed, image => image.blur(1.4).threshold(28));
  // Мягкий край в 1px, чтобы деталь не была «вырезана ножницами».
  const feathered = await maskOperation(dilated, image => image.blur(0.8));
  const rgba = Buffer.alloc(width * height * 4);
  for (let at = 0; at < width * height; at += 1) {
    // Слой рисует «фон» (убранная деталь открыла фон) → пишем ТОЧНЫЙ цвет
    // паспорта: тон фона у генераций гуляет и давал светлое «облако».
    const assetToBg = Math.hypot(asset.data[at * 3] - bgHex.r, asset.data[at * 3 + 1] - bgHex.g, asset.data[at * 3 + 2] - bgHex.b) / 4.4167;
    if (assetToBg < 16) {
      rgba[at * 4] = bgHex.r; rgba[at * 4 + 1] = bgHex.g; rgba[at * 4 + 2] = bgHex.b;
    } else {
      rgba[at * 4] = asset.data[at * 3];
      rgba[at * 4 + 1] = asset.data[at * 3 + 1];
      rgba[at * 4 + 2] = asset.data[at * 3 + 2];
    }
    rgba[at * 4 + 3] = feathered[at];
  }
  // alphaQuality 100 — сжатие альфы давало видимые полосы на полупрозрачном.
  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .resize(PUBLISH_WIDTH, PUBLISH_HEIGHT).webp({ quality: WEBP_QUALITY, alphaQuality: 100 }).toBuffer();
}

const publishedItems = [];
const mapEntries = [];
for (const item of manifest.items) {
  const source = path.join(pipelineRoot, item.file);
  const publishedFile = item.file.replace(/\.png$/, '.webp');
  const destination = path.join(assetsRoot, publishedFile);
  await mkdir(path.dirname(destination), { recursive: true });
  const fullBytes = await sharp(source).resize(PUBLISH_WIDTH, PUBLISH_HEIGHT).webp({ quality: WEBP_QUALITY }).toBuffer();
  await writeFile(destination, fullBytes);
  mapEntries.push(`  '${item.slot}/${item.id}': require('./${publishedFile.replace(/\\/g, '/')}'),`);

  let layerFile = null;
  if (item.base) {
    layerFile = `layers/${item.slot}/${item.id}.webp`;
    const layerPath = path.join(assetsRoot, layerFile);
    await mkdir(path.dirname(layerPath), { recursive: true });
    await writeFile(layerPath, await makeLayer(source, path.join(pipelineRoot, 'base', item.base)));
    mapEntries.push(`  'layer:${item.slot}/${item.id}': require('./${layerFile}'),`);
  }
  publishedItems.push({ ...item, file: publishedFile, layer: layerFile, sha256: createHash('sha256').update(fullBytes).digest('hex') });
}

await writeFile(path.join(assetsRoot, 'manifest.json'), JSON.stringify({ ...manifest, items: publishedItems }, null, 2) + '\n');
await writeFile(path.join(assetsRoot, 'asset_map.generated.ts'),
  '// AUTO-GENERATED by content/avatar-studio/scripts/publish_catalog.mjs — не править руками.\n' +
  '// Перегенерация: node content/avatar-studio/scripts/publish_catalog.mjs\n' +
  'export const AVATAR_25D_ASSETS: Record<string, number> = {\n' +
  mapEntries.join('\n') + (mapEntries.length ? '\n' : '') +
  '};\n');
process.stdout.write(`Опубликовано: ${publishedItems.length} ассетов (+${publishedItems.filter(i => i.layer).length} слоёв) → assets/avatar-25d\n`);
