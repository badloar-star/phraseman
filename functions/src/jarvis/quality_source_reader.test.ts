import {
  QUALITY_REPORT_COLLECTIONS,
  aggregateQualityRows,
  buildQualityEvidence,
  type QualityRawRow,
} from './quality_source_reader';

function row(overrides: Partial<QualityRawRow> = {}): QualityRawRow {
  return {
    category: 'crash',
    screen: 'lesson',
    createdAtMs: 10_000,
    ...overrides,
  };
}

describe('Jarvis quality source reader — aggregation never leaks report content', () => {
  test('counts rows by category and screen only, no free text or uids', () => {
    const rows: readonly QualityRawRow[] = [
      row({ category: 'crash', screen: 'lesson' }),
      row({ category: 'crash', screen: 'lesson' }),
      row({ category: 'audio', screen: 'lesson' }),
    ];
    const aggregate = aggregateQualityRows(rows);
    expect(aggregate.totalCount).toBe(3);
    expect(aggregate.byCategory).toEqual({ crash: 2, audio: 1 });
    expect(aggregate.byScreen).toEqual({ lesson: 3 });
    // зачем: digest не должен содержать ни одного поля кроме счётчиков —
    // это единственная защита от утечки текста репорта в модель.
    expect(JSON.stringify(aggregate)).not.toMatch(/uid|summary|comment|context/i);
  });

  test('unknown category or screen is bucketed as unknown, never dropped silently', () => {
    const rows: readonly QualityRawRow[] = [row({ category: null, screen: null })];
    const aggregate = aggregateQualityRows(rows);
    expect(aggregate.byCategory).toEqual({ unknown: 1 });
    expect(aggregate.byScreen).toEqual({ unknown: 1 });
    expect(aggregate.totalCount).toBe(1);
  });

  test('empty input aggregates to all-zero, not an error', () => {
    const aggregate = aggregateQualityRows([]);
    expect(aggregate.totalCount).toBe(0);
    expect(aggregate.byCategory).toEqual({});
  });

  test('counts aggregate events by release dimensions and buckets distinct affected users', () => {
    const aggregate = aggregateQualityRows([row({
      category: 'auth', screen: 'sign_in', build: '319', platform: 'ios', eventCount: 7, affectedUserCount: 3,
    })]);
    expect(aggregate.totalCount).toBe(7);
    expect(aggregate.byCategory).toEqual({ auth: 7 });
    expect(aggregate.byBuild).toEqual({ '319': 7 });
    expect(aggregate.byPlatform).toEqual({ ios: 7 });
    expect(aggregate.releaseBuckets).toEqual([{
      build: '319', platform: 'ios', category: 'auth', screen: 'sign_in', eventCount: 7, affectedUserBucket: '2-4',
    }]);
    expect(JSON.stringify(aggregate)).not.toContain('affectedUserCount');
  });
});

describe('Jarvis quality source reader — evidence honestly reflects fetch state', () => {
  test('ready fetch with no truncation produces trustworthy evidence with a real count', () => {
    const evidence = buildQualityEvidence({
      sourceId: 'error_reports',
      state: 'ready',
      truncated: false,
      droppedCount: 0,
      rows: [row(), row({ category: 'audio' })],
      observedAtMs: 5_000,
    });
    expect(evidence.state).toBe('ready');
    expect(evidence.count).toBe(2);
    expect(evidence.trustworthy).toBe(true);
  });

  test('truncated fetch refuses to assert a count', () => {
    const evidence = buildQualityEvidence({
      sourceId: 'error_reports',
      state: 'ready',
      truncated: true,
      droppedCount: 30,
      rows: [row()],
      observedAtMs: 5_000,
    });
    expect(evidence.state).toBe('truncated');
    expect(evidence.count).toBeNull();
  });

  test('failed source fetch produces error evidence, not zero', () => {
    const evidence = buildQualityEvidence({
      sourceId: 'app_errors',
      state: 'error',
      truncated: false,
      droppedCount: 0,
      rows: [],
      observedAtMs: 5_000,
    });
    expect(evidence.state).toBe('error');
    expect(evidence.count).toBeNull();
  });

  test('empty source (genuinely zero reports) is distinct from an error', () => {
    const evidence = buildQualityEvidence({
      sourceId: 'user_reports',
      state: 'empty',
      truncated: false,
      droppedCount: 0,
      rows: [],
      observedAtMs: 5_000,
    });
    expect(evidence.state).toBe('empty');
    expect(evidence.count).toBe(0);
    expect(evidence.trustworthy).toBe(true);
  });

  test('digest carries only the safe aggregate, never raw rows', () => {
    const evidence = buildQualityEvidence({
      sourceId: 'error_reports',
      state: 'ready',
      truncated: false,
      droppedCount: 0,
      rows: [row()],
      observedAtMs: 5_000,
    });
    const digest = JSON.parse(evidence.digest);
    expect(digest).toMatchObject({
      totalCount: 1, byCategory: { crash: 1 }, byScreen: { lesson: 1 },
      byBuild: { unknown: 1 }, byPlatform: { unknown: 1 },
    });
    expect(digest.releaseBuckets).toEqual([{
      build: 'unknown', platform: 'unknown', category: 'crash', screen: 'lesson', eventCount: 1, affectedUserBucket: 'unknown',
    }]);
  });

  test('degraded raw fallback keeps observed event detail but refuses an exact evidence count', () => {
    const evidence = buildQualityEvidence({
      sourceId: 'app_errors', state: 'partial', truncated: false, droppedCount: 0,
      rows: [row({ build: '319', platform: 'ios', eventCount: 1, affectedUserCount: null })],
      observedAtMs: 5_000, evidenceMode: 'degraded_raw_fallback',
    });
    expect(evidence.state).toBe('partial');
    expect(evidence.count).toBeNull();
    expect(evidence.trustworthy).toBe(false);
    expect(JSON.parse(evidence.digest)).toMatchObject({ evidenceMode: 'degraded_raw_fallback' });
  });
});

test('the three quality collections are exactly the ones reviewed and approved', () => {
  expect(QUALITY_REPORT_COLLECTIONS).toEqual(['error_reports', 'user_reports', 'app_errors']);
});
