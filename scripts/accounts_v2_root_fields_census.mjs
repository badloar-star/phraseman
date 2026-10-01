#!/usr/bin/env node
// Account V2, Пакет 8A — сверка корневых полей users/* с инвентарём ПО ДАННЫМ (только чтение).
//
// зачем: сторож по коду (functions/src/accounts_v2_migration/root_fields_census_guard.test.ts)
// видит только то, что пишет ТЕКУЩИЙ код. В проде лежат поля старых версий приложения и
// прод-скриптов вне репозитория — каждое такое поле без правила остановит перенос OD21
// (HOLD unknown_field) у всех, у кого оно есть. Перед выкладкой владелец запускает этот
// скрипт и видит: какие имена корневых полей встречаются, у скольких документов и что с
// ними сделает перенос (правило инвентаря или UNKNOWN → HOLD).
//
// Жёсткие границы:
//  - НИКАКИХ записей: ни в Firestore, ни на диск. Только чтение и печать агрегатов в stdout;
//  - в выводе только ИМЕНА полей и КОЛИЧЕСТВА: ни значений, ни uid, ни id документов, ни PII.
//    Имя поля, похожее на почту/идентификатор, маскируется хэшем (такое имя само может быть PII);
//  - firebase-admin грузится только при явной цели: --emulator (FIRESTORE_EMULATOR_HOST) или
//    прод --project=<id> --owner-command="<дословная команда владельца>"; иначе — только план;
//  - документы читаются порциями ≤500 по __name__ с курсором, всего не больше --max-docs.
//    select() без полей не годится: он не возвращает имён ключей. Стоимость = 1 чтение на документ.
//
// Запуск:
//   node scripts/accounts_v2_root_fields_census.mjs                         → план (без сети)
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/accounts_v2_root_fields_census.mjs --emulator
//   node scripts/accounts_v2_root_fields_census.mjs --project=<id> --owner-command="<команда>" [--max-docs=N] [--page-size=N]
// Коды выхода: 0 — план/отчёт напечатан; 2 — запрещённая комбинация аргументов; 1 — сбой чтения.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[ACCOUNT-V2-ROOT-CENSUS]';
const USERS = 'users';
export const MAX_PAGE_SIZE = 500;
export const DEFAULT_MAX_DOCS = 100_000;
const HARD_MAX_DOCS = 2_000_000;

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

function positiveInt(raw, fallback, max) {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 && value <= max ? value : null;
}

/**
 * Цель запуска или причина отказа. Без цели — только план.
 * @returns {{ mode: 'plan' | 'emulator' | 'prod', projectId?: string, pageSize: number, maxDocs: number } | { error: string }}
 */
export function resolveTarget(args, env) {
  const pageSize = positiveInt(args['page-size'], MAX_PAGE_SIZE, MAX_PAGE_SIZE);
  if (pageSize === null) return { error: `--page-size должен быть целым 1..${MAX_PAGE_SIZE}` };
  const maxDocs = positiveInt(args['max-docs'], DEFAULT_MAX_DOCS, HARD_MAX_DOCS);
  if (maxDocs === null) return { error: `--max-docs должен быть целым 1..${HARD_MAX_DOCS}` };
  for (const forbidden of ['execute', 'write', 'fix', 'delete', 'apply']) {
    if (args[forbidden] !== undefined) return { error: `--${forbidden}: скрипт только читает, запись запрещена` };
  }
  if (args.emulator) {
    if (!env.FIRESTORE_EMULATOR_HOST) return { error: '--emulator требует FIRESTORE_EMULATOR_HOST' };
    if (args.project !== undefined) return { error: '--emulator и --project одновременно запрещены' };
    return { mode: 'emulator', projectId: env.GCLOUD_PROJECT || 'demo-phraseman', pageSize, maxDocs };
  }
  if (args.project === undefined && args['owner-command'] === undefined) return { mode: 'plan', pageSize, maxDocs };
  if (typeof args.project !== 'string' || !/^[a-z][a-z0-9-]{4,62}$/.test(args.project.trim())) return { error: 'прод без --project=<id> запрещён' };
  if (typeof args['owner-command'] !== 'string' || args['owner-command'].trim().length < 10) {
    return { error: 'прод без --owner-command="<дословная команда владельца>" запрещён' };
  }
  if (env.FIRESTORE_EMULATOR_HOST) return { error: 'FIRESTORE_EMULATOR_HOST задан — прод и эмулятор не смешиваем' };
  return { mode: 'prod', projectId: args.project.trim(), pageSize, maxDocs };
}

/**
 * Имя поля в отчёт. Похожее на почту, uid или произвольную строку — только хэш (имя само может быть PII).
 */
export function reportableFieldName(name) {
  const value = String(name);
  // Похоже на uid: длинная строка без подчёркиваний, где цифр много (у имён полей 0–2 цифры).
  const uidLike = value.length >= 20 && /^[A-Za-z0-9-]+$/.test(value) && (value.match(/\d/g) ?? []).length >= 4;
  const looksPersonal = value.includes('@') || /\s/.test(value) || value.length > 64 || uidLike;
  if (!looksPersonal) return value;
  return `<masked:${createHash('sha256').update(value).digest('hex').slice(0, 8)}>`;
}

