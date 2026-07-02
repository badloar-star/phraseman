// Аналитика АХ-сцены. app/analytics.ts сейчас редактируется другой сессией,
// поэтому union AnalyticsEvent НЕ расширяем — локальная обёртка с приведением
// типа. TODO(интеграция): когда app/analytics.ts освободится — добавить эти
// события в union и убрать приведение.

import { trackEvent } from '../../app/analytics';

export type AhaEventName =
  | 'onboarding_aha_started'
  | 'onboarding_aha_hear_replayed'
  | 'onboarding_aha_assembled'
  | 'onboarding_aha_speech_prompt'
  | 'onboarding_aha_speech_result'
  | 'onboarding_aha_speech_fallback'
  | 'onboarding_aha_completed'
  | 'onboarding_aha_skipped';

export function trackAhaEvent(
  name: AhaEventName,
  props: Record<string, unknown> = {},
): void {
  void trackEvent(name as Parameters<typeof trackEvent>[0], props).catch(() => undefined);
}
