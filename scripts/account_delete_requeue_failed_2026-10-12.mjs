#!/usr/bin/env node
// зачем (координатор 12.10, ACCOUNT_DELETE_INDEX_INCIDENT §5): три удаления аккаунта упали на стадии
// collection_group_matches (нет индекса idea_likes_sent.targetAuthorUid). Задачи воркера ушли в failed
// после 8 попыток и сами не оживут; прямой accountDeleteMine задачу не создаёт вовсе. Админская
// adminQueueAccountDeletion для них не годится — она до сих пор требует App Check (request.app), которого нет.
//
// ⛔ ЗАПУСК С --apply ТОЛЬКО ПО «ДА» ВЛАДЕЛЬЦА и только ПОСЛЕ деплоя индексов и кода collect_peers (2027e3b2b):
// иначе удаление снова упадёт на той же стадии или уйдёт в полный перебор users.
//
// Режимы:
//   node scripts/account_delete_requeue_failed_2026-10-12.mjs            — только чтение: проверка индексов + поиск задач
//   node scripts/account_delete_requeue_failed_2026-10-12.mjs --apply --owner-yes [--no-grace]
//                                                                         — повторная постановка через серверный
//                                                                           enqueueAccountDeletionJob (failed → queued)
// Перед запуском: собрать functions (скрипт берёт скомпилированный код из functions/lib), войти
// `gcloud auth application-default login`. В вывод не попадают uid — только префиксы хешей.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const admin = require('firebase-admin');
const lib = (name) => require(`./lib/functions/src/${name}.js`);
const { accountDeleteCollectionGroupPlan } = lib('account_delete');
const {
  ACCOUNT_DELETE_JOBS,
  ACCOUNT_DELETE_TOMBSTONES,
  ACCOUNT_DELETE_AUTH_MARKERS,
  enqueueAccountDeletionJob,
} = lib('account_delete_job');

const TARGET_PROJECT = 'phraseman-ea0b3';
/** Префиксы stableUidHash из журнала (§5): воркер 2c1cdfe0/8ab721e3, прямой Mine 89fd3ced. */
const HASH_PREFIXES = ['2c1cdfe0', '8ab721e3', '89fd3ced'];
const TAG = '[ADEL-REQUEUE]';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const OWNER_YES = args.has('--owner-yes');
const NO_GRACE = args.has('--no-grace');

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: TARGET_PROJECT });
const db = admin.firestore();

const log = (event, extra = {}) => console.log(`${TAG} ${event} ${JSON.stringify(extra)}`);

