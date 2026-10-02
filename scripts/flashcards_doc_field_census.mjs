#!/usr/bin/env node
// Account V2, Пакет 8H-2 (C) — сухой подсчёт устаревших копий карточек в документах users/* (только чтение).
//
// зачем: клиент 2.0 обнуляет progress.flashcards_v1 в документе после успешной записи страниц
// flashcard_pages (8H-2, B). У аккаунтов, которые клиентом 2.0 не синхронизируются, поле
// остаётся и продолжает затенять страницы при restore. Перед решением о прогоне
// functions/scripts/migrate_flashcards_to_pages.js (только командой владельца) владельцу нужен
// масштаб: сколько документов ещё держат непустое поле. Этот скрипт его даёт агрегатом count().
//
// Жёсткие границы:
//  - НИКАКИХ записей: ни в Firestore, ни на диск. Только агрегаты count() и печать чисел в stdout;
//  - в выводе только ИМЕНА ключей и КОЛИЧЕСТВА: ни значений, ни uid, ни id документов;
//  - firebase-admin грузится только при явной цели: --emulator (FIRESTORE_EMULATOR_HOST) или
//    прод --project=<id> --owner-command="<дословная команда владельца>"; иначе — только план;
//  - стоимость: count() тарифицируется как 1 чтение на каждые 1000 совпавших записей индекса
//    (минимум 1 чтение на запрос); документы НЕ выкачиваются.
//
// Запуск:
//   node scripts/flashcards_doc_field_census.mjs                         → план (без сети)
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/flashcards_doc_field_census.mjs --emulator
//   node scripts/flashcards_doc_field_census.mjs --project=<id> --owner-command="<команда>"
// Коды выхода: 0 — план/отчёт напечатан; 2 — запрещённая комбинация аргументов; 1 — сбой чтения.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[FLASHCARDS-DOC-FIELD-CENSUS]';
const USERS = 'users';

// Те же ключи, что выгружаются в flashcard_pages (app/cloud_sync.ts doSyncToCloud,
// functions/scripts/migrate_flashcards_to_pages.js).
export const OFFLOADED_FLASHCARD_KEYS = Object.freeze(['flashcards_v1', 'flashcards_v2::fr::flashcards_v1']);
// зачем (8H-2, ревью I-1): древнее progress.flashcards — масштаб риска «древний список
// перебивает страницы при restore». Считается отдельно, в totalNonEmpty не входит.
export const LEGACY_FLASHCARD_KEYS = Object.freeze(['flashcards']);
export const ALL_COUNTED_KEYS = Object.freeze([...OFFLOADED_FLASHCARD_KEYS, ...LEGACY_FLASHCARD_KEYS]);
// «Пустые» значения: поле есть, но карточек в нём нет — затенять нечем.
export const EMPTY_VALUES = Object.freeze(['', '[]']);

/** Разбор `--key=value` / `--flag`. */
export function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    if (eq === -1) out[raw.slice(2)] = true;
    else out[raw.slice(2, eq)] = raw.slice(eq + 1);
  }
  return out;
}

/**
 * Цель запуска или причина отказа. Без цели — только план.
 * @returns {{ mode: 'plan' | 'emulator' | 'prod', projectId?: string } | { error: string }}
 */
export function resolveTarget(args, env) {
  for (const forbidden of ['execute', 'write', 'fix', 'delete', 'apply', 'migrate']) {
    if (args[forbidden] !== undefined) return { error: `--${forbidden}: скрипт только считает, запись запрещена` };
  }
  if (args.emulator) {
    if (!env.FIRESTORE_EMULATOR_HOST) return { error: '--emulator требует FIRESTORE_EMULATOR_HOST' };
    if (args.project !== undefined) return { error: '--emulator и --project одновременно запрещены' };
    return { mode: 'emulator', projectId: env.GCLOUD_PROJECT || 'demo-phraseman' };
  }
  if (args.project === undefined && args['owner-command'] === undefined) return { mode: 'plan' };
  if (typeof args.project !== 'string' || !/^[a-z][a-z0-9-]{4,62}$/.test(args.project.trim())) return { error: 'прод без --project=<id> запрещён' };
  if (typeof args['owner-command'] !== 'string' || args['owner-command'].trim().length < 10) {
    return { error: 'прод без --owner-command="<дословная команда владельца>" запрещён' };
  }
  if (env.FIRESTORE_EMULATOR_HOST) return { error: 'FIRESTORE_EMULATOR_HOST задан — прод и эмулятор не смешиваем' };
  return { mode: 'prod', projectId: args.project.trim() };
}

