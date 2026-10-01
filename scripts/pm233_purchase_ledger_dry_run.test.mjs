// Сторож PM-233: ledger покупок и прав полон по маркерам кода, ничего не пишет и не ходит в прод.
// Запуск: node --test scripts/pm233_purchase_ledger_dry_run.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { IGNORED, LEDGER, buildReport, prodCountPlan, scanMarkers } from './pm233_purchase_ledger_dry_run.mjs';

const SCRIPT = 'scripts/pm233_purchase_ledger_dry_run.mjs';
const STATUSES = new Set(['keep', 'convert_decided', 'retire_decided', 'needs_decision', 'removed']);

test('every entitlement marker found in code is in the ledger (or ignored with a reason), none is stale', () => {
  const report = buildReport();
  assert.deepEqual(report.uncovered, [], `маркеры права без строки ledger: ${report.uncovered.join(', ')}`);
  assert.deepEqual(report.stale, [], `маркеры ledger, которых больше нет в коде: ${report.stale.join(', ')}`);
  assert.deepEqual(report.staleIgnored, [], `протухшие исключения: ${report.staleIgnored.join(', ')}`);
  assert.deepEqual(report.resurrected, [], `удалённые пути начисления вернулись в код: ${report.resurrected.join(', ')}`);
  for (const [key, reason] of Object.entries(IGNORED)) assert.ok(reason.trim().length > 3, `нет причины для ${key}`);
});

test('a new store product / purchase collection in code fails the guard', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pm233-'));
  try {
    mkdirSync(join(dir, 'app'), { recursive: true });
    writeFileSync(join(dir, 'app', 'new_shop.ts'), [
      "const SKU = 'phraseman_premium_family_v1';",
      "db.collection('family_plan_purchases');",
      "const KEY = 'sticker_owned_v1';",
    ].join('\n'));
    const report = buildReport(scanMarkers(dir));
    assert.ok(report.uncovered.includes('store_product:phraseman_premium_family_v1'));
    assert.ok(report.uncovered.includes('collection:family_plan_purchases'));
    assert.ok(report.uncovered.includes('local_key:sticker_owned_v1'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ledger rows are complete; open questions are explicit; prod volumes are unknown, never 0', () => {
  const ids = new Set();
  for (const row of LEDGER) {
    assert.ok(!ids.has(row.id), `дубль ${row.id}`);
    ids.add(row.id);
    for (const field of ['product', 'source', 'storage', 'fate', 'risk']) assert.ok(String(row[field] ?? '').trim(), `${row.id}: пусто ${field}`);
    assert.ok(STATUSES.has(row.status), `${row.id}: статус ${row.status}`);
    if (row.status === 'needs_decision') assert.match(String(row.question), /^Q-233-\d+:/, `${row.id}: нет вопроса владельцу`);
    for (const ref of [...row.writers, ...row.readers]) assert.match(ref, /^[\w./()[\]-]+\.(ts|tsx|mjs|js)(:\d+)?$/, `${row.id}: ссылка ${ref}`);
  }
  const report = buildReport();
  for (const row of report.rows) assert.equal(row.prodVolume, 'unknown');
  const plan = prodCountPlan();
  assert.equal(plan.executes, false);
  for (const q of plan.queries) {
    assert.equal(q.aggregate, 'count');
    assert.equal(q.result, 'unknown');
  }
});

test('ledger covers every product family the owner listed', () => {
  const ids = new Set(LEDGER.map((row) => row.id));
  for (const id of [
    'plus_store_subscription', 'plus_store_lifetime', 'plus_revenuecat_denials', 'pearls_store_packs', 'pearls_balance', 'coins_wallet',
    'cosmetics_avatars_auras', 'themes', 'boosts_season_pass', 'energy', 'dialog_rune_unlocks', 'dialog_extra_replies',
    'community_pack_purchase', 'community_pack_author_payout', 'arena_stars_and_shop', 'max_subscription', 'max_voice_minutes',
    'plus_promo_and_certificates', 'referral_roulette', 'gifts_level_spins', 'friend_gifts',
  ]) assert.ok(ids.has(id), `нет продукта ${id}`);
});

test('script is read-only: no prod client, no network, no file writes; --prod is refused', () => {
  const source = readFileSync(SCRIPT, 'utf8');
  // зачем: проверяем именно импорты, а не текст — комментарии и план для владельца
  // законно упоминают firebase-admin как то, что запускается ОТДЕЛЬНО по команде.
  const imports = source.split('\n').filter((line) => /^\s*import\b|\brequire\(|\bimport\(/.test(line)).join('\n');
  assert.doesNotMatch(imports, /firebase|@google-cloud|googleapis|child_process|node:https?|node:net/, `запрещённый импорт:\n${imports}`);
  for (const banned of [/\bfetch\(/, /https?:\/\//, /\b(writeFileSync|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync)\b/]) {
    assert.doesNotMatch(source, banned, `запрещено в скрипте: ${banned}`);
  }
  const refused = spawnSync(process.execPath, [SCRIPT, '--prod'], { encoding: 'utf8' });
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /refused/);
  const out = execFileSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' });
  assert.match(out, /uncovered=0 stale=0/);
});

// зачем: D136–D140 (владелец 2026-10-01) — удалённые пути покупок/наград записаны строками
// со статусом removed; их маркеры не должны вернуться, а вернувшийся ловится сторожем.
test('removed money paths are recorded and a resurrected marker fails the guard', () => {
  const removedRows = LEDGER.filter((row) => row.status === 'removed');
  for (const id of ['pearls_store_packs', 'dialog_extra_replies', 'pack_gifts', 'max_subscription', 'max_voice_minutes', 'quests', 'collectibles']) {
    assert.ok(removedRows.some((row) => row.id === id), `строка ${id} не помечена removed`);
  }
  assert.deepEqual(LEDGER.filter((row) => row.status === 'needs_decision').map((row) => row.id), [], 'все Q-233 закрыты решениями D136–D140');
  const dir = mkdtempSync(join(tmpdir(), 'pm233-removed-'));
  try {
    mkdirSync(join(dir, 'functions', 'src'), { recursive: true });
    writeFileSync(join(dir, 'functions', 'src', 'back.ts'), 'export const questClaimReward = onCall(async () => null);' + String.fromCharCode(10));
    const report = buildReport(scanMarkers(dir));
    assert.ok(report.resurrected.includes('quests:callable:questClaimReward'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
