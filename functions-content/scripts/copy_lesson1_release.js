#!/usr/bin/env node
/*
 * Эталон урока 1 для сторожа публикации D150 (координатор 2026-10-01).
 *
 * зачем: adminPublishAuthoredLearningV2Course (кодовая база `content`) сравнивает
 * авторский урок 1 со встроенным релизом (modules/learning-v2/content/
 * lesson1_release_parity_v1.ts), а встроенный релиз читается ленивым
 * require('./generated_release/en/l01/...json') рядом со скомпилированным
 * factory_native. tsc переносит только .ts→.js, поэтому без этой копии в облаке
 * сторож ВСЕГДА отказывал бы «эталон недоступен».
 * Копируем только en/l01 (~3 МБ, 168 файлов): сторожу нужен лишь урок 1, а весь
 * релиз (~12 МБ) раздул бы кодовую базу. Источника нет — сборку не роняем:
 * сторож остаётся fail-closed и называет причину
 * publish_lesson1_release_reference_unavailable.
 */
const fs = require('node:fs');
const path = require('node:path');

const from = path.resolve(__dirname, '..', '..', 'modules', 'learning-v2', 'content', 'factory_native', 'generated_release', 'en', 'l01');
const to = path.resolve(__dirname, '..', 'lib', 'modules', 'learning-v2', 'content', 'factory_native', 'generated_release', 'en', 'l01');

if (!fs.existsSync(from)) {
  console.warn('[assets] эталон урока 1 (factory_native en/l01) отсутствует — сторож D150 будет отказывать «эталон недоступен»');
  process.exit(0);
}

let copied = 0;
const copyTree = (fromDir, toDir) => {
  fs.mkdirSync(toDir, { recursive: true });
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const source = path.join(fromDir, entry.name);
    const target = path.join(toDir, entry.name);
    if (entry.isDirectory()) copyTree(source, target);
    else if (entry.name.endsWith('.json')) {
      fs.copyFileSync(source, target);
      copied += 1;
    }
  }
};
copyTree(from, to);
console.log(`[assets] эталон урока 1 для сторожа D150: ${copied} файлов → lib`);
