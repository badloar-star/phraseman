#!/usr/bin/env node
// Пакет 8S — сколько людей УЖЕ прошли сверку монет (coinReconcileV1) до 8S, имея
// аккаунты, скрытые слиянием, со Spin-результатами. ТОЛЬКО чтение, в выводе только числа.
//
// зачем: до 8S сверка читала level_spin_results лишь текущего stableUid; Spin-призы
// аккаунтов, слитых в него (auth_merge.ts не копирует level_spin_* — PM-067), не
// учитывались. Сверка одноразовая: у кого запись coinReconcileV1 уже есть, 8S не
// досчитает автоматически. Скрипт даёт масштаб для решения владельца/координатора.
//
// Связь «скрытый → победитель» та же, что в functions/src/coin_reconcile_v1.ts:
// users/{loser}.identityHidden == true, canonicalStableId = родитель (цепочки сворачиваются
// до корня). Запись до 8S = coinReconcileV1 без поля mergedLoserCount.
//
// Стоимость (прод):
//   базово — count(hidden) [1 чтение/1000] + по 1 чтению на скрытый аккаунт (select одного
//   поля) + по 1 на корень-победитель (getAll c fieldMask) + count() Spin-результатов по
//   1 чтению на скрытый аккаунт затронутых победителей;
//   --deep (опция) — ещё документы level_spin_results затронутых скрытых (limit 500 на
//   аккаунт) и расписки star_operations по семье (getAll) → точная сумма непроведённых монет.
//
// Жёсткие границы: никаких записей; в выводе ни uid, ни id, ни значений полей.
// firebase-admin грузится только при явной цели: --emulator (FIRESTORE_EMULATOR_HOST) или прод
// --project=<id> --owner-command="<дословная команда владельца/координатора>". Без цели — план.
//
// Запуск:
//   node scripts/coin_reconcile_merged_losers_count.mjs                    → план (без сети)
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/coin_reconcile_merged_losers_count.mjs --emulator [--deep]
//   node scripts/coin_reconcile_merged_losers_count.mjs --project=<id> --owner-command="<команда>" [--deep]
// Коды выхода: 0 — план/отчёт; 2 — запрещённые аргументы; 1 — сбой чтения.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[COIN-RECONCILE-8S-COUNT]';

/** Зеркало functions/src/coin_reconcile_v1.ts (COIN_RECONCILE_V1_SPIN_AMOUNTS). */
export const SPIN_AMOUNTS = Object.freeze({
  stars_10: 10, stars_20: 20, stars_50: 50, stars_100: 100,
  stars_250: 250, stars_500: 500, stars_1000: 1_000,
});
export const MAX_CHAIN_HOPS = 8;
export const PAGE_SIZE = 300;
export const RESULTS_LIMIT = 500;

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
  for (const forbidden of ['execute', 'write', 'fix', 'delete', 'apply', 'repair', 'grant', 'raise']) {
    if (args[forbidden] !== undefined) return { error: `--${forbidden}: скрипт только читает, запись запрещена` };
  }
  const deep = args.deep === true;
  if (args.emulator) {
    if (!env.FIRESTORE_EMULATOR_HOST) return { error: '--emulator требует FIRESTORE_EMULATOR_HOST' };
    if (args.project !== undefined) return { error: '--emulator и --project одновременно запрещены' };
    return { mode: 'emulator', projectId: env.GCLOUD_PROJECT || 'demo-phraseman', deep };
  }
  if (args.project === undefined && args['owner-command'] === undefined) return { mode: 'plan', deep };
  if (typeof args.project !== 'string' || !/^[a-z][a-z0-9-]{4,62}$/.test(args.project.trim())) return { error: 'прод без --project=<id> запрещён' };
  if (typeof args['owner-command'] !== 'string' || args['owner-command'].trim().length < 10) {
    return { error: 'прод без --owner-command="<дословная команда владельца>" запрещён' };
  }
  if (env.FIRESTORE_EMULATOR_HOST) return { error: 'FIRESTORE_EMULATOR_HOST задан — прод и эмулятор не смешиваем' };
  return { mode: 'prod', projectId: args.project.trim(), deep };
}

