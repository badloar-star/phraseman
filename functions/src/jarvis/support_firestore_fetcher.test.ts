import {
  fetchSupportSource,
  SUPPORT_LOOKBACK_MS,
  SUPPORT_SYNC_MAX_AGE_MS,
} from './support_firestore_fetcher';

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1_000;

interface FakeDoc { readonly [key: string]: unknown }

function makeCollection(docs: readonly FakeDoc[], failing = false) {
  let startIndex = 0;
  let pageLimit = 500;
  const selectedFields: string[][] = [];
  let getCalls = 0;
  const query = {
    where: () => query,
    orderBy: () => query,
    limit: (value: number) => { pageLimit = value; return query; },
    select: (...fields: string[]) => { selectedFields.push(fields); return query; },
    startAfter: (last: { index: number }) => { startIndex = last.index + 1; return query; },
    get: async () => {
      if (failing) throw new Error('unavailable');
      getCalls += 1;
      return {
        docs: docs.slice(startIndex, startIndex + pageLimit).map((data, offset) => ({
          index: startIndex + offset,
          data: () => data,
        })),
      };
    },
  };
  return {
    query: query as unknown as FirebaseFirestore.Query,
    selectedFields,
    get getCalls() { return getCalls; },
  };
}

function queryOf(docs: readonly FakeDoc[], failing = false): FirebaseFirestore.Query {
  return makeCollection(docs, failing).query;
}

function syncDocument(imapSyncedAt: unknown, failing = false) {
  return {
    get: async () => {
      if (failing) throw new Error('unavailable');
      return {
        exists: true,
        data: () => ({ imapSyncedAt }),
      };
    },
  } as unknown as Pick<FirebaseFirestore.DocumentReference, 'get'>;
}

function letter(over: Partial<Record<string, unknown>> = {}): FakeDoc {
  return { receivedAtMs: NOW - 2 * HOUR, status: 'new', mailCategory: 'human', ...over };
}

