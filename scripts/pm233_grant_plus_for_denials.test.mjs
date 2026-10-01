// Сторож D137: скрипт выдачи Plus по denials по умолчанию только печатает план без PII,
// а исполнение отклоняется без подтверждения, срока и явной цели (прод — только с --project
// и командой владельца). Запуск: node --test scripts/pm233_grant_plus_for_denials.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { CONFIRM_TOKEN, buildPlan, classifyDenial, executeRefusal, parseArgs } from './pm233_grant_plus_for_denials.mjs';

const SCRIPT = 'scripts/pm233_grant_plus_for_denials.mjs';
const FIXTURE = 'scripts/fixtures/pm233_d137_denials.sample.json';
const run = (args, env = {}) => spawnSync(process.execPath, [SCRIPT, ...args], {
  encoding: 'utf8',
  env: { ...process.env, FIRESTORE_EMULATOR_HOST: '', ...env },
});

test('classifies denials: one owner is grantable, anonymous/ambiguous/transfer need identity, deleted are skipped', () => {
  assert.equal(classifyDenial('evt', { reason: 'owner_lineage_limit', ownerUid: 'user-1' }).kind, 'grantable');
  assert.equal(classifyDenial('evt', { reason: 'account_deletion_pending_or_tombstoned', ownerUid: 'user-1' }).kind, 'skip_deleted_account');
  assert.equal(classifyDenial('evt', { reason: 'ambiguous_owner', ownerUids: ['a1', 'b2'] }).kind, 'needs_identity');
  assert.equal(classifyDenial('evt', { reason: 'missing_authoritative_owner' }).kind, 'needs_identity');
  assert.equal(classifyDenial('transfer_x', { reason: 'transfer_lineage_limit', ownerUid: 'user-1' }).kind, 'needs_identity');
});

test('fixture dry run prints aggregates only — no uid ever reaches the output', () => {
  const out = run([`--fixture=${FIXTURE}`]);
  assert.equal(out.status, 0, out.stderr);
  const plan = JSON.parse(out.stdout);
  assert.equal(plan.executes, false);
  assert.deepEqual(plan.totals, { denials: 7, grantable: 3, needs_identity: 3, skip_deleted_account: 1 });
  assert.equal(plan.uniqueOwnersToGrant, 2);
  assert.doesNotMatch(out.stdout + out.stderr, /fixture-user-\d/);
  const sameShape = buildPlan([{ id: 'e', doc: { reason: 'owner_lineage_limit', ownerUid: 'secret-uid' } }]);
  assert.doesNotMatch(JSON.stringify(sameShape), /secret-uid/);
});

test('--execute is refused without the confirmation token, days and an explicit target', () => {
  for (const args of [
    ['--execute'],
    ['--execute', '--days=30'],
    ['--execute', `--confirm=${CONFIRM_TOKEN}`],
    ['--execute', `--confirm=${CONFIRM_TOKEN}`, '--days=30'],
    ['--execute', `--confirm=${CONFIRM_TOKEN}`, '--days=30', '--project=phraseman-ea0b3'],
    ['--execute', `--confirm=${CONFIRM_TOKEN}`, '--days=30', `--fixture=${FIXTURE}`],
    ['--execute', `--confirm=${CONFIRM_TOKEN}`, '--days=30', '--emulator'],
  ]) {
    const out = run(args);
    assert.equal(out.status, 2, `ожидался отказ для ${args.join(' ')}`);
    assert.match(out.stderr, /refused/);
  }
});

test('prod needs --project plus the owner command and never mixes with the emulator', () => {
  assert.equal(run(['--project=phraseman-ea0b3']).status, 2);
  assert.match(String(executeRefusal(parseArgs([
    '--execute', `--confirm=${CONFIRM_TOKEN}`, '--days=30', '--project=p', '--owner-command=выдай plus по D137',
  ]), { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' })), /не смешиваем/);
  assert.equal(executeRefusal(parseArgs([
    '--execute', `--confirm=${CONFIRM_TOKEN}`, '--days=30', '--project=p', '--owner-command=выдай plus по D137',
  ]), {}), null);
  assert.equal(executeRefusal(parseArgs([
    '--execute', `--confirm=${CONFIRM_TOKEN}`, '--days=0', '--emulator',
  ]), { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }), null);
});

test('without a source the script only prints usage and loads no Firebase client', () => {
  const out = run([]);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /сухой прогон по умолчанию/);
  const source = readFileSync(SCRIPT, 'utf8');
  const staticImports = source.split('\n').filter((line) => /^\s*import\b/.test(line)).join('\n');
  assert.doesNotMatch(staticImports, /firebase|@google-cloud|googleapis|node:https?/);
});
