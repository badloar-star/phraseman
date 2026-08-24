import { emptyMaxVoiceOpsDaily, MAX_VOICE_OPS_SCHEMA } from '../max_voice_ops';
import { MAX_EVIDENCE_AGE_MS } from './decision';

export const MAXVOICE_SOURCE_DAYS = 7;

export type MaxvoiceSourceState = 'ready' | 'empty' | 'stale' | 'error';

export interface FetchMaxvoiceSourceResult {
  readonly state: MaxvoiceSourceState;
  readonly sampledDays: number;
  readonly mintRejections: number | null;
  readonly callsStarted: number | null;
  readonly callsConnected: number | null;
  readonly callsCompleted: number | null;
  readonly reviewsReady: number | null;
  readonly reconnectAttempts: number | null;
  readonly reconnectRecovered: number | null;
  readonly firstAudioGte8s: number | null;
  readonly observedAtMs: number;
}

export interface FetchMaxvoiceSourceInput {
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

const CONTENT_KEYS = new Set([
  'uid', 'userid', 'accountid', 'sessionid', 'name', 'email', 'history',
  'transcript', 'audio', 'audiotext', 'utterance', 'usertext', 'assistanttext',
  'conversation', 'conversationsummary', 'memoryfact',
]);
const MAX_COUNTER = 1_000_000_000_000;

function safeCount(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_COUNTER) {
    throw new Error('Jarvis MAX: invalid aggregate counter');
  }
  return value as number;
}

function safeTimestamp(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('Jarvis MAX: invalid aggregate timestamp');
  }
  return value as number;
}

function nullResult(observedAtMs: number): FetchMaxvoiceSourceResult {
  return Object.freeze({
    state: 'error' as const,
    sampledDays: 0,
    mintRejections: null,
    callsStarted: null,
    callsConnected: null,
    callsCompleted: null,
    reviewsReady: null,
    reconnectAttempts: null,
    reconnectRecovered: null,
    firstAudioGte8s: null,
    observedAtMs,
  });
}

function readDaily(value: unknown): {
  readonly callsStarted: number;
  readonly mintRejections: number;
  readonly callsConnected: number;
  readonly callsCompleted: number;
  readonly reviewsReady: number;
  readonly reconnectAttempts: number;
  readonly reconnectRecovered: number;
  readonly firstAudioGte8s: number;
  readonly updatedAtMs: number;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Jarvis MAX: daily aggregate is not an object');
  }
  const row = value as Record<string, unknown>;
  const dayKey = typeof row.dayKey === 'string' ? row.dayKey : '';
  const templateKeys = new Set(Object.keys(emptyMaxVoiceOpsDaily(dayKey, 0)));
  const additiveLegacyKeys = new Set(['mintRejections', 'mintRejectionReasons']);
  if (row.schemaVersion !== MAX_VOICE_OPS_SCHEMA || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    throw new Error('Jarvis MAX: daily aggregate schema is invalid');
  }
  if (Object.keys(row).some((key) => CONTENT_KEYS.has(key.toLowerCase()) || !templateKeys.has(key))) {
    throw new Error('Jarvis MAX: daily aggregate contains an unapproved field');
  }
  if ([...templateKeys].some((key) => !(key in row) && !additiveLegacyKeys.has(key))) {
    throw new Error('Jarvis MAX: daily aggregate is incomplete');
  }
  const firstAudio = row.firstAudioLatencyBuckets;
  if (!firstAudio || typeof firstAudio !== 'object' || Array.isArray(firstAudio)) {
    throw new Error('Jarvis MAX: first-audio buckets are invalid');
  }
  return Object.freeze({
    callsStarted: safeCount(row.callsStarted),
    mintRejections: safeCount(row.mintRejections ?? 0),
    callsConnected: safeCount(row.callsConnected),
    callsCompleted: safeCount(row.callsCompleted),
    reviewsReady: safeCount(row.reviewsReady),
    reconnectAttempts: safeCount(row.reconnectAttempts),
    reconnectRecovered: safeCount(row.reconnectRecovered),
    firstAudioGte8s: safeCount((firstAudio as Record<string, unknown>).gte8s),
    updatedAtMs: safeTimestamp(row.updatedAtMs),
  });
}

export async function fetchMaxvoiceSource(
  input: FetchMaxvoiceSourceInput,
): Promise<FetchMaxvoiceSourceResult> {
  try {
    // One bounded read of server-owned daily aggregates. No user/session rows exist here.
    const snapshot = await input.collection.orderBy('dayKey', 'desc').limit(MAXVOICE_SOURCE_DAYS).get();
    if (snapshot.docs.length === 0) {
      return Object.freeze({
        state: 'empty' as const,
        sampledDays: 0,
        mintRejections: 0,
        callsStarted: 0,
        callsConnected: 0,
        callsCompleted: 0,
        reviewsReady: 0,
        reconnectAttempts: 0,
        reconnectRecovered: 0,
        firstAudioGte8s: 0,
        observedAtMs: input.nowMs,
      });
    }

    const rows = snapshot.docs.map((doc) => readDaily(doc.data()));
    const observedAtMs = Math.max(...rows.map((row) => row.updatedAtMs));
    const sum = (key: keyof Omit<typeof rows[number], 'updatedAtMs'>) => rows.reduce(
      (total, row) => safeCount(total + row[key]),
      0,
    );
    return Object.freeze({
      state: input.nowMs - observedAtMs > MAX_EVIDENCE_AGE_MS ? ('stale' as const) : ('ready' as const),
      sampledDays: rows.length,
      mintRejections: sum('mintRejections'),
      callsStarted: sum('callsStarted'),
      callsConnected: sum('callsConnected'),
      callsCompleted: sum('callsCompleted'),
      reviewsReady: sum('reviewsReady'),
      reconnectAttempts: sum('reconnectAttempts'),
      reconnectRecovered: sum('reconnectRecovered'),
      firstAudioGte8s: sum('firstAudioGte8s'),
      observedAtMs,
    });
  } catch {
    return nullResult(input.nowMs);
  }
}
