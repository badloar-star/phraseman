import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  decideShouldShowWelcome,
  markWelcomeSeen,
  readWelcomeSeen,
  consumeForcedWelcomeBranch,
  requestForcedWelcome,
  resetWelcomeSeen,
  isWelcomeLatched,
  __resetWelcomeProcessLatch,
  WELCOME_SEEN_KEY,
  WELCOME_FORCE_KEY,
  type DecideWelcomeInput,
} from '../app/onboarding_welcome/welcome_gate';

const BASE: DecideWelcomeInput = {
  seenRaw: null,
  onboardingDone: true,
  latched: false,
  forced: null,
  hasPremiumAccess: false,
  hasActivePlan: false,
};

describe('decideShouldShowWelcome — показ ровно один раз', () => {
  it('показывает при первом входе (онбординг пройден, флага нет)', () => {
    expect(decideShouldShowWelcome(BASE)).toEqual({ show: true, branch: 'free' });
  });

  it('НЕ показывает, если флаг seen уже стоит (отказался/прошёл ранее) — навсегда', () => {
    expect(decideShouldShowWelcome({ ...BASE, seenRaw: '1' })).toEqual({ show: false, branch: 'free' });
  });

  it('НЕ показывает при поднятой защёлке процесса (анти-повтор при ремаунте)', () => {
    expect(decideShouldShowWelcome({ ...BASE, latched: true })).toEqual({ show: false, branch: 'free' });
  });

  it('ждёт завершения базового онбординга (onboarding_done != true)', () => {
    expect(decideShouldShowWelcome({ ...BASE, onboardingDone: false })).toEqual({ show: false, branch: 'free' });
    expect(decideShouldShowWelcome({ ...BASE, onboardingDone: null })).toEqual({ show: false, branch: 'free' });
  });

  it('ветка = plan при активном плане, иначе free', () => {
    expect(decideShouldShowWelcome({ ...BASE, hasActivePlan: true }).branch).toBe('plan');
    expect(decideShouldShowWelcome({ ...BASE, hasActivePlan: false }).branch).toBe('free');
  });

  it('принудительный запуск из админки игнорирует seen и онбординг-гейт', () => {
    const d = decideShouldShowWelcome({ ...BASE, seenRaw: '1', onboardingDone: false, forced: 'plan' });
    expect(d).toEqual({ show: true, branch: 'plan' });
  });

  it('защёлка перебивает даже принудительный запуск (уже показывали в этом запуске)', () => {
    const d = decideShouldShowWelcome({ ...BASE, latched: true, forced: 'free' });
    expect(d.show).toBe(false);
  });
});

describe('welcome_gate — хранилище и защёлка', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    __resetWelcomeProcessLatch();
  });

  it('markWelcomeSeen пишет флаг и СИНХРОННО поднимает защёлку', async () => {
    expect(isWelcomeLatched()).toBe(false);
    const p = markWelcomeSeen();
    // защёлка должна встать до завершения await (анти-гонка при ремаунте)
    expect(isWelcomeLatched()).toBe(true);
    await p;
    expect(await readWelcomeSeen()).toBe('1');
    await expect(AsyncStorage.getItem(WELCOME_SEEN_KEY)).resolves.toBe('1');
  });

  it('consumeForcedWelcomeBranch читает и СРАЗУ удаляет одноразовый QA-флаг', async () => {
    await requestForcedWelcome('plan');
    await expect(AsyncStorage.getItem(WELCOME_FORCE_KEY)).resolves.toBe('plan');
    expect(await consumeForcedWelcomeBranch()).toBe('plan');
    // повторное чтение — уже пусто (не запустится снова)
    await expect(AsyncStorage.getItem(WELCOME_FORCE_KEY)).resolves.toBeNull();
    expect(await consumeForcedWelcomeBranch()).toBeNull();
  });

  it('resetWelcomeSeen снимает флаг, force-ключ и защёлку (QA-сброс)', async () => {
    await markWelcomeSeen();
    await requestForcedWelcome('free');
    await resetWelcomeSeen();
    expect(isWelcomeLatched()).toBe(false);
    await expect(AsyncStorage.getItem(WELCOME_SEEN_KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(WELCOME_FORCE_KEY)).resolves.toBeNull();
  });

  it('readWelcomeSeen возвращает null при чистом хранилище', async () => {
    expect(await readWelcomeSeen()).toBeNull();
  });
});
