// зачем (владелец 28.10 через координатора): «выключил в Пульте разделы онбординга — в приложении ничего не изменилось». С 30.09 белый
// список applyRemoteConfigSnapshot (efe19ae9d) молча выбрасывал texts.onboarding_enabled_steps_v1 и bools.onboarding_skip_enabled.
// Сторож: значение Пульта с боя (28.10) доходит до маршрута — выключенный раздел пропускается, «Пропуск» выключается.
import {
  explainEnabledOnboardingSteps,
  resolveEnabledOnboardingOrder,
  resolveOnboardingAdvance,
  resolveOnboardingStep,
} from '../app/onboarding_flow';
import { __resetRemoteFlagsForTest, applyRemoteConfigSnapshot, getEnabledOnboardingSteps, getRemoteBool } from '../app/remote_flags';

// remote_config/app.texts.onboarding_enabled_steps_v1 на бою 28.10: выключены improve, source, trialReminder, onboardingPaywall
const PULT_28_10 = '["welcome","privacy","niceToMeet","promise","language","level","notifications","name","catalog_2026_08_17"]';

describe('Пульт: выключенный раздел онбординга → шаг пропущен', () => {
  let logs: string[] = [];
  beforeEach(() => {
    __resetRemoteFlagsForTest();
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { logs.push(args.map(String).join(' ')); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('список из Пульта применяется: выключенные шаги не входят в маршрут', () => {
    applyRemoteConfigSnapshot({ texts: { onboarding_enabled_steps_v1: PULT_28_10 } }, { source: 'network', fetchedAtMs: 1 });
    const steps = getEnabledOnboardingSteps();
    expect(steps).toEqual(['welcome', 'privacy', 'niceToMeet', 'promise', 'language', 'level', 'notifications', 'name']);
    for (const off of ['improve', 'source', 'trialReminder', 'onboardingPaywall']) expect(steps).not.toContain(off);
  });

  it('переходы пропускают выключенные шаги: после «Обещания» — сразу «Язык», после «Имени» — завершение', () => {
    applyRemoteConfigSnapshot({ texts: { onboarding_enabled_steps_v1: PULT_28_10 } }, { source: 'cache' });
    const order = resolveEnabledOnboardingOrder(getEnabledOnboardingSteps(), true, true);
    expect(resolveOnboardingStep(order, 'promise', 'forward')).toBe('language');
    expect(resolveOnboardingAdvance(order, 'name')).toBeNull(); // напоминание и цены выключены — онбординг завершается
  });

  it('тумблер «Пропуск» из Пульта доходит до приложения', () => {
    expect(getRemoteBool('onboarding_skip_enabled')).toBe(true); // дефолт
    applyRemoteConfigSnapshot({ bools: { onboarding_skip_enabled: false } }, { source: 'network' });
    expect(getRemoteBool('onboarding_skip_enabled')).toBe(false);
  });

  it('лог [ONB-FLAGS] называет источник и причину по каждому шагу', () => {
    applyRemoteConfigSnapshot({ texts: { onboarding_enabled_steps_v1: PULT_28_10 } }, { source: 'network', fetchedAtMs: 0 });
    getEnabledOnboardingSteps();
    expect(logs.some((l) => l.startsWith('[ONB-FLAGS] apply: source=network') && l.includes('steps_taken=true'))).toBe(true);
    const line = logs.find((l) => l.startsWith('[ONB-FLAGS] steps:')) ?? '';
    expect(line).toContain('origin=pult(network');
    expect(line).toContain('improve=OFF:off_in_pult');
    expect(line).toContain('name=on:mandatory');
  });

  it('пустой и битый список — весь каталог, причина в разборе', () => {
    expect(explainEnabledOnboardingSteps('').steps.every((s) => s.on && s.why === 'no_list_all_on')).toBe(true);
    expect(explainEnabledOnboardingSteps('{bad').steps.every((s) => s.on && s.why === 'bad_list_all_on')).toBe(true);
  });
});