export function planText() {
  return [
    `${LOG} план (без сети): записей нет, в выводе только числа`,
    `${LOG}   1. count(users where identityHidden == true)`,
    `${LOG}   2. users where identityHidden == true, select(canonicalStableId), страницы по ${PAGE_SIZE} → корень цепочки (≤ ${MAX_CHAIN_HOPS} шагов)`,
    `${LOG}   3. getAll(users/{корень}, fieldMask=coinReconcileV1) → до 8S / после 8S / не сверялся`,
    `${LOG}   4. для корней «до 8S»: count(users/{скрытый}/level_spin_results)`,
    `${LOG}   --deep: + документы level_spin_results (limit ${RESULTS_LIMIT}) и расписки star_operations семьи → непроведённые монеты`,
  ].join('\n');
}

/** Корень цепочки скрытий (hidden → canonical → …). null при цикле/слишком длинной цепочке. */
export function rootOf(id, parentOf) {
  let current = id;
  for (let hop = 0; hop < MAX_CHAIN_HOPS; hop += 1) {
    const parent = parentOf.get(current);
    if (!parent) return current;
    if (parent === id) return null;
    current = parent;
  }
  return parentOf.has(current) ? null : current;
}

/** pairs: [{ id, canonical }] скрытых → Map(корень → [скрытые]). */
export function groupLosersByRoot(pairs) {
  const parentOf = new Map();
  for (const { id, canonical } of pairs) {
    if (typeof canonical === 'string' && canonical.trim() && canonical.trim() !== id) parentOf.set(id, canonical.trim());
  }
  const groups = new Map();
  let broken = 0;
  for (const id of parentOf.keys()) {
    const root = rootOf(id, parentOf);
    if (!root) { broken += 1; continue; }
    groups.set(root, [...(groups.get(root) ?? []), id]);
  }
  return { groups, broken };
}

/** 'none' — не сверялся (8S учтёт сам); 'pre_8s' — сверен до 8S; 'post_8s' — сверен с учётом слитых. */
export function classifyRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schemaVersion !== 1) return 'none';
  return Number.isSafeInteger(raw.mergedLoserCount) ? 'post_8s' : 'pre_8s';
}

/** Монетные выданные дорожки результата (та же форма, что в сверке). */
export function coinLanesOf(id, data) {
  const deliveries = data && typeof data.deliveries === 'object' && !Array.isArray(data.deliveries) ? data.deliveries : {};
  const lanes = [];
  for (const lane of ['base', 'premium']) {
    const delivery = deliveries[lane];
    if (!delivery || delivery.state !== 'delivered') continue;
    const amount = SPIN_AMOUNTS[delivery.selectedGiftId];
    if (amount === undefined) continue;
    lanes.push({ opId: `level_spin:${id}.${lane}`, amount });
  }
  return lanes;
}

/** Отчёт из чисел (без uid и значений). */
export function reportText(counts) {
  return Object.entries(counts).map(([key, value]) => `${LOG} ${key}=${value}`).join('\n');
}

