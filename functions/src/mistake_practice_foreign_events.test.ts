import { createMistakePracticeEventSyncHandler, parseMistakePracticeEventSyncRequest } from './mistake_practice_event_sync';

// зачем (№45, 21.10): клиенты 1.6.x слали в журнал fr события en — сервер отвечал 400 на всю пачку,
// клиент повторял синк по кругу (≈ треть чтений Firestore). Чужие события теперь отбрасываются, ответ ok.
const event = (eventId: string, studyTarget: string) => ({
  eventId,
  mistakeId: 'mistake:v1:' + 'b'.repeat(64),
  cycleId: 'mistake-cycle:v1:' + 'c'.repeat(64),
  type: 'captured',
  occurredAtMs: 100,
  studyTarget,
  payload: { canonicalTarget: 'Je suis prêt.' },
});

const fakeDb = () => {
  let reads = 0;
  const creates: string[] = [];
  const doc = (kind: string, id: string) => ({ kind, id });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => name === 'users'
        ? { ...doc('owner', id), collection: () => ({ doc: (eventId: string) => doc('event', eventId) }) }
        : doc('map', id),
    }),
    runTransaction: async (work: (tx: unknown) => Promise<unknown>) => work({
      get: async (ref: { kind: string }) => {
        reads += 1;
        return ref.kind === 'owner'
          ? { exists: true, data: () => ({}) }
          : { exists: false, data: () => undefined };
      },
      create: (ref: { id: string }) => creates.push(ref.id),
    }),
  };
  return { db, stats: () => ({ reads, creates: creates.length }) };
};

const handlerWith = (db: unknown) => createMistakePracticeEventSyncHandler({
  db: db as never,
  resolveAccountBinding: async () => ({ stableUid: 'owner-a', accountGeneration: 1 }) as never,
});

describe('mistake practice sync: foreign-language events from old clients', () => {
  test('parser drops foreign events instead of rejecting the batch', () => {
    const parsed = parseMistakePracticeEventSyncRequest({
      action: 'append', expectedStableUid: 'owner-a', studyTarget: 'fr',
      events: [event('e1', 'fr'), event('e2', 'en'), event('e3', 'fr')],
    });
    expect(parsed).toMatchObject({ action: 'append', received: 3 });
    expect(parsed.action === 'append' && parsed.events.map((e) => e.eventId)).toEqual(['e1', 'e3']);
  });

  test('mixed batch stores only own events and reports the full count back', async () => {
    const { db, stats } = fakeDb();
    const result = await handlerWith(db)({
      auth: { uid: 'auth-a' },
      data: { action: 'append', expectedStableUid: 'owner-a', studyTarget: 'fr', events: [event('e1', 'fr'), event('e2', 'en')] },
    });
    expect(result).toEqual({ ok: true, appended: 2 });
    expect(stats()).toEqual({ reads: 3, creates: 1 });
  });

  test('all-foreign batch answers ok without a single Firestore read', async () => {
    const { db, stats } = fakeDb();
    const result = await handlerWith(db)({
      auth: { uid: 'auth-a' },
      data: { action: 'append', expectedStableUid: 'owner-a', studyTarget: 'fr', events: [event('e1', 'en'), event('e2', 'de')] },
    });
    expect(result).toEqual({ ok: true, appended: 2 });
    expect(stats()).toEqual({ reads: 0, creates: 0 });
  });

  test('malformed events are still rejected', () => {
    expect(() => parseMistakePracticeEventSyncRequest({
      action: 'append', expectedStableUid: 'owner-a', studyTarget: 'fr',
      events: [{ ...event('e1', 'fr'), type: 'bogus' }],
    })).toThrow('mistake_practice_event_sync_invalid');
  });
});
