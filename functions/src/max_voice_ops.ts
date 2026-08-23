import type { DocumentReference, Firestore } from 'firebase-admin/firestore';

export const MAX_VOICE_OPS_COLLECTION = 'max_voice_ops_daily';
export const MAX_VOICE_OPS_SCHEMA = 'max-voice-ops-daily.v1' as const;
export const MAX_VOICE_OPS_EVENT_SCHEMA = 'max-voice-ops-event.v1' as const;

const SCALAR_KEYS = [
  'mintsRequested', 'mintsSucceeded', 'mintsFailed', 'callsStarted', 'callsConnected',
  'callsCompleted', 'callsFailed', 'explicitUserEnds', 'watchdogEnds', 'reconnectAttempts',
  'reconnectRecovered', 'reconnectFailed', 'noRemoteAudio', 'emptyTranscript',
  'finalizationQueued', 'finalizationRetryable', 'finalizationTerminal', 'reviewsReady',
  'reviewsFailed', 'finalizationRetries', 'memoryUpdatesSucceeded', 'memoryUpdatesFailed',
  'sensitiveMemoryCandidatesRejected', 'quotaReservations', 'quotaSettlements',
  'watchdogSettlements', 'impossibleSequences',
  // зачем: владелец 2026-08-22 — телеметрия дисциплины БОЕВОЙ модели учителя
  // (симуляция показала слабые места слабой модели; проверяем настоящую).
  // Только счётчики за урок, никакого текста — приватность как у всего ops.
  'lessonsFinalized', 'lessonsEndedByTutor', 'lessonsWithHomework', 'lessonsGoalAdvanced',
  'lessonsSceneDone', 'lessonsTutorSafetyFlagged', 'lessonsWithLanguagePreference',
  'phraseResultsPass', 'phraseResultsTotal',
] as const;
const END_REASONS = ['completed', 'capped', 'dropped', 'background', 'failed'] as const;
const PREPARATION_BUCKETS = ['lt1s', '1to3s', '3to8s', 'gte8s'] as const;
const FIRST_AUDIO_BUCKETS = PREPARATION_BUCKETS;
const RESPONSE_BUCKETS = ['lt500ms', '500msto1s', '1to3s', 'gte3s'] as const;
const FINALIZE_BUCKETS = ['lt5s', '5to15s', '15to60s', 'gte60s'] as const;
const RECONNECT_BUCKETS = ['lt2s', '2to5s', '5to15s', 'gte15s'] as const;
const DURATION_BUCKETS = ['lt1m', '1to3m', '3to10m', 'gte10m'] as const;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
const PROVIDER_KEYS = ['audioInputTokens', 'audioOutputTokens', 'cachedTokens', 'textTokens', 'estimatedCostMicros'] as const;

type CounterRecord<K extends readonly string[]> = Readonly<Record<K[number], number>>;

export interface MaxVoiceOpsDailyV1 {
  readonly schemaVersion: typeof MAX_VOICE_OPS_SCHEMA;
  readonly dayKey: string;
  readonly mintsRequested: number;
  readonly mintsSucceeded: number;
  readonly mintsFailed: number;
  readonly callsStarted: number;
  readonly callsConnected: number;
  readonly callsCompleted: number;
  readonly callsFailed: number;
  readonly explicitUserEnds: number;
  readonly watchdogEnds: number;
  readonly reconnectAttempts: number;
  readonly reconnectRecovered: number;
  readonly reconnectFailed: number;
  readonly noRemoteAudio: number;
  readonly emptyTranscript: number;
  readonly finalizationQueued: number;
  readonly finalizationRetryable: number;
  readonly finalizationTerminal: number;
  readonly reviewsReady: number;
  readonly reviewsFailed: number;
  readonly finalizationRetries: number;
  readonly memoryUpdatesSucceeded: number;
  readonly memoryUpdatesFailed: number;
  readonly sensitiveMemoryCandidatesRejected: number;
  readonly quotaReservations: number;
  readonly quotaSettlements: number;
  readonly watchdogSettlements: number;
  readonly impossibleSequences: number;
  readonly lessonsFinalized: number;
  readonly lessonsEndedByTutor: number;
  readonly lessonsWithHomework: number;
  readonly lessonsGoalAdvanced: number;
  readonly lessonsSceneDone: number;
  readonly lessonsTutorSafetyFlagged: number;
  readonly lessonsWithLanguagePreference: number;
  readonly phraseResultsPass: number;
  readonly phraseResultsTotal: number;
  readonly endReasons: CounterRecord<typeof END_REASONS>;
  readonly preparationLatencyBuckets: CounterRecord<typeof PREPARATION_BUCKETS>;
  readonly firstAudioLatencyBuckets: CounterRecord<typeof FIRST_AUDIO_BUCKETS>;
  readonly responseLatencyBuckets: CounterRecord<typeof RESPONSE_BUCKETS>;
  readonly finalizeLatencyBuckets: CounterRecord<typeof FINALIZE_BUCKETS>;
  readonly reconnectRecoveryBuckets: CounterRecord<typeof RECONNECT_BUCKETS>;
  readonly callDurationBuckets: CounterRecord<typeof DURATION_BUCKETS>;
  readonly localeCounts: CounterRecord<typeof LOCALES>;
  readonly levelCounts: CounterRecord<typeof LEVELS>;
  readonly providerUsage: CounterRecord<typeof PROVIDER_KEYS>;
  readonly updatedAtMs: number;
}

