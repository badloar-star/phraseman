import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_STEP_CATALOG, ONBOARDING_STEPS_CATALOG_MARK, ONBOARDING_STEPS_DEFAULT_ON } from '../app/onboarding_flow';

// Свежие модули на каждый тест: remote_config_client держит зеркало кэша в памяти процесса (AsyncStorage.clear его не сбрасывает).
async function loadWithCache(texts: Record<string, string>): Promise<string[]> {
  let steps: string[] = [];
  await jest.isolateModulesAsync(async () => {
    // Холодный старт без сети (с 28.10 старт всегда идёт в сеть): облако выключено — проверяем ровно то, что дал кэш телефона.
    jest.doMock('../app/config', () => ({ ...jest.requireActual('../app/config'), CLOUD_SYNC_ENABLED: false }));
    // кэш кладём в тот же экземпляр AsyncStorage, что увидит клиент внутри изоляции
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storage = require('@react-native-async-storage/async-storage').default as typeof AsyncStorage;
    await storage.clear();
    await storage.setItem('remote_config_cache_v1', JSON.stringify({ texts }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const client = require('../app/remote_config_client') as typeof import('../app/remote_config_client');
    flags.__resetRemoteFlagsForTest();
    await client.loadRemoteConfig();
    steps = flags.getEnabledOnboardingSteps();
  });
  return steps;
}

describe('onboarding remote config offline cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  // зачем: 03.10 этот сторож держал правило «маршрут онбординга — локальное решение» (белый список efe19ae9d, общий снимок 2.0).
  // 28.10 владелец через координатора: «выключил разделы в Пульте — в приложении ничего не изменилось» — галочки Пульта обязаны
  // работать. Список из кэша телефона (первый кадр до сети) теперь применяется так же, как из сети.
  it('applies a cached Pult onboarding list with the catalog mark literally', async () => {
    const steps = await loadWithCache({ onboarding_enabled_steps_v1: JSON.stringify(['welcome', 'name', ONBOARDING_STEPS_CATALOG_MARK]) });
    expect(steps).toEqual(['welcome', 'name']);
  });

  it('keeps the screens added on 17.08 on for a legacy cached list without the catalog mark', async () => {
    const steps = await loadWithCache({ onboarding_enabled_steps_v1: '["welcome","name"]' });
    const expected = ONBOARDING_STEP_CATALOG.map(({ id }) => id)
      .filter((id) => id === 'welcome' || id === 'name' || (ONBOARDING_STEPS_DEFAULT_ON as readonly string[]).includes(id));
    expect(steps).toEqual(expected);
  });

  it('falls back to the full route for a damaged cached onboarding value', async () => {
    const steps = await loadWithCache({ onboarding_enabled_steps_v1: '{bad' });
    expect(steps).toEqual(ONBOARDING_STEP_CATALOG.map(({ id }) => id));
  });
});
