import {
  EMPTY_COIN_WALLET_LIMITS,
  applyCoinWalletLimits,
  assertCoinWalletOperationShape,
  classifyCoinWalletSource,
} from './coin_wallet_policy';

// Кнопка владельца 22.10 «Да, выложить»: старая операция «Дневного пути» без promotionEligibility — это gameplay.
// Повод: после заплатки очереди монет (OTA 22.10) 17:20Z пришла dailyjourney_…_1 stars_250 без поля и получила отказ
// journey_requires_gameplay — человек терял законные 250 монет. Сторож падает, если такую операцию снова начнут резать.

const requestId = `dailyjourney_${'a'.repeat(32)}_1`;
const legacy = { requestId, lane: 'base' as const, giftId: 'stars_250', amount: 250 };

describe('кошелёк: старый «Дневной путь» без promotionEligibility', () => {
  test('без поля — принимается как gameplay', () => {
    const cls = classifyCoinWalletSource(requestId);
    expect(() => assertCoinWalletOperationShape(legacy, cls)).not.toThrow();
  });

  test('явное excluded_compensation у пути — по-прежнему отказ', () => {
    const cls = classifyCoinWalletSource(requestId);
    expect(() => assertCoinWalletOperationShape({ ...legacy, promotionEligibility: 'excluded_compensation' }, cls))
      .toThrow('coin_wallet_source_shape_invalid');
  });

  test('потолок пути 2000 в сутки действует и для старых операций', () => {
    const cls = classifyCoinWalletSource(requestId);
    const now = Date.parse('2026-10-22T17:20:00Z');
    const nearCap = applyCoinWalletLimits(EMPTY_COIN_WALLET_LIMITS, { ...legacy, giftId: 'stars_1000', amount: 1_900 }, cls, now, 0);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(() => applyCoinWalletLimits(nearCap, legacy, cls, now, 0)).toThrow('coin_wallet_daily_limit_reached');
    } finally {
      warn.mockRestore();
    }
  });
});