type NestedDelta = Partial<Record<string, number>>;
export type MaxVoiceOpsDelta = Partial<Record<typeof SCALAR_KEYS[number], number>> & Partial<{
  endReasons: NestedDelta;
  preparationLatencyBuckets: NestedDelta;
  firstAudioLatencyBuckets: NestedDelta;
  responseLatencyBuckets: NestedDelta;
  finalizeLatencyBuckets: NestedDelta;
  reconnectRecoveryBuckets: NestedDelta;
  callDurationBuckets: NestedDelta;
  localeCounts: NestedDelta;
  levelCounts: NestedDelta;
  providerUsage: NestedDelta;
}>;

export type MaxVoiceOpsStage =
  | 'mint_requested' | 'mint_succeeded' | 'mint_failed'
  | 'call_started' | 'call_connected' | 'first_remote_audio' | 'call_completed' | 'call_failed'
  | 'explicit_user_end' | 'watchdog_end'
  | 'reconnect_attempt' | 'reconnect_recovered' | 'reconnect_failed'
  | 'no_remote_audio' | 'empty_transcript'
  | 'finalization_queued' | 'finalization_retryable' | 'finalization_terminal'
  | 'review_ready' | 'review_failed'
  | 'memory_update_succeeded' | 'memory_update_failed' | 'sensitive_memory_candidate_rejected'
  | 'quota_reserved' | 'quota_settled' | 'watchdog_settled'
  | 'lesson_quality';

/** Счётчики дисциплины учителя за один урок (стадия lesson_quality). Только числа/флаги. */
export interface MaxVoiceOpsLessonQuality {
  readonly endedByTutor: boolean;
  readonly homeworkAssigned: boolean;
  readonly goalAdvanced: boolean;
  readonly sceneDone: boolean;
  readonly tutorSafetyFlagged: boolean;
  readonly languagePreferenceSet: boolean;
  readonly phrasePass: number;
  readonly phraseTotal: number;
}

export interface MaxVoiceOpsEventV1 {
  readonly schemaVersion: typeof MAX_VOICE_OPS_EVENT_SCHEMA;
  readonly stage: MaxVoiceOpsStage;
  readonly latencyMs?: number;
  readonly durationSec?: number;
  readonly locale?: typeof LOCALES[number];
  readonly level?: typeof LEVELS[number];
  readonly endReason?: typeof END_REASONS[number];
  readonly providerUsage?: Partial<CounterRecord<typeof PROVIDER_KEYS>>;
  readonly lesson?: MaxVoiceOpsLessonQuality;
}

export function maxVoiceOpsLocale(value: unknown): typeof LOCALES[number] | undefined {
  return (LOCALES as readonly unknown[]).includes(value) ? value as typeof LOCALES[number] : undefined;
}

export function maxVoiceOpsLevel(value: unknown): typeof LEVELS[number] | undefined {
  return (LEVELS as readonly unknown[]).includes(value) ? value as typeof LEVELS[number] : undefined;
}

