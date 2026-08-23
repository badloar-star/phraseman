#!/usr/bin/env node
/**
 * Сторож: одна облачная функция — ровно одна кодовая база.
 *
 * зачем (владелец, 2026-08-23): деплой ВСЕХ функций упал с ошибкой
 *   More than one codebase claims following functions:
 *   adminPublishAuthoredLearningV2Course: default, content
 * Утром коммит 478b03750 вынес контент-фабрику в базу `content`, чтобы основной
 * бандл похудел с 380 до 140 МБ. Днём другая сессия добавила экспорт той же
 * функции обратно в `functions/src/index.ts` — ей нужен был эндпоинт для кнопки
 * в админке, и про утренний перенос она не знала. Обе правки закоммитились, и
 * деплой оказался заблокирован для ВСЕХ сессий сразу.
 *
 * Проблема повторяемая: ничто не мешает снова добавить функцию в старую базу.
 * Ошибка при этом всплывает только на деплое — то есть у владельца, в конце
 * длинной сборки, а не у автора правки.
 *
 * Сторож читает `firebase.json`, находит entry-файл каждой кодовой базы и
 * сверяет имена экспортов. Пересеклись — коммит отклоняется с точным указанием,
 * какая функция и в каких базах задвоилась.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/**
 * Entry-файл кодовой базы.
 *
 * зачем .js тоже: functions-english-test собран как JS (main: index.js).
 * Первая редакция искала только .ts и молча пропускала эту базу целиком — а она
 * экспортирует четыре функции, и дубль с ними сторож бы не увидел (аудит).
 */
function resolveEntrySource(sourceDir) {
  const candidates = [
    path.join(sourceDir, 'src', 'index.ts'),
    path.join(sourceDir, 'index.ts'),
    path.join(sourceDir, 'src', 'index.js'),
    path.join(sourceDir, 'index.js'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/** Заменяет содержимое на пробелы, сохраняя переводы строк. */
function blank(text) {
  return text.replace(/[^\r\n]/g, ' ');
}

/**
 * Имена экспортов верхнего уровня и «непрозрачные» реэкспорты.
 *
 * зачем регулярками, а не разбором TypeScript: сторож обязан быть мгновенным и
 * работать в pre-commit без компиляции. Нас интересуют только имена.
 *
 * Маскируем не только комментарии, но и строковые литералы: `export const fake`
 * внутри строки — не экспорт, а ложное срабатывание (аудит 2026-08-23).
 */
function collectExports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const masked = source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/^[ \t]*\/\/.*$/gm, blank)
    .replace(/'(?:[^'\\\n]|\\.)*'/g, blank)
    .replace(/"(?:[^"\\\n]|\\.)*"/g, blank)
    .replace(/`(?:[^`\\]|\\.)*`/g, blank);

  const names = new Set();

  for (const match of masked.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const piece of match[1].split(',')) {
      // Учитываем `foo as bar` — наружу уходит `bar`.
      const name = piece.includes(' as ') ? piece.split(' as ').pop() : piece;
      const clean = name.trim();
      if (clean && clean !== 'default') names.add(clean);
    }
  }

  // let/var/class тоже объявляют экспорт — первая редакция знала только
  // const/function и пропустила бы такой дубль.
  const declaration =
    /export\s+(?:const|let|var|class|function|async\s+function)\s+([A-Za-z0-9_$]+)/g;
  for (const match of masked.matchAll(declaration)) {
    names.add(match[1]);
  }

  // CommonJS: functions-english-test объявляет функции как `exports.name = ...`.
  // Без этой ветки база читалась «пустой», и дубль с её четырьмя функциями
  // сторож не ловил (проверено эмпирически при аудите 2026-08-23).
  const commonJs = /^[ \t]*(?:module\.)?exports\.([A-Za-z0-9_$]+)\s*=/gm;
  for (const match of masked.matchAll(commonJs)) {
    names.add(match[1]);
  }

  // `export * from './x'` не называет имён, поэтому сверить их нельзя. Молчать
  // здесь опаснее всего: именно так дубль вернётся незаметно. Сообщаем о таких
  // местах отдельно — проверка по ним неполна, и автор должен это знать.
  const wildcards = [...masked.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)]
    .map((match) => match[1]);

  return { names, wildcards };
}

function readCodebases() {
  const config = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'firebase.json'), 'utf8'),
  );
  const entries = Array.isArray(config.functions)
    ? config.functions
    : [config.functions].filter(Boolean);

  return entries
    .map((entry) => ({
      codebase: entry?.codebase ?? 'default',
      sourceDir: entry?.source ? path.join(repositoryRoot, entry.source) : null,
    }))
    .filter((entry) => entry.sourceDir && fs.existsSync(entry.sourceDir));
}

const owners = new Map();
const missingEntry = [];
const opaque = [];

for (const { codebase, sourceDir } of readCodebases()) {
  const entryFile = resolveEntrySource(sourceDir);
  if (!entryFile) {
    missingEntry.push(codebase);
    continue;
  }
  const { names, wildcards } = collectExports(entryFile);
  for (const name of names) {
    if (!owners.has(name)) owners.set(name, []);
    owners.get(name).push(codebase);
  }
  for (const target of wildcards) {
    opaque.push(`${codebase} → export * from '${target}'`);
  }
}

const duplicates = [...owners.entries()].filter(([, bases]) => bases.length > 1);

if (duplicates.length > 0) {
  console.error('ОТКАЗ: одна функция объявлена в нескольких кодовых базах.');
  console.error('');
  console.error('Firebase откажется деплоить ВСЕ функции с ошибкой');
  console.error('«More than one codebase claims following functions».');
  console.error('Деплой встанет у всех сессий сразу, а не только у автора правки.');
  console.error('');
  for (const [name, bases] of duplicates) {
    console.error(`  ${name}: ${bases.join(', ')}`);
  }
  console.error('');
  console.error('Как чинить: оставить экспорт РОВНО в одной базе. Имя эндпоинта');
  console.error('при переносе не меняется, поэтому вызовы (httpsCallable по имени)');
  console.error('продолжают работать — правится только место объявления.');
  process.exitCode = 1;
} else {
  console.log(`OK: экспорты кодовых баз не пересекаются (${owners.size} функций).`);
  if (missingEntry.length > 0) {
    console.log(`   Без entry-файла, НЕ ПРОВЕРЕНЫ: ${missingEntry.join(', ')}`);
  }
  if (opaque.length > 0) {
    console.log('   Непрозрачные реэкспорты (имена не видны, проверка неполна):');
    for (const line of opaque) console.log(`     ${line}`);
  }
}
