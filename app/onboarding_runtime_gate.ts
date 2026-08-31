/**
 * Canonical synchronous runtime gate for QA-forced onboarding.
 *
 * Persisted `onboarding_done` deliberately remains untouched in this mode, so
 * any app-scoped reward host must consult this gate before trusting storage.
 */
export function isForcedOnboardingForQaRuntime(): boolean {
  return typeof __DEV__ !== 'undefined'
    && __DEV__
    && process.env.EXPO_PUBLIC_FORCE_ONBOARDING_QA === '1';
}
