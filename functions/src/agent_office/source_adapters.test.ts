import * as fs from 'node:fs';
import * as path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';
import type {
  AgentOfficeDocument,
  AgentOfficeQuery,
  AgentOfficeRepository,
  AgentOfficeTransaction,
} from './ledger';

interface SourceAdaptersModule {
  runAgentOfficeObservationFromInternalSources(
    repository: AgentOfficeRepository,
    collectors: Readonly<{
      collectAnalytics: () => Promise<unknown>;
      collectReports: () => Promise<unknown>;
      collectAudit: () => Promise<unknown>;
    }>,
    now?: () => number,
  ): Promise<Readonly<{ receipt: Record<string, unknown>; idempotent: boolean }>>;
}

function loadAdapters(): SourceAdaptersModule | null {
  try {
    return require('./source_adapters') as SourceAdaptersModule;
  } catch {
    return null;
  }
}

class MemoryRepository implements AgentOfficeRepository {
  readonly documents = new Map<string, AgentOfficeDocument>();
  readonly writes: string[] = [];
  transactionCalls = 0;

  seed(pathValue: string, data: Record<string, unknown>): void {
    this.documents.set(pathValue, { id: pathValue.split('/').at(-1) || '', data: structuredClone(data) });
  }

  async get(pathValue: string): Promise<AgentOfficeDocument | null> {
    return this.documents.get(pathValue) ?? null;
  }

  async query(_input: AgentOfficeQuery): Promise<readonly AgentOfficeDocument[]> {
    throw new Error('source adapters must not query collections through the Agent Office repository');
  }

  async runTransaction<T>(body: (transaction: AgentOfficeTransaction) => Promise<T>): Promise<T> {
    this.transactionCalls += 1;
    const staged = new Map(this.documents);
    const transaction: AgentOfficeTransaction = {
      get: async (pathValue) => staged.get(pathValue) ?? null,
      create: (pathValue, data) => {
        if (staged.has(pathValue)) throw new HttpsError('already-exists', 'document exists');
        staged.set(pathValue, { id: pathValue.split('/').at(-1) || '', data: structuredClone(data) });
        this.writes.push(pathValue);
      },
      update: () => { throw new Error('observation receipts are create-only'); },
      set: () => { throw new Error('observation receipts are create-only'); },
    };
    const result = await body(transaction);
    this.documents.clear();
    staged.forEach((value, key) => this.documents.set(key, value));
    return result;
  }
}

const VALID_CONTROL = Object.freeze({
  schemaVersion: 1,
  controlId: 'global',
  killSwitchEnabled: false,
  revision: 4,
  lastChangedAtMs: 1_000,
  lastChangedByUid: 'owner-sensitive-uid',
  lastIdempotencyKeyHash: 'a'.repeat(64),
  lastPayloadHash: 'b'.repeat(64),
});

const ANALYTICS_SOURCE_NAMES = [
  'users',
  'app_activity',
  'revenuecat_premium_events',
  'revenuecat_shard_transactions',
  'paywall_funnel',
] as const;

const REPORT_SOURCE_NAMES = [
  'error_reports',
  'user_reports',
  'community_pack_reports',
  'explain_report_entries',
  'app_errors',
] as const;

function completeAnalytics(): Record<string, unknown> {
  return {
    generatedAtMs: 2_000,
    state: 'ready',
    sources: Object.fromEntries(ANALYTICS_SOURCE_NAMES.map((source, index) => [source, {
      state: index === 0 ? 'ready' : 'empty',
      count: index === 0 ? 1 : 0,
      truncated: false,
      latestAtMs: index === 0 ? 1_900 : null,
      errorCode: null,
    }])),
    quality: { incomplete: false, errorCodes: [] },
  };
}

function completeReports(): Record<string, unknown> {
  const items = [0, 1, 2].map((index) => ({
    id: `raw-report-id-${index}`,
    source: 'error_reports',
    category: 'audio',
    summary: `private report body ${index}`,
    users: { primaryUid: `private-uid-${index}`, reporterName: 'Private Person' },
    reporterEmail: `private${index}@example.com`,
    context: { screen: 'lesson', dataId: `private-data-id-${index}` },
  }));
  return {
    ok: true,
    state: 'ready',
    items,
    count: items.length,
    sourceHealth: REPORT_SOURCE_NAMES.map((source) => ({
      source,
      state: source === 'error_reports' ? 'ready' : 'empty',
      count: source === 'error_reports' ? items.length : 0,
      truncated: false,
    })),
    omittedSources: [],
    fetchedAtMs: 2_000,
  };
}

