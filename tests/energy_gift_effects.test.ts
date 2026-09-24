import {
  applyEnergyCapacityGift,
  energyGiftEffectForRewardId,
  expireEnergyGift,
  fillEnergyToActiveCap,
} from '../app/energy_gift_effects';
import { ENERGY_PERMANENT_CAPACITY_LIMIT } from '../app/energy_contract';

const MIDNIGHT = 1_800_028_800_000;

// PM-081 (BIBLE «Энергия: 5»; D06/D07): постоянный запас 5 вместо 100 и без
// прибавки карточки профиля. Размер временных подарков (+20/40/60) — зона
// PM-088 (бонусный пул), здесь он не менялся; меняется только база.
describe('numeric energy gifts', () => {
  it.each([[1, 20, 25], [2, 40, 45], [3, 60, 65]])(
    'energy_plus%i adds %i capacity and guarantees %i total energy',
    (_legacyAmount, added, expected) => {
      expect(applyEnergyCapacityGift(
        { base: 34, bonus: 0, capacity: 0, expiresAt: 0 },
        added,
        MIDNIGHT,
      )).toEqual({
        base: 5,
        bonus: expected - 5,
        capacity: added,
        expiresAt: MIDNIGHT,
      });
    },
  );

  it('stacks temporary capacity to +200 without exceeding the active limit', () => {
    expect(applyEnergyCapacityGift(
      { base: 4, bonus: 180, capacity: 180, expiresAt: MIDNIGHT },
      60,
      MIDNIGHT,
    )).toEqual({ base: 5, bonus: 200, capacity: 200, expiresAt: MIDNIGHT });
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
    expect(fillEnergyToActiveCap({ base: 1, bonus: 2, capacity: 40, expiresAt: MIDNIGHT }))
      .toEqual({ base: 5, bonus: 40, capacity: 40, expiresAt: MIDNIGHT });
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
    )).toEqual({ base: 5, bonus: 60, capacity: 60, expiresAt: MIDNIGHT });
    expect(expireEnergyGift({ base: 145, bonus: 60, capacity: 60, expiresAt: MIDNIGHT, maxEnergy: 150 }))
      .toEqual({ base: 5, bonus: 0, capacity: 0, expiresAt: 0 });
  });

  it('maps every legacy reward id to its new effect', () => {
    expect(energyGiftEffectForRewardId('energy_full')).toEqual({ kind: 'full', amount: 0 });
    expect(energyGiftEffectForRewardId('energy_plus1')).toEqual({ kind: 'capacity', amount: 20 });
    expect(energyGiftEffectForRewardId('energy_plus2')).toEqual({ kind: 'capacity', amount: 40 });
    expect(energyGiftEffectForRewardId('energy_plus3')).toEqual({ kind: 'capacity', amount: 60 });
  });
});
