import {
  emptyMaxVoiceOpsDaily,
  MAX_VOICE_OPS_EVENT_SCHEMA,
  maxVoiceOpsDeltaForEvent,
  recordMaxVoiceOpsOnce,
  sanitizeMaxOpsDelta,
} from './max_voice_ops';
import type { Firestore } from 'firebase-admin/firestore';

function fakeFirestore() {
  const docs = new Map<string, Record<string, unknown>>();
  const ref = (path: string) => ({ path });
  const db = {
    collection: (collection: string) => ({ doc: (id: string) => ref(`${collection}/${id}`) }),
    runTransaction: async (work: (tx: unknown) => Promise<unknown>) => work({
      get: async (document: { path: string }) => ({ data: () => docs.get(document.path) }),
      set: (document: { path: string }, value: Record<string, unknown>, options?: { merge?: boolean }) => {
        docs.set(document.path, options?.merge ? { ...(docs.get(document.path) ?? {}), ...value } : value);
      },
    }),
  } as unknown as Firestore;
  return { db, docs, markerRef: ref('voice_quota/owner') as never };
}

describe('MAX daily content-free operations', () => {
  test('rejects content, identity, unknown, negative, and non-integer fields', () => {
    for (const invalid of [
      { callsStarted: 1, sessionId: 's1' },
      { reviewsReady: 1, transcript: 'hello' },
      { callsStarted: 1, uid: 'u1' },
      { callsStarted: -1 },
      { callsStarted: 1.5 },
      { madeUpCounter: 1 },
    ]) {
      expect(() => sanitizeMaxOpsDelta(invalid as never)).toThrow();
    }
  });

  test('derives counters and buckets only from a bounded server stage event', () => {
    expect(maxVoiceOpsDeltaForEvent({ schemaVersion: 'max-voice-ops-event.v1', stage: 'mint_succeeded', latencyMs: 850, locale: 'uk', level: 'B2' }))
      .toEqual(expect.objectContaining({
        mintsSucceeded: 1,
        preparationLatencyBuckets: { lt1s: 1 },
        localeCounts: { uk: 1 },
        levelCounts: { B2: 1 },
      }));
    expect(maxVoiceOpsDeltaForEvent({ schemaVersion: 'max-voice-ops-event.v1', stage: 'call_completed', durationSec: 181, endReason: 'completed' }))
      .toEqual(expect.objectContaining({ callsCompleted: 1, callDurationBuckets: { '3to10m': 1 }, endReasons: { completed: 1 } }));
  });

  test('does not confuse transport connection with the first audible MAX output', () => {
    expect(maxVoiceOpsDeltaForEvent({
      schemaVersion: 'max-voice-ops-event.v1',
      stage: 'call_connected',
      latencyMs: 200,
    })).toEqual({ callsConnected: 1 });
    expect(maxVoiceOpsDeltaForEvent({
      schemaVersion: 'max-voice-ops-event.v1',
      stage: 'first_remote_audio',
      latencyMs: 9_000,
    })).toEqual({ firstAudioLatencyBuckets: { gte8s: 1 } });
  });

  test('empty documents contain the exact bounded schema and no identity or content', () => {
    const row = emptyMaxVoiceOpsDaily('2026-08-21', 1_000);
    expect(row.schemaVersion).toBe('max-voice-ops-daily.v1');
    expect(row.dayKey).toBe('2026-08-21');
    expect(Object.keys(row)).not.toEqual(expect.arrayContaining([
      'uid', 'userId', 'sessionId', 'transcript', 'history', 'utterance',
      'userText', 'assistantText', 'conversationSummary',
    ]));
  });

  test('records each stage once and counts impossible sequences without requested counters', async () => {
    const { db, docs, markerRef } = fakeFirestore();
    const event = { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'mint_requested' } as const;
    await expect(recordMaxVoiceOpsOnce(db, { markerRef, markerId: 'private-session', event, nowMs: Date.UTC(2026, 7, 21) })).resolves.toBe('recorded');
    await expect(recordMaxVoiceOpsOnce(db, { markerRef, markerId: 'private-session', event, nowMs: Date.UTC(2026, 7, 21) })).resolves.toBe('duplicate');
    await expect(recordMaxVoiceOpsOnce(db, {
      markerRef,
      markerId: 'private-session',
      event: { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'call_connected', latencyMs: 200 },
      nowMs: Date.UTC(2026, 7, 21),
    })).resolves.toBe('impossible');
    const aggregate = docs.get('max_voice_ops_daily/2026-08-21');
    expect(aggregate).toEqual(expect.objectContaining({ mintsRequested: 1, callsConnected: 0, impossibleSequences: 1 }));
    expect(JSON.stringify(aggregate)).not.toContain('private-session');
  });
});
