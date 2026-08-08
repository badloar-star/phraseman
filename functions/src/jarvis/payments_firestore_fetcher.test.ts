import { fetchPaymentsSource, MAX_PAYMENT_FAILURE_DOCS, PAYMENTS_LOOKBACK_MS } from './payments_firestore_fetcher';

interface FakeDoc { readonly data: () => Record<string, unknown>; }
interface FakeQuery { where: jest.Mock; orderBy: jest.Mock; limit: jest.Mock; select: jest.Mock; get: jest.Mock; }

function makeFakeCollection(docs: readonly FakeDoc[], overrides: Partial<FakeQuery> = {}) {
  const query: FakeQuery = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    select: jest.fn(() => query),
    get: jest.fn(async () => ({ docs })),
    ...overrides,
  };
  return query;
}

function doc(row: Record<string, unknown>): FakeDoc {
  return { data: () => row };
}

const NOW = 10_000_000;

describe('Jarvis payments fetcher — telegram dead letter', () => {
  test('reads only the recent window with a bounded limit', async () => {
    const collection = makeFakeCollection([]);
    await fetchPaymentsSource({
      sourceId: 'telegram_premium_dead_letter',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: NOW,
    });
    expect(collection.limit).toHaveBeenCalledWith(MAX_PAYMENT_FAILURE_DOCS + 1);
    expect(collection.where).toHaveBeenCalled();
  });

  test('a dead letter WITH a successful payment is the money-losing case', async () => {
    const collection = makeFakeCollection([
      doc({ reason: 'handler_failed', hasSuccessfulPayment: true, resolved: false }),
      doc({ reason: 'parse_failed', hasSuccessfulPayment: false, resolved: false }),
    ]);
    const result = await fetchPaymentsSource({
      sourceId: 'telegram_premium_dead_letter',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: NOW,
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.filter((r) => r.paidButUnfulfilled)).toHaveLength(1);
  });

  test('an already-resolved dead letter is not counted as an open problem', async () => {
    const collection = makeFakeCollection([
      doc({ reason: 'handler_failed', hasSuccessfulPayment: true, resolved: true }),
    ]);
    const result = await fetchPaymentsSource({
      sourceId: 'telegram_premium_dead_letter',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: NOW,
    });
    expect(result.rows[0].resolved).toBe(true);
    expect(result.rows[0].paidButUnfulfilled).toBe(false);
  });

  test('a missing reason becomes unknown, never dropped silently', async () => {
    const collection = makeFakeCollection([doc({ hasSuccessfulPayment: true, resolved: false })]);
    const result = await fetchPaymentsSource({
      sourceId: 'telegram_premium_dead_letter',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: NOW,
    });
    expect(result.rows[0].reason).toBe('unknown');
  });
});

describe('Jarvis payments fetcher — RevenueCat denials', () => {
  test('maps denial reasons', async () => {
    const collection = makeFakeCollection([doc({ reason: 'user_not_found' })]);
    const result = await fetchPaymentsSource({
      sourceId: 'revenuecat_premium_denials',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: NOW,
    });
    expect(result.rows[0].reason).toBe('user_not_found');
    // Отказ RevenueCat не несёт признака оплаты — не выдаём его за потерянные деньги.
    expect(result.rows[0].paidButUnfulfilled).toBe(false);
  });
});

describe('Jarvis payments fetcher — honest states', () => {
  test('no failures is a genuine empty, the best possible news', async () => {
    const collection = makeFakeCollection([]);
    const result = await fetchPaymentsSource({
      sourceId: 'telegram_premium_dead_letter',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: NOW,
    });
    expect(result.state).toBe('empty');
  });

  test('hitting the cap marks the fetch truncated', async () => {
    const docs = Array.from({ length: MAX_PAYMENT_FAILURE_DOCS + 1 }, () => doc({ reason: 'x', resolved: false }));
    const collection = makeFakeCollection(docs);
    const result = await fetchPaymentsSource({
      sourceId: 'telegram_premium_dead_letter',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: NOW,
    });
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(MAX_PAYMENT_FAILURE_DOCS);
  });

  test('a Firestore error fails closed', async () => {
    const collection = makeFakeCollection([], { get: jest.fn(async () => { throw new Error('unavailable'); }) });
    const result = await fetchPaymentsSource({
      sourceId: 'revenuecat_premium_denials',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: NOW,
    });
    expect(result.state).toBe('error');
    expect(result.rows).toEqual([]);
  });

  test('the lookback window is a sane multi-day span, not a single hour', () => {
    expect(PAYMENTS_LOOKBACK_MS).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
  });
});
