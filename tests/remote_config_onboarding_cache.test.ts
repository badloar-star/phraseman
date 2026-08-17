import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadRemoteConfig } from '../app/remote_config_client';
import { getEnabledOnboardingSteps, __resetRemoteFlagsForTest } from '../app/remote_flags';
import { ONBOARDING_STEP_CATALOG, ONBOARDING_STEPS_CATALOG_MARK } from '../app/onboarding_flow';

describe('onboarding remote config offline cache', () => {
  beforeEach(async () => {
    __resetRemoteFlagsForTest();
    await AsyncStorage.clear();
  });

  it('applies the last valid cached onboarding route before network access', async () => {
    // зачем: с меткой каталога список читается буквально — тест сторожит именно
    // кэш, а не default-on логику новых шагов (она проверяется в onboarding_flow.test).
    await AsyncStorage.setItem('remote_config_cache_v1', JSON.stringify({
      texts: { onboarding_enabled_steps_v1: JSON.stringify(['welcome', 'name', ONBOARDING_STEPS_CATALOG_MARK]) },
    }));
    await loadRemoteConfig();
    expect(getEnabledOnboardingSteps()).toEqual(['welcome', 'name']);
  });

  it('keeps post-release screens on for a legacy cached list without the catalog mark', async () => {
    // зачем: старый сохранённый список (до появления новых экранов) не должен
    // молча выключать их на проде — иначе после релиза у всех пропали бы
    // сейф, график, «помоги улучшить» и напоминание о пробном.
    await AsyncStorage.setItem('remote_config_cache_v1', JSON.stringify({
      texts: { onboarding_enabled_steps_v1: '["welcome","name"]' },
    }));
    await loadRemoteConfig();
    const enabled = getEnabledOnboardingSteps();
    expect(enabled).toContain('privacy');
    expect(enabled).toContain('promise');
    expect(enabled).toContain('improve');
    expect(enabled).toContain('trialReminder');
    expect(enabled).toContain('niceToMeet');
    expect(enabled).toContain('letsBuild');
    expect(enabled).not.toContain('source');
    expect(enabled).not.toContain('onboardingPaywall');
  });

  it('falls back to the full route for a damaged cached onboarding value', async () => {
    await AsyncStorage.setItem('remote_config_cache_v1', JSON.stringify({
      texts: { onboarding_enabled_steps_v1: '{bad' },
    }));
    await loadRemoteConfig();
    expect(getEnabledOnboardingSteps()).toEqual(ONBOARDING_STEP_CATALOG.map(({ id }) => id));
  });
});
