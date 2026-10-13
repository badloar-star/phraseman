#!/usr/bin/env node
/**
 * Гейт «в стор-бандле нет dev-модулей и dev-строк» — [STORE-BUNDLE-DEV].
 *
 * зачем (координатор 12.10): в стор-режиме dev-модули подменяются заглушками (02cea12a1), но готовый стор-бандл никто не
 * проверял. Если заглушка не сработала, в сборку для людей уедут дев-фикстуры состояний, VIP-переключатель разработчика или
 * трасса жизненного цикла хаба.
 *
 * Как: проверяет ТОЛЬКО папку стор-экспорта (по умолчанию `dist-store/`, отдельная от dev-экспорта, чтобы не проверить
 * старый dev-бандл). Две проверки:
 *  1) ТОЧНАЯ, по source map: среди источников бандла нет ни одного настоящего модуля из списка заглушек сборщика
 *     (`storeReleaseDevStateStubs` в конфиге сборщика → `app/<имя>.ts`). Карта обязательна: без неё — отказ с инструкцией.
 *  2) Байтовая: в .js / .hbc / .bundle нет маркеров, которые встречаются ТОЛЬКО в dev-коде (Hermes хранит ASCII-строки как есть).
 * Папки нет — громкое «пропущено» и код 0: экспорт делается в день сборки, не на каждом прогоне.
 *
 * зачем точная проверка (Ядро 13.10, первый настоящий стор-экспорт PM-216): байтовый поиск «[DEV-STATE]» давал ложный отказ —
 * это общий префикс журналов в dev-ветках 58 боевых файлов (Карточки-сообщество, опрос настроек…), а сами dev-модули были
 * подменены. Строка журнала в мёртвой ветке ничего не включает; уехавший настоящий dev-модуль — включает. Его и ищем по карте.
 *
 * Экспорт в день сборки (тяжело — через светофор), карта обязательна:
 *   EXPO_PUBLIC_STORE_RELEASE=1 npx expo export --platform android --output-dir dist-store --source-maps
 * Использование: node scripts/store_bundle_dev_strings_gate.mjs [--dir <папка>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stubNamesFromMetroConfig } from './store_release_stubs_gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[STORE-BUNDLE-DEV]';

/**
 * Маркеры, которые встречаются ТОЛЬКО в dev-коде (не префиксы журналов боевых файлов). Новые dev-маркеры — сюда.
 * «[DEV-STATE]» сюда не входит: см. «зачем точная проверка» в шапке.
 */
export const STORE_BUNDLE_FORBIDDEN_STRINGS = Object.freeze(['dev_vip_override', 'HUB-LIFECYCLE']);
const BUNDLE_EXT = new Set(['.js', '.hbc', '.bundle']);

function listBundleFiles(dir) {
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (BUNDLE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** Чистая проверка папки: { status: 'skipped'|'ok'|'failed', files, hits }. */
export function scanStoreBundleForDevStrings(dir, forbidden = STORE_BUNDLE_FORBIDDEN_STRINGS) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return { status: 'skipped', files: 0, hits: [] };
  const files = listBundleFiles(dir);
  if (files.length === 0) return { status: 'skipped', files: 0, hits: [] };
  const needles = forbidden.map((text) => ({ text, bytes: Buffer.from(text, 'utf8') }));
  const hits = [];
  for (const file of files) {
    const data = fs.readFileSync(file);
    for (const needle of needles) {
      if (data.indexOf(needle.bytes) >= 0) hits.push({ file: path.relative(dir, file), text: needle.text });
    }
  }
  return { status: hits.length > 0 ? 'failed' : 'ok', files: files.length, hits };
}

const normalizeSource = (source) => String(source).replace(/\\/g, '/');

/**
 * Точная проверка по source map: { status: 'skipped'|'ok'|'failed', files, missingMaps, leaked }.
 * devModuleNames — имена из списка заглушек сборщика; настоящий модуль — `app/<имя>.ts(x)`, заглушка живёт в store_release_stubs/.
 */
export function scanStoreBundleSourceMaps(dir, devModuleNames) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return { status: 'skipped', files: 0, missingMaps: [], leaked: [] };
  const files = listBundleFiles(dir);
  if (files.length === 0) return { status: 'skipped', files: 0, missingMaps: [], leaked: [] };
  const realPattern = new RegExp(`(^|/)app/(${devModuleNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\.tsx?$`);
  const missingMaps = [];
  const leaked = [];
  for (const file of files) {
    const mapFile = `${file}.map`;
    if (!fs.existsSync(mapFile)) {
      missingMaps.push(path.relative(dir, file));
      continue;
    }
    const sources = JSON.parse(fs.readFileSync(mapFile, 'utf8')).sources ?? [];
    for (const source of sources) {
      const normalized = normalizeSource(source);
      if (!normalized.includes('/store_release_stubs/') && realPattern.test(normalized)) {
        leaked.push({ file: path.relative(dir, file), source: normalized });
      }
    }
  }
  const failed = missingMaps.length > 0 || leaked.length > 0;
  return { status: failed ? 'failed' : 'ok', files: files.length, missingMaps, leaked };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dirArgIndex = process.argv.indexOf('--dir');
  const dir = path.resolve(ROOT, dirArgIndex > 0 ? process.argv[dirArgIndex + 1] : 'dist-store');
  const strings = scanStoreBundleForDevStrings(dir);
  if (strings.status === 'skipped') {
    console.log(`${LOG} пропущено: нет стор-экспорта в ${path.relative(ROOT, dir) || dir} — в день сборки сделай экспорт (см. шапку скрипта) и прогони снова`);
    process.exit(0);
  }
  const devModuleNames = stubNamesFromMetroConfig(fs.readFileSync(path.join(ROOT, 'metro.config.js'), 'utf8'));
  if (!devModuleNames || devModuleNames.length === 0) {
    console.error(`${LOG} ОТКАЗ: не найден список заглушек storeReleaseDevStateStubs в конфиге сборщика — проверить нечем`);
    process.exit(1);
  }
  const maps = scanStoreBundleSourceMaps(dir, devModuleNames);
  let failed = false;
  if (strings.status === 'failed') {
    failed = true;
    console.error(`${LOG} ОТКАЗ: в стор-бандле есть dev-маркеры:`);
    for (const hit of strings.hits) console.error(`${LOG}   ${hit.file}: «${hit.text}»`);
  }
  for (const miss of maps.missingMaps) {
    failed = true;
    console.error(`${LOG} ОТКАЗ: у ${miss} нет source map — повтори экспорт с --source-maps (точная проверка модулей без карты невозможна)`);
  }
  for (const leak of maps.leaked) {
    failed = true;
    console.error(`${LOG} ОТКАЗ: в ${leak.file} настоящий dev-модуль ${leak.source} — заглушка стор-режима не сработала`);
  }
  if (failed) {
    console.error(`${LOG} Что делать: найти модуль и добавить его в подмену заглушкой для стор-режима (resolveRequest в конфиге сборщика).`);
    process.exit(1);
  }
  console.log(`${LOG} OK: файлов бандла ${strings.files}; dev-модулей из ${devModuleNames.length} заглушек в бандле нет (по карте); маркеров ${STORE_BUNDLE_FORBIDDEN_STRINGS.join(', ')} нет`);
  process.exit(0);
}
