// PM-290: пробный прогон миграции денежного журнала на синтетическом снимке хранилища (без записи куда-либо).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_PREFIXES, planShardLedgerRetirement } from '../scripts/pm290_shard_ledger_dry_run.mjs';

const OWNER = 'user%3Aa';
const op = (id, grant, authority = 'client') => [`client_shard_operation_v1:${OWNER}:${id}`, JSON.stringify({ operationId: id, authority, grant })];
const base = () => Object.fromEntries([
  ['shards_balance', '137'],
  ['shards_balance_meta_v1', '{"revision":3}'],
  [`client_shard_ledger_state_v1:${OWNER}`, '{"revision":3}'],
  op('op-lesson-5', { kind: 'lesson_pearl_unlock', subjectId: 'lesson-5', payload: { storageKey: 'lessons_pearl_unlocked_v1', lessonId: 5 } }),
  op('op-pack-1', { kind: 'official_card_pack', subjectId: 'pack_b1', payload: { studyTarget: 'en' } }),
  ['lessons_pearl_unlocked_v1', '[1,5]'],
  ['flashcards_owned_packs_v1', '["pack_b1"]'],
  ['runes_wallet_v1:user', '{"balance":420}'],
  ['coin_rank_v1:user', '{"rank":3}'],
  ['user_settings', '{}'],
]);

test('чистый снимок: план переносит всё, баланс монет и все чужие ключи не меняются', () => {
  const plan = planShardLedgerRetirement(base());
  assert.equal(plan.ok, true, plan.problems.join('; '));
  assert.equal(plan.pearlBalanceZeroed, 137);
  assert.equal(plan.portableEntitlements.length, 2);
  assert.ok(plan.portableEntitlements.every((entry) => entry.materialized));
  assert.equal(plan.invariants.walletKeysFound, 2);
  assert.equal(plan.invariants.walletKeysNotInDeleteSet, true);
  assert.ok(!Object.keys(plan.backup).some((key) => /runes_wallet|coin_rank|user_settings|lessons_pearl/.test(key)));
  assert.equal(plan.backupKeys, plan.counts.delete);
});

test('откат: резервная копия содержит ровно удаляемые пары и восстанавливает снимок один в один', () => {
  const snapshot = base();
  const plan = planShardLedgerRetirement(snapshot);
  const after = Object.fromEntries(Object.entries(snapshot).filter(([key]) => !(key in plan.backup)));
  assert.deepEqual({ ...after, ...plan.backup }, snapshot);
  assert.ok(Object.keys(plan.backup).every((key) => key === 'shards_balance' || key === 'shards_balance_meta_v1' || LEDGER_PREFIXES.some((p) => key.startsWith(p))));
});

test('купленное право, которого нет в хозяйском ключе, останавливает миграцию', () => {
  const snapshot = base();
  snapshot.lessons_pearl_unlocked_v1 = '[1]';
  const plan = planShardLedgerRetirement(snapshot);
  assert.equal(plan.ok, false);
  assert.match(plan.problems.join(' '), /entitlement_not_materialized:lesson_pearl_unlock:lesson-5/);
});

test('незавершённая операция и запись конфликта останавливают миграцию', () => {
  const snapshot = { ...base(), [`client_shard_prepared_v1:${OWNER}`]: '{}', [`client_shard_conflict_v1:${OWNER}`]: '{}' };
  const plan = planShardLedgerRetirement(snapshot);
  assert.equal(plan.ok, false);
  assert.match(plan.problems.join(' '), /prepared_operation_pending:1/);
  assert.match(plan.problems.join(' '), /conflict_records_present:1/);
});

test('повреждённая запись операции не пропадает молча', () => {
  const snapshot = { ...base(), [`client_shard_operation_v1:${OWNER}:broken`]: '{bad' };
  const plan = planShardLedgerRetirement(snapshot);
  assert.equal(plan.ok, false);
  assert.match(plan.problems.join(' '), /operation_unparseable/);
});
