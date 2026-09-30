import {
  applyEnergyCapacityGift,
  energyGiftEffectForRewardId,
  expireEnergyGift,
  fillEnergyToActiveCap,
} from '../app/energy_gift_effects';
import { ENERGY_PERMANENT_CAPACITY_LIMIT } from '../app/energy_contract';

const MIDNIGHT = 1_800_028_800_000;

// PM-088: legacy energy gifts remain readable but never add temporary capacity.
describe('numeric energy gifts', () => {
  it('legacy capacity gifts are no-ops beyond the fixed cap', () => {
    expect(applyEnergyCapacityGift(
      { base: 34, bonus: 0, capacity: 0, expiresAt: 0 },
      60,
      MIDNIGHT,
    )).toEqual({ base: 5, bonus: 0, capacity: 0, expiresAt: 0 });
  });

  it('does not restore retired temporary capacity', () => {
    expect(applyEnergyCapacityGift(
      { base: 4, bonus: 180, capacity: 180, expiresAt: MIDNIGHT },
      60,
      MIDNIGHT,
    )).toEqual({ base: 5, bonus: 0, capacity: 0, expiresAt: 0 });
    // зачем константа вместо числа: смысл проверки — «дутый maxEnergy (999) не
    // поднимает постоянную базу выше законного потолка». Зашитое 150 протухло,
    // когда лиги добавили +10 за ярус (потолок стал 260), и тест падал не по делу.
    expect(applyEnergyCapacityGift(
      { base: ENERGY_PERMANENT_CAPACITY_LIMIT, bonus: 200, capacity: 200, expiresAt: MIDNIGHT, maxEnergy: 999 },
      60,
      MIDNIGHT,
    )).toEqual({ base: ENERGY_PERMANENT_CAPACITY_LIMIT, bonus: 0, capacity: 0, expiresAt: 0 });
  });

  it('full charge fills the active cap and expiry preserves only base', () => {
    expect(fillEnergyToActiveCap({ base: 1, bonus: 2, capacity: 40, expiresAt: MIDNIGHT }))
      .toEqual({ base: 5, bonus: 0, capacity: 0, expiresAt: 0 });
    expect(expireEnergyGift({ base: 3, bonus: 40, capacity: 40, expiresAt: MIDNIGHT }))
      .toEqual({ base: 3, bonus: 0, capacity: 0, expiresAt: 0 });
  });

  // PM-081 (D07): прежний потолок карточки профиля (150) больше не признаётся —
  // и подарок, и его сгорание держат постоянную базу в пределах 5.
  it('clamps a legacy profile-card capacity to 5 while applying or expiring a gift', () => {
    expect(applyEnergyCapacityGift(
      { base: 135, bonus: 0, capacity: 0, expiresAt: 0, maxEnergy: 150 },
      60,
      MIDNIGHT,
    )).toEqual({ base: 5, bonus: 0, capacity: 0, expiresAt: 0 });
    expect(expireEnergyGift({ base: 145, bonus: 60, capacity: 60, expiresAt: MIDNIGHT, maxEnergy: 150 }))
      .toEqual({ base: 5, bonus: 0, capacity: 0, expiresAt: 0 });
  });

  it('maps every legacy reward id to its new effect', () => {
    expect(energyGiftEffectForRewardId('energy_full')).toEqual({ kind: 'full', amount: 0 });
    expect(energyGiftEffectForRewardId('energy_plus1')).toEqual({ kind: 'full', amount: 0 });
    expect(energyGiftEffectForRewardId('energy_plus2')).toEqual({ kind: 'full', amount: 0 });
    expect(energyGiftEffectForRewardId('energy_plus3')).toEqual({ kind: 'full', amount: 0 });
  });
});
