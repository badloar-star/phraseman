#!/usr/bin/env node
/**
 * build_avatar_aura_hd_layers.mjs
 *
 * зачем: владелец попросил «апскейл рамок, улучшить качество» (2026-09-14).
 * «Рамки» — это кольца-ауры вокруг аватара. Слои лежат в 320×320, а на Главной
 * кольцо рисуется 156 pt (468 px на 3x) и на сцене студии 270 pt (810 px):
 * источник растягивается в 1.5–2.5 раза и заметно мылит.
 *
 * Скрипт строит второй тир того же арта — 768×768 (×2.4, см. HD_EDGE) — в
 * assets/images/avatar-auras-hd/<auraId>/<layer>.webp. 320-px оригиналы
 * НЕ трогаются: их sha256 и геометрию сторожит tests/avatar_aura_v2_assets.test.ts.
 *
 * Почему именно так:
 *  · Lanczos3 — лучший из доступных классических кернелов (сравнение
 *    linear / lanczos3 / mitchell смотрели глазами на ember/neon/gilded);
 *  · резкость накладывается ТОЛЬКО на RGB, а альфа берётся из чистого
 *    ресайза. Unsharp по альфе сдвинул бы край кольца — а край сторожит
 *    геометрия (padding ≥ 23 px и радиус ≤ 137.71 в масштабе 320);
 *  · вес держит альфа-канал, а не цвет: слои почти целиком прозрачны,
 *    поэтому экономим на alphaQuality (см. WEBP_OPTIONS), а не на картинке.
 *
 * Вход для ИИ-апскейла: --from=<dir> принимает уже увеличенные PNG
 * (Real-ESRGAN, Upscayl и т. п.) в раскладке <auraId>/<layer>.png и прогоняет
 * их через ту же нормализацию (приведение к HD_EDGE и WebP). Так замена
 * классического апскейла нейросетевым не потребует переписывать пайплайн.
 *
 * Run:
 *   node scripts/build_avatar_aura_hd_layers.mjs --dry
 *   node scripts/build_avatar_aura_hd_layers.mjs
 *   node scripts/build_avatar_aura_hd_layers.mjs --write-fixture
 *   node scripts/build_avatar_aura_hd_layers.mjs --from=C:/tmp/esrgan-out
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'assets/images/avatar-auras');
const OUT_DIR = path.join(ROOT, 'assets/images/avatar-auras-hd');
const FIXTURE = path.join(ROOT, 'tests/fixtures/avatar_aura_hd_sha256.ts');
const LAYERS = ['base', 'flow', 'accents'];

/**
 * Сторона HD-слоя. Ровно ×2.4 от 320.
 *
 * зачем именно 768, а не 960 (владелец 2026-09-14: «апскейл, но чтобы их вес
 * сильно не увеличился»): самое крупное кольцо в приложении — сцена студии,
 * 270 pt × 3x = 810 px. 768 закрывает его почти полностью (растяжение ×1.05
 * вместо нынешнего ×2.53), а весит вдвое меньше 960:
 *
 *   320 (сейчас) →  2.50 МБ на 117 слоёв
 *   960 q84 a100 → 10.11 МБ  (×4.0 — отвергнуто по весу)
 *   768 q75 a20  →  3.78 МБ  (×1.5 — принято)
 *
 * Дополнительно 960-я сборка вышла за допуск сторожа по радиусу (137.80 при
 * пороге 137.71 у aura-gilded-laurel/flow), а 768-я укладывается.
 */
export const HD_EDGE = 768;

/**
 * Параметры WebP. Ключ к весу — alphaQuality, а НЕ quality: слои кольца почти
 * целиком прозрачны, и альфа занимает больше половины файла.
 *
 * зачем ровно 50, ни меньше ни больше (замер 2026-09-14 по 4 худшим слоям):
 *
 *   alphaQuality=20  → 4.32 МБ, но СДВИГ ВИДИМОЙ ОБЛАСТИ до 15.5 px
 *   alphaQuality=50  → 5.14 МБ, сдвиг 0.71 px   ← принято
 *   alphaQuality=70  → 5.58 МБ, сдвиг 0.71 px
 *   alphaQuality=100 → 7.42 МБ, сдвиг 0.71 px
 *
 * На 20 сжатие съедало самые слабые полупрозрачные детали целиком: у
 * aura-neon-circuit/base верхняя граница кольца уезжала с 63 на 89 (в масштабе
 * 320) — то есть у ауры пропадала часть рисунка. Это ровно та «экономия», от
 * которой картинка становится хуже оригинала, а не лучше. Выше 50 качество уже
 * не растёт — только вес, поэтому 50 и есть точка перелома.
 */
const WEBP_OPTIONS = Object.freeze({
  quality: 75,
  alphaQuality: 50,
  effort: 6,
  smartSubsample: true,
});

const DRY = process.argv.includes('--dry');
const WRITE_FIXTURE = process.argv.includes('--write-fixture');
const fromArg = process.argv.find((a) => a.startsWith('--from='));
const FROM_DIR = fromArg ? path.resolve(fromArg.slice('--from='.length)) : null;

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * Один слой: 320 → HD_EDGE.
 * RGB и альфа идут разными путями намеренно (см. шапку файла).
 */
