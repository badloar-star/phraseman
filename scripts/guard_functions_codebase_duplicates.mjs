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

/** Entry-файл кодовой базы: сначала исходник, потом привычные варианты. */
function resolveEntrySource(sourceDir) {
  const candidates = [
    path.join(sourceDir, 'src', 'index.ts'),
    path.join(sourceDir, 'index.ts'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/**
 * Имена экспортов верхнего уровня.
 *
 * зачем регулярками, а не разбором TypeScript: сторож обязан быть мгновенным и
 * работать в pre-commit без компиляции. Нас интересуют только имена, а формы
 * объявления в этих файлах ограничены `export { … } from …` и `export const …`.
 */
function collectExportedNames(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  // Комментарии маскируем: имя функции в пояснении не должно считаться экспортом.
  const masked = source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\r\n]/g, ' '))
    .replace(/^[ \t]*\/\/.*$/gm, (line) => line.replace(/[^\r\n]/g, ' '));

  const names = new Set();

  for (const match of masked.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const piece of match[1].split(',')) {
      // Учитываем `foo as bar` — наружу уходит `bar`.
      const name = piece.includes(' as ')
        ? piece.split(' as ').pop()
        : piece;
      const clean = name.trim();
      if (clean && clean !== 'default') names.add(clean);
    }
  }

  for (const match of masked.matchAll(/export\s+(?:const|function|async\s+function)\s+([A-Za-z0-9_$]+)/g)) {
    names.add(match[1]);
  }

  return names;
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
const skipped = [];

for (const { codebase, sourceDir } of readCodebases()) {
  const entryFile = resolveEntrySource(sourceDir);
  if (!entryFile) {
    skipped.push(codebase);
    continue;
  }
  for (const name of collectExportedNames(entryFile)) {
    if (!owners.has(name)) owners.set(name, []);
    owners.get(name).push(codebase);
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
  const checked = owners.size;
  console.log(`OK: экспорты кодовых баз не пересекаются (${checked} функций).`);
  if (skipped.length > 0) {
    console.log(`   Без entry-файла, пропущены: ${skipped.join(', ')}`);
  }
}
