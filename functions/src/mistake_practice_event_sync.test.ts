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
    const italianEvent = { ...event, studyTarget: 'it' };
    expect(parseMistakePracticeEventSyncRequest({ action: 'append', expectedStableUid: 'owner-a', studyTarget: 'it', events: [italianEvent] }))
      .toMatchObject({ action: 'append', studyTarget: 'it', events: [italianEvent] });
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
              // зачем (22.10): быстрый путь читает только владельца и карту — переход владельца случается после 2-го чтения.
              if (attempt === 0 && reads === 2) {
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

  // зачем (§CORE-0162, аудит стоимости Firebase, пакет A): страница списка фильтрует язык в самом запросе — раньше
  // листала все mp_* аккаунта (×5 языков на восстановлении). Нет индекса — прежний запрос; форма ответа та же.
  describe('list filters by study target in the query', () => {
    const createHandler = (require('./mistake_practice_event_sync') as {
      createMistakePracticeEventSyncHandler: (dependencies: unknown) => (request: unknown) => Promise<any>;
    }).createMistakePracticeEventSyncHandler;
    const enRecord = materializeMistakePracticeEventRecord({ stableUid: 'owner-a', studyTarget: 'en', event });

    function makeListDb(options: { failFiltered?: boolean }) {
      const queries: string[][] = [];
      const makeQuery = (steps: string[]): any => ({
        where: (field: string, op: string, value: unknown) => makeQuery([...steps, `where:${field}${op}${String(value)}`]),
        orderBy: () => makeQuery([...steps, 'orderBy:id']),
        startAt: () => makeQuery(steps),
        endBefore: () => makeQuery(steps),
        startAfter: (cursor: string) => makeQuery([...steps, `after:${cursor}`]),
        limit: () => makeQuery(steps),
        get: async () => {
          queries.push(steps);
          if (options.failFiltered && steps.some((step) => step.startsWith('where:'))) {
            throw Object.assign(new Error('9 FAILED_PRECONDITION: The query requires an index.'), { code: 9 });
          }
          return { docs: [{ id: 'mp_' + 'a'.repeat(64), data: () => enRecord }] };
        },
      });
      const db = {
        collection: (name: string) => ({
          doc: () => name === 'users'
            ? { get: async () => ({ exists: true, data: () => ({}) }), collection: () => makeQuery([]) }
            : {},
        }),
        runTransaction: async () => { throw new Error('unused'); },
      };
      return { db, queries };
    }
    const request = { auth: { uid: 'auth-a' }, data: { action: 'list', expectedStableUid: 'owner-a', studyTarget: 'en', cursor: null } };

    test('the page query carries where(studyTarget) and returns the same response shape', async () => {
      const { db, queries } = makeListDb({});
      const handler = createHandler({ db, resolveAccountBinding: async () => ({ stableUid: 'owner-a', accountGeneration: 1 }) });
      const result = await handler(request);
      expect(queries).toEqual([['where:studyTarget==en', 'orderBy:id']]);
      expect(result).toEqual({ ok: true, events: [event], cursor: null });
    });

    test('falls back to the unfiltered page when the index is unavailable', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { db, queries } = makeListDb({ failFiltered: true });
      const handler = createHandler({ db, resolveAccountBinding: async () => ({ stableUid: 'owner-a', accountGeneration: 1 }) });
      const result = await handler(request);
      expect(queries).toEqual([['where:studyTarget==en', 'orderBy:id'], ['orderBy:id']]);
      expect(result).toEqual({ ok: true, events: [event], cursor: null });
      expect(warn).toHaveBeenCalledWith('[MP-SYNC] list:target_filter_unavailable', expect.any(String));
      warn.mockRestore();
    });
  });
});
