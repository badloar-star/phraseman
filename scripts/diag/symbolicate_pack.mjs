#!/usr/bin/env node
// зачем (координатор 05.10, пакет 01:26): держатели замка аккаунта в дев-сборке печатаются безымянными кадрами
// («?anon_0_ (http://…bundle…:строка:колонка)»). Скрипт берёт файл пакета логов, собирает все такие кадры и
// одним запросом к Metro /symbolicate превращает их в «файл:строка (функция)».
//
// Использование:
//   node scripts/diag/symbolicate_pack.mjs <файл пакета> [--metro http://localhost:8081]
// Результат: таблица в консоли и копия пакета рядом — <файл>.symbolicated.txt с подстановкой.
// Требует запущенный Metro той же сборки, что писала лог (иначе позиции не совпадут).
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const packPath = args.find((arg) => !arg.startsWith('--'));
const metroIndex = args.indexOf('--metro');
const metroOrigin = (metroIndex >= 0 ? args[metroIndex + 1] : 'http://localhost:8081').replace(/\/+$/, '');

if (!packPath) {
  console.error('usage: node scripts/diag/symbolicate_pack.mjs <файл пакета> [--metro http://localhost:8081]');
  process.exit(2);
}

const text = readFileSync(packPath, 'utf8');
// Кадр Hermes: «имя (http://хост:порт/путь…:строка:колонка)»; имя может отсутствовать. В пути бывают скобки
// (app/(tabs)/home.bundle), поэтому URL берём до первого «:строка:колонка)», а не до первой «)».
const FRAME_RE = /([^\s(<]*)\s*\((https?:\/\/\S+?):(\d+):(\d+)\)/g;

const frames = new Map();
for (const match of text.matchAll(FRAME_RE)) {
  const [whole, methodName, file, line, column] = match;
  if (!frames.has(whole)) {
    frames.set(whole, { whole, methodName: methodName || '<anon>', file, lineNumber: Number(line), column: Number(column) });
  }
}

if (frames.size === 0) {
  console.log('[SYMBOLICATE] кадров бандла (http…:строка:колонка) в файле не найдено — нечего символизировать.');
  process.exit(0);
}

const stack = [...frames.values()].map(({ file, lineNumber, column, methodName }) => ({
  file, lineNumber, column, methodName,
}));

let response;
try {
  response = await fetch(`${metroOrigin}/symbolicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stack }),
  });
} catch (error) {
  console.error(`[SYMBOLICATE] Metro недоступен по ${metroOrigin}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
if (!response.ok) {
  console.error(`[SYMBOLICATE] Metro ответил ${response.status}: ${(await response.text()).slice(0, 300)}`);
  process.exit(2);
}
const body = await response.json();
const symbolicated = Array.isArray(body?.stack) ? body.stack : [];

const root = process.cwd().replace(/\\/g, '/');
const shortPath = (file) => String(file ?? '?').replace(/\\/g, '/').replace(`${root}/`, '');

let annotated = text;
const rows = [];
[...frames.values()].forEach((frame, index) => {
  const out = symbolicated[index];
  const label = out && out.file
    ? `${shortPath(out.file)}:${out.lineNumber}${out.methodName ? ` (${out.methodName})` : ''}`
    : 'не символизировано';
  rows.push(`${frame.methodName} @${frame.lineNumber}:${frame.column}  ->  ${label}`);
  annotated = annotated.split(frame.whole).join(`${frame.methodName} [${label}]`);
});

console.log(`[SYMBOLICATE] кадров: ${frames.size}`);
for (const row of rows) console.log(`  ${row}`);
const outPath = `${packPath}.symbolicated.txt`;
writeFileSync(outPath, annotated, 'utf8');
console.log(`[SYMBOLICATE] копия с подстановкой: ${outPath}`);
