import {
  MISTAKE_PRACTICE_EVENT_PAGE_MAX,
  assertMistakePracticeExpectedOwner,
  materializeMistakePracticeEventRecord,
  parseMistakePracticeEventSyncRequest,
  verifyMistakePracticeEventReplay,
} from './mistake_practice_event_sync';

const event = {
  eventId: 'mistake-practice:v1:' + 'a'.repeat(64),
  mistakeId: 'mistake:v1:' + 'b'.repeat(64),
  cycleId: 'mistake-cycle:v1:' + 'c'.repeat(64),
  type: 'captured',
  occurredAtMs: 100,
  studyTarget: 'en',
  payload: { canonicalTarget: 'I am ready.' },
};

describe('mistake practice immutable event transport', () => {
  test('accepts only bounded exact append/list packets', () => {
    expect(parseMistakePracticeEventSyncRequest({ action: 'append', expectedStableUid: 'owner-a', studyTarget: 'en', events: [event] }))
      .toMatchObject({ action: 'append', events: [event] });
    expect(parseMistakePracticeEventSyncRequest({ action: 'list', expectedStableUid: 'owner-a', studyTarget: 'fr', cursor: null }))
      .toEqual({ action: 'list', expectedStableUid: 'owner-a', studyTarget: 'fr', cursor: null });
    expect(() => parseMistakePracticeEventSyncRequest({
      action: 'append', expectedStableUid: 'owner-a', studyTarget: 'en', events: Array(MISTAKE_PRACTICE_EVENT_PAGE_MAX + 1).fill(event),
    })).toThrow('mistake_practice_event_sync_invalid');
    expect(() => parseMistakePracticeEventSyncRequest({
      action: 'append', expectedStableUid: 'owner-a', studyTarget: 'en', events: [event], extra: true,
    })).toThrow('mistake_practice_event_sync_invalid');
  });

  test('binds owner/target outside payload and rejects same-id different bytes', () => {
    expect(() => assertMistakePracticeExpectedOwner('owner-a', 'owner-b'))
      .toThrow('mistake_practice_owner_mismatch');
    expect(() => assertMistakePracticeExpectedOwner('owner-a', 'owner-a')).not.toThrow();
    const record = materializeMistakePracticeEventRecord({ stableUid: 'owner-a', studyTarget: 'en', event });
    expect(record).toMatchObject({ ownerStableUid: 'owner-a', studyTarget: 'en', event });
    expect(() => materializeMistakePracticeEventRecord({ stableUid: 'owner-a', studyTarget: 'fr', event }))
      .toThrow('mistake_practice_event_sync_invalid');
    expect(verifyMistakePracticeEventReplay(record, record)).toEqual(record);
    expect(() => verifyMistakePracticeEventReplay(record, { ...record, eventFingerprint: 'f'.repeat(64) }))
      .toThrow('mistake_practice_event_conflict');
  });

  test('append transaction revalidates canonical owner against an auth-merge race', () => {
    const createHandler = (require('./mistake_practice_event_sync') as {
      createMistakePracticeEventSyncHandler?: (dependencies: unknown) => (request: unknown) => Promise<unknown>;
    }).createMistakePracticeEventSyncHandler;
    expect(typeof createHandler).toBe('function');

    const owner = { exists: true, data: { identityHidden: false, mistakePracticeMergePending: false } };
    const ownerMap = { exists: false, data: {} as Record<string, unknown> };
    const records = new Map<string, unknown>();
    let version = 0;
    let firstAttemptPaused = false;
    const doc = (kind: 'owner' | 'map' | 'event', id: string) => ({ kind, id });
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => name === 'users'
          ? {
              ...doc('owner', id),
              collection: () => ({ doc: (eventId: string) => doc('event', eventId) }),
            }
          : doc('map', id),
      }),
      runTransaction: async (work: (tx: any) => Promise<unknown>) => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const readVersion = version;
          const creates: Array<{ id: string; value: unknown }> = [];
          let reads = 0;
          const tx = {
            get: async (ref: { kind: string; id: string }) => {
              reads += 1;
              const ownerDataAtRead = { ...owner.data };
              const ownerMapDataAtRead = { ...ownerMap.data };
              const ownerMapExistsAtRead = ownerMap.exists;
              const snap = ref.kind === 'owner'
                ? { exists: owner.exists, data: () => ownerDataAtRead }
                : ref.kind === 'map'
                  ? { exists: ownerMapExistsAtRead, data: () => ownerMapDataAtRead }
                  : { exists: records.has(ref.id), data: () => records.get(ref.id) };
              if (attempt === 0 && reads === 3) {
                firstAttemptPaused = true;
                owner.data.mistakePracticeMergePending = true;
                ownerMap.exists = true;
                ownerMap.data = { canonicalStableId: 'winner-b' };
                version += 1;
              }
              return snap;
            },
            create: (ref: { id: string }, value: unknown) => creates.push({ id: ref.id, value }),
          };
          try {
            const result = await work(tx);
            if (readVersion !== version) continue;
            creates.forEach(({ id, value }) => records.set(id, value));
            return result;
          } catch (error) {
            if (readVersion !== version) continue;
            throw error;
          }
        }
        throw new Error('transaction_retry_limit');
      },
    };
    const handler = createHandler!({
      db,
      resolveAccountBinding: async () => ({ stableUid: 'owner-a', accountGeneration: 1 }),
    });

    return expect(handler({
      auth: { uid: 'auth-a' },
      data: { action: 'append', expectedStableUid: 'owner-a', studyTarget: 'en', events: [event] },
    })).rejects.toMatchObject({ code: 'failed-precondition' }).then(() => {
      expect(firstAttemptPaused).toBe(true);
      expect(records.size).toBe(0);
    });
  });
});
