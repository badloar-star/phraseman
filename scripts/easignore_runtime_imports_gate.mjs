#!/usr/bin/env node
/**
 * Сторож «код приложения не ссылается на файлы, которые .easignore выкинет из архива EAS».
 *
 * зачем (координатор 14.10, предсборочный прогон Тем на 2133977a1): app/learning_v2_factory_runtime_audio_omissions_v1.ts
 * делает require('../content/learning-v2-course/activation/en/*.json'), а .easignore исключал /content/ целиком → в архиве
 * EAS файла нет → Metro на сервере падает «Unable to resolve» ПОСЛЕ загрузки архива (платная сборка сгорает).
 * Ловим это локально, до сборки: каждый относительный require/import/import() из кода приложения разрешается от файла
 * и проверяется по .easignore тем же форматом (пакет `ignore`, семантика .gitignore, как у EAS CLI).
 *
 * Код 0 — чисто; код 1 — список «файл → путь, который не попадёт в архив». Вызывается из scripts/release_precheck.mjs.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ignore from 'ignore';

const TAG = '[EASIGNORE-IMPORTS]';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['app', 'modules', 'components', 'hooks', 'constants'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
// require('…'), import … from '…', import('…'), export … from '…' — только относительные пути.
const SPEC_RE = /(?:require\(\s*|from\s+|import\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;

/** Относительные спецификаторы из исходника. */
export function relativeSpecifiers(source) {
  const out = [];
  for (const match of source.matchAll(SPEC_RE)) out.push(match[1]);
  return out;
}

/**
 * Нарушения для набора файлов: { file, specifier, target } — target (путь от корня, через /) исключён .easignore.
 * files: [{ rel: 'app/x.ts', source: '...' }]
 */
export function findIgnoredImports(files, easignoreText) {
  const ig = ignore().add(easignoreText);
  const violations = [];
  for (const { rel, source } of files) {
    for (const specifier of relativeSpecifiers(source)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), specifier));
      if (target.startsWith('..')) continue; // вне репозитория — не наш случай
      if (ig.ignores(target)) violations.push({ file: rel, specifier, target });
    }
  }
  return violations;
}

function walk(dirRel, out) {
  let entries = [];
  try {
    entries = readdirSync(path.join(ROOT, dirRel));
  } catch (error) {
    console.warn(`${TAG} каталог ${dirRel} не прочитан: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const rel = `${dirRel}/${name}`;
    const stat = statSync(path.join(ROOT, rel));
    if (stat.isDirectory()) walk(rel, out);
    else if (EXTENSIONS.has(path.extname(name))) out.push({ rel, source: readFileSync(path.join(ROOT, rel), 'utf8') });
  }
}

function main() {
  const easignore = readFileSync(path.join(ROOT, '.easignore'), 'utf8');
  const files = [];
  for (const dir of SCAN_DIRS) walk(dir, files);
  const violations = findIgnoredImports(files, easignore);
  if (violations.length === 0) {
    console.log(`${TAG} OK: файлов проверено ${files.length}, ссылок на исключённое из архива EAS нет`);
    return;
  }
  console.error(`${TAG} ОТКАЗ: код приложения ссылается на файлы, которых не будет в архиве EAS (.easignore):`);
  for (const v of violations) console.error(`  ${v.file} → ${v.specifier} (${v.target})`);
  console.error(`${TAG} Почини .easignore (исключение для нужной папки) или убери импорт — иначе Metro на сервере упадёт «Unable to resolve».`);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
