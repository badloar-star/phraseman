// D109 (04.10): награда за репорт — только монеты 300/600/1000; скрипт по умолчанию ничего не пишет.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REPORT_REWARD_BUNDLES,
  normalizeReplyRow,
  resolveRunMode,
  rewardLabel,
} from '../scripts/reply_to_reports_rewards.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const row = (rewardBundle, extra = {}) => ({
  reportId: 'r1', uid: 'uid-real-1', title: 'Спасибо!', body: 'Ошибка исправлена.', resolution: 'confirmed_fixed', rewardBundle, ...extra,
});

test('every reward tier is coins only (D109 300/600/1000), no spins/runes/pearls', () => {
  assert.deepEqual(Object.values(REPORT_REWARD_BUNDLES).map((b) => b.coins), [0, 300, 600, 1000]);
  for (const bundle of Object.values(REPORT_REWARD_BUNDLES)) {
    assert.deepEqual(Object.keys(bundle).sort(), ['coins', 'severity', 'version']);
    assert.equal(bundle.version, 2);
  }
});

test('exact v2 coin bundle is accepted as-is', () => {
  const { item, error } = normalizeReplyRow(row({ version: 2, severity: 'serious', coins: 600 }), 0);
  assert.equal(error, undefined);
  assert.deepEqual(item.rewardBundle, { version: 2, severity: 'serious', coins: 600 });
});

test('old v1 bundle is converted to coins of the same tier, pearls/spins are not paid', () => {
  const { item, warning } = normalizeReplyRow(row({ version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 }), 0);
  assert.deepEqual(item.rewardBundle, { version: 2, severity: 'critical', coins: 1000 });
  assert.match(warning, /1000 монет/);
  assert.doesNotMatch(JSON.stringify(item), /spins|runes|pearls/);
});

test('arbitrary amounts, extra keys and rewards without a confirmed fix are rejected', () => {
  assert.ok(normalizeReplyRow(row({ version: 2, severity: 'minor', coins: 5000 }), 0).error);
  assert.ok(normalizeReplyRow(row({ version: 2, severity: 'minor', coins: 300, pearls: 1 }), 0).error);
  assert.ok(normalizeReplyRow(row({ version: 1, severity: 'minor', spins: 9, runes: 300, pearls: 1 }), 0).error);
  assert.ok(normalizeReplyRow(row({ version: 2, severity: 'minor', coins: 300 }, { resolution: 'rejected' }), 0).error);
});

test('legacy shards field gives the minor coin tier', () => {
  const { item } = normalizeReplyRow({ reportId: 'r', uid: 'u-1', title: 't', body: 'b', shards: 1 }, 0);
  assert.deepEqual(item.rewardBundle, REPORT_REWARD_BUNDLES.minor);
  assert.equal(rewardLabel(item.rewardBundle), '300 монет');
});

test('run mode is a preview unless --send is passed explicitly (and --dry-run always wins)', () => {
  assert.equal(resolveRunMode([]), 'dry-run');
  assert.equal(resolveRunMode(['--dry-run']), 'dry-run');
  assert.equal(resolveRunMode(['--send', '--dry-run']), 'dry-run');
  assert.equal(resolveRunMode(['--send']), 'send');
});

test('the script without flags previews coins and never initialises Firebase', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'reply-reports-'));
  const file = path.join(dir, 'replies.json');
  writeFileSync(file, JSON.stringify([row({ version: 1, severity: 'minor', spins: 1, runes: 300, pearls: 1 })]));
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/reply_to_reports.mjs'), file], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /DRY-RUN/);
  assert.match(run.stdout, /300 монет/);
  assert.doesNotMatch(run.stdout, /спин|рун |жемч/);
  assert.doesNotMatch(readFileSync(path.join(ROOT, 'scripts/reply_to_reports.mjs'), 'utf8'), /pearls|spins/);
});