describe('Jarvis support fetcher — measures how long real people wait for an answer', () => {
  test('counts letters still waiting and how long the oldest has waited', async () => {
    const result = await fetchSupportSource({
      collection: queryOf([
        letter({ receivedAtMs: NOW - 50 * HOUR }),
        letter({ receivedAtMs: NOW - 3 * HOUR }),
      ]),
      nowMs: NOW,
    });
    expect(result.state).toBe('ready');
    expect(result.waitingCount).toBe(2);
    expect(result.oldestWaitingMs).toBe(50 * HOUR);
  });

  test('automated mail never counts as an unanswered person', async () => {
    // Роботы не ждут ответа — иначе метрика ожидания врёт.
    const result = await fetchSupportSource({
      collection: queryOf([
        letter({ mailCategory: 'automated', receivedAtMs: NOW - 90 * HOUR }),
        letter({ receivedAtMs: NOW - 1 * HOUR }),
      ]),
      nowMs: NOW,
    });
    expect(result.waitingCount).toBe(1);
    expect(result.oldestWaitingMs).toBe(1 * HOUR);
  });

  test('answered letters give the median reply time, not the average', async () => {
    // Медиана: один забытый месяц не должен красить всю картину.
    const result = await fetchSupportSource({
      collection: queryOf([
        letter({ status: 'answered', receivedAtMs: NOW - 10 * HOUR, repliedAt: new Date(NOW - 9 * HOUR).toISOString() }),
        letter({ status: 'answered', receivedAtMs: NOW - 20 * HOUR, repliedAt: new Date(NOW - 18 * HOUR).toISOString() }),
        letter({ status: 'answered', receivedAtMs: NOW - 30 * HOUR, repliedAt: new Date(NOW - 20 * HOUR).toISOString() }),
      ]),
      nowMs: NOW,
    });
    expect(result.answeredCount).toBe(3);
    expect(result.medianReplyMs).toBe(2 * HOUR);
  });

  test('an answered letter without a reply timestamp is not counted as instant', async () => {
    const result = await fetchSupportSource({
      collection: queryOf([
        letter({ status: 'answered', receivedAtMs: NOW - 5 * HOUR, repliedAt: undefined }),
      ]),
      nowMs: NOW,
    });
    expect(result.medianReplyMs).toBeNull();
  });

  test('a reply dated before the letter arrived is discarded, not reported as negative', async () => {
    const result = await fetchSupportSource({
      collection: queryOf([
        letter({ status: 'answered', receivedAtMs: NOW - 2 * HOUR, repliedAt: new Date(NOW - 9 * HOUR).toISOString() }),
      ]),
      nowMs: NOW,
    });
    expect(result.medianReplyMs).toBeNull();
  });

  test('archived letters are neither waiting nor answered', async () => {
    const result = await fetchSupportSource({
      collection: queryOf([letter({ status: 'archived', receivedAtMs: NOW - 80 * HOUR })]),
      nowMs: NOW,
    });
    expect(result.waitingCount).toBe(0);
    expect(result.answeredCount).toBe(0);
  });

  test('an empty inbox is empty, and that is good news', async () => {
    const result = await fetchSupportSource({ collection: queryOf([]), nowMs: NOW });
    expect(result.state).toBe('empty');
    expect(result.waitingCount).toBe(0);
    expect(result.oldestWaitingMs).toBeNull();
  });

  test('an unreadable inbox reports nothing rather than a comforting zero', async () => {
    const result = await fetchSupportSource({ collection: queryOf([], true), nowMs: NOW });
    expect(result.state).toBe('error');
    expect(result.waitingCount).toBeNull();
    expect(result.oldestWaitingMs).toBeNull();
    expect(result.medianReplyMs).toBeNull();
  });

  test('a stale IMAP checkpoint is an error, never a comforting empty inbox', async () => {
    const result = await fetchSupportSource({
      collection: queryOf([]),
      syncDocument: syncDocument(new Date(NOW - SUPPORT_SYNC_MAX_AGE_MS - 1).toISOString()),
      nowMs: NOW,
    });
    expect(result.state).toBe('error');
    expect(result.waitingCount).toBeNull();
  });

  test('a fresh IMAP checkpoint permits normal support evidence', async () => {
    const result = await fetchSupportSource({
      collection: queryOf([letter()]),
      syncDocument: syncDocument(new Date(NOW - 5 * 60 * 1_000).toISOString()),
      nowMs: NOW,
    });
    expect(result.state).toBe('ready');
    expect(result.waitingCount).toBe(1);
  });

  test('the window covers at least a week of support history', () => {
    expect(SUPPORT_LOOKBACK_MS).toBeGreaterThanOrEqual(7 * 24 * HOUR);
  });

  test('paginates beyond 500 so a large inbox cannot hide an old waiting person', async () => {
    const docs = Array.from({ length: 500 }, (_, index) => letter({
      status: 'answered',
      receivedAtMs: NOW - (index + 1) * 1_000,
      repliedAt: new Date(NOW - index * 1_000).toISOString(),
    }));
    docs.push(letter({ receivedAtMs: NOW - 9 * 24 * HOUR }));
    const collection = makeCollection(docs);

    const result = await fetchSupportSource({ collection: collection.query, nowMs: NOW });

    expect(result.waitingCount).toBe(1);
    expect(result.oldestWaitingMs).toBe(9 * 24 * HOUR);
    expect(collection.getCalls).toBe(2);
  });

  test('treats a legacy missing status as new, matching the admin inbox UI', async () => {
    const result = await fetchSupportSource({
      collection: queryOf([letter({ status: undefined, receivedAtMs: NOW - 5 * HOUR })]),
      nowMs: NOW,
    });
    expect(result.waitingCount).toBe(1);
    expect(result.oldestWaitingMs).toBe(5 * HOUR);
  });

  test('excludes future-dated messages from all metrics', async () => {
    const result = await fetchSupportSource({
      collection: queryOf([
        letter({ receivedAtMs: NOW + HOUR }),
        letter({ status: undefined, receivedAtMs: NOW + 2 * HOUR }),
        letter({ status: 'answered', receivedAtMs: NOW + 3 * HOUR, repliedAt: new Date(NOW + 4 * HOUR).toISOString() }),
      ]),
      nowMs: NOW,
    });
    expect(result.state).toBe('empty');
    expect(result.waitingCount).toBe(0);
    expect(result.answeredCount).toBe(0);
  });

  test('reads only timing and classification fields, never correspondence PII', async () => {
    const collection = makeCollection([letter()]);
    await fetchSupportSource({ collection: collection.query, nowMs: NOW });
    expect(collection.selectedFields[0]).toEqual([
      'receivedAtMs', 'status', 'repliedAt', 'mailCategory',
    ]);
    expect(collection.selectedFields.flat()).not.toEqual(expect.arrayContaining([
      'fromEmail', 'fromName', 'subject', 'bodyText',
    ]));
  });
});