function completeAudit(): Record<string, unknown> {
  return {
    ok: true,
    state: 'empty',
    items: [],
    count: 0,
    sourceHealth: [{ source: 'admin_log', state: 'empty', count: 0, scanned: 0, truncated: false, error: '' }],
    fetchedAtMs: 2_000,
  };
}

function collectors(overrides: Partial<Record<'analytics' | 'reports' | 'audit', unknown>> = {}) {
  return {
    collectAnalytics: async () => overrides.analytics ?? completeAnalytics(),
    collectReports: async () => overrides.reports ?? completeReports(),
    collectAudit: async () => overrides.audit ?? completeAudit(),
  };
}

function repository(): MemoryRepository {
  const value = new MemoryRepository();
  value.seed('agent_office_control/global', VALID_CONTROL);
  return value;
}

function requireAdapters(): SourceAdaptersModule | null {
  const adapters = loadAdapters();
  expect(adapters).not.toBeNull();
  return adapters;
}

describe('Agent Office trusted internal source adapters', () => {
  test('sanitizes complete existing source shapes before the runner transaction', async () => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();

    const result = await adapters.runAgentOfficeObservationFromInternalSources(repo, collectors(), () => 3_000);

    expect(repo.transactionCalls).toBe(1);
    expect(repo.writes).toHaveLength(1);
    expect(result.receipt).toMatchObject({ outcome: 'draft_prepared', reason: 'sufficient_evidence', piiClass: 'none', externalEffect: 'none' });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('private report body');
    expect(serialized).not.toContain('private-uid');
    expect(serialized).not.toContain('@example.com');
    expect(serialized).not.toContain('raw-report-id');
    expect(serialized).not.toContain('private-data-id');
  });

  test('passes distinct validated source timestamps through to the runner receipt', async () => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();
    const analytics = completeAnalytics();
    const reports = completeReports();
    const audit = completeAudit();
    analytics.generatedAtMs = 2_700;
    reports.fetchedAtMs = 2_800;
    audit.fetchedAtMs = 2_900;

    const result = await adapters.runAgentOfficeObservationFromInternalSources(
      repo,
      collectors({ analytics, reports, audit }),
      () => 3_000,
    );

    expect(result.receipt.sourceHealth).toEqual([
      { source: 'analytics', state: 'ready', observedAtMs: 2_700 },
      { source: 'reports', state: 'ready', observedAtMs: 2_800 },
      { source: 'audit', state: 'empty', observedAtMs: 2_900 },
    ]);
  });

  test('accepts the report center complete-empty shape and derives an empty receipt', async () => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();
    const base = completeReports();
    const reports = {
      ...base,
      state: 'ready',
      items: [],
      count: 0,
      sourceHealth: REPORT_SOURCE_NAMES.map((source) => ({ source, state: 'empty', count: 0, truncated: false })),
    };

    const result = await adapters.runAgentOfficeObservationFromInternalSources(repo, collectors({ reports }), () => 3_000);

    expect(repo.transactionCalls).toBe(1);
    expect(result.receipt).toMatchObject({
      outcome: 'no_action',
      reason: 'no_observation',
      sourceHealth: expect.arrayContaining([{ source: 'reports', state: 'empty', observedAtMs: 2_000 }]),
    });
  });

  test.each([
    ['partial analytics', () => ({ ...completeAnalytics(), state: 'partial' }), 'analytics'],
    ['errored reports', () => ({ ...completeReports(), state: 'error' }), 'reports'],
    ['truncated audit', () => ({ ...completeAudit(), state: 'truncated' }), 'audit'],
    ['missing analytics source', () => {
      const value = completeAnalytics();
      const sources = { ...(value.sources as Record<string, unknown>) };
      delete sources.app_activity;
      return { ...value, sources };
    }, 'analytics'],
  ])('rejects %s before opening the runner transaction', async (_label, fixture, source) => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();

    await expect(adapters.runAgentOfficeObservationFromInternalSources(
      repo,
      collectors({ [source]: fixture() }),
      () => 3_000,
    )).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(repo.transactionCalls).toBe(0);
  });

  test('does not default a missing numeric count to zero', async () => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();
    const reports = completeReports();
    delete reports.count;

    await expect(adapters.runAgentOfficeObservationFromInternalSources(repo, collectors({ reports }), () => 3_000))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(repo.transactionCalls).toBe(0);
  });

  test.each([
    ['stale analytics', 'analytics', 2_000, 902_001],
    ['stale reports', 'reports', 2_000, 902_001],
    ['stale audit', 'audit', 2_000, 902_001],
    ['future analytics', 'analytics', 63_001, 2_000],
    ['future reports', 'reports', 63_001, 2_000],
    ['future audit', 'audit', 63_001, 2_000],
  ] as const)('rejects %s before opening the runner transaction', async (_label, source, sourceTimestampMs, nowMs) => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();
    const analytics = completeAnalytics();
    const reports = completeReports();
    const audit = completeAudit();
    analytics.generatedAtMs = source === 'analytics' ? sourceTimestampMs : nowMs;
    reports.fetchedAtMs = source === 'reports' ? sourceTimestampMs : nowMs;
    audit.fetchedAtMs = source === 'audit' ? sourceTimestampMs : nowMs;

    await expect(adapters.runAgentOfficeObservationFromInternalSources(
      repo,
      collectors({ analytics, reports, audit }),
      () => nowMs,
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: expect.stringContaining(`Agent Office ${source} source receipt is unsafe`),
    });
    expect(repo.transactionCalls).toBe(0);
  });

  test.each([
    ['analytics', () => {
      const fixture = completeAnalytics();
      const sources = fixture.sources as Record<string, Record<string, unknown>>;
      sources.users.errorCode = 'users_read_failed_private@example.com';
      return fixture;
    }],
    ['reports', () => {
      const fixture = completeReports();
      const sourceHealth = fixture.sourceHealth as Record<string, unknown>[];
      sourceHealth[0].error = 'report_read_failed_private@example.com';
      return fixture;
    }],
    ['audit', () => {
      const fixture = completeAudit();
      const sourceHealth = fixture.sourceHealth as Record<string, unknown>[];
      sourceHealth[0].error = 'audit_read_failed_private@example.com';
      return fixture;
    }],
  ] as const)('rejects contradictory nested %s error markers without leaking them', async (source, fixture) => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();

    await expect(adapters.runAgentOfficeObservationFromInternalSources(
      repo,
      collectors({ [source]: fixture() }),
      () => 3_000,
    )).rejects.toMatchObject({ code: 'failed-precondition', message: expect.not.stringContaining('@example.com') });
    expect(repo.transactionCalls).toBe(0);
  });

  test.each(['reports', 'audit'] as const)('requires ok true from the existing %s source shape', async (source) => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();
    const fixture = source === 'reports' ? completeReports() : completeAudit();
    fixture.ok = false;

    await expect(adapters.runAgentOfficeObservationFromInternalSources(
      repo,
      collectors({ [source]: fixture }),
      () => 3_000,
    )).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(repo.transactionCalls).toBe(0);
  });

  test('rejects more than 100 report rows before the runner transaction', async () => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();
    const base = completeReports();
    const items = Array.from({ length: 101 }, (_, index) => ({ source: 'error_reports', category: 'bug', context: { screen: 'home' }, id: `id-${index}` }));
    const reports = { ...base, items, count: items.length };

    await expect(adapters.runAgentOfficeObservationFromInternalSources(repo, collectors({ reports }), () => 3_000))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(repo.transactionCalls).toBe(0);
  });

  test('redacts PII placed in report category and screen metadata', async () => {
    const adapters = requireAdapters();
    if (!adapters) return;
    const repo = repository();
    const base = completeReports();
    const items = [0, 1].map(() => ({
      source: 'user_reports',
      category: 'person@example.com',
      context: { screen: 'private-user-uid' },
      summary: 'raw private text',
    }));
    const reports = {
      ...base,
      items,
      count: items.length,
      sourceHealth: REPORT_SOURCE_NAMES.map((source) => ({ source, state: source === 'user_reports' ? 'ready' : 'empty', count: source === 'user_reports' ? 2 : 0, truncated: false })),
    };

    const result = await adapters.runAgentOfficeObservationFromInternalSources(repo, collectors({ reports }), () => 3_000);

    expect(JSON.stringify(result)).not.toContain('person@example.com');
    expect(JSON.stringify(result)).not.toContain('private-user-uid');
    expect(result.receipt).toMatchObject({ draft: { summary: '2 related reports: other on unknown_screen.' } });
  });

  test('is absent from callable and package export surfaces', () => {
    const modulePath = path.join(__dirname, 'source_adapters.ts');
    const moduleSource = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';
    const packageIndex = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    const functionsIndex = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf8');

    expect(moduleSource).not.toMatch(/\bonCall\b|firebase-functions\/v2\/scheduler|\.pubsub\b/);
    expect(packageIndex).not.toContain('source_adapters');
    expect(packageIndex).not.toContain('runAgentOfficeObservationFromInternalSources');
    expect(functionsIndex).not.toContain('source_adapters');
    expect(functionsIndex).not.toContain('runAgentOfficeObservationFromInternalSources');
  });
});
