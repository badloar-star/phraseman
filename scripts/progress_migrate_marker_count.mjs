#!/usr/bin/env node
// Пакет 8G — оценка масштаба для владельца (ТОЛЬКО чтение, только агрегаты .count()).
//
// зачем: progressMigrateSnapshot до 8G при пустом снимке ЗАМЕНЯЛ облачный progress пустым,
// если у аккаунта ещё не было маркера users/{id}/progress_migrations/client_snapshot_v1.
// В зоне риска — аккаунты без маркера. Firestore не умеет «посчитать документы без
// поддокумента» одним запросом, поэтому печатаем три агрегата и разность:
//   A = count(users)
//   B = count(collectionGroup progress_migrations) — маркеры (код пишет только client_snapshot_v1; без фильтра —
//       для collectionGroup с фильтром нужен отдельный индекс области «группа коллекций»)
//   C = count(users, progressServerAuthoritative == true)
//   A − B ≈ аккаунты без маркера (верхняя оценка зоны риска; сироты-маркеры удалённых аккаунтов её занижают).
// Стоимость: агрегат count() — 1 чтение на каждые 1000 записей индекса; документы не читаются.
//
// Жёсткие границы: никаких записей; в выводе только числа (ни uid, ни id, ни значений).
// firebase-admin грузится только при явной цели: --emulator (FIRESTORE_EMULATOR_HOST) или прод
// --project=<id> --owner-command="<дословная команда владельца>". Без цели — только план.
//
// Запуск:
//   node scripts/progress_migrate_marker_count.mjs                    → план (без сети)
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/progress_migrate_marker_count.mjs --emulator
//   node scripts/progress_migrate_marker_count.mjs --project=<id> --owner-command="<команда владельца>"
// Коды выхода: 0 — план/отчёт; 2 — запрещённые аргументы; 1 — сбой чтения.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[PROGRESS-MIGRATE-COUNT]';

export const AGGREGATES = Object.freeze([
  { name: 'users_total', describe: 'count(users)' },
  { name: 'migration_markers', describe: "count(collectionGroup('progress_migrations'))" },
  { name: 'users_server_authoritative', describe: 'count(users where progressServerAuthoritative == true)' },
]);

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

/** Цель запуска или причина отказа. Без цели — только план. */
export function resolveTarget(args, env) {
  for (const forbidden of ['execute', 'write', 'fix', 'delete', 'apply', 'repair']) {
    if (args[forbidden] !== undefined) return { error: `--${forbidden}: скрипт только читает, запись запрещена` };
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
    `${LOG} план (без сети): только агрегаты count(), документы не читаются, записей нет`,
    ...AGGREGATES.map((item) => `${LOG}   ${item.name}: ${item.describe}`),
    `${LOG}   без маркера ≈ users_total − migration_markers (верхняя оценка зоны риска до 8G)`,
  ].join('\n');
}

/** Отчёт из чисел (без uid и значений). */
export function reportText(counts) {
  const withoutMarker = Math.max(0, counts.users_total - counts.migration_markers);
  return [
    ...AGGREGATES.map((item) => `${LOG} ${item.name}=${counts[item.name]}`),
    `${LOG} users_without_marker_estimate=${withoutMarker}`,
  ].join('\n');
}

async function runCounts(projectId) {
  const require = createRequire(resolve(REPO, 'functions', 'package.json'));
  const admin = require('firebase-admin');
  if (admin.apps.length === 0) admin.initializeApp({ projectId });
  const db = admin.firestore();
  const count = async (query) => (await query.count().get()).data().count; // guard-ok: агрегат, документы не читаются
  return {
    users_total: await count(db.collection('users')),
    migration_markers: await count(db.collectionGroup('progress_migrations')),
    users_server_authoritative: await count(db.collection('users').where('progressServerAuthoritative', '==', true)),
  };
}

async function main() {
  const target = resolveTarget(parseArgs(process.argv.slice(2)), process.env);
  if ('error' in target) {
    console.error(`${LOG} отказ: ${target.error}`);
    process.exit(2);
  }
  if (target.mode === 'plan') {
    console.log(planText());
    return;
  }
  try {
    console.log(`${LOG} mode=${target.mode} project=${target.projectId}`);
    console.log(reportText(await runCounts(target.projectId)));
  } catch (error) {
    console.error(`${LOG} read_failed kind=${error instanceof Error ? error.name : typeof error} code=${error?.code ?? 'none'}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
