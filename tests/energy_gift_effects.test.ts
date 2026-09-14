import {
  applyEnergyCapacityGift,
  energyGiftEffectForRewardId,
  expireEnergyGift,
  fillEnergyToActiveCap,
} from '../app/energy_gift_effects';
import { ENERGY_PERMANENT_CAPACITY_LIMIT } from '../app/energy_contract';

const MIDNIGHT = 1_800_028_800_000;

describe('numeric energy gifts', () => {
  it.each([[1, 20, 120], [2, 40, 140], [3, 60, 160]])(
    'energy_plus%i adds %i capacity and guarantees %i total energy',
    (_legacyAmount, added, expected) => {
      expect(applyEnergyCapacityGift(
        { base: 34, bonus: 0, capacity: 0, expiresAt: 0 },
        added,
        MIDNIGHT,
      )).toEqual({
        base: 100,
        bonus: expected - 100,
        capacity: added,
        expiresAt: MIDNIGHT,
      });
    },
  );

  it('stacks temporary capacity to +200 without exceeding the active limit', () => {
    expect(applyEnergyCapacityGift(
      { base: 90, bonus: 180, capacity: 180, expiresAt: MIDNIGHT },
      60,
      MIDNIGHT,
    )).toEqual({ base: 100, bonus: 200, capacity: 200, expiresAt: MIDNIGHT });
    // зачем константа вместо числа: смысл проверки — «дутый maxEnergy (999) не
    // поднимает постоянную базу выше законного потолка». Зашитое 150 протухло,
    // когда лиги добавили +10 за ярус (потолок стал 260), и тест падал не по делу.
    expect(applyEnergyCapacityGift(
      { base: ENERGY_PERMANENT_CAPACITY_LIMIT, bonus: 200, capacity: 200, expiresAt: MIDNIGHT, maxEnergy: 999 },
      60,
      MIDNIGHT,
    )).toEqual({ base: ENERGY_PERMANENT_CAPACITY_LIMIT, bonus: 200, capacity: 200, expiresAt: MIDNIGHT });
  });

  it('full charge fills the active cap and expiry preserves only base', () => {
    expect(fillEnergyToActiveCap({ base: 41, bonus: 2, capacity: 40, expiresAt: MIDNIGHT }))
      .toEqual({ base: 100, bonus: 40, capacity: 40, expiresAt: MIDNIGHT });
    expect(expireEnergyGift({ base: 83, bonus: 40, capacity: 40, expiresAt: MIDNIGHT }))
      .toEqual({ base: 83, bonus: 0, capacity: 0, expiresAt: 0 });
  });

  it('never lowers permanent profile-card capacity while applying or expiring a gift', () => {
    expect(applyEnergyCapacityGift(
      { base: 135, bonus: 0, capacity: 0, expiresAt: 0, maxEnergy: 150 },
      60,
      MIDNIGHT,
    )).toEqual({ base: 150, bonus: 60, capacity: 60, expiresAt: MIDNIGHT });
    expect(expireEnergyGift({ base: 145, bonus: 60, capacity: 60, expiresAt: MIDNIGHT, maxEnergy: 150 }))
      .toEqual({ base: 145, bonus: 0, capacity: 0, expiresAt: 0 });
  });

  it('maps every legacy reward id to its new effect', () => {
    expect(energyGiftEffectForRewardId('energy_full')).toEqual({ kind: 'full', amount: 0 });
    expect(energyGiftEffectForRewardId('energy_plus1')).toEqual({ kind: 'capacity', amount: 20 });
    expect(energyGiftEffectForRewardId('energy_plus2')).toEqual({ kind: 'capacity', amount: 40 });
    expect(energyGiftEffectForRewardId('energy_plus3')).toEqual({ kind: 'capacity', amount: 60 });
  });
});
