import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rankHook = fs.readFileSync('hooks/use_my_coin_rank.ts', 'utf8');
const upgradeHook = fs.readFileSync('hooks/use_coin_rank_upgrade.ts', 'utf8');

test('rank hook publishes one atomic owner-generation-rank binding', () => {
  assert.match(rankHook, /export type MyCoinRankBinding/);
  assert.match(rankHook, /ownerStableId:/);
  assert.match(rankHook, /accountGeneration:/);
  assert.match(rankHook, /rank:/);
  assert.match(rankHook, /setBinding\(null\)/);
  assert.match(rankHook, /isCurrentAccountGeneration\(token, owner\)/);
});

test('upgrade hook validates the displayed binding against a fresh account token before mutation', () => {
  const guardAt = upgradeHook.indexOf('isCoinRankOwnerBindingCurrent');
  const mutationAt = upgradeHook.indexOf('upgradeCoinRank({');
  assert.ok(guardAt >= 0, 'owner binding guard must be present');
  assert.ok(mutationAt > guardAt, 'owner binding must be checked before calling upgradeCoinRank');
  assert.match(upgradeHook, /const token = captureAccountGeneration\(\);/);
  assert.match(upgradeHook, /if \(!binding \|\| !isCoinRankOwnerBindingCurrent\(binding, token\)\)/);
  assert.match(upgradeHook, /expectedFromRank: binding\.rank/);
  assert.match(upgradeHook, /rankBinding: binding/);
});

test('ceremony carries its owner, generation and rank transition and is dismissed when stale', () => {
  assert.match(upgradeHook, /ownerStableId: string/);
  assert.match(upgradeHook, /accountGeneration: number/);
  assert.match(upgradeHook, /fromRank: number/);
  assert.match(upgradeHook, /toRank: number/);
  assert.match(upgradeHook, /ownerStableId: binding\.ownerStableId/);
  assert.match(upgradeHook, /accountGeneration: binding\.accountGeneration/);
  assert.match(upgradeHook, /fromRank: result\.fromRank/);
  assert.match(upgradeHook, /isCoinRankCeremonyBindingStale\(ceremony, binding,/);
  assert.match(upgradeHook, /setCeremony\(null\)/);
});

