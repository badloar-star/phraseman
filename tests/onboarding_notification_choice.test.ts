jest.mock('@react-native-async-storage/async-storage');

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_NOTIFICATION_CHOICE_KEY,
  readOnboardingNotificationChoice,
  setOnboardingNotificationChoice,
  shouldPromptForOnboardingNotifications,
} from '../app/onboarding_notification_choice';

describe('onboarding notification choice', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it.each(['allow', 'skip', 'blocked'] as const)('persists %s', async (choice) => {
    await setOnboardingNotificationChoice(choice);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_NOTIFICATION_CHOICE_KEY, choice);
    await expect(readOnboardingNotificationChoice()).resolves.toBe(choice);
  });

  it('treats unknown/corrupt values as no decision', async () => {
    await AsyncStorage.setItem(ONBOARDING_NOTIFICATION_CHOICE_KEY, 'wat');
    await expect(readOnboardingNotificationChoice()).resolves.toBeNull();
  });

  it('prompts only before a choice exists', () => {
    expect(shouldPromptForOnboardingNotifications(null)).toBe(true);
    expect(shouldPromptForOnboardingNotifications('allow')).toBe(false);
    expect(shouldPromptForOnboardingNotifications('skip')).toBe(false);
    expect(shouldPromptForOnboardingNotifications('blocked')).toBe(false);
  });
});
