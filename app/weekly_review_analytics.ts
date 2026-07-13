import { logEvent } from './firebase';
import type { WeeklyReviewActionKind } from './weekly_review_types';

export type WeeklyReviewAnalyticsEvent =
  | 'weekly_review_impression'
  | 'weekly_review_generate_started'
  | 'weekly_review_generate_succeeded'
  | 'weekly_review_generate_failed'
  | 'weekly_review_expanded'
  | 'weekly_review_action_pressed'
  | 'weekly_review_paywall_pressed';

type Tier = 'free' | 'plus';
type StudyTarget = 'en' | 'fr';
type SignalBucket = '0' | '1_3' | '4_7' | '8_plus';
type ResultSource = 'none' | 'local_fallback' | 'cache' | 'replay' | 'provider';
type ErrorCode = 'offline' | 'not_ready' | 'app_check_unavailable' | 'provider_failed' | 'unknown';
type LatencyBucket = 'under_1s' | '1_3s' | '3_10s' | '10s_plus';

export interface WeeklyReviewAnalyticsParams {
  tier?: Tier;
  study_target?: StudyTarget;
  signal_bucket?: SignalBucket;
  result_source?: ResultSource;
  error_code?: ErrorCode;
  latency_bucket?: LatencyBucket;
  schema_version?: 'weekly-review-v2';
  action_kind?: WeeklyReviewActionKind;
}

const EVENTS = new Set<WeeklyReviewAnalyticsEvent>([
  'weekly_review_impression',
  'weekly_review_generate_started',
  'weekly_review_generate_succeeded',
  'weekly_review_generate_failed',
  'weekly_review_expanded',
  'weekly_review_action_pressed',
  'weekly_review_paywall_pressed',
]);
const TIERS = new Set<Tier>(['free', 'plus']);
const TARGETS = new Set<StudyTarget>(['en', 'fr']);
const SIGNALS = new Set<SignalBucket>(['0', '1_3', '4_7', '8_plus']);
const SOURCES = new Set<ResultSource>(['none', 'local_fallback', 'cache', 'replay', 'provider']);
const ERRORS = new Set<ErrorCode>(['offline', 'not_ready', 'app_check_unavailable', 'provider_failed', 'unknown']);
const LATENCIES = new Set<LatencyBucket>(['under_1s', '1_3s', '3_10s', '10s_plus']);
const ACTIONS = new Set<WeeklyReviewActionKind>([
  'repeat_due_words',
  'repeat_due_phrases',
  'open_personal_training',
  'continue_lesson',
]);

export function signalBucket(count: number): SignalBucket {
  if (count <= 0) return '0';
  if (count <= 3) return '1_3';
  if (count <= 7) return '4_7';
  return '8_plus';
}

export function latencyBucket(durationMs: number): LatencyBucket {
  if (durationMs < 1_000) return 'under_1s';
  if (durationMs < 3_000) return '1_3s';
  if (durationMs < 10_000) return '3_10s';
  return '10s_plus';
}

export function trackWeeklyReviewEvent(
  event: WeeklyReviewAnalyticsEvent,
  raw: WeeklyReviewAnalyticsParams = {},
): void {
  if (!EVENTS.has(event)) return;
  const params: Record<string, string> = {};
  if (TIERS.has(raw.tier as Tier)) params.tier = raw.tier as Tier;
  if (TARGETS.has(raw.study_target as StudyTarget)) params.study_target = raw.study_target as StudyTarget;
  if (SIGNALS.has(raw.signal_bucket as SignalBucket)) params.signal_bucket = raw.signal_bucket as SignalBucket;
  if (SOURCES.has(raw.result_source as ResultSource)) params.result_source = raw.result_source as ResultSource;
  if (raw.error_code !== undefined) params.error_code = ERRORS.has(raw.error_code as ErrorCode) ? raw.error_code as ErrorCode : 'unknown';
  if (LATENCIES.has(raw.latency_bucket as LatencyBucket)) params.latency_bucket = raw.latency_bucket as LatencyBucket;
  if (raw.schema_version === 'weekly-review-v2') params.schema_version = 'weekly_review_v2';
  if (ACTIONS.has(raw.action_kind as WeeklyReviewActionKind)) params.action_kind = raw.action_kind as WeeklyReviewActionKind;
  logEvent(event, params);
}

export default function __RouteShim() { return null; }
