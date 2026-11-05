// зачем (диагноз Эмулятора 06.11, решение координатора): на свежей установке список шагов Пульта приходит из сети позже маршрута → показывались все 12 шагов.
// Сторож: свежая установка + список админки → показаны ТОЛЬКО шаги админки; нет ответа → безопасный минимум, а не «всё включено».
import fs from 'node:fs';
import path from 'node:path';
import {
  ONBOARDING_STEPS_CATALOG_MARK,
  parseEnabledOnboardingSteps,
  resolveEnabledOnboardingOrder,
} from '../app/onboarding_flow';
import { ONBOARDING_STEPS_SAFE_MINIMUM, ONBOARDING_STEPS_WAIT_MS, awaitOnboardingStepsList } from '../app/onboarding_steps_gate';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

function fakeConfig(initiallyReady: boolean, adminListRaw: string) {
  let ready = initiallyReady;
  const listeners = new Set<() => void>();
  return {
    deps: {
      isReady: () => ready,
      getList: () => (ready ? parseEnabledOnboardingSteps(adminListRaw) : parseEnabledOnboardingSteps('')),
      subscribe: (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    },
    arrive: () => { ready = true; listeners.forEach((cb) => cb()); },
    listenerCount: () => listeners.size,
  };
}

const ADMIN_LIST = JSON.stringify(['welcome', 'language', 'level', 'name', ONBOARDING_STEPS_CATALOG_MARK]);

describe('список шагов на холодном старте', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('кэш/снимок уже есть → маршрут сразу, без ожидания', async () => {
    const cfg = fakeConfig(true, ADMIN_LIST);
    const plan = await awaitOnboardingStepsList(cfg.deps);
    expect(plan).toMatchObject({ source: 'ready_immediately', waitedMs: 0 });
    expect(plan.steps).toEqual(['welcome', 'language', 'level', 'name']);
  });

  it('свежая установка: пока нет ответа — ждём; список админки пришёл → только шаги админки (не все 12)', async () => {
    const cfg = fakeConfig(false, ADMIN_LIST);
    let nowMs = 1_000;
    const pending = awaitOnboardingStepsList({ ...cfg.deps, nowMs: () => nowMs });
    nowMs += 3_000;
    cfg.arrive();
    const plan = await pending;
    expect(plan.source).toBe('arrived_while_waiting');
    expect(plan.waitedMs).toBe(3_000);
    expect(plan.steps).toEqual(['welcome', 'language', 'level', 'name']);
    // и итоговый порядок с рубильниками кода (уровень выключен в коде): welcome → language → name
    expect(resolveEnabledOnboardingOrder(plan.steps, true, false)).toEqual(['welcome', 'language', 'name']);
    expect(cfg.listenerCount()).toBe(0);
  });

  it('нет ответа за таймаут → безопасный минимум welcome, language, name (а не все 12 шагов)', async () => {
    const cfg = fakeConfig(false, ADMIN_LIST);
    const pending = awaitOnboardingStepsList(cfg.deps);
    jest.advanceTimersByTime(ONBOARDING_STEPS_WAIT_MS);
    const plan = await pending;
    expect(plan.source).toBe('timeout_safe_minimum');
    expect(plan.steps).toEqual(ONBOARDING_STEPS_SAFE_MINIMUM);
    expect(plan.steps).toEqual(['welcome', 'language', 'name']);
    expect(cfg.listenerCount()).toBe(0);
  });

  it('обязательный шаг с согласиями (name) есть в минимуме', () => {
    expect(ONBOARDING_STEPS_SAFE_MINIMUM).toContain('name');
  });

  it('экран онбординга: «Начать» ждёт список с индикатором на кнопке и фиксирует маршрут', () => {
    const src = read('components/CleanOnboarding.tsx');
    expect(src).toContain('const startOnboardingRoute = useCallback(async () => {');
    expect(src).toContain('loading={startWaiting}');
    expect(src).toContain('void startOnboardingRoute();');
    expect(src).toContain('go(\'privacy\', order);');
    expect(src).toContain('[ONB-FLAGS] route: source=');
    expect(src).toContain('if (routeLockedRef.current) {');
  });
});