export function planText() {
  return [
    `${LOG} ПЛАН (сеть не используется, данные не читаются).`,
    `${LOG} Что сделает запуск с целью: для каждого ключа ${ALL_COUNTED_KEYS.join(', ')}`,
    `${LOG} выполнит агрегаты count() по users/*: поле не null; поле == '' ; поле == '[]'.`,
    `${LOG} Непустых = не null − пустые. Значения, uid и id документов не читаются и не печатаются.`,
    `${LOG} Стоимость: 1 чтение на 1000 совпадений индекса, минимум 1 на запрос (${ALL_COUNTED_KEYS.length * (1 + EMPTY_VALUES.length)} запросов). Записей нет.`,
    `${LOG} Эмулятор: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/flashcards_doc_field_census.mjs --emulator`,
    `${LOG} Прод (только по команде владельца): node scripts/flashcards_doc_field_census.mjs --project=<id> --owner-command="<дословно>"`,
  ].join('\n');
}

/**
 * Подсчёт агрегатами. `fieldPathFor(key)` → FieldPath('progress', key): имя ключа содержит `::`,
 * строковый путь с точками для него ненадёжен.
 */
export async function countDocFields(db, fieldPathFor, log = console.log) {
  const keys = [];
  for (const key of ALL_COUNTED_KEYS) {
    const field = fieldPathFor(key);
    const startedAt = Date.now();
    const notNull = await countOf(db.collection(USERS).where(field, '!=', null));
    let empty = 0;
    for (const value of EMPTY_VALUES) empty += await countOf(db.collection(USERS).where(field, '==', value));
    const nonEmpty = Math.max(0, notNull - empty);
    log(`${LOG} key=${key} not_null=${notNull} empty=${empty} non_empty=${nonEmpty} ms=${Date.now() - startedAt}`);
    keys.push({ key, legacy: LEGACY_FLASHCARD_KEYS.includes(key), notNull, empty, nonEmpty });
  }
  return keys;
}

async function countOf(query) {
  const snapshot = await query.count().get();
  const value = snapshot.data().count;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`count() вернул не число: ${typeof value}`);
  return value;
}

export function buildReport(keys, meta) {
  return {
    format: 'flashcards-doc-field-census/1',
    mode: meta.mode,
    keys,
    totalNonEmpty: keys.filter((entry) => !entry.legacy).reduce((sum, entry) => sum + entry.nonEmpty, 0),
    legacyNonEmpty: keys.filter((entry) => entry.legacy).reduce((sum, entry) => sum + entry.nonEmpty, 0),
  };
}

async function openFirestore(target) {
  // зачем: firebase-admin грузится ТОЛЬКО при явной цели (эмулятор или прод с командой владельца).
  const requireFn = createRequire(resolve(REPO, 'functions', 'package.json'));
  const admin = requireFn('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ projectId: target.projectId });
  return { admin, db: admin.firestore() };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = resolveTarget(args, process.env);
  if ('error' in target) {
    console.error(`${LOG} отказ: ${target.error}`);
    process.exit(2);
  }
  if (target.mode === 'plan') {
    console.log(planText());
    return;
  }
  console.log(`${LOG} start mode=${target.mode}`
    + (target.mode === 'prod' ? ` ownerCommandSha=${createHash('sha256').update(String(args['owner-command'])).digest('hex').slice(0, 12)}` : ''));
  const { admin, db } = await openFirestore(target);
  const keys = await countDocFields(db, (key) => new admin.firestore.FieldPath('progress', key));
  const report = buildReport(keys, { mode: target.mode });
  console.log(JSON.stringify(report, null, 2));
  console.log(`${LOG} done totalNonEmpty=${report.totalNonEmpty} legacyNonEmpty=${report.legacyNonEmpty}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    // Причина без данных: только класс и код ошибки.
    console.error(`${LOG} failed ${error instanceof Error ? error.name : typeof error} code=${String(error?.code ?? '').slice(0, 40)}`);
    process.exit(1);
  });
}