const NESTED_KEYS = {
  endReasons: END_REASONS,
  preparationLatencyBuckets: PREPARATION_BUCKETS,
  firstAudioLatencyBuckets: FIRST_AUDIO_BUCKETS,
  responseLatencyBuckets: RESPONSE_BUCKETS,
  finalizeLatencyBuckets: FINALIZE_BUCKETS,
  reconnectRecoveryBuckets: RECONNECT_BUCKETS,
  callDurationBuckets: DURATION_BUCKETS,
  localeCounts: LOCALES,
  levelCounts: LEVELS,
  providerUsage: PROVIDER_KEYS,
} as const;
const TOP_LEVEL_FORBIDDEN_KEYS = new Set([
  'uid', 'userId', 'accountId', 'sessionId', 'name', 'email', 'history', 'transcript',
  'audio', 'utterance', 'userText', 'assistantText', 'memoryFact', 'conversationSummary',
]);
const MAX_COUNTER = 1_000_000_000_000;
type MutableMaxVoiceOpsDaily = { -readonly [K in keyof MaxVoiceOpsDailyV1]: MaxVoiceOpsDailyV1[K] };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('max_ops_delta_invalid');
  return value as Record<string, unknown>;
}

function count(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_COUNTER) throw new Error('max_ops_counter_invalid');
  return parsed;
}

function zeroes<K extends readonly string[]>(keys: K): Record<K[number], number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K[number], number>;
}

export function emptyMaxVoiceOpsDaily(dayKey: string, updatedAtMs: number): MaxVoiceOpsDailyV1 {
  return {
    schemaVersion: MAX_VOICE_OPS_SCHEMA,
    dayKey,
    ...Object.fromEntries(SCALAR_KEYS.map((key) => [key, 0])) as Record<typeof SCALAR_KEYS[number], number>,
    endReasons: zeroes(END_REASONS),
    preparationLatencyBuckets: zeroes(PREPARATION_BUCKETS),
    firstAudioLatencyBuckets: zeroes(FIRST_AUDIO_BUCKETS),
    responseLatencyBuckets: zeroes(RESPONSE_BUCKETS),
    finalizeLatencyBuckets: zeroes(FINALIZE_BUCKETS),
    reconnectRecoveryBuckets: zeroes(RECONNECT_BUCKETS),
    callDurationBuckets: zeroes(DURATION_BUCKETS),
    localeCounts: zeroes(LOCALES),
    levelCounts: zeroes(LEVELS),
    providerUsage: zeroes(PROVIDER_KEYS),
    updatedAtMs,
  };
}

export function sanitizeMaxOpsDelta(value: unknown): MaxVoiceOpsDelta {
  const row = object(value);
  const allowed = new Set<string>([...SCALAR_KEYS, ...Object.keys(NESTED_KEYS)]);
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(row)) {
    if (TOP_LEVEL_FORBIDDEN_KEYS.has(key)) throw new Error('max_ops_forbidden_key');
    if (!allowed.has(key)) throw new Error('max_ops_unknown_key');
    if ((SCALAR_KEYS as readonly string[]).includes(key)) {
      result[key] = count(raw);
      continue;
    }
    const nested = object(raw);
    const nestedAllowed = new Set<string>(NESTED_KEYS[key as keyof typeof NESTED_KEYS]);
    const clean: Record<string, number> = {};
    for (const [nestedKey, nestedValue] of Object.entries(nested)) {
      if (!nestedAllowed.has(nestedKey)) throw new Error('max_ops_forbidden_key');
      clean[nestedKey] = count(nestedValue);
    }
    result[key] = clean;
  }
  return result as MaxVoiceOpsDelta;
}

function latencyBucket(value: number, cuts: readonly number[], labels: readonly string[]): string {
  const safe = Number.isFinite(value) && value >= 0 ? value : 0;
  const index = cuts.findIndex((cut) => safe < cut);
  return labels[index < 0 ? labels.length - 1 : index];
}

