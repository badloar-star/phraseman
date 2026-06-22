#!/usr/bin/env node
/**
 * Генерация статической карты require() для арт-картинок «Сокровищницы».
 *
 *   node tools/collectibles/build-image-map.mjs
 *
 * Источник истины — файлы assets/images/collectibles/dalli/<setId>/<cardId>.webp.
 * Каждый cardId совпадает 1:1 с id карточки в app/collectibles/catalog_data.ts.
 *
 * Зачем отдельный файл, а не часть catalog_data.ts:
 *   - Metro требует СТАТИЧЕСКИЙ require('<literal>') — путь нельзя собрать из переменной,
 *     поэтому нужна сгенерированная карта-литерал { id: require('...') }.
 *   - Карту держим отдельно от текстов, чтобы build-app (тексты/SVG) и build-image-map
 *     (картинки) можно было перегенерировать независимо.
 *
 * Гейты: падает, если в каталоге есть id без webp-файла или webp без id (паритет 1:1).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..');
const ART_ROOT = path.join(REPO, 'assets', 'images', 'collectibles', 'dalli');
const CATALOG_PATH = path.join(REPO, 'app', 'collectibles', 'catalog_data.ts');
const OUT_PATH = path.join(REPO, 'app', 'collectibles', 'card_images.generated.ts');
// require()-путь относительно расположения OUT_PATH (app/collectibles/).
const REQUIRE_PREFIX = '../../assets/images/collectibles/dalli';

function fail(msg) {
  console.error(`build-image-map: ${msg}`);
  process.exit(1);
}

function collectFiles() {
  if (!fs.existsSync(ART_ROOT)) fail(`нет каталога арта: ${ART_ROOT}`);
  /** @type {Array<{id: string, setDir: string, file: string}>} */
  const out = [];
  const sets = fs
    .readdirSync(ART_ROOT)
    .filter((d) => fs.statSync(path.join(ART_ROOT, d)).isDirectory())
    .sort();
  for (const setDir of sets) {
    const files = fs
      .readdirSync(path.join(ART_ROOT, setDir))
      .filter((f) => f.endsWith('.webp'))
      .sort();
    for (const file of files) {
      out.push({ id: file.replace(/\.webp$/, ''), setDir, file });
    }
  }
  return out;
}

function catalogIds() {
  const src = fs.readFileSync(CATALOG_PATH, 'utf8');
  return [...src.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
}

function main() {
  const files = collectFiles();
  const fileIds = new Set(files.map((f) => f.id));
  const catIds = catalogIds();
  const catSet = new Set(catIds);

  if (fileIds.size !== files.length) fail('дублирующиеся id среди webp-файлов');

  const missing = [...catSet].filter((id) => !fileIds.has(id));
  const orphan = [...fileIds].filter((id) => !catSet.has(id));
  if (missing.length) fail(`в каталоге есть id без webp: ${missing.slice(0, 10).join(', ')} (всего ${missing.length})`);
  if (orphan.length) fail(`есть webp без id в каталоге: ${orphan.slice(0, 10).join(', ')} (всего ${orphan.length})`);

  const lines = files.map(
    ({ id, setDir, file }) => `  ${JSON.stringify(id)}: require('${REQUIRE_PREFIX}/${setDir}/${file}'),`,
  );

  const ts = `// АВТОГЕНЕРИРОВАНО: node tools/collectibles/build-image-map.mjs
// НЕ ПРАВИТЬ РУКАМИ — источник истины: assets/images/collectibles/dalli/**/*.webp
// Статическая карта require() (Metro требует литеральные пути). Ключ — id карточки
// из app/collectibles/catalog_data.ts, паритет 1:1.
/* eslint-disable */
import type { ImageSourcePropType } from 'react-native';

export const COLLECTIBLE_CARD_IMAGE_COUNT = ${files.length};

export const COLLECTIBLE_CARD_IMAGES: Record<string, ImageSourcePropType> = {
${lines.join('\n')}
};

/** Картинка карточки по id, либо null если арта нет. */
export function collectibleCardImage(cardId: string): ImageSourcePropType | null {
  return COLLECTIBLE_CARD_IMAGES[cardId] ?? null;
}
`;

  fs.writeFileSync(OUT_PATH, ts, 'utf8');
  console.log(`build-image-map OK: ${files.length} картинок → ${path.relative(REPO, OUT_PATH)}`);
}

main();
