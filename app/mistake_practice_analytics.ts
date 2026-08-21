import * as Crypto from 'expo-crypto';
import { trackEvent } from './analytics';

export const MISTAKE_PRACTICE_ANALYTICS_SCHEMA_VERSION = 1 as const;

export type MistakePracticeAnalyticsEvent =
  | 'mistake_practice_menu_opened'
  | 'mistake_practice_setup_started'
  | 'mistake_practice_session_started'
  | 'mistake_practice_answered'
  | 'mistake_practice_session_completed'
  | 'mistake_practice_session_abandoned'
  | 'mistake_practice_hidden'
  | 'mistake_practice_restored'
  | 'mistake_practice_voice_outcome'
  | 'mistake_practice_content_unavailable'
  | 'mistake_practice_loop_available'
  | 'mistake_practice_loop_started';

type SafeValue = string | number | boolean;

const bounded = (value: number, max: number): number =>
  Math.min(max, Math.max(0, Number.isFinite(value) ? Math.round(value) : 0));

export function buildMistakePracticeAnalyticsPayload(
  input: Readonly<Record<string, SafeValue>>,
): Readonly<Record<string, SafeValue>> {
  const payload: Record<string, SafeValue> = {
    schema_version: MISTAKE_PRACTICE_ANALYTICS_SCHEMA_VERSION,
    event_id: Crypto.randomUUID(),
  };
  for (const [key, value] of Object.entries(input)) {
    if (/phrase|answer_text|translation|transcript|mistake_id/i.test(key)) continue;
    if (typeof value === 'string') payload[key] = value.trim().slice(0, 80);
    else if (typeof value === 'number') payload[key] = bounded(value, 10_000);
    else payload[key] = value;
  }
  return Object.freeze(payload);
}

export function trackMistakePracticeEvent(
  event: MistakePracticeAnalyticsEvent,
  input: Readonly<Record<string, SafeValue>>,
): void {
  void trackEvent(event, buildMistakePracticeAnalyticsPayload(input));
}

export default function __RouteShim() { return null; }