async function runCounts(projectId, deep) {
  const require = createRequire(resolve(REPO, 'functions', 'package.json'));
  const admin = require('firebase-admin');
  if (admin.apps.length === 0) admin.initializeApp({ projectId });
  const db = admin.firestore();
  const users = db.collection('users');
  const hiddenQuery = users.where('identityHidden', '==', true);
  const counts = {
    hidden_total: (await hiddenQuery.count().get()).data().count, // guard-ok: агрегат, документы не читаются
  };
  const pairs = [];
  let cursor = null;
  for (;;) {
    let page = hiddenQuery.orderBy(admin.firestore.FieldPath.documentId()).select('canonicalStableId').limit(PAGE_SIZE);
    if (cursor) page = page.startAfter(cursor);
    const snap = await page.get(); // guard-ok: постранично, одно поле, только скрытые
    for (const doc of snap.docs) pairs.push({ id: doc.id, canonical: doc.get('canonicalStableId') });
    if (snap.size < PAGE_SIZE) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
  const { groups, broken } = groupLosersByRoot(pairs);
  counts.hidden_scanned = pairs.length;
  counts.hidden_chain_broken = broken;
  counts.roots_total = groups.size;
  const roots = [...groups.keys()];
  const records = new Map();
  for (let i = 0; i < roots.length; i += 100) {
    const refs = roots.slice(i, i + 100).map((id) => users.doc(id));
    const snaps = await db.getAll(...refs, { fieldMask: ['coinReconcileV1'] }); // guard-ok: getAll чанками по 100, одно поле
    snaps.forEach((snap) => records.set(snap.id, snap.exists ? classifyRecord(snap.get('coinReconcileV1')) : 'root_missing'));
  }
  const byClass = { none: 0, pre_8s: 0, post_8s: 0, root_missing: 0 };
  for (const value of records.values()) byClass[value] = (byClass[value] ?? 0) + 1;
  counts.roots_not_reconciled = byClass.none;
  counts.roots_reconciled_post_8s = byClass.post_8s;
  counts.roots_missing = byClass.root_missing;
  counts.roots_reconciled_pre_8s = byClass.pre_8s;

  const preRoots = roots.filter((root) => records.get(root) === 'pre_8s');
  let affectedRoots = 0;
  let losersWithResults = 0;
  let unpaidLanes = 0;
  let unpaidCoins = 0;
  let affectedRootsDeep = 0;
  for (const root of preRoots) {
    const losers = groups.get(root) ?? [];
    const resultCounts = await Promise.all(losers.map(async (loser) => (
      (await users.doc(loser).collection('level_spin_results').count().get()).data().count // guard-ok: агрегат на скрытого затронутого победителя
    )));
    const withResults = losers.filter((_loser, index) => resultCounts[index] > 0);
    losersWithResults += withResults.length;
    if (withResults.length > 0) affectedRoots += 1;
    if (!deep || withResults.length === 0) continue;
    const family = [root, ...losers];
    let rootUnpaid = 0;
    for (const loser of withResults) {
      const results = await users.doc(loser).collection('level_spin_results').limit(RESULTS_LIMIT).get(); // guard-ok: --deep, limit
      const lanes = results.docs.flatMap((doc) => coinLanesOf(doc.id, doc.data()));
      if (lanes.length === 0) continue;
      const receiptRefs = lanes.flatMap((lane) => family.map((owner) => users.doc(owner).collection('star_operations').doc(lane.opId)));
      const receipts = await db.getAll(...receiptRefs); // guard-ok: --deep, одним getAll на скрытого
      lanes.forEach((lane, index) => {
        const paid = receipts.slice(index * family.length, (index + 1) * family.length).some((snap) => snap.exists);
        if (paid) return;
        unpaidLanes += 1;
        unpaidCoins += lane.amount;
        rootUnpaid += lane.amount;
      });
    }
    if (rootUnpaid > 0) affectedRootsDeep += 1;
  }
  counts.pre_8s_roots_with_loser_spin_results = affectedRoots;
  counts.pre_8s_losers_with_spin_results = losersWithResults;
  if (deep) {
    counts.deep_pre_8s_roots_with_unpaid_coins = affectedRootsDeep;
    counts.deep_unpaid_lanes = unpaidLanes;
    counts.deep_unpaid_coins_total = unpaidCoins;
  }
  return counts;
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
    console.log(`${LOG} mode=${target.mode} project=${target.projectId} deep=${target.deep}`);
    console.log(reportText(await runCounts(target.projectId, target.deep)));
  } catch (error) {
    console.error(`${LOG} read_failed kind=${error instanceof Error ? error.name : typeof error} code=${error?.code ?? 'none'}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