/** Счётчик в памяти: имя корневого поля → число документов, где оно есть. */
export function createRootFieldCounter() {
  const counts = new Map();
  let docs = 0;
  return {
    add(data) {
      docs += 1;
      if (!data || typeof data !== 'object') return;
      for (const key of Object.keys(data)) {
        const name = reportableFieldName(key);
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    },
    result() {
      return { docs, counts: Object.fromEntries([...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
    },
  };
}

/** Классификация имён таблицей инвентаря (тот же код, что у переноса). */
export function loadClassifier() {
  const requireFn = createRequire(import.meta.url);
  const { require: tsxRequire } = requireFn('tsx/cjs/api');
  const inventory = tsxRequire(resolve(REPO, 'functions', 'src', 'accounts_v2_migration', 'inventory.ts'), import.meta.url);
  return (name) => {
    if (name === 'progress') return { ruleId: 'progress_map', disposition: 'scanned_by_progress_rules' };
    if (name.startsWith('<masked:')) return { ruleId: null, disposition: 'hold', reason: 'unknown_field' };
    const found = inventory.classifyRootField(name);
    return { ruleId: found.ruleId, disposition: found.disposition, reason: found.reason };
  };
}

/** Итоговый отчёт: только имена, количества и судьба поля при переносе. */
export function buildReport(counted, classify, meta) {
  const fields = Object.entries(counted.counts).map(([name, docs]) => ({ name, docs, ...classify(name) }));
  const blocking = fields.filter((field) => field.disposition === 'hold');
  return {
    format: 'accounts-v2-root-fields-census/1',
    mode: meta.mode,
    docsScanned: counted.docs,
    truncated: meta.truncated,
    distinctFields: fields.length,
    blockingFields: blocking.map((field) => ({ name: field.name, docs: field.docs, reason: field.reason ?? null })),
    fields,
  };
}

export function planText(target) {
  return [
    `${LOG} ПЛАН (сеть не используется, данные не читаются).`,
    `${LOG} Что сделает запуск с целью: прочитает users/* порциями по ${target.pageSize} (курсор по __name__),`,
    `${LOG} не больше ${target.maxDocs} документов, посчитает в памяти ИМЕНА корневых полей и напечатает агрегаты:`,
    `${LOG} имя → число документов → правило инвентаря (UNKNOWN = HOLD переноса). Значения, uid и id не печатаются.`,
    `${LOG} Стоимость: 1 чтение Firestore на документ (до ${target.maxDocs} чтений). Записей нет.`,
    `${LOG} Эмулятор: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/accounts_v2_root_fields_census.mjs --emulator`,
    `${LOG} Прод (только по команде владельца): node scripts/accounts_v2_root_fields_census.mjs --project=<id> --owner-command="<дословно>" [--max-docs=N]`,
  ].join('\n');
}

async function openFirestore(target) {
  // зачем: firebase-admin грузится ТОЛЬКО при явной цели (эмулятор или прод с командой владельца).
  const requireFn = createRequire(resolve(REPO, 'functions', 'package.json'));
  const admin = requireFn('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ projectId: target.projectId });
  return { admin, db: admin.firestore() };
}

/** Постраничное чтение users/* с курсором; данные документа сразу сводятся к именам ключей. */
export async function scanUsers(db, documentIdField, target, counter, log = console.log) {
  let cursor = null;
  let read = 0;
  for (;;) {
    const remaining = target.maxDocs - read;
    if (remaining <= 0) return { truncated: true };
    let query = db.collection(USERS).orderBy(documentIdField).limit(Math.min(target.pageSize, remaining));
    if (cursor) query = query.startAfter(cursor);
    const startedAt = Date.now();
    const page = await query.get();
    if (page.empty) return { truncated: false };
    for (const doc of page.docs) counter.add(doc.data());
    read += page.size;
    cursor = page.docs[page.docs.length - 1];
    log(`${LOG} page docs=${page.size} total=${read} ms=${Date.now() - startedAt}`);
    if (page.size < Math.min(target.pageSize, remaining)) return { truncated: false };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = resolveTarget(args, process.env);
  if ('error' in target) {
    console.error(`${LOG} отказ: ${target.error}`);
    process.exit(2);
  }
  if (target.mode === 'plan') {
    console.log(planText(target));
    return;
  }
  console.log(`${LOG} start mode=${target.mode} pageSize=${target.pageSize} maxDocs=${target.maxDocs}`
    + (target.mode === 'prod' ? ` ownerCommandSha=${createHash('sha256').update(String(args['owner-command'])).digest('hex').slice(0, 12)}` : ''));
  const classify = loadClassifier();
  const { admin, db } = await openFirestore(target);
  const counter = createRootFieldCounter();
  const { truncated } = await scanUsers(db, admin.firestore.FieldPath.documentId(), target, counter);
  const report = buildReport(counter.result(), classify, { mode: target.mode, truncated });
  console.log(JSON.stringify(report, null, 2));
  console.log(`${LOG} done docs=${report.docsScanned} distinctFields=${report.distinctFields} blocking=${report.blockingFields.length} truncated=${truncated}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    // Причина без данных: только класс и код ошибки.
    console.error(`${LOG} failed ${error instanceof Error ? error.name : typeof error} code=${String(error?.code ?? '').slice(0, 40)}`);
    process.exit(1);
  });
}
