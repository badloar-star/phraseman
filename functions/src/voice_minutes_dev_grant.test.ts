/**
 * Сторож дев-выдачи минут.
 *
 * зачем: дев-функция раздаёт ПЛАТНЫЙ товар даром. Единственное, что отделяет её
 * от дыры в проде, — выключенный по умолчанию флаг и узкие ограничители.
 * Тест ломает сборку, если дефолт станет «включено» или исчезнет потолок.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import {
  DEV_GRANT_ALLOWED_MINUTES,
  DEV_GRANT_LIFETIME_CAP_MIN,
  devGrantEnabledFromConfig,
  normalizeDevGrantMinutes,
} from './voice_minutes_dev_grant';

describe('voice-minute dev grant guards', () => {
  it('выключен, пока флаг не выставлен ЯВНО в true', () => {
    expect(devGrantEnabledFromConfig(undefined)).toBe(false);
    expect(devGrantEnabledFromConfig({})).toBe(false);
    // Ни строка, ни 1, ни null не считаются включением: только строгий true.
    expect(devGrantEnabledFromConfig({ voiceMinuteDevGrantEnabled: 'true' })).toBe(false);
    expect(devGrantEnabledFromConfig({ voiceMinuteDevGrantEnabled: 1 })).toBe(false);
    expect(devGrantEnabledFromConfig({ voiceMinuteDevGrantEnabled: null })).toBe(false);
    expect(devGrantEnabledFromConfig({ voiceMinuteDevGrantEnabled: true })).toBe(true);
  });

  it('принимает только магазинные номиналы 30/120/300', () => {
    expect(DEV_GRANT_ALLOWED_MINUTES).toEqual([30, 120, 300]);
    for (const minutes of DEV_GRANT_ALLOWED_MINUTES) {
      expect(normalizeDevGrantMinutes(minutes)).toBe(minutes);
    }
    for (const bad of [0, -30, 31, 10_000, 1.5, '30', null, undefined, {}]) {
      expect(() => normalizeDevGrantMinutes(bad)).toThrow(HttpsError);
    }
  });

  it('держит конечный потолок на аккаунт', () => {
    expect(Number.isSafeInteger(DEV_GRANT_LIFETIME_CAP_MIN)).toBe(true);
    expect(DEV_GRANT_LIFETIME_CAP_MIN).toBeGreaterThan(0);
    expect(DEV_GRANT_LIFETIME_CAP_MIN).toBeLessThanOrEqual(600);
  });
});