const STAGE_COUNTER: Readonly<Record<MaxVoiceOpsStage, typeof SCALAR_KEYS[number] | null>> = {
  mint_requested: 'mintsRequested', mint_succeeded: 'mintsSucceeded', mint_failed: 'mintsFailed',
  call_started: 'callsStarted', call_connected: 'callsConnected', first_remote_audio: null,
  call_completed: 'callsCompleted', call_failed: 'callsFailed',
  explicit_user_end: 'explicitUserEnds', watchdog_end: 'watchdogEnds',
  reconnect_attempt: 'reconnectAttempts', reconnect_recovered: 'reconnectRecovered', reconnect_failed: 'reconnectFailed',
  no_remote_audio: 'noRemoteAudio', empty_transcript: 'emptyTranscript',
  finalization_queued: 'finalizationQueued', finalization_retryable: 'finalizationRetryable', finalization_terminal: 'finalizationTerminal',
  review_ready: 'reviewsReady', review_failed: 'reviewsFailed',
  memory_update_succeeded: 'memoryUpdatesSucceeded', memory_update_failed: 'memoryUpdatesFailed',
  sensitive_memory_candidate_rejected: 'sensitiveMemoryCandidatesRejected',
  quota_reserved: 'quotaReservations', quota_settled: 'quotaSettlements', watchdog_settled: 'watchdogSettlements',
  lesson_quality: 'lessonsFinalized',
};

/** Потолок фраз за урок — защита от мусорного клиента (в уроке их единицы). */
const LESSON_PHRASE_MAX = 200;

export function maxVoiceOpsDeltaForEvent(event: MaxVoiceOpsEventV1): MaxVoiceOpsDelta {
  if (event.schemaVersion !== MAX_VOICE_OPS_EVENT_SCHEMA || !(event.stage in STAGE_COUNTER)) throw new Error('max_ops_event_invalid');
  const counter = STAGE_COUNTER[event.stage];
  const delta: MaxVoiceOpsDelta = counter === null ? {} : { [counter]: 1 };
  if (event.stage === 'mint_succeeded') {
    delta.preparationLatencyBuckets = { [latencyBucket(event.latencyMs ?? 0, [1_000, 3_000, 8_000], PREPARATION_BUCKETS)]: 1 };
    if (event.locale && (LOCALES as readonly string[]).includes(event.locale)) delta.localeCounts = { [event.locale]: 1 };
    if (event.level && (LEVELS as readonly string[]).includes(event.level)) delta.levelCounts = { [event.level]: 1 };
  } else if (event.stage === 'first_remote_audio') {
    delta.firstAudioLatencyBuckets = { [latencyBucket(event.latencyMs ?? 0, [1_000, 3_000, 8_000], FIRST_AUDIO_BUCKETS)]: 1 };
  } else if (event.stage === 'reconnect_recovered') {
    delta.reconnectRecoveryBuckets = { [latencyBucket(event.latencyMs ?? 0, [2_000, 5_000, 15_000], RECONNECT_BUCKETS)]: 1 };
  } else if (event.stage === 'review_ready') {
    delta.finalizeLatencyBuckets = { [latencyBucket(event.latencyMs ?? 0, [5_000, 15_000, 60_000], FINALIZE_BUCKETS)]: 1 };
  } else if (event.stage === 'lesson_quality') {
    const lesson = event.lesson;
    if (lesson) {
      if (lesson.endedByTutor === true) delta.lessonsEndedByTutor = 1;
      if (lesson.homeworkAssigned === true) delta.lessonsWithHomework = 1;
      if (lesson.goalAdvanced === true) delta.lessonsGoalAdvanced = 1;
      if (lesson.sceneDone === true) delta.lessonsSceneDone = 1;
      if (lesson.tutorSafetyFlagged === true) delta.lessonsTutorSafetyFlagged = 1;
      if (lesson.languagePreferenceSet === true) delta.lessonsWithLanguagePreference = 1;
      delta.phraseResultsPass = Math.min(LESSON_PHRASE_MAX, count(lesson.phrasePass));
      delta.phraseResultsTotal = Math.min(LESSON_PHRASE_MAX, count(lesson.phraseTotal));
    }
  } else if (event.stage === 'call_completed' || event.stage === 'call_failed') {
    delta.callDurationBuckets = { [latencyBucket((event.durationSec ?? 0) * 1_000, [60_000, 180_000, 600_000], DURATION_BUCKETS)]: 1 };
    if (event.endReason && (END_REASONS as readonly string[]).includes(event.endReason)) delta.endReasons = { [event.endReason]: 1 };
    if (event.providerUsage) delta.providerUsage = Object.fromEntries(PROVIDER_KEYS.map((key) => [key, count(event.providerUsage?.[key] ?? 0)]));
  }
  return sanitizeMaxOpsDelta(delta);
}

