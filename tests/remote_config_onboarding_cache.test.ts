import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadRemoteConfig } from '../app/remote_config_client';
import { getEnabledOnboardingSteps, __resetRemoteFlagsForTest } from '../app/remote_flags';
import { ONBOARDING_STEP_CATALOG, ONBOARDING_STEPS_CATALOG_MARK } from '../app/onboarding_flow';

describe('onboarding remote config offline cache', () => {
  beforeEach(async () => {
    __resetRemoteFlagsForTest();
    await AsyncStorage.clear();
  });

  // зачем (03.10): в 2.0 сервер больше не управляет маршрутом онбординга — applyRemoteConfigSnapshot
  // пропускает только синхронизацию, обновления, видео, промо/оплату и премиум («All other product
  // decisions stay local even if legacy keys are still present», снимок efe19ae9d). Сторож держит это
  // правило: сохранённый старым документом список (с меткой каталога или без) маршрут не меняет.
  it('ignores a cached server onboarding list with the catalog mark (route is a local decision)', async () => {
    await AsyncStorage.setItem('remote_config_cache_v1', JSON.stringify({
      texts: { onboarding_enabled_steps_v1: JSON.stringify(['welcome', 'name', ONBOARDING_STEPS_CATALOG_MARK]) },
    }));
    await loadRemoteConfig();
    expect(getEnabledOnboardingSteps()).toEqual(ONBOARDING_STEP_CATALOG.map(({ id }) => id));
  });

  it('ignores a legacy cached server onboarding list without the catalog mark', async () => {
    await AsyncStorage.setItem('remote_config_cache_v1', JSON.stringify({
      texts: { onboarding_enabled_steps_v1: '["welcome","name"]' },
    }));
    await loadRemoteConfig();
    expect(getEnabledOnboardingSteps()).toEqual(ONBOARDING_STEP_CATALOG.map(({ id }) => id));
  });

  it('falls back to the full route for a damaged cached onboarding value', async () => {
    await AsyncStorage.setItem('remote_config_cache_v1', JSON.stringify({
      texts: { onboarding_enabled_steps_v1: '{bad' },
    }));
    await loadRemoteConfig();
    expect(getEnabledOnboardingSteps()).toEqual(ONBOARDING_STEP_CATALOG.map(({ id }) => id));
  });
});
