import {
  DIGEST_SOURCE_REGISTRY,
  readTargetForDigestSource,
  readPaginatedSource,
  type DigestPage,
  type DigestPageReader,
} from './admin_digest_sources';

type Row = { id: string; createdAtMs: number };

describe('readPaginatedSource', () => {
  test('reads every page inside the closed-open digest window', async () => {
    const calls: Array<{ startMs: number; endMs: number; cursor?: string; pageSize: number }> = [];
    const pages: DigestPage<Row>[] = [
      { rows: [{ id: 'a', createdAtMs: 110 }], nextCursor: 'a' },
      { rows: [{ id: 'b', createdAtMs: 190 }] },
    ];
    const readPage: DigestPageReader<Row> = async (input) => {
      calls.push(input);
      return pages[calls.length - 1];
    };

    const result = await readPaginatedSource({
      sourceId: 'test_events',
      timestampField: 'createdAtMs',
      window: { startMs: 100, endMs: 200 },
      pageSize: 1,
      readPage,
      uniqueKey: (row) => row.id,
    });

    expect(result.rows.map((row) => row.id)).toEqual(['a', 'b']);
    expect(calls).toEqual([
      { startMs: 100, endMs: 200, cursor: undefined, pageSize: 1 },
      { startMs: 100, endMs: 200, cursor: 'a', pageSize: 1 },
    ]);
    expect(result.coverage).toMatchObject({
      sourceId: 'test_events',
      status: 'ok',
      rowCount: 2,
      uniqueCount: 2,
      truncated: false,
      timestampField: 'createdAtMs',
    });
  });

  test('marks a later-page failure as partial instead of returning a false zero', async () => {
    let callCount = 0;
    const readPage: DigestPageReader<Row> = async () => {
      callCount += 1;
      if (callCount === 1) return { rows: [{ id: 'a', createdAtMs: 110 }], nextCursor: 'a' };
      throw Object.assign(new Error('missing index'), { code: 'failed-precondition' });
    };

    const result = await readPaginatedSource({
      sourceId: 'test_events',
      timestampField: 'createdAtMs',
      window: { startMs: 100, endMs: 200 },
      pageSize: 1,
      readPage,
      uniqueKey: (row) => row.id,
    });

    expect(result.rows).toEqual([{ id: 'a', createdAtMs: 110 }]);
    expect(result.coverage).toMatchObject({
      status: 'partial',
      rowCount: 1,
      errorCode: 'failed-precondition',
    });
  });

  test('marks a first-page failure as failed rather than an empty successful source', async () => {
    const result = await readPaginatedSource<Row>({
      sourceId: 'test_events',
      timestampField: 'createdAtMs',
      window: { startMs: 100, endMs: 200 },
      pageSize: 100,
      readPage: async () => { throw new Error('permission denied'); },
      uniqueKey: (row) => row.id,
    });

    expect(result.rows).toEqual([]);
    expect(result.coverage.status).toBe('failed');
    expect(result.coverage.errorCode).toBe('unknown');
  });

  test('stops with an explicit truncated status at the safety page limit', async () => {
    const result = await readPaginatedSource<Row>({
      sourceId: 'test_events',
      timestampField: 'createdAtMs',
      window: { startMs: 100, endMs: 200 },
      pageSize: 1,
      maxPages: 1,
      readPage: async () => ({ rows: [{ id: 'a', createdAtMs: 110 }], nextCursor: 'a' }),
      uniqueKey: (row) => row.id,
    });

    expect(result.coverage).toMatchObject({ status: 'partial', truncated: true });
  });
});

describe('DIGEST_SOURCE_REGISTRY', () => {
  test('documents every current digest source without duplicate ids', () => {
    const ids = DIGEST_SOURCE_REGISTRY.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      'error_reports',
      'subscription_cancel_surveys',
      'app_errors',
      'safety_flags',
      'users',
      'revenuecat_premium_events',
      'paywall_funnel',
      'user_ideas',
      'referral_attributions',
      'community_pack_purchases',
    ]));
  });

  test('distinguishes event, snapshot and configuration sources', () => {
    expect(DIGEST_SOURCE_REGISTRY.some((source) => source.mode === 'event')).toBe(true);
    expect(DIGEST_SOURCE_REGISTRY.some((source) => source.mode === 'snapshot')).toBe(true);
    expect(DIGEST_SOURCE_REGISTRY.some((source) => source.mode === 'configuration')).toBe(true);
  });

  test('documents non-obvious Firestore read targets and timestamp fields', () => {
    const byId = new Map(DIGEST_SOURCE_REGISTRY.map((source) => [source.id, source]));
    expect(readTargetForDigestSource(byId.get('explain_reports')!)).toEqual({ kind: 'collection', path: 'explain_report_entries' });
    expect(readTargetForDigestSource(byId.get('league_chat_messages')!)).toEqual({ kind: 'collection', path: 'league_chat_moderation_queue' });
    expect(readTargetForDigestSource(byId.get('promo_redemptions')!)).toEqual({ kind: 'collectionGroup', path: 'promo_redemptions' });
    expect(byId.get('community_pack_purchases')?.timestampField).toBe('createdAt');
    expect(byId.get('community_pack_submissions')?.timestampField).toBe('submittedAt');
    expect(byId.get('vip_survey_responses')?.timestampField).toBe('updatedAtMs');
  });
});
