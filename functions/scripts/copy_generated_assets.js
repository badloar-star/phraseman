#!/usr/bin/env node
/*
 * Копирует src/generated/*.json в собранный lib/.
 *
 * зачем: tsc переносит только .ts→.js, а генератору турнирных заданий нужен
 * tournament_content.json рядом с скомпилированным модулем. Без этой копии
 * в облаке require('./generated/tournament_content.json') не найдёт файл и
 * генерация молча вернёт ноль заданий.
 */
const fs = require('node:fs');
const path = require('node:path');

const from = path.resolve(__dirname, '..', 'src', 'generated');
const to = path.resolve(__dirname, '..', 'lib', 'functions', 'src', 'generated');

if (!fs.existsSync(from)) {
  console.warn('[assets] src/generated отсутствует — пропускаю');
  process.exit(0);
}
fs.mkdirSync(to, { recursive: true });

let copied = 0;
for (const file of fs.readdirSync(from)) {
  if (!file.endsWith('.json')) continue;
  fs.copyFileSync(path.join(from, file), path.join(to, file));
  const mb = (fs.statSync(path.join(to, file)).size / 1024 / 1024).toFixed(2);
  console.log(`[assets] ${file} → lib (${mb} МБ)`);
  copied += 1;
}
console.log(`[assets] скопировано файлов: ${copied}`);
