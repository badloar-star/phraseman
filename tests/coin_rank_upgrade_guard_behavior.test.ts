import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isCoinRankCeremonyBindingCurrent,
  isCoinRankCeremonyBindingStale,
  isCoinRankOperationBindingCurrent,
  isCoinRankOwnerBindingCurrent,
  isCoinRankUpgradeEligible,
} from '../hooks/coin_rank_upgrade_guard';

test('displayed rank is valid only for the exact active owner and account generation', () => {
  const binding = { ownerStableId: 'owner-a', accountGeneration: 4 } as const;

  assert.equal(isCoinRankOwnerBindingCurrent(binding, {
    phase: 'active', stableId: 'owner-a', generation: 4,
  }), true);
  assert.equal(isCoinRankOwnerBindingCurrent(binding, {
    phase: 'active', stableId: 'owner-b', generation: 5,
  }), false);
  assert.equal(isCoinRankOwnerBindingCurrent(binding, {
    phase: 'active', stableId: 'owner-a', generation: 5,
  }), false);
  assert.equal(isCoinRankOwnerBindingCurrent(binding, {
    phase: 'transitioning', stableId: 'owner-a', generation: 4,
  }), false);
  assert.equal(isCoinRankOwnerBindingCurrent(null, {
    phase: 'active', stableId: 'owner-a', generation: 4,
  }), false);
});

test('a stale-high balance cannot enable another press while reconciliation is required', () => {
  const affordable = {
    rank: 2,
    balance: 10_000,
    nextPrice: 3_000,
    upgrading: false,
    balanceReconciling: false,
  } as const;

  assert.equal(isCoinRankUpgradeEligible(affordable), true);
  assert.equal(isCoinRankUpgradeEligible({ ...affordable, balanceReconciling: true }), false);
  assert.equal(isCoinRankUpgradeEligible({ ...affordable, balance: null }), false);
  assert.equal(isCoinRankUpgradeEligible({ ...affordable, balance: 2_999 }), false);
  assert.equal(isCoinRankUpgradeEligible({ ...affordable, nextPrice: null }), false);
});

test('an immutable operation binding expires when owner or generation changes while awaiting', () => {
  const operationBinding = Object.freeze({ ownerStableId: 'owner-a', accountGeneration: 8, rank: 4 });
  const currentBinding = Object.freeze({ ownerStableId: 'owner-a', accountGeneration: 8, rank: 4 });

  assert.equal(isCoinRankOperationBindingCurrent(operationBinding, currentBinding, {
    phase: 'active', stableId: 'owner-a', generation: 8,
  }), true);
  assert.equal(isCoinRankOperationBindingCurrent(operationBinding, currentBinding, {
    phase: 'active', stableId: 'owner-b', generation: 9,
  }), false);
  assert.equal(isCoinRankOperationBindingCurrent(operationBinding, currentBinding, {
    phase: 'active', stableId: 'owner-a', generation: 9,
  }), false);
  assert.equal(isCoinRankOperationBindingCurrent(operationBinding, {
    ...currentBinding, rank: 5,
  }, {
    phase: 'active', stableId: 'owner-a', generation: 8,
  }), false);
  assert.deepEqual(operationBinding, { ownerStableId: 'owner-a', accountGeneration: 8, rank: 4 });
});

test('ceremony is valid only for its account generation and completed rank transition', () => {
  const ceremony = Object.freeze({
    ownerStableId: 'owner-a',
    accountGeneration: 8,
    fromRank: 4,
    toRank: 5,
  });
  const completedBinding = Object.freeze({ ownerStableId: 'owner-a', accountGeneration: 8, rank: 5 });

  assert.equal(isCoinRankCeremonyBindingCurrent(ceremony, completedBinding, {
    phase: 'active', stableId: 'owner-a', generation: 8,
  }), true);
  assert.equal(isCoinRankCeremonyBindingCurrent(ceremony, completedBinding, {
    phase: 'active', stableId: 'owner-a', generation: 9,
  }), false);
  assert.equal(isCoinRankCeremonyBindingCurrent(ceremony, {
    ...completedBinding, rank: 4,
  }, {
    phase: 'active', stableId: 'owner-a', generation: 8,
  }), false);
  assert.equal(isCoinRankCeremonyBindingCurrent(ceremony, {
    ...completedBinding, ownerStableId: 'owner-b', accountGeneration: 9,
  }, {
    phase: 'active', stableId: 'owner-b', generation: 9,
  }), false);

  assert.equal(isCoinRankCeremonyBindingStale(ceremony, {
    ...completedBinding, rank: 4,
  }, {
    phase: 'active', stableId: 'owner-a', generation: 8,
  }), false);
  assert.equal(isCoinRankCeremonyBindingStale(ceremony, completedBinding, {
    phase: 'active', stableId: 'owner-a', generation: 9,
  }), true);
  assert.equal(isCoinRankCeremonyBindingStale(ceremony, {
    ...completedBinding, rank: 6,
  }, {
    phase: 'active', stableId: 'owner-a', generation: 8,
  }), true);
});

