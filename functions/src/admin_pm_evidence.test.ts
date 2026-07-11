import {
  buildPmEvidenceWindows,
  collectProductManagerEvidence,
  createFirestorePmSourceReaders,
  type PmSourceReaderMap,
} from './admin_pm_evidence';
import type { DigestPageInput } from './admin_digest_sources';

type Row = { id: string; uid?: string; email?: string };

function reader(pages: Array<{ rows: Row[]; nextCursor?: string }>): PmSourceReaderMap {
  const calls: DigestPageInput[] = [];
  return {
    users: Object.assign(async (input: DigestPageInput) => {
      calls.push(input);
      return pages[calls.length - 1] || { rows: [] };
    }, { calls }),
  };
}

test('builds exact current, equal previous and 7/28-day context windows', () => {
  const day = 24 * 60 * 60 * 1000;
  const windows = buildPmEvidenceWindows({ startMs: 10 * day, endMs: 12 * day });
  expect(windows.current).toEqual({ startMs: 10 * day, endMs: 12 * day });
  expect(windows.previous).toEqual({ startMs: 8 * day, endMs: 10 * day });
  expect(windows.context.map((window) => window.days)).toEqual([7, 28]);
  expect(windows.context[0].window).toEqual({ startMs: 5 * day, endMs: 12 * day });
  expect(windows.context[1].window).toEqual({ startMs: -16 * day, endMs: 12 * day });
});

test('collects stable aggregate evidence from paginated sources without raw identities', async () => {
  const readers = reader([
    { rows: [{ id: 'u1', uid: 'secret-uid', email: 'a@example.com' }], nextCursor: 'next' },
    { rows: [{ id: 'u1' }, { id: 'u2' }] },
    { rows: [{ id: 'old' }] },
  ]);

  const bundle = await collectProductManagerEvidence({
    window: { startMs: 100, endMs: 200 },
    readers,
    sourceIds: ['users'],
    pageSize: 2,
  });

  expect(bundle.evidence.map((item) => item.evidenceId)).toEqual([
    'ev:growth_activation.users.events.current',
    'ev:growth_activation.users.events.previous',
    'ev:growth_activation.users.events.context_7d',
    'ev:growth_activation.users.events.context_28d',
  ]);
  expect(bundle.metrics['growth_activation.users.events'].current).toBe(2);
  expect(bundle.metrics['growth_activation.users.events'].previous).toBe(1);
  expect(JSON.stringify(bundle)).not.toContain('secret-uid');
  expect(JSON.stringify(bundle)).not.toContain('a@example.com');
});

test('marks a failed source as failed instead of returning a false zero', async () => {
  const bundle = await collectProductManagerEvidence({
    window: { startMs: 100, endMs: 200 },
    readers: {
      revenuecat_premium_events: async () => {
        throw Object.assign(new Error('permission denied'), { code: 'permission-denied' });
      },
    },
    sourceIds: ['revenuecat_premium_events'],
  });

  expect(bundle.metrics['revenue.revenuecat_premium_events.events']).toBeUndefined();
  expect(bundle.coverage.revenuecat_premium_events.current).toMatchObject({
    status: 'failed',
    errorCode: 'permission-denied',
  });
});

test('marks day-string sources partial for arbitrary exact windows', async () => {
  const bundle = await collectProductManagerEvidence({
    window: { startMs: Date.UTC(2026, 0, 1, 6), endMs: Date.UTC(2026, 0, 2, 12) },
    readers: {
      paywall_funnel: async () => ({ rows: [{ id: 'p1' }] }),
    },
    sourceIds: ['paywall_funnel'],
  });

  expect(bundle.coverage.paywall_funnel.current).toMatchObject({
    status: 'partial',
    errorCode: 'calendar_day_granularity_not_exact',
  });
});

test('creates Firestore readers from the source registry read targets', async () => {
  const calls: string[] = [];
  const query = {
    where(field: string, op: string, value: unknown) { calls.push(`where:${field}:${op}:${value}`); return this; },
    orderBy(field: string) { calls.push(`orderBy:${field}`); return this; },
    limit(value: number) { calls.push(`limit:${value}`); return this; },
    startAfter() { calls.push('startAfter'); return this; },
    async get() {
      return {
        size: 1,
        docs: [{
          ref: { path: 'users/u1' },
          data: () => ({ created_at: 150, uid: 'raw-user-id' }),
        }],
      };
    },
  };
  const db = {
    collection(path: string) { calls.push(`collection:${path}`); return query; },
    collectionGroup(path: string) { calls.push(`collectionGroup:${path}`); return query; },
  };

  const readers = createFirestorePmSourceReaders(db as never);
  const page = await readers.users({ startMs: 100, endMs: 200, pageSize: 25 });

  expect(calls).toEqual([
    'collection:users',
    'where:created_at:>=:100',
    'where:created_at:<:200',
    'orderBy:created_at',
    'limit:25',
  ]);
  expect(page.rows).toEqual([{ __digestId: 'users/u1', id: 'users/u1' }]);
  expect(JSON.stringify(page.rows)).not.toContain('raw-user-id');
});
