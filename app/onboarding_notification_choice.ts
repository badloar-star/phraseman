import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_NOTIFICATION_CHOICE_KEY = 'onboarding_trial_reminder_choice_v1';

export type OnboardingNotificationChoice = 'allow' | 'skip' | 'blocked';

export async function readOnboardingNotificationChoice(): Promise<OnboardingNotificationChoice | null> {
  const stored = await AsyncStorage.getItem(ONBOARDING_NOTIFICATION_CHOICE_KEY).catch(() => null);
  return stored === 'allow' || stored === 'skip' || stored === 'blocked' ? stored : null;
}

export async function setOnboardingNotificationChoice(
  choice: OnboardingNotificationChoice,
): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_NOTIFICATION_CHOICE_KEY, choice);
}

export function shouldPromptForOnboardingNotifications(
  choice: OnboardingNotificationChoice | null,
): boolean {
  return choice === null;
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
