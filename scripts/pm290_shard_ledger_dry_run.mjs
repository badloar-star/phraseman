#!/usr/bin/env node
// PM-290: ПРОБНЫЙ прогон миграции денежного журнала шардов (client_shard_operation_ledger). Только чтение и расчёт плана.
// зачем: удаление журнала затрагивает деньги пользователей (D70/D84) и купленные права (карточные наборы, аватары, ауры, уроки,
// которые другое устройство достраивает ИЗ журнала). Пока гейт MIGRATION_AND_ROLLBACK не одобрен, код журнала не удаляется — этот
// инструмент считает, что именно перенесётся/обнулится, и проверяет инварианты на снимке хранилища (JSON {ключ: значение}).
// Запись в хранилище или в боевую базу здесь невозможна по построению: функции чистые, скрипт читает только файл.
// Запуск: node scripts/pm290_shard_ledger_dry_run.mjs <снимок.json> [--report <отчёт.json>]
import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const LOG = '[PM290-DRYRUN]';
// Всё, что принадлежит журналу (совпадает со списком blocklist в app/cloud_sync.ts) + флаги «оплачено» редьюсера.
export const LEDGER_PREFIXES = [
  'client_shard_operation_v1:', 'client_shard_ledger_state_v1:', 'client_shard_prepared_v1:', 'client_shard_grant_receipt_v1:',
  'client_shard_cloud_synced_v1:', 'client_shard_conflict_v1:', 'client_shard_phone_state_outbox_v1:', 'client_shard_semantic_paid_v1:',
];
export const PEARL_BALANCE_KEYS = ['shards_balance', 'shards_balance_meta_v1'];
const PORTABLE_KINDS = new Set(['official_card_pack', 'custom_avatar', 'avatar_aura', 'lesson_pearl_unlock']);

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
const isLedgerKey = (key) => LEDGER_PREFIXES.some((prefix) => key.startsWith(prefix));
const isPlannedDelete = (key) => isLedgerKey(key) || PEARL_BALANCE_KEYS.includes(key);

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} json_unparseable reason=${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/** Лежит ли купленное право в «хозяйском» ключе (иначе при удалении журнала оно пропадёт для других устройств). */
export function entitlementMaterialized(snapshot, grant) {
  if (grant.kind === 'lesson_pearl_unlock') {
    const storageKey = String(grant.payload?.storageKey ?? '');
    const lessonId = Math.floor(Number(grant.payload?.lessonId) || 0);
    const list = parseJson(snapshot[storageKey] ?? 'null');
    return Array.isArray(list) && list.includes(lessonId);
  }
  // Карточные наборы/аватары/ауры: ищем subjectId в ключах владения (эвристика — точные ключи сверяет рецензент по коду).
  return Object.keys(snapshot).some((key) => /owned/.test(key) && !isLedgerKey(key) && String(snapshot[key]).includes(grant.subjectId));
}

export function planShardLedgerRetirement(snapshot) {
  const keys = Object.keys(snapshot);
  const deleteKeys = keys.filter(isPlannedDelete).sort();
  const keepKeys = keys.filter((key) => !isPlannedDelete(key)).sort();
  const perPrefix = Object.fromEntries(LEDGER_PREFIXES.map((prefix) => [prefix, keys.filter((key) => key.startsWith(prefix)).length]));

  const pearlBalance = Number(snapshot.shards_balance ?? 0) || 0;
  const portable = [];
  const problems = [];
  for (const key of keys.filter((k) => k.startsWith('client_shard_operation_v1:'))) {
    const op = parseJson(snapshot[key]);
    if (!op || typeof op !== 'object') {
      problems.push(`operation_unparseable:${key}`);
      continue;
    }
    const grant = op.grant;
    if (op.authority === 'client' && grant && PORTABLE_KINDS.has(grant.kind)) {
      const materialized = entitlementMaterialized(snapshot, grant);
      portable.push({ kind: grant.kind, subjectId: grant.subjectId, materialized });
      if (!materialized) problems.push(`entitlement_not_materialized:${grant.kind}:${grant.subjectId}`);
    }
  }
  // Незавершённая операция (prepared) могла бы потерять деньги — удалять нельзя, пока она не разобрана.
  const prepared = keys.filter((key) => key.startsWith('client_shard_prepared_v1:'));
  if (prepared.length > 0) problems.push(`prepared_operation_pending:${prepared.length}`);
  const conflicts = keys.filter((key) => key.startsWith('client_shard_conflict_v1:'));
  if (conflicts.length > 0) problems.push(`conflict_records_present:${conflicts.length}`);

  // Инвариант «баланс монет не меняется»: ключи вне плана удаления неизменны, монетный/рунный кошелёк — среди них.
  const fingerprintOf = (source) => sha(Object.keys(source).sort().map((key) => `${key}=${source[key]}`).join('\n'));
  const keptBefore = Object.fromEntries(keepKeys.map((key) => [key, snapshot[key]]));
  const keptAfter = Object.fromEntries(keys.filter((key) => !deleteKeys.includes(key)).map((key) => [key, snapshot[key]]));
  const walletKeys = keepKeys.filter((key) => /rune|coin|wallet/i.test(key));
  const invariants = {
    keptKeysUnchanged: fingerprintOf(keptBefore) === fingerprintOf(keptAfter),
    walletKeysNotInDeleteSet: walletKeys.every((key) => !deleteKeys.includes(key)),
    walletKeysFound: walletKeys.length,
  };
  const backup = Object.fromEntries(deleteKeys.map((key) => [key, snapshot[key]]));
  return {
    ok: problems.length === 0 && invariants.keptKeysUnchanged && invariants.walletKeysNotInDeleteSet,
    counts: { total: keys.length, delete: deleteKeys.length, keep: keepKeys.length, perPrefix },
    pearlBalanceZeroed: pearlBalance,
    portableEntitlements: portable,
    problems,
    invariants,
    keptFingerprint: fingerprintOf(keptBefore),
    backupKeys: deleteKeys.length,
    backup, // откат = записать эти пары обратно (setItem по каждому ключу), остальное не менялось
  };
}

function main(argv) {
  const file = argv[0];
  if (!file) {
    console.error(`${LOG} usage: pm290_shard_ledger_dry_run.mjs <снимок.json> [--report <файл>]`);
    return 2;
  }
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  const plan = planShardLedgerRetirement(snapshot);
  const { backup: _backup, ...summary } = plan;
  console.log(`${LOG} ${JSON.stringify(summary, null, 2)}`);
  const at = argv.indexOf('--report');
  if (at >= 0 && argv[at + 1]) {
    fs.writeFileSync(argv[at + 1], JSON.stringify(plan, null, 2));
    console.log(`${LOG} report written (с резервной копией ключей для отката)`);
  }
  return plan.ok ? 0 : 1;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)));
