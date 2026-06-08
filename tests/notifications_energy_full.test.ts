/**
 * Контракт пуша «энергия восстановлена» (energy_full).
 * Проверяем чистую логику тихих часов (23:00–08:00 локально):
 * момент полного восстановления, попавший в ночь, сдвигается на ближайшее 08:00,
 * чтобы не будить пользователя.
 */
import { shiftEnergyMomentOutOfQuietHours } from '../app/notifications';

/** Локальное время в ms для текущей тестовой машины (тихие часы считаются в local time). */
function localMoment(year: number, monthIdx: number, day: number, hour: number, minute = 0): number {
  return new Date(year, monthIdx, day, hour, minute, 0, 0).getTime();
}

describe('shiftEnergyMomentOutOfQuietHours', () => {
  it('оставляет дневной момент без изменений (12:00)', () => {
    const noon = localMoment(2026, 4, 10, 12, 0);
    expect(shiftEnergyMomentOutOfQuietHours(noon)).toBe(noon);
  });

  it('оставляет момент в 08:00 без изменений (граница не тихая)', () => {
    const eight = localMoment(2026, 4, 10, 8, 0);
    expect(shiftEnergyMomentOutOfQuietHours(eight)).toBe(eight);
  });

  it('оставляет момент в 22:59 без изменений (до начала тишины)', () => {
    const lateEvening = localMoment(2026, 4, 10, 22, 59);
    expect(shiftEnergyMomentOutOfQuietHours(lateEvening)).toBe(lateEvening);
  });

  it('сдвигает поздний вечер (23:30) на 08:00 СЛЕДУЮЩЕГО дня', () => {
    const night = localMoment(2026, 4, 10, 23, 30);
    const shifted = shiftEnergyMomentOutOfQuietHours(night);
    const expected = localMoment(2026, 4, 11, 8, 0);
    expect(shifted).toBe(expected);
  });

  it('сдвигает раннее утро (03:00) на 08:00 ТОГО ЖЕ дня', () => {
    const earlyMorning = localMoment(2026, 4, 11, 3, 0);
    const shifted = shiftEnergyMomentOutOfQuietHours(earlyMorning);
    const expected = localMoment(2026, 4, 11, 8, 0);
    expect(shifted).toBe(expected);
  });

  it('сдвигает ровно полночь (00:00) на 08:00 того же дня', () => {
    const midnight = localMoment(2026, 4, 11, 0, 0);
    const shifted = shiftEnergyMomentOutOfQuietHours(midnight);
    const expected = localMoment(2026, 4, 11, 8, 0);
    expect(shifted).toBe(expected);
  });

  it('сдвинутый момент всегда вне тихих часов', () => {
    for (let hour = 0; hour < 24; hour++) {
      const m = localMoment(2026, 4, 10, hour, 15);
      const shifted = shiftEnergyMomentOutOfQuietHours(m);
      const h = new Date(shifted).getHours();
      const inQuiet = h >= 23 || h < 8;
      expect(inQuiet).toBe(false);
    }
  });
});
