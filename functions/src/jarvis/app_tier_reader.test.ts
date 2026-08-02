import { fetchActiveUserCount, ACTIVE_USER_WINDOW_MS } from './app_tier_reader';

interface FakeQuery { where: jest.Mock; count: jest.Mock; get: jest.Mock; }

function makeFakeCollection(countValue: number, overrides: Partial<FakeQuery> = {}) {
  const query: FakeQuery = {
    where: jest.fn(() => query),
    count: jest.fn(() => query),
    get: jest.fn(async () => ({ data: () => ({ count: countValue }) })),
    ...overrides,
  };
  return query;
}

describe('Jarvis app tier reader — cheap server-side count, no document download', () => {
  test('queries last_active_at within the active window using Firestore count() aggregation', async () => {
    const collection = makeFakeCollection(4_200);
    const result = await fetchActiveUserCount({
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 100_000,
    });
    expect(collection.where).toHaveBeenCalledWith('last_active_at', '>=', 100_000 - ACTIVE_USER_WINDOW_MS);
    expect(collection.count).toHaveBeenCalledTimes(1);
    expect(result.state).toBe('ready');
    expect(result.count).toBe(4_200);
  });

  test('zero active users is a genuine empty state, not an error', async () => {
    const collection = makeFakeCollection(0);
    const result = await fetchActiveUserCount({
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 100_000,
    });
    expect(result.state).toBe('empty');
    expect(result.count).toBe(0);
  });

  test('a Firestore error fails closed — no count, no fabricated tier', async () => {
    const collection = makeFakeCollection(0, { get: jest.fn(async () => { throw new Error('unavailable'); }) });
    const result = await fetchActiveUserCount({
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 100_000,
    });
    expect(result.state).toBe('error');
    expect(result.count).toBeNull();
  });

  test('a non-finite count from a malformed response fails closed', async () => {
    const collection = makeFakeCollection(0, { get: jest.fn(async () => ({ data: () => ({ count: 'not-a-number' }) })) });
    const result = await fetchActiveUserCount({
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 100_000,
    });
    expect(result.state).toBe('error');
    expect(result.count).toBeNull();
  });
});
