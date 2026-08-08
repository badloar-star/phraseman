import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 support and safety Add-to-Plan actions', () => {
  const core = read('admin/v2/scripts/admin-core.js');

  test('offers only closed support queue aggregates and hashes no message content or identity', () => {
    expect(core).toContain('function buildSupportPlanSignals(support)');
    expect(core).toContain("support_queue_new:");
    expect(core).toContain("support_queue_human:");
    expect(core).toContain("support_queue_answered:");
    expect(core).toContain("support_queue_archived:");
    expect(core).toContain("support_queue_total:");
    expect(core).toContain('data-support-plan-key');
    expect(core).toContain('buildSupportPlanSignals(state.support)');

    const supportSignals = core.slice(core.indexOf('function buildSupportPlanSignals(support)'), core.indexOf('function operationalPlanSignalKey'));
    expect(supportSignals).not.toContain('bodyText');
    expect(supportSignals).not.toContain('fromEmail');
    expect(supportSignals).not.toContain('subject');
    expect(supportSignals).not.toContain('uid');
  });

  test('offers safety only as a complete open_safety aggregate and reuses the guarded plan flow', () => {
    expect(core).toContain("daily_briefing_open_safety:");
    expect(core).toContain("operationalPlanSignal('daily_briefing_open_safety', 'daily_briefing', 'safety_flags', 'ready', Number(digest.facts?.safety?.open || 0), Number(digest.generatedAtMs || 0))");
    expect(core).toContain('buildDailyBriefingSafetyPlanSignals(digest, stateName)');
    expect(core).toContain('data-safety-plan-key');

    const safetySignals = core.slice(core.indexOf('function buildDailyBriefingSafetyPlanSignals'), core.indexOf('function operationalPlanSignalKey'));
    expect(safetySignals).not.toContain('byCategory');
    expect(safetySignals).not.toContain('comments');
    expect(safetySignals).not.toContain('reportId');
  });

  test('hydrates and rechecks these signals using the existing source hash, owner, duplicate, confirmation, and direct plans route guards', () => {
    const handler = core.slice(core.indexOf("if (action === 'add-operational-signal-to-plan')"), core.indexOf("if (action === 'add-analytics-aggregate-to-plan')"));
    expect(handler).toContain('...buildSupportPlanSignals(state.support)');
    expect(handler).toContain('...buildDailyBriefingSafetyPlanSignals(state.briefing.digest, state.briefing.state)');
    expect(handler).toContain("if (state.adminRole !== 'owner' || !signal)");
    expect(handler).toContain('if (digestSignalAlreadyLinked(signal)) return setMessage');
    expect(handler).toContain('await operationalPlanSourceHash(signal)');
    expect(handler).toContain("globalThis.location.hash = 'plans'");
  });
});
