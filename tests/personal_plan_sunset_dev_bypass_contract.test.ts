import fs from 'node:fs';
import path from 'node:path';

import {
  PERSONAL_PLAN_SUNSET_AT_MS,
  resolvePersonalPlanSunsetAccess,
  splitPersonalPlanSunsetCountdown,
} from '../app/personal_plan_sunset';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ════════════════════════════════════════════════════════════════════════════
// Сторож dev-обхода заката «Планов» (владелец 2026-08-24): раздел обязан быть
// виден в dev-сборке БЕЗ старого плана, но обход НЕ смеет уехать в прод, НЕ
// смеет отключать сам закат (таймер идёт как у старых юзеров) и НЕ смеет
// ослаблять контрактных сторожей — под тестовым рантаймом он выключен.
// ════════════════════════════════════════════════════════════════════════════
describe('personal plan sunset dev bypass', () => {
  it('обход висит на прод-безопасном флаге, а не на голом DEV_MODE/__DEV__', () => {
    const sunset = read('app/personal_plan_sunset.ts');
    expect(sunset).toContain('DEV_CONTENT_UNLOCK');
    // голый DEV_MODE/__DEV__ физически уезжает в стор-сборку — запрещено
    expect(sunset).not.toMatch(/if\s*\(\s*DEV_MODE\s*\)/);
    expect(sunset).not.toMatch(/if\s*\(\s*__DEV__\s*\)/);
    // сам флаг обязан гаситься стор-релизом
    expect(read('app/config.ts'))
      .toContain('export const DEV_CONTENT_UNLOCK = DEV_MODE && !IS_STORE_RELEASE');
  });

  it('обход выключен под тестовым рантаймом — сторожа проверяют настоящее правило', () => {
    const sunset = read('app/personal_plan_sunset.ts');
    expect(sunset).toContain('JEST_WORKER_ID');
    expect(sunset).toMatch(/return DEV_CONTENT_UNLOCK && !underTestRuntime;/);
    // Живое доказательство: без grandfather-права доступа нет, хотя
    // DEV_CONTENT_UNLOCK в этой среде истинен.
    expect(resolvePersonalPlanSunsetAccess({
      hasOriginalFeatureAccess: true,
      savedState: null,
      nowMs: PERSONAL_PLAN_SUNSET_AT_MS - 1,
    })).toEqual({ status: 'not_grandfathered', grandfathered: false });
  });

  it('обход НЕ отменяет закат: после даты отключения доступа нет никогда', () => {
    expect(resolvePersonalPlanSunsetAccess({
      hasOriginalFeatureAccess: true,
      savedState: { status: 'active', createdAt: '2026-08-01T00:00:00.000Z' },
      nowMs: PERSONAL_PLAN_SUNSET_AT_MS + 1,
    }).status).toBe('expired');
  });

  it('таймер до отключения тикает независимо от обхода', () => {
    const countdown = splitPersonalPlanSunsetCountdown(PERSONAL_PLAN_SUNSET_AT_MS - 90_061_000);
    expect(countdown.expired).toBe(false);
    expect(countdown.days).toBe(1);
    expect(countdown.hours).toBe(1);
    expect(countdown.minutes).toBe(1);
    expect(splitPersonalPlanSunsetCountdown(PERSONAL_PLAN_SUNSET_AT_MS).expired).toBe(true);
  });

  it('ветка обхода стоит ПОСЛЕ проверки даты отключения', () => {
    const sunset = read('app/personal_plan_sunset.ts');
    const expiredAt = sunset.indexOf("status: 'expired'");
    const bypassAt = sunset.indexOf('if (devSunsetBypassActive())');
    expect(expiredAt).toBeGreaterThan(-1);
    expect(bypassAt).toBeGreaterThan(expiredAt);
  });
});
