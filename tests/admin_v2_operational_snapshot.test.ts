import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-core.js'), 'utf8');

function buildSnapshot(briefing: unknown, nowMs = 2_000_000_000_000): Record<string, unknown> {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-operational-snapshot.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => process.stdout.write(JSON.stringify(m.buildOperationalSnapshot(${JSON.stringify(briefing)}, ${nowMs}))))`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout);
}

const readyDigest = {
  state: 'ready',
  fetchedAtMs: 2_000_000_000_000,
  digest: {
    schemaVersion: 2,
    dayKey: '2033-05-18',
    generatedAtMs: 1_999_996_400_000,
    generationState: 'complete',
    completeness: { errors: 0, truncated: 1, total: 3 },
    facts: {
      reports: { open: 4 },
      appErrors: { total: 12, critical: 2 },
      safety: { open: 3 },
      community: { packSubmissions: { total: 5 } },
      queues: [{ name: 'Почта', total: 6 }, { name: 'Модерация', total: 2 }],
    },
    sourceHealth: [
      { source: 'app_errors', state: 'ready', count: 12, checkedAtMs: 1_999_996_400_000, latestEventAtMs: 1_999_996_000_000, limit: 1000 },
      { source: 'support_inbox', state: 'empty', count: 0, checkedAtMs: 1_999_996_400_000, latestEventAtMs: 0, limit: 1000 },
      { source: 'community_pack_submissions', state: 'truncated', count: 1000, checkedAtMs: 1_999_996_400_000, latestEventAtMs: 1_999_995_000_000, limit: 1000 },
    ],
  },
};

describe('Admin v2 operational snapshot truth model', () => {
  test('keeps loading, empty and error states distinct without green zeroes', () => {
    expect(buildSnapshot({ state: 'loading', digest: null })).toMatchObject({ state: 'loading', hasData: false, stateLabel: 'Загрузка' });
    expect(buildSnapshot({ state: 'empty', digest: null })).toMatchObject({ state: 'empty', hasData: false, stateLabel: 'Снимок ещё не создан' });
    expect(buildSnapshot({ state: 'error', digest: null, error: 'permission-denied' })).toMatchObject({ state: 'error', hasData: false, stateLabel: 'Ошибка чтения', error: 'permission-denied' });
  });

  test('derives only evidence-backed metrics and preserves source freshness', () => {
    expect(buildSnapshot(readyDigest)).toMatchObject({
      state: 'ready',
      hasData: true,
      stateLabel: 'Данные получены',
      generatedAtMs: 1_999_996_400_000,
      metrics: {
        criticalSignals: 5,
        packSubmissions24h: 5,
        queueSignals24h: 12,
        appErrors: 12,
        sourceTotal: 3,
        sourceErrors: 0,
        sourceTruncated: 1,
      },
      sources: [
        { source: 'app_errors', state: 'ready', count: 12, latestEventAtMs: 1_999_996_000_000 },
        { source: 'support_inbox', state: 'empty', count: 0 },
        { source: 'community_pack_submissions', state: 'truncated', count: 1000 },
      ],
    });
  });

  test('marks old data stale and keeps partial data visibly degraded', () => {
    const stale = buildSnapshot(readyDigest, 2_000_200_000_000);
    expect(stale).toMatchObject({ state: 'stale', hasData: true, stateLabel: 'Снимок устарел' });

    const partial = buildSnapshot({ ...readyDigest, state: 'partial', digest: { ...readyDigest.digest, generationState: 'partial' } });
    expect(partial).toMatchObject({ state: 'partial', hasData: true, stateLabel: 'Данные частичные' });
  });

  test('does not fabricate zeroes for legacy or incomplete digest fields', () => {
    expect(buildSnapshot({
      state: 'legacy',
      fetchedAtMs: 2_000_000_000_000,
      digest: {
        schemaVersion: 1,
        dayKey: '2033-05-18',
        generatedAtMs: 1_999_996_400_000,
        facts: { reports: {} },
      },
    })).toMatchObject({
      state: 'legacy',
      hasData: true,
      hasUnknownMetrics: true,
      metrics: {
        criticalSignals: null,
        packSubmissions24h: null,
        queueSignals24h: null,
        appErrors: null,
        sourceTotal: null,
        sourceErrors: null,
        sourceTruncated: null,
      },
    });

    expect(buildSnapshot({
      state: 'ready',
      fetchedAtMs: 2_000_000_000_000,
      digest: {
        schemaVersion: 2,
        dayKey: '2033-05-18',
        generatedAtMs: 1_999_996_400_000,
        facts: {},
        sourceHealth: [],
      },
    })).toMatchObject({
      state: 'ready',
      hasUnknownMetrics: true,
      metrics: {
        criticalSignals: null,
        packSubmissions24h: null,
        queueSignals24h: null,
        appErrors: null,
        sourceTotal: 0,
        sourceErrors: 0,
        sourceTruncated: 0,
      },
    });
  });

  test('keeps stale and partial flags independent for old partial snapshots', () => {
    const oldPartial = buildSnapshot(
      { ...readyDigest, state: 'partial', digest: { ...readyDigest.digest, generatedAtMs: 1_999_800_000_000, generationState: 'partial' } },
      2_000_000_000_000,
    );

    expect(oldPartial).toMatchObject({
      state: 'stale',
      isPartial: true,
      isStale: true,
      stateLabel: 'Снимок устарел',
    });
  });

  test('does not hide loading or error state behind stale old digest', () => {
    const oldDigest = { ...readyDigest.digest, generatedAtMs: 1_999_800_000_000 };

    expect(buildSnapshot({ state: 'loading', digest: oldDigest }, 2_000_000_000_000)).toMatchObject({
      state: 'loading',
      isStale: true,
      stateLabel: 'Загрузка',
    });

    expect(buildSnapshot({ state: 'error', error: 'permission-denied', digest: oldDigest }, 2_000_000_000_000)).toMatchObject({
      state: 'error',
      isStale: true,
      stateLabel: 'Ошибка чтения',
      error: 'permission-denied',
    });
  });

  test('wires Overview and Diagnostics to the stored read-only briefing without generation or duplicate refresh controls', () => {
    expect(core).toContain("import { buildOperationalSnapshot");
    expect(core).toContain('function refreshCurrentRouteReadModels()');
    expect(core).toContain('loadDailyBriefing(false)');
    expect(core).toContain('renderOverviewOperationalState');
    expect(core).toContain('renderDiagnosticsSourceHealth');
    expect(core).toContain('latestEventAtMs');
    expect(core).toContain('role="alert"');
    expect(core).toContain('Снимок обновляется автоматически при открытии.');
    expect(core).toContain('Новые подачи паков · 24 ч');
    expect(core).toContain('Открытые репорты и события очередей · 24 ч');
    expect(core).toContain("value == null");
    expect(core).toContain('сигналов ошибок и безопасности за окно снимка');
    expect(core).toContain('title="Повторно прочитать последний сохранённый снимок"');
    expect(core).toContain('title="Повторно прочитать состояние источников"');
    expect(core).not.toContain("['Критические сигналы', 'Контент на проверке', 'Открытые обращения', 'Последнее изменение']");
    expect(core).not.toContain("['API', 'Ошибки', 'Неудачные задания', 'Операции отката']");

    const autoLoadBlock = core.slice(core.indexOf('function refreshCurrentRouteReadModels()'), core.indexOf('function agentOfficeRefreshKey'));
    expect(autoLoadBlock).not.toContain('generateDailyBriefing');
  });
});
