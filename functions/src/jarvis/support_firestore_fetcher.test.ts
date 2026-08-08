import { fetchSupportSource, SUPPORT_LOOKBACK_MS } from './support_firestore_fetcher';

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1_000;

interface FakeDoc { readonly [key: string]: unknown }

function makeCollection(docs: readonly FakeDoc[], failing = false) {
  const query = {
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    select: () => query,
    get: async () => {
      if (failing) throw new Error('unavailable');
      return { docs: docs.map((data) => ({ data: () => data })) };
    },
  };
  return query as unknown as FirebaseFirestore.Query;
}

function letter(over: Partial<Record<string, unknown>> = {}): FakeDoc {
  return { receivedAtMs: NOW - 2 * HOUR, status: 'new', mailCategory: 'human', ...over };
}

describe('Jarvis support fetcher — measures how long real people wait for an answer', () => {
  test('counts letters still waiting and how long the oldest has waited', async () => {
    const result = await fetchSupportSource({
      collection: makeCollection([
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
      collection: makeCollection([
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
      collection: makeCollection([
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
      collection: makeCollection([
        letter({ status: 'answered', receivedAtMs: NOW - 5 * HOUR, repliedAt: undefined }),
      ]),
      nowMs: NOW,
    });
    expect(result.medianReplyMs).toBeNull();
  });

  test('a reply dated before the letter arrived is discarded, not reported as negative', async () => {
    const result = await fetchSupportSource({
      collection: makeCollection([
        letter({ status: 'answered', receivedAtMs: NOW - 2 * HOUR, repliedAt: new Date(NOW - 9 * HOUR).toISOString() }),
      ]),
      nowMs: NOW,
    });
    expect(result.medianReplyMs).toBeNull();
  });

  test('archived letters are neither waiting nor answered', async () => {
    const result = await fetchSupportSource({
      collection: makeCollection([letter({ status: 'archived', receivedAtMs: NOW - 80 * HOUR })]),
      nowMs: NOW,
    });
    expect(result.waitingCount).toBe(0);
    expect(result.answeredCount).toBe(0);
  });

  test('an empty inbox is empty, and that is good news', async () => {
    const result = await fetchSupportSource({ collection: makeCollection([]), nowMs: NOW });
    expect(result.state).toBe('empty');
    expect(result.waitingCount).toBe(0);
    expect(result.oldestWaitingMs).toBeNull();
  });

  test('an unreadable inbox reports nothing rather than a comforting zero', async () => {
    const result = await fetchSupportSource({ collection: makeCollection([], true), nowMs: NOW });
    expect(result.state).toBe('error');
    expect(result.waitingCount).toBeNull();
    expect(result.oldestWaitingMs).toBeNull();
    expect(result.medianReplyMs).toBeNull();
  });

  test('the window covers at least a week of support history', () => {
    expect(SUPPORT_LOOKBACK_MS).toBeGreaterThanOrEqual(7 * 24 * HOUR);
  });
});
