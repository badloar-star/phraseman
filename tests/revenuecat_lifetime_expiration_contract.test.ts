// Аудит #24: EXPIRATION на lifetime НЕ должен снимать платный доступ. Спурьёзный
// EXPIRATION на non-renewing «Навсегда» иначе молча даунгрейднул бы платящего до free.
// REFUND по-прежнему деактивирует (вернули деньги).
import { shouldDeactivateOnInactiveEvent } from '../functions/src/revenuecat_shards';

describe('shouldDeactivateOnInactiveEvent — защита lifetime от ложного EXPIRATION', () => {
  it('EXPIRATION + lifetime → НЕ деактивировать (false)', () => {
    expect(shouldDeactivateOnInactiveEvent('EXPIRATION', 'lifetime')).toBe(false);
  });

  it('REFUND + lifetime → деактивировать (вернули деньги)', () => {
    expect(shouldDeactivateOnInactiveEvent('REFUND', 'lifetime')).toBe(true);
  });

  it('EXPIRATION + monthly/yearly → деактивировать как обычно', () => {
    expect(shouldDeactivateOnInactiveEvent('EXPIRATION', 'monthly')).toBe(true);
    expect(shouldDeactivateOnInactiveEvent('EXPIRATION', 'yearly')).toBe(true);
  });

  it('REFUND + monthly → деактивировать', () => {
    expect(shouldDeactivateOnInactiveEvent('REFUND', 'monthly')).toBe(true);
  });
});
