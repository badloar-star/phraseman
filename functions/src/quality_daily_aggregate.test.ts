import {
  QUALITY_DAILY_COLLECTION,
  buildQualityDailyDimensions,
  prepareQualityDailyAggregate,
  qualityAffectedUserBucket,
  qualityUtcDayKey,
} from './quality_daily_aggregate';

type Snapshot = { exists: boolean; data(): Record<string, unknown> | undefined };

function snapshot(data?: Record<string, unknown>): Snapshot {
  return { exists: data !== undefined, data: () => data };
}

function ref(pathValue: string): FirebaseFirestore.DocumentReference {
  return {
    path: pathValue,
    collection(name: string) {
      return { doc: (id: string) => ref(`${pathValue}/${name}/${id}`) };
    },
  } as unknown as FirebaseFirestore.DocumentReference;
}

function db(): FirebaseFirestore.Firestore {
  return {
    collection(name: string) {
      return { doc: (id: string) => ref(`${name}/${id}`) };
    },
  } as unknown as FirebaseFirestore.Firestore;
}

const fields = {
  increment: (value: number) => ({ increment: value }),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
};

describe('server-owned daily quality aggregates', () => {
  test('uses UTC days and release-aware, categorical dimensions only', () => {
    expect(qualityUtcDayKey(Date.parse('2026-08-08T23:59:59.999Z'))).toBe('2026-08-08');
    expect(qualityUtcDayKey(Date.parse('2026-08-09T00:00:00.000Z'))).toBe('2026-08-09');
    expect(buildQualityDailyDimensions('app_error', {
      appVersion: '2.4.1', buildNumber: '319', platform: 'ios', feature: 'auth', screen: 'sign_in',
    })).toEqual({ build: '319', platform: 'ios', category: 'auth', screen: 'sign_in' });
    expect(buildQualityDailyDimensions('error_report', {
      appVersion: '2.4.1', platform: 'ios', category: 'my email is person@example.com', screen: 'lesson screen',
    })).toEqual({ build: '2.4.1', platform: 'ios', category: 'unknown', screen: 'unknown' });
  });

  test('prepares one event increment and one domain-separated affected-user marker', async () => {
    const transaction = {
      get: jest.fn(async (documentRef: FirebaseFirestore.DocumentReference) => {
        if (documentRef.path === `${QUALITY_DAILY_COLLECTION}/_meta`) return snapshot();
        return snapshot();
      }),
    } as unknown as FirebaseFirestore.Transaction & { get: jest.Mock };
    const prepared = await prepareQualityDailyAggregate({
      db: db(),
      tx: transaction,
      kind: 'app_error',
      reportDoc: { appVersion: '2.4.1', buildNumber: '319', platform: 'ios', feature: 'auth', screen: 'sign_in' },
      stableUid: 'stable-user-raw-value',
      nowMs: Date.parse('2026-08-08T12:00:00.000Z'),
      fields,
    });

    expect(prepared.recorded).toBe(true);
    expect(prepared.aggregateRef.path).toMatch(/^jarvis_quality_daily\/2026-08-08\/sources\/app_errors\/buckets\/[a-f0-9]{64}$/);
    expect(prepared.userMarkerRef.path).toMatch(/\/affected_users\/[a-f0-9]{64}$/);
    expect(prepared.aggregateWrite).toMatchObject({
      sourceId: 'app_errors', dayKey: '2026-08-08', build: '319', platform: 'ios', category: 'auth', screen: 'sign_in',
      eventCount: { increment: 1 }, affectedUserCount: { increment: 1 },
    });
    expect(JSON.stringify(prepared)).not.toContain('stable-user-raw-value');
    expect(JSON.stringify(prepared)).not.toMatch(/message|comment|stack|email/i);
  });

  test('a repeated event increments events without incrementing distinct affected users', async () => {
    const transaction = {
      get: jest.fn(async (documentRef: FirebaseFirestore.DocumentReference) =>
        documentRef.path.includes('/affected_users/') ? snapshot({ createdAtMs: 1 }) : snapshot({ activatedAtMs: 1 })),
    } as unknown as FirebaseFirestore.Transaction & { get: jest.Mock };
    const prepared = await prepareQualityDailyAggregate({
      db: db(), tx: transaction, kind: 'error_report',
      reportDoc: { appVersion: '2.4.1', platform: 'android', category: 'audio', screen: 'lesson' },
      stableUid: 'stable-user-raw-value', nowMs: Date.parse('2026-08-08T12:00:00.000Z'), fields,
    });

    expect(prepared.aggregateWrite).toMatchObject({ eventCount: { increment: 1 }, affectedUserCount: { increment: 0 } });
    expect(prepared.createUserMarker).toBe(false);
  });

  test.each([
    [0, '0'], [1, '1'], [2, '2-4'], [4, '2-4'], [5, '5-9'], [10, '10-24'], [25, '25-49'], [50, '50+'],
  ] as const)('buckets %s affected users as %s', (count, bucket) => {
    expect(qualityAffectedUserBucket(count)).toBe(bucket);
  });
});