export function applyMaxVoiceOpsDelta(raw: unknown, dayKey: string, deltaValue: unknown, updatedAtMs: number): MaxVoiceOpsDailyV1 {
  const current = emptyMaxVoiceOpsDaily(dayKey, updatedAtMs) as MutableMaxVoiceOpsDaily;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const source = raw as Record<string, unknown>;
    for (const key of SCALAR_KEYS) current[key] = count(source[key] ?? 0);
    for (const [group, keys] of Object.entries(NESTED_KEYS)) {
      const sourceGroup = source[group] && typeof source[group] === 'object' ? source[group] as Record<string, unknown> : {};
      const target = current[group as keyof MaxVoiceOpsDailyV1] as unknown as Record<string, number>;
      for (const key of keys) target[key] = count(sourceGroup[key] ?? 0);
    }
  }
  const delta = sanitizeMaxOpsDelta(deltaValue);
  for (const key of SCALAR_KEYS) current[key] = Math.min(MAX_COUNTER, current[key] + (delta[key] ?? 0));
  for (const [group, keys] of Object.entries(NESTED_KEYS)) {
    const target = current[group as keyof MaxVoiceOpsDailyV1] as unknown as Record<string, number>;
    const additions = delta[group as keyof MaxVoiceOpsDelta] as NestedDelta | undefined;
    for (const key of keys) target[key] = Math.min(MAX_COUNTER, target[key] + (additions?.[key] ?? 0));
  }
  current.updatedAtMs = updatedAtMs;
  return current;
}

export function maxVoiceOpsDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

const PREREQUISITE: Partial<Record<MaxVoiceOpsStage, MaxVoiceOpsStage>> = {
  mint_succeeded: 'mint_requested', mint_failed: 'mint_requested', quota_reserved: 'mint_requested',
  call_connected: 'call_started', first_remote_audio: 'call_connected',
  call_completed: 'call_started', call_failed: 'call_started',
  reconnect_recovered: 'reconnect_attempt', reconnect_failed: 'reconnect_attempt',
  review_ready: 'finalization_queued', review_failed: 'finalization_queued',
  memory_update_succeeded: 'finalization_queued', memory_update_failed: 'finalization_queued',
  quota_settled: 'quota_reserved', watchdog_settled: 'quota_reserved',
  lesson_quality: 'finalization_queued',
};

export async function recordMaxVoiceOpsOnce(db: Firestore, input: {
  markerRef: DocumentReference;
  markerId: string;
  event: MaxVoiceOpsEventV1;
  nowMs?: number;
}): Promise<'recorded' | 'duplicate' | 'impossible'> {
  const nowMs = input.nowMs ?? Date.now();
  const dayKey = maxVoiceOpsDayKey(nowMs);
  const aggregateRef = db.collection(MAX_VOICE_OPS_COLLECTION).doc(dayKey);
  return db.runTransaction(async (tx) => {
    const [markerSnapshot, aggregateSnapshot] = await Promise.all([tx.get(input.markerRef), tx.get(aggregateRef)]);
    const marker = (markerSnapshot.data() ?? {}) as Record<string, unknown>;
    const stages = marker.maxVoiceOpsStages && typeof marker.maxVoiceOpsStages === 'object'
      ? { ...marker.maxVoiceOpsStages as Record<string, unknown> }
      : {};
    if (stages[input.event.stage] === input.markerId) return 'duplicate';
    const prerequisite = PREREQUISITE[input.event.stage];
    const impossible = prerequisite !== undefined && stages[prerequisite] !== input.markerId;
    const delta = impossible ? { impossibleSequences: 1 } : maxVoiceOpsDeltaForEvent(input.event);
    tx.set(aggregateRef, applyMaxVoiceOpsDelta(aggregateSnapshot.data(), dayKey, delta, nowMs));
    stages[input.event.stage] = input.markerId;
    tx.set(input.markerRef, { maxVoiceOpsStages: stages, maxVoiceOpsUpdatedAtMs: nowMs }, { merge: true });
    return impossible ? 'impossible' : 'recorded';
  });
}