async function upscaleLayer(srcPath) {
  const input = sharp(srcPath).ensureAlpha();

  // Чистый ресайз с premultiply — эталон альфы и база для RGB.
  const clean = await input
    .clone()
    .resize(HD_EDGE, HD_EDGE, { kernel: 'lanczos3', fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Тот же ресайз + мягкая резкость. Альфу из него выбрасываем.
  const sharpened = await sharp(srcPath)
    .ensureAlpha()
    .resize(HD_EDGE, HD_EDGE, { kernel: 'lanczos3', fit: 'fill' })
    .sharpen({ sigma: 1.0, m1: 0.3, m2: 1.3, x1: 3, y2: 13, y3: 18 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: cleanData, info } = clean;
  const merged = Buffer.from(cleanData);
  for (let i = 0; i < merged.length; i += 4) {
    merged[i] = sharpened.data[i];
    merged[i + 1] = sharpened.data[i + 1];
    merged[i + 2] = sharpened.data[i + 2];
    // merged[i + 3] — альфа из чистого ресайза, НЕ из резкости.
  }

  return sharp(merged, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp(WEBP_OPTIONS)
    .toBuffer();
}

/** Внешний (например нейросетевой) апскейл: только нормализуем к HD_EDGE и WebP. */
async function normalizeExternal(srcPath) {
  return sharp(srcPath)
    .ensureAlpha()
    .resize(HD_EDGE, HD_EDGE, { kernel: 'lanczos3', fit: 'fill' })
    .webp(WEBP_OPTIONS)
    .toBuffer();
}

function collect() {
  const auraIds = fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('aura-'))
    .map((e) => e.name)
    .sort();
  const out = [];
  for (const auraId of auraIds) {
    for (const layer of LAYERS) {
      const srcPath = path.join(SRC_DIR, auraId, `${layer}.webp`);
      if (!fs.existsSync(srcPath)) {
        console.error(`Отсутствует слой ${auraId}/${layer}.webp`);
        process.exit(1);
      }
      let externalPath = null;
      if (FROM_DIR) {
        for (const ext of ['png', 'webp']) {
          const candidate = path.join(FROM_DIR, auraId, `${layer}.${ext}`);
          if (fs.existsSync(candidate)) { externalPath = candidate; break; }
        }
        if (!externalPath) {
          console.error(`--from указан, но нет файла ${auraId}/${layer}.(png|webp) в ${FROM_DIR}`);
          process.exit(1);
        }
      }
      out.push({ auraId, layer, srcPath, externalPath, key: `${auraId}/${layer}.webp` });
    }
  }
  return out;
}

async function main() {
  const items = collect();
  console.log(`Слоёв к сборке: ${items.length} (${items.length / 3} аур), цель ${HD_EDGE}×${HD_EDGE}.`);
  if (FROM_DIR) console.log(`Источник апскейла: ${FROM_DIR} (внешний, только нормализация).`);

  if (DRY) {
    console.log('DRY — ничего не записано.');
    console.log(`Пример выхода: ${path.relative(ROOT, path.join(OUT_DIR, items[0].key))}`);
    return;
  }

  // Каталог пересобираем с нуля: иначе сироты от прошлых прогонов уедут в
  // Storage (класс бага уже был с каталогом достижений, 2026-08-25).
  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  const hashes = {};
  let totalBytes = 0;
  let srcBytes = 0;
  for (const item of items) {
    const buf = item.externalPath
      ? await normalizeExternal(item.externalPath)
      : await upscaleLayer(item.srcPath);
    const destPath = path.join(OUT_DIR, item.auraId, `${item.layer}.webp`);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
    hashes[item.key] = sha256(buf);
    totalBytes += buf.length;
    srcBytes += fs.statSync(item.srcPath).size;
  }

  console.log(`Готово: ${items.length} слоёв, ${(totalBytes / 1048576).toFixed(2)} МБ (320-px оригиналы: ${(srcBytes / 1048576).toFixed(2)} МБ).`);

  if (WRITE_FIXTURE) {
    const lines = Object.keys(hashes).sort().map((k) => `  '${k}': '${hashes[k]}',`);
    const body = `/** Immutable byte contract for the ${items.length} HD (${HD_EDGE}×${HD_EDGE}) aura layers.\n *  Генерируется scripts/build_avatar_aura_hd_layers.mjs --write-fixture. */\nexport const AVATAR_AURA_HD_LAYER_SHA256: Readonly<Record<string, string>> = {\n${lines.join('\n')}\n};\n`;
    fs.writeFileSync(FIXTURE, body);
    console.log(`Фикстура обновлена: ${path.relative(ROOT, FIXTURE)}`);
  }
}

main().catch((e) => {
  // зачем: немой catch запрещён — молчаливый сбой сборки арта уже стоил проекту
  // мёртвого прогрева картинок на месяцы.
  console.error(`Сборка HD-слоёв упала: ${e?.stack || e}`);
  process.exit(1);
});
