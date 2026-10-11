#!/usr/bin/env node
/**
 * Гейт «в стор-бандле нет dev-строк» — [STORE-BUNDLE-DEV].
 *
 * зачем (координатор 12.10): в стор-режиме dev-модули подменяются заглушками (02cea12a1), но готовый стор-бандл никто не
 * проверял. Если заглушка не сработала, в сборку для людей уедут дев-фикстуры состояний, VIP-переключатель разработчика или
 * трасса жизненного цикла хаба.
 *
 * Как: проверяет ТОЛЬКО папку стор-экспорта (по умолчанию `dist-store/`, отдельная от dev-экспорта, чтобы не проверить
 * старый dev-бандл). Читает все .js / .hbc / .bundle и ищет запрещённые строки байтово (Hermes хранит ASCII-строки в
 * таблице как есть). Папки нет — громкое «пропущено» и код 0: экспорт делается в день сборки, не на каждом прогоне.
 *
 * Экспорт в день сборки (тяжело — через светофор):
 *   EXPO_PUBLIC_STORE_RELEASE=1 npx expo export --platform android --output-dir dist-store
 * Использование: node scripts/store_bundle_dev_strings_gate.mjs [--dir <папка>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[STORE-BUNDLE-DEV]';

/** Строки, которых не должно быть в сборке для людей. Новые dev-маркеры — сюда. */
export const STORE_BUNDLE_FORBIDDEN_STRINGS = Object.freeze(['[DEV-STATE]', 'dev_vip_override', 'HUB-LIFECYCLE']);
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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dirArgIndex = process.argv.indexOf('--dir');
  const dir = path.resolve(ROOT, dirArgIndex > 0 ? process.argv[dirArgIndex + 1] : 'dist-store');
  const result = scanStoreBundleForDevStrings(dir);
  if (result.status === 'skipped') {
    console.log(`${LOG} пропущено: нет стор-экспорта в ${path.relative(ROOT, dir) || dir} — в день сборки сделай экспорт (см. шапку скрипта) и прогони снова`);
    process.exit(0);
  }
  if (result.status === 'ok') {
    console.log(`${LOG} OK: файлов бандла ${result.files}, dev-строк нет (${STORE_BUNDLE_FORBIDDEN_STRINGS.join(', ')})`);
    process.exit(0);
  }
  console.error(`${LOG} ОТКАЗ: в стор-бандле есть dev-строки — заглушка dev-модуля в стор-режиме не сработала:`);
  for (const hit of result.hits) console.error(`${LOG}   ${hit.file}: «${hit.text}»`);
  console.error(`${LOG} Что делать: найти модуль со строкой и добавить его в подмену заглушкой для стор-режима (resolveRequest в конфиге сборщика).`);
  process.exit(1);
}
