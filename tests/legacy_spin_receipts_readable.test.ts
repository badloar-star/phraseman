import assert from 'node:assert/strict';
import { parsePaidLevelSpinRuneOperation } from '../modules/phone-state/domains/economy';
import { isLocalSpinGiftAllowedForCatalogVersion } from '../app/level_spin_local_contract';

// зачем (PM-055/PM-088): исторические платные спины и квитанции с XP/энергией/щитами должны
// ОСТАВАТЬСЯ читаемыми (иначе кошелёк рун помечается corrupt, а невыданный спин пропадает).
// Новый каталог их не выдаёт — эта проба защищает только разбор истории.
test('historical spin gifts with retired rewards remain readable', () => {
  const base = {
    schemaVersion: 'client-paid-level-spin-rune-operation.v1',
    operationId: 'paid_level_spin:req_0123456789abcdef',
    ownerStableId: 'stable_owner_1',
    accountGeneration: 1,
    requestId: 'req_0123456789abcdef',
    catalogVersion: 7,
    runeDelta: -300,
    price: 300,
    balanceBefore: 1000,
    balanceAfter: 700,
    reason: 'paid_level_spin',
    createdAtMs: 1_725_000_000_000,
    requestFingerprint: 'a'.repeat(64),
  };
  let accepted = 0;
  for (const giftId of ['xp_1000', 'xp_50000', 'energy_plus3', 'chain_shield_3', 'xp_bank_1500', 'xp_2x_48h']) {
    const parsed = parsePaidLevelSpinRuneOperation({ ...base, giftId });
    if (parsed) accepted += 1;
    else console.log(`paid parse rejected legacy gift: ${giftId}`);
  }
  for (const giftId of ['xp_1000', 'energy_full', 'chain_shield_1', 'xp_bank_600']) {
    assert.equal(isLocalSpinGiftAllowedForCatalogVersion(giftId, 6), giftId !== 'chain_shield_3', `receipt v6 ${giftId}`);
  }
  assert.equal(isLocalSpinGiftAllowedForCatalogVersion('chain_shield_1', 1), true, 'v1 chain_shield_1');
  assert.equal(isLocalSpinGiftAllowedForCatalogVersion('chain_shield_3', 6), false, 'chain_shield_3 introduced in v7');
  assert.equal(isLocalSpinGiftAllowedForCatalogVersion('chain_shield_3', 7), true, 'v7 chain_shield_3');
  assert.equal(isLocalSpinGiftAllowedForCatalogVersion('not_a_gift', 7), false, 'unknown id stays rejected');
  assert.equal(parsePaidLevelSpinRuneOperation({ ...base, giftId: 'not_a_gift' }), null, 'unknown paid gift stays rejected');
  assert.equal(accepted, 6, `only ${accepted}/6 legacy paid gifts parsed`);
});
