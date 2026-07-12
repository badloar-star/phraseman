import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadRemoteConfig } from '../app/remote_config_client';
import { getEnabledOnboardingSteps, __resetRemoteFlagsForTest } from '../app/remote_flags';
import { ONBOARDING_STEP_CATALOG } from '../app/onboarding_flow';

describe('onboarding remote config offline cache', () => {
  beforeEach(async () => {
    __resetRemoteFlagsForTest();
    await AsyncStorage.clear();
  });

  it('applies the last valid cached onboarding route before network access', async () => {
    await AsyncStorage.setItem('remote_config_cache_v1', JSON.stringify({
      texts: { onboarding_enabled_steps_v1: '["welcome","name"]' },
    }));
    await loadRemoteConfig();
    expect(getEnabledOnboardingSteps()).toEqual(['welcome', 'name']);
  });

  it('falls back to the full route for a damaged cached onboarding value', async () => {
    await AsyncStorage.setItem('remote_config_cache_v1', JSON.stringify({
      texts: { onboarding_enabled_steps_v1: '{bad' },
    }));
    await loadRemoteConfig();
    expect(getEnabledOnboardingSteps()).toEqual(ONBOARDING_STEP_CATALOG.map(({ id }) => id));
  });
});
