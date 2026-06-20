import { applyRemoteConfigSnapshot, __resetRemoteFlagsForTest } from '../app/remote_flags';
// Тестируем НЕ-UI поверхность публичного входа напрямую (без барреля, который тянет
// @expo/vector-icons и не грузится в jest-окружении). Контракт изоляции тот же.
import { compassOn } from '../app/compass/compass_flags';
import { canActivatePlan, decidePlanAccess } from '../app/compass/compass_access';

describe('compass public entry — контракт изоляции', () => {
  beforeEach(() => {
    __resetRemoteFlagsForTest();
  });

  it('compassOn по умолчанию false (Компас выключен)', () => {
    expect(typeof compassOn).toBe('function');
    expect(compassOn()).toBe(false);
  });

  it('включается только явным флагом из админ-конфига', () => {
    applyRemoteConfigSnapshot({ bools: { compass_enabled: true } });
    expect(compassOn()).toBe(true);
  });

  it('премиум-гейт плана доступен и работает независимо от флага Компаса', () => {
    expect(canActivatePlan({ hasPremiumAccess: true })).toBe(true);
    expect(decidePlanAccess({ hasPremiumAccess: false })).toEqual({
      allowed: false,
      reason: 'premium_required',
    });
  });
});