/** Каждый запрос стадии collection_group_matches пустым значением: код 9 = индекса нет. */
async function probeIndexes() {
  const plan = accountDeleteCollectionGroupPlan('__adel_probe_stable__', '__adel_probe_auth__');
  const seen = new Set();
  const missing = [];
  for (const spec of plan) {
    const key = `${spec.collectionGroup}.${spec.field}.${spec.op}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await db.collectionGroup(spec.collectionGroup).where(spec.field, spec.op, spec.value).limit(1).get();
    } catch (e) {
      missing.push({ key, code: e?.code ?? 'unknown', message: String(e?.message ?? e).slice(0, 120) });
    }
  }
  // Узкий путь collect_peers (2027e3b2b): обход групп по __name__ без индексов — проверяем, что он читается.
  for (const group of ['friend_requests', 'blocked']) {
    try {
      await db.collectionGroup(group).orderBy(admin.firestore.FieldPath.documentId()).select().limit(1).get();
    } catch (e) {
      missing.push({ key: `${group}.__name__`, code: e?.code ?? 'unknown', message: String(e?.message ?? e).slice(0, 120) });
    }
  }
  log('indexes', { probed: seen.size + 2, missing: missing.length });
  for (const m of missing) log('index:missing', m);
  return missing;
}

async function findByHashPrefix(collection, prefix) {
  const snap = await db.collection(collection)
    .where('stableUidHash', '>=', prefix)
    .where('stableUidHash', '<', `${prefix}`)
    .limit(5)
    .get();
  return snap.docs;
}

async function inspect(prefix) {
  const [jobs, tombstones, markers] = await Promise.all([
    findByHashPrefix(ACCOUNT_DELETE_JOBS, prefix),
    findByHashPrefix(ACCOUNT_DELETE_TOMBSTONES, prefix),
    findByHashPrefix(ACCOUNT_DELETE_AUTH_MARKERS, prefix),
  ]);
  const job = jobs[0]?.data() ?? null;
  log('target', {
    prefix,
    jobs: jobs.length,
    jobStatus: job?.status ?? null,
    jobAttempts: job?.attempts ?? null,
    jobNextAttempt: job?.nextAttemptAtMs ? new Date(job.nextAttemptAtMs).toISOString() : null,
    jobLastError: job?.lastError ? String(job.lastError).slice(0, 160) : null,
    tombstones: tombstones.length,
    tombstoneStatus: tombstones[0]?.data()?.status ?? null,
    authMarkers: markers.length,
  });
  if (jobs.length > 1 || tombstones.length > 1 || markers.length > 1) {
    log('target:ambiguous', { prefix, reason: 'prefix_matches_several_docs' });
    return null;
  }
  if (job) return { prefix, kind: 'job', authUid: job.authUid, stableUid: job.stableUid, closure: job.identityClosure, status: job.status };
  if (tombstones[0] && markers[0]) {
    return { prefix, kind: 'mine', authUid: markers[0].id, stableUid: tombstones[0].id, closure: undefined, status: 'no_job' };
  }
  log('target:not_found', { prefix, reason: 'no_job_and_no_tombstone_marker_pair' });
  return null;
}

async function requeue(target) {
  if (target.kind === 'job' && target.status !== 'failed') {
    log('apply:skip', { prefix: target.prefix, reason: `job_status_${target.status}` });
    return;
  }
  const res = await enqueueAccountDeletionJob(db, target.authUid, target.stableUid, Date.now(), undefined, target.closure);
  log('apply:enqueued', { prefix: target.prefix, kind: target.kind, status: res.status, created: res.created });
  // Новая задача для прямого Mine получает 14 дней grace; человек уже подтвердил удаление — по флагу без ожидания.
  if (target.kind === 'mine' && NO_GRACE && res.created) {
    await db.collection(ACCOUNT_DELETE_JOBS).doc(res.jobId).update({ nextAttemptAtMs: Date.now(), updatedAtMs: Date.now() });
    log('apply:no_grace', { prefix: target.prefix });
  }
}

async function main() {
  log('start', { apply: APPLY, ownerYes: OWNER_YES, noGrace: NO_GRACE, prefixes: HASH_PREFIXES });
  const missing = await probeIndexes();
  const targets = [];
  for (const prefix of HASH_PREFIXES) {
    const t = await inspect(prefix);
    if (t) targets.push(t);
  }
  if (!APPLY) {
    log('done:dry_run', { targets: targets.length, missingIndexes: missing.length });
    return;
  }
  if (!OWNER_YES) {
    log('abort', { reason: 'owner_yes_flag_missing' });
    process.exitCode = 2;
    return;
  }
  if (missing.length > 0) {
    log('abort', { reason: 'indexes_missing', missing: missing.length });
    process.exitCode = 3;
    return;
  }
  for (const t of targets) {
    try {
      await requeue(t);
    } catch (e) {
      log('apply:failed', { prefix: t.prefix, code: e?.code ?? 'unknown', message: String(e?.message ?? e).slice(0, 160) });
      process.exitCode = 1;
    }
  }
  log('done:apply', { targets: targets.length });
}

main().catch((e) => {
  log('fatal', { code: e?.code ?? 'unknown', message: String(e?.message ?? e).slice(0, 200) });
  process.exitCode = 1;
});
