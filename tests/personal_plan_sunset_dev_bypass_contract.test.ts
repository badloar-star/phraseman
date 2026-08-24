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
// Сторож dev-обхода заката «Планов» (владелец 2026-08-24).
//
// Раздел обязан быть ПОЛНОСТЬЮ проходимым в dev-сборке без старого плана и без
// премиума: вкладка видна, тап открывает раздел (а не прячет его), план можно
// создать. При этом обход НЕ смеет уехать в прод, НЕ смеет отключать закат
// (таймер идёт как у старых юзеров) и НЕ смеет ослаблять контрактных сторожей.
//
// История: первая версия открыла только вкладку — по тапу раздел «пропадал»,
// потому что стен было четыре (закат, премиум-гейт экрана, ветка «плана нет»
// в табе, премиум-гейт кнопки создания плана).
// ════════════════════════════════════════════════════════════════════════════
describe('personal plan sunset dev bypass', () => {
  it('обход висит на прод-безопасном флаге, а не на голом DEV_MODE/__DEV__', () => {
    const sunset = read('app/personal_plan_sunset.ts');
    expect(sunset).toContain('DEV_CONTENT_UNLOCK');
    expect(sunset).not.toMatch(/if\s*\(\s*DEV_MODE\s*\)/);
    expect(sunset).not.toMatch(/if\s*\(\s*__DEV__\s*\)/);
    expect(read('app/config.ts'))
      .toContain('export const DEV_CONTENT_UNLOCK = DEV_MODE && !IS_STORE_RELEASE');
  });

  it('обход выключен под тестовым рантаймом — сторожа проверяют настоящее правило', () => {
    const sunset = read('app/personal_plan_sunset.ts');
    expect(sunset).toContain('JEST_WORKER_ID');
    expect(sunset).toMatch(/return DEV_CONTENT_UNLOCK && !underTestRuntime;/);
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

  it('премиум-стены сняты во ВСЕХ четырёх точках, иначе раздел «пропадает» по тапу', () => {
    // 1. probe: не уводит на сетевую верификацию премиума
    expect(read('app/personal_plan_sunset.ts'))
      .toMatch(/if \(devSunsetBypassActive\(\)\) return 'allowed';/);
    // 2. гейт экрана: не редиректит на пейвол
    expect(read('app/personal_plan_sunset_guard.tsx'))
      .toContain('!verifiedAccess && !isPersonalPlanDevBypassActive()');
    // 3. таб: премиум не отправляет на пейвол
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('!verifiedPlanAccess && !isPersonalPlanDevBypassActive()');
    // 4. кнопка создания плана
    expect(read('app/personal_plan_setup.tsx'))
      .toMatch(/if \(isPersonalPlanDevBypassActive\(\)\) return true;/);
  });

  it('активация не падает без существующего плана (createdAt у null)', () => {
    // История: обход пропускал assert, и следом `existing.createdAt` ронял
    // активацию — «нажимаю начать план и ничего не происходит».
    const state = read('app/personal_plan_state.ts');
    expect(state).not.toContain('createdAt: existing.createdAt,');
    expect(state).toContain('createdAt: existing?.createdAt ?? base.createdAt,');
  });

  it('без плана таб ведёт на создание плана, а не прячет раздел', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    // Ветка «плана нет» больше не гасит вкладку безусловно.
    expect(lessons).not.toContain('if (access.status !== "allowed" || !state) {');
    expect(lessons).toMatch(/if \(!state\) \{[\s\S]{0,200}isPersonalPlanDevBypassActive\(\)[\s\S]{0,120}personal_plan_setup/);
  });
});
