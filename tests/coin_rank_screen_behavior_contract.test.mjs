import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screenPath = 'app/coin_rank.tsx';
const screen = fs.existsSync(screenPath) ? fs.readFileSync(screenPath, 'utf8') : '';

test('upgrade CTA is fail-closed until rank, balance and price are known and affordable', () => {
  assert.match(screen, /isCoinRankUpgradeEligible\(\{/);
  assert.match(screen, /balanceReconciling,/);
  assert.match(screen, /disabled=\{!canUpgrade\}/);
});

test('one press invokes the guarded hook once and never retries a money mutation', () => {
  const handler = screen.slice(screen.indexOf('const handleUpgrade'), screen.indexOf('const handleUpgrade') + 2600);
  assert.match(handler, /const result = await upgrade\(\);/);
  assert.doesNotMatch(handler, /retry|setTimeout|setInterval|while\s*\(|for\s*\(/i);
});

test('every guarded upgrade result receives explicit user feedback or the ceremony', () => {
  assert.match(screen, /result\.status === 'upgraded'/);
  assert.match(screen, /result\.status === 'already_applied'/);
  for (const reason of [
    'identity_changed',
    'invalid_rank',
    'stale_rank',
    'max_rank',
    'insufficient_coins',
    'state_corrupt',
    'failed',
  ]) {
    assert.match(screen, new RegExp(`case '${reason}'`));
  }
  assert.match(screen, /emitAppEvent\('action_toast'/);
});

test('insufficient balance blocks immediately and requires a durable reconciliation before another press', () => {
  const insufficient = screen.slice(screen.indexOf("case 'insufficient_coins'"), screen.indexOf("case 'stale_rank'"));
  assert.match(insufficient, /reconciliationBlockedRef\.current = true/);
  assert.match(insufficient, /setBalanceReconciling\(true\)/);
  assert.match(insufficient, /await forceBalanceReconcile\(\)/);
  assert.match(insufficient, /quality === 'durable'/);
  assert.doesNotMatch(insufficient, /upgrade\(\)/);
});

test('async UI results stay bound to the owner, generation and rank that produced the display', () => {
  const handler = screen.slice(screen.indexOf('const handleUpgrade'), screen.indexOf('const handleUpgrade') + 4200);
  // раньше ранний выход был немым `return;`; с журналом (сверка chain21) — блок с причиной и тем же `return;`
  assert.match(handler, /if \(!rankBinding\) (return;|\{[^}]*return;\s*\})/);
  assert.match(handler, /const operationBinding = Object\.freeze\(\{/);
  assert.match(handler, /ownerStableId: rankBinding\.ownerStableId/);
  assert.match(handler, /accountGeneration: rankBinding\.accountGeneration/);
  assert.match(handler, /rank: rankBinding\.rank/);
  assert.match(handler, /isCoinRankOperationBindingCurrent\(\s*operationBinding,\s*rankBindingRef\.current,/);
  const upgradeAwaitAt = handler.indexOf('const result = await upgrade();');
  const resultGuardAt = handler.indexOf('if (!operationStillCurrent()) return;', upgradeAwaitAt);
  const resultHandlingAt = handler.indexOf('if (result.ok)', upgradeAwaitAt);
  assert.ok(upgradeAwaitAt >= 0, 'upgrade await must exist');
  assert.ok(resultGuardAt > upgradeAwaitAt, 'account binding must be rechecked after upgrade resolves');
  assert.ok(resultHandlingAt > resultGuardAt, 'stale result must be ignored before any UI handling');
  const reconcileAwaitAt = handler.indexOf('await forceBalanceReconcile()', resultHandlingAt);
  const reconcileGuardAt = handler.indexOf('if (!operationStillCurrent()) return;', reconcileAwaitAt);
  assert.ok(reconcileAwaitAt > resultHandlingAt, 'insufficient path must reconcile explicitly');
  assert.ok(reconcileGuardAt > reconcileAwaitAt, 'account binding must be rechecked after reconciliation resolves');
});

test('ceremony is rendered only while its completed transition binding is current', () => {
  assert.match(screen, /const visibleCeremony = isCoinRankCeremonyBindingCurrent\(/);
  assert.match(screen, /ceremony,\s*rankBinding,/);
  assert.match(screen, /ceremony=\{visibleCeremony\}/);
  assert.doesNotMatch(screen, /ceremony=\{ceremony\}/);
});

