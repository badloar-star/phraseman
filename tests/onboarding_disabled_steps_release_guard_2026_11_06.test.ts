// зачем (вопрос владельца 06.11 «почему показываются экраны онбординга, которые я отключил в админке»): выключенный шаг (список с меткой каталога)
// не показывается в релизе; QA-режим «весь каталог» недостижим вне __DEV__; админка при сохранении всегда ставит метку.
import fs from 'node:fs';
import path from 'node:path';
import {
  ONBOARDING_STEPS_CATALOG_MARK,
  ONBOARDING_STEPS_DEFAULT_ON,
  explainEnabledOnboardingSteps,
  parseEnabledOnboardingSteps,
  resolveRuntimeOnboardingSteps,
} from '../app/onboarding_flow';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('выключенные в админке экраны онбординга', () => {
  it('список С меткой читается буквально: выключенный шаг не показывается, причина off_in_pult', () => {
    const raw = JSON.stringify(['name', 'welcome', ONBOARDING_STEPS_CATALOG_MARK]);
    const steps = parseEnabledOnboardingSteps(raw);
    for (const id of ONBOARDING_STEPS_DEFAULT_ON) expect(steps).not.toContain(id);
    const explained = explainEnabledOnboardingSteps(raw);
    expect(explained.listState).toBe('with_catalog_mark');
    for (const id of ONBOARDING_STEPS_DEFAULT_ON) expect(explained.steps.find((s) => s.id === id)).toMatchObject({ on: false, why: 'off_in_pult' });
  });

  it('список БЕЗ метки насильно включает пять шагов — признак старой публикации (причина default_on_old_list)', () => {
    const raw = JSON.stringify(['name', 'welcome']);
    const steps = parseEnabledOnboardingSteps(raw);
    for (const id of ONBOARDING_STEPS_DEFAULT_ON) expect(steps).toContain(id);
    expect(explainEnabledOnboardingSteps(raw).listState).toBe('without_catalog_mark');
  });

  it('вне QA-режима рабочий список ровно тот, что дала админка', () => {
    const raw = JSON.stringify(['name', ONBOARDING_STEPS_CATALOG_MARK]);
    const fromPult = parseEnabledOnboardingSteps(raw);
    expect(resolveRuntimeOnboardingSteps(fromPult, false)).toEqual(fromPult);
    expect(resolveRuntimeOnboardingSteps(fromPult, true).length).toBeGreaterThan(fromPult.length);
  });

  it('QA-режим «весь каталог» требует __DEV__ в обоих местах чтения', () => {
    expect(read('components/CleanOnboarding.tsx')).toMatch(/const FORCE_ONBOARDING_QA =\s*typeof __DEV__ !== 'undefined'\s*&& __DEV__\s*&& process\.env\.EXPO_PUBLIC_FORCE_ONBOARDING_QA === '1'/);
    expect(read('app/onboarding_runtime_gate.ts')).toContain("__DEV__\n    && process.env.EXPO_PUBLIC_FORCE_ONBOARDING_QA === '1'".replace(/\n/g, read('app/onboarding_runtime_gate.ts').includes('\r\n') ? '\r\n' : '\n'));
  });

  it('админка при публикации всегда добавляет метку каталога', () => {
    const admin = read('admin/v2/legacy.html');
    const publishes = admin.match(/JSON\.stringify\(\[\.\.\.next, ONBOARDING_STEPS_CATALOG_MARK\]\)/g) ?? [];
    expect(publishes.length).toBeGreaterThanOrEqual(2);
  });
});
