import { ENFORCE_APP_CHECK_ADMIN } from './callable_options';
import {
  ADMIN_STATISTICS_OPTIONS,
  createAdminGetProductStatisticsHandler,
} from './admin_statistics';

describe('admin product statistics callable', () => {
  test('rejects unauthorized callers before cache or Firestore access', async () => {
    const getDb = jest.fn(() => { throw new Error('must not access Firestore'); });
    const readThroughCache = jest.fn();
    const handler = createAdminGetProductStatisticsHandler({
      nowMs: () => 1000,
      getDb: getDb as never,
      readThroughCache: readThroughCache as never,
    });

    await expect(handler({ auth: null, data: { refresh: true } } as never)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(getDb).not.toHaveBeenCalled();
    expect(readThroughCache).not.toHaveBeenCalled();
  });

  test('ignores refresh input and binds the fixed cache kind and empty key data', async () => {
    const query: { where: jest.Mock; count: jest.Mock; orderBy: jest.Mock; select: jest.Mock; limit: jest.Mock; get: jest.Mock } = {
      where: jest.fn(() => query),
      count: jest.fn(() => ({ get: async () => ({ data: () => ({ count: 0 }) }) })),
      orderBy: jest.fn(() => query),
      select: jest.fn(() => query),
      limit: jest.fn(() => query),
      get: jest.fn(async () => ({ docs: [] })),
    };
    const db = { collection: jest.fn(() => query) };
    const readThroughCache = jest.fn(async (input: { compute: () => Promise<object> }) => ({
      ...(await input.compute()),
      cache: { hit: false, ageMs: 0 },
    }));
    const handler = createAdminGetProductStatisticsHandler({
      nowMs: () => 1000,
      getDb: () => db as never,
      readThroughCache: readThroughCache as never,
    });

    const response = await handler({
      auth: { uid: 'owner', token: { admin: true } },
      data: { refresh: true },
    } as never);

    expect(readThroughCache).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'product_statistics_v2',
      data: {},
    }));
    expect(db.collection).toHaveBeenCalledTimes(24);
    expect(db.collection).toHaveBeenCalledWith('public_profiles');
    expect(query.orderBy).toHaveBeenCalledTimes(1);
    expect(query.select).toHaveBeenCalledWith('cardLongestStreak', 'cardAppDays');
    expect(query.limit).toHaveBeenCalledWith(10_001);
    expect(response).not.toHaveProperty('cache');
  });

  test('wraps an intentional scan-cap partial as cacheable while returning it honestly', async () => {
    const docs = Array.from({ length: 10_001 }, (_, index) => ({
      data: () => ({ cardLongestStreak: index === 0 ? 1000 : 0, cardAppDays: 1 }),
    }));
    let countCall = 0;
    const query: { where: jest.Mock; count: jest.Mock; orderBy: jest.Mock; select: jest.Mock; limit: jest.Mock; get: jest.Mock } = {
      where: jest.fn(() => query),
      count: jest.fn(() => {
        const count = countCall === 0 ? docs.length : 0;
        countCall += 1;
        return { get: async () => ({ data: () => ({ count }) }) };
      }),
      orderBy: jest.fn(() => query),
      select: jest.fn(() => query),
      limit: jest.fn(() => query),
      get: jest.fn(async () => ({ docs })),
    };
    const seen: object[] = [];
    const readThroughCache = jest.fn(async (input: { compute: () => Promise<object> }) => {
      const computed = await input.compute();
      seen.push(computed);
      return { ...computed, cache: { hit: false, ageMs: 0 } };
    });
    const handler = createAdminGetProductStatisticsHandler({
      nowMs: () => 1000,
      getDb: () => ({ collection: jest.fn(() => query) }) as never,
      readThroughCache: readThroughCache as never,
    });

    const response = await handler({ auth: { uid: 'owner', token: { admin: true } }, data: {} } as never);

    expect(response.state).toBe('partial');
    expect(response).toMatchObject({ coverage: { projectedProfilesComplete: false } });
    expect(seen).toEqual([expect.objectContaining({ state: 'ready', payload: expect.objectContaining({ state: 'partial' }) })]);
    expect(JSON.stringify(response)).not.toMatch(/uid|displayName|email/i);
  });

  test('does not persist and cools down a scan-cap partial inconsistent with the total', async () => {
    let nowMs = 1000;
    const docs = Array.from({ length: 10_001 }, () => ({
      data: () => ({ cardLongestStreak: 1, cardAppDays: 1 }),
    }));
    const query: { where: jest.Mock; count: jest.Mock; orderBy: jest.Mock; select: jest.Mock; limit: jest.Mock; get: jest.Mock } = {
      where: jest.fn(() => query),
      count: jest.fn(() => ({ get: async () => ({ data: () => ({ count: 0 }) }) })),
      orderBy: jest.fn(() => query),
      select: jest.fn(() => query),
      limit: jest.fn(() => query),
      get: jest.fn(async () => ({ docs })),
    };
    const db = { collection: jest.fn(() => query) };
    const seen: object[] = [];
    const readThroughCache = jest.fn(async (input: { compute: () => Promise<object> }) => {
      const computed = await input.compute();
      seen.push(computed);
      return { ...computed, cache: { hit: false, ageMs: 0 } };
    });
    const handler = createAdminGetProductStatisticsHandler({
      nowMs: () => nowMs,
      getDb: () => db as never,
      readThroughCache: readThroughCache as never,
    });
    const request = { auth: { uid: 'owner', token: { admin: true } }, data: {} } as never;

    const response = await handler(request);
    nowMs += 1;
    await handler(request);

    expect(response.unavailable).toContain('dayHistograms:total_inconsistent');
    expect(seen).toEqual([expect.objectContaining({ state: 'partial' })]);
    expect(readThroughCache).toHaveBeenCalledTimes(1);
    expect(db.collection).toHaveBeenCalledTimes(24);
  });

  test('keeps App Check sealed and caps recomputation amplification', () => {
    expect(ADMIN_STATISTICS_OPTIONS).toMatchObject({
      enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
      maxInstances: 1,
      concurrency: 1,
    });
    expect(ENFORCE_APP_CHECK_ADMIN).toBe(false);
  });

  test('holds partial/error responses in memory for five minutes', async () => {
    let nowMs = 1000;
    const response = {
      schemaVersion: 1 as const,
      generatedAtMs: nowMs,
      source: 'public_profiles' as const,
      totalProfiles: null,
      state: 'error' as const,
      metrics: [],
      cost: { aggregationQueries: 33, ttlHours: 6 as const },
      unavailable: [],
    };
    const getDb = jest.fn(() => ({ collection: jest.fn() }) as never);
    const readThroughCache = jest.fn(async () => ({ state: 'partial', payload: response, cache: { hit: false, ageMs: 0 } }));
    const handler = createAdminGetProductStatisticsHandler({
      nowMs: () => nowMs,
      getDb,
      readThroughCache: readThroughCache as never,
    });
    const request = { auth: { uid: 'owner', token: { admin: true } }, data: {} } as never;

    await handler(request);
    nowMs += 299_999;
    await handler(request);

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(readThroughCache).toHaveBeenCalledTimes(1);
  });

  test('cools down a truncated response when another metric has a source error', async () => {
    let nowMs = 1000;
    const response = {
      schemaVersion: 1 as const,
      generatedAtMs: nowMs,
      source: 'public_profiles' as const,
      totalProfiles: 20_000,
      state: 'partial' as const,
      metrics: [{ status: 'error' }],
      coverage: {
        projectedProfilesScanned: 10_000,
        projectedProfilesCap: 10_000,
        projectedProfilesComplete: false,
        projectedProfilesStatus: 'truncated' as const,
      },
      cost: {
        aggregationQueries: 23,
        projectedDocumentReads: 10_001,
        projectedDocumentReadCap: 10_001,
        ttlHours: 6 as const,
      },
      unavailable: ['rank:source_error'],
    };
    const getDb = jest.fn(() => ({ collection: jest.fn() }) as never);
    const readThroughCache = jest.fn(async () => ({ state: 'partial', payload: response, cache: { hit: false, ageMs: 0 } }));
    const handler = createAdminGetProductStatisticsHandler({
      nowMs: () => nowMs,
      getDb,
      readThroughCache: readThroughCache as never,
    });
    const request = { auth: { uid: 'owner', token: { admin: true } }, data: {} } as never;

    await handler(request);
    nowMs += 1;
    await handler(request);

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(readThroughCache).toHaveBeenCalledTimes(1);
  });
});
