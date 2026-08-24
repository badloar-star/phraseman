#!/usr/bin/env node
/**
 * Сторож: имя секрета не должно лежать ещё и в functions/.env.
 *
 * зачем (деплой 2026-08-24): полный деплой падал на трёх функциях сразу —
 * emailUnsubscribe, webLeadCapture, webLeadNudgeCron:
 *   HTTP Error: 400, Could not update Cloud Run service ...
 *   spec.template.spec.containers[0].env:
 *   Secret environment variable overlaps non secret environment variable
 *
 * Причина: `EMAIL_UNSUBSCRIBE_SECRET` и `EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET`
 * были объявлены ОДНОВРЕМЕННО двумя способами — через `defineSecret()` в
 * `functions/src/email_unsubscribe.ts` и обычными строками в `functions/.env`.
 * Cloud Run запрещает такое пересечение: одно имя не может быть и секретом,
 * и обычной переменной окружения. Значения лежали в `.env` с 26.07.2026, потом
 * их перевели на Secret Manager и убрать из `.env` забыли.
 *
 * Проблема повторяемая и особенно неприятная: `.env` не в git, ошибка всплывает
 * только на деплое — в конце длинной сборки, у владельца, и только на его
 * машине. У других разработчиков и в CI её может не быть вовсе.
 *
 * Сторож читает имена из `functions/.env` (значения НЕ читает и никуда не
 * пишет — там реальные секреты) и сверяет их с именами всех `defineSecret(...)`
 * в исходниках. Пересеклись — падаем ДО деплоя с точным списком имён.
 *
 * Запуск: node scripts/guard_secret_env_overlap.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Кодовые базы со своим .env и своими исходниками. */
const CODEBASES = ['functions', 'functions-max', 'functions-content'];

/** Имена переменных из .env. Значения не читаем — только левую часть до '='. */
function readEnvNames(envPath) {
  if (!fs.existsSync(envPath)) return [];
  return fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=', 1)[0].trim())
    .filter((name) => /^[A-Z0-9_]+$/.test(name));
}

/** Имена всех defineSecret('X') в .ts-исходниках кодовой базы. */
function collectSecretNames(srcDir) {
  const names = new Set();
  if (!fs.existsSync(srcDir)) return names;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts')) continue;
      const source = fs.readFileSync(full, 'utf8');
      for (const m of source.matchAll(/defineSecret\(\s*['"`]([A-Z0-9_]+)['"`]/g)) {
        names.add(m[1]);
      }
    }
  };
  walk(srcDir);
  return names;
}

const problems = [];
for (const base of CODEBASES) {
  const baseDir = path.join(ROOT, base);
  if (!fs.existsSync(baseDir)) continue;
  const secrets = collectSecretNames(path.join(baseDir, 'src'));
  if (!secrets.size) continue;
  // Проверяем и общий .env, и проектные варианты (.env.<projectId>).
  const envFiles = fs.readdirSync(baseDir)
    .filter((name) => name === '.env' || name.startsWith('.env.'))
    // .example — шаблон без реальных значений; .bak-* — резервные копии.
    .filter((name) => !name.endsWith('.example') && !name.includes('.bak'));
  for (const envFile of envFiles) {
    const overlap = readEnvNames(path.join(baseDir, envFile)).filter((n) => secrets.has(n));
    for (const name of overlap) problems.push({ base, envFile, name });
  }
}

if (problems.length > 0) {
  console.error('\n❌ Секрет и обычная переменная с одним именем — Cloud Run это запрещает.\n');
  for (const { base, envFile, name } of problems) {
    console.error(`   ${name}`);
    console.error(`      объявлен как defineSecret() в ${base}/src/**`);
    console.error(`      и лежит обычной строкой в ${base}/${envFile}`);
  }
  console.error('\nДеплой упадёт с «Secret environment variable overlaps non secret');
  console.error('environment variable» — и не в начале, а посреди выкладки.\n');
  console.error('Как чинить: убрать эти имена из .env, оставив их ТОЛЬКО в Secret Manager.');
  console.error('Проверить, что значение там есть:');
  console.error('   firebase functions:secrets:access <ИМЯ>\n');
  process.exit(1);
}

console.log(`✅ Пересечений секретов и .env нет (проверено баз: ${CODEBASES.length}).`);
