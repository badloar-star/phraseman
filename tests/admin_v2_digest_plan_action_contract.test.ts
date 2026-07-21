import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 digest-to-plan action', () => {
  const core = read('admin/v2/scripts/admin-core.js');

  test('maps actionable digest facts to closed structured plan signals without forwarding prose', () => {
    expect(core).toContain('const DIGEST_PLAN_SIGNALS = Object.freeze');
    expect(core).toContain('investigate_safety_flags: { actionCodes:');
    expect(core).toContain('function buildDigestPlanSignals(facts, stateName)');
    expect(core).toContain('JSON.stringify({ dayKey: String(digest.dayKey || \'\'), generatedAtMs: Number(digest.generatedAtMs || 0), signals: signalCodes })');
    expect(core).toContain("source: { kind: 'director_digest', ref: `director_digest:sha256:${sourceHash}` }");
    expect(core).not.toContain('digest.title');
    expect(core).not.toContain('digest.summary,');
    expect(core).not.toContain('digest.details');
  });

  test('shows one owner-only accessible action for each unlinked digest signal and opens Plans with its structured draft', () => {
    expect(core).toContain("data-action=\"add-digest-signal-to-plan\"");
    expect(core).toContain('data-digest-plan-code');
    expect(core).toContain("title=\"Добавить этот сигнал в план без передачи текста карточки\"");
    expect(core).toContain('if (state.adminRole !== \'owner\' || !digest) return;');
    expect(core).toContain("globalThis.location.hash = 'plans'");
    expect(core).toContain('function digestSignalAlreadyLinked(signal)');
  });

  test('requires an explicit confirmation before the callable writes a plan', () => {
    const actionBlock = core.slice(core.indexOf("if (action === 'create-plan')"), core.indexOf("if (action === 'load-asset-jobs')"));
    expect(actionBlock).toContain("globalThis.confirm('Создать план на сервере?")
    expect(actionBlock.indexOf('globalThis.confirm')).toBeLessThan(actionBlock.indexOf('await actions.createPlan(input)'));
  });

  test('rejects stale DOM actions when their signal was linked after the button rendered', () => {
    const digestHandler = core.slice(core.indexOf("if (action === 'add-digest-signal-to-plan')"), core.indexOf("if (action === 'add-operational-signal-to-plan')"));
    const operationalHandler = core.slice(core.indexOf("if (action === 'add-operational-signal-to-plan')"), core.indexOf("if (action === 'save-admin-settings')"));
    for (const handler of [digestHandler, operationalHandler]) {
      expect(handler).toContain('if (digestSignalAlreadyLinked(signal)) return setMessage');
      expect(handler.indexOf('digestSignalAlreadyLinked(signal)')).toBeGreaterThan(handler.indexOf('if (state.adminRole'));
      expect(handler.indexOf('digestSignalAlreadyLinked(signal)')).toBeLessThan(handler.indexOf('return runBusy'));
    }
  });

  test('rejects a stale or manually entered source hash already present in loaded plans before confirmation', () => {
    const createHandler = core.slice(core.indexOf("if (action === 'create-plan')"), core.indexOf("if (action === 'load-asset-jobs')"));
    expect(createHandler).toContain('if (planSourceHashAlreadyLinked(sourceHash)) return setMessage');
    expect(createHandler.indexOf('planSourceHashAlreadyLinked(sourceHash)')).toBeGreaterThan(createHandler.indexOf('/^[a-f0-9]{64}$/.test(sourceHash)'));
    expect(createHandler.indexOf('planSourceHashAlreadyLinked(sourceHash)')).toBeLessThan(createHandler.indexOf('globalThis.confirm'));
    expect(createHandler.indexOf('planSourceHashAlreadyLinked(sourceHash)')).toBeLessThan(createHandler.indexOf('await actions.createPlan(input)'));
  });

  test('offers only owner-only operational signals with canonical opaque hashes, never report prose', () => {
    expect(core).toContain('const OPERATIONAL_PLAN_SIGNALS = Object.freeze');
    expect(core).toContain('overview_critical_signals:');
    expect(core).toContain('diagnostics_source_error:');
    expect(core).toContain('report_source_error:');
    expect(core).toContain('function operationalPlanSourceBytes(signal)');
    expect(core).toContain('JSON.stringify({ scope: signal.scope, code: signal.code, source: signal.source, state: signal.state, count: signal.count, observedAtMs: signal.observedAtMs })');
    expect(core).toContain('data-action="add-operational-signal-to-plan"');
    expect(core).toContain("if (state.adminRole !== 'owner' || !signal)");
    const operationalHashBlock = core.slice(core.indexOf('function operationalPlanSourceBytes(signal)'), core.indexOf('function renderPmDigestActions'));
    expect(operationalHashBlock).not.toContain('item.summary');
    expect(operationalHashBlock).not.toContain('reportText');
  });

  test('offers Add to plan only for eligible aggregate analytics cards with a closed canonical projection', () => {
    expect(core).toContain('const ANALYTICS_AGGREGATE_PLAN_SIGNALS = Object.freeze');
    expect(core).toContain('analytics_subscription_refunds:');
    expect(core).toContain('function analyticsAggregatePlanSignal(input)');
    expect(core).toContain("if (!definition || stateName !== 'ready' || !/^[a-z0-9_-]{1,80}$/.test(source)) return null;");
    expect(core).toContain("JSON.stringify({ scope: signal.scope, metric: signal.metric, rangeDays: signal.rangeDays, state: signal.state, count: signal.count, observedAtMs: signal.observedAtMs })");
    expect(core).toContain('data-action="add-analytics-aggregate-to-plan"');
    expect(core).toContain("if (state.adminRole !== 'owner' || !signal)");
    expect(core).toContain('if (digestSignalAlreadyLinked(signal)) return setMessage');
    expect(core).toContain('renderPlanAction: renderAnalyticsAggregatePlanAction');
    expect(core).toContain('hydratePlanAction: hydrateAnalyticsAggregatePlanAction');
    expect(core).toContain('async function hydrateAnalyticsAggregatePlanAction(input)');
    expect(core).toContain('state.digestPlanSourceHashes = { ...state.digestPlanSourceHashes, [analyticsAggregatePlanSignalKey(signal)]: sourceHash };');
    expect(core).not.toContain('analyticsPlanSignal(report.summary');
    expect(core).not.toContain('analyticsPlanSignal(report.email');
    expect(core).not.toContain('analyticsPlanSignal(report.uid');
  });
});
