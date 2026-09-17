import { LEVEL_SPIN_REWARD_IDS } from '../app/level_spin_reward_catalog';
import {
  isInstantLevelSpinReward,
  levelSpinRewardChannelBreakdown,
  levelSpinRewardDeliveryChannel,
} from '../app/level_spin_reward_delivery_channel';

/**
 * зачем (владелец, 2026-09-17): «должно сразу показывать изменения в счётчике
 * рун, а не типа надо было применить». Валюта и опыт выдаются мгновенно;
 * энергия, расходники с длительностью и косметика остаются в «Подарках»,
 * потому что их владелец включает сам, когда они нужны.
 *
 * Сторож ловит класс бага «новый приз добавили в каталог, а канал забыли» —
 * такой приз молча уехал бы в инвентарь, и владелец узнал бы об этом на себе.
 */
describe('level spin reward delivery channel', () => {
  test('валюта и опыт выдаются мгновенно', () => {
    for (const id of ['xp_250', 'xp_50000', 'pearls_5', 'pearls_1000', 'stars_10', 'stars_2000']) {
      expect(levelSpinRewardDeliveryChannel(id)).toBe('instant');
    }
  });

  test('энергия, расходники с длительностью и косметика ждут тапа в «Подарках»', () => {
    for (const id of [
      'energy_full', 'energy_plus2', 'energy_plus3',
      'hint_1', 'hint_3', 'chain_shield_1', 'chain_shield_3', 'attempt_restore_all',
      'plus_days_3', 'plus_days_30',
      'cosmetic_avatar_aura', 'cosmetic_theme', 'cosmetic_avatar_common',
    ]) {
      expect(levelSpinRewardDeliveryChannel(id)).toBe('inventory');
    }
  });

  test('банк ×2 и множитель опыта — НЕ мгновенные, хотя начинаются с xp_', () => {
    // Это ловушка именования: xp_bank_150 «расходуется только во время
    // обучения», xp_2x_24h тикает 24 часа. Выдай их сразу — время сгорит зря.
    for (const id of ['xp_bank_150', 'xp_bank_300', 'xp_bank_600', 'xp_bank_1500', 'xp_2x_24h', 'xp_2x_48h']) {
      expect(isInstantLevelSpinReward(id)).toBe(false);
    }
  });

  test('каждый приз каталога отнесён к одному из двух каналов', () => {
    const breakdown = levelSpinRewardChannelBreakdown();
    expect(breakdown.instant.length + breakdown.inventory.length).toBe(LEVEL_SPIN_REWARD_IDS.length);
    expect(new Set([...breakdown.instant, ...breakdown.inventory]).size)
      .toBe(LEVEL_SPIN_REWARD_IDS.length);
  });

  test('ни один канал не пуст — иначе классификация выродилась', () => {
    const breakdown = levelSpinRewardChannelBreakdown();
    expect(breakdown.instant.length).toBeGreaterThan(0);
    expect(breakdown.inventory.length).toBeGreaterThan(0);
  });
});
