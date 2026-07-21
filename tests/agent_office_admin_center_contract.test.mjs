import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const firebase = read('admin/v2/scripts/admin-firebase.js');
const core = read('admin/v2/scripts/admin-core.js');
const decision = read('admin/v2/scripts/admin-agent-office.mjs');
const router = read('admin/v2/scripts/admin-router.js');

for (const callable of [
  'agentOfficeListCases', 'agentOfficeGetCase', 'agentOfficeListRecommendations',
  'agentOfficeDecideRecommendation', 'agentOfficeListAuditEvents', 'agentOfficeGetAggregateHealth',
]) assert.ok(firebase.includes(`httpsCallable(functionsUs, '${callable}')`), `missing ${callable} callable`);

assert.ok(router.includes("'agent-office': 'agent-office'"), 'missing Agent Office route');
assert.ok(core.includes('renderAgentOfficeCenter'), 'missing strategic decision center renderer');
assert.ok(core.includes('agent-office-evidence-freshness'), 'missing evidence freshness projection');
assert.ok(core.includes('data-action="load-agent-office"'), 'missing safe load action');
assert.ok(core.includes('data-action="open-agent-office-audit"'), 'missing audit handoff');
assert.ok(core.includes('data-action="decide-agent-office-recommendation"'), 'missing deliberate decision action');
assert.ok(decision.includes('expectedCaseRevision'), 'decision must bind case revision');
assert.ok(decision.includes('recommendationContentHash'), 'decision must bind recommendation hash');
assert.ok(decision.includes('idempotencyKey'), 'decision must be idempotent');
assert.ok(core.includes('prepare_only'), 'UI must make non-execution scope visible');
assert.ok(core.includes("agentOffice.state === 'loading'"), 'missing loading state');
assert.ok(core.includes("agentOffice.state === 'empty'"), 'missing empty state');
assert.ok(core.includes("agentOffice.state === 'error'"), 'missing error state');
assert.ok(core.includes('briefing.read'), 'missing access guard');
assert.ok(core.includes('role="alert"'), 'missing accessible error state');
assert.ok(core.includes('agent-office-decision-reject'), 'danger control must be visually separated');
assert.ok(core.includes('agent-office-decision-approve'), 'approve control must be in its own visual group');
assert.ok(core.includes('agent-office-decision-controls'), 'decision controls need a separation container');
assert.ok(core.includes('globalThis.confirm(confirmation)'), 'a dangerous decision needs explicit confirmation');
assert.ok(core.includes('escapeHtml(agentCase.summary'), 'case text must be escaped before rendering');
assert.ok(core.includes('<label for="agent-office-reason-'), 'decision reason needs an accessible label');
assert.equal(/(?:getFirestore|collection\(|doc\(|onSnapshot)/.test(firebase), false, 'browser must not read Agent Office Firestore directly');

assert.ok(core.includes('const AGENT_OFFICE_AGGREGATE_PLAN_SIGNALS = Object.freeze'), 'aggregate plan sources must be closed');
assert.ok(core.includes('function agentOfficeAggregatePlanSignal(input)'), 'aggregate signals need a closed projection');
assert.ok(core.includes('function buildAgentOfficeAggregatePlanSignals(items)'), 'aggregate cards need a safe builder');
assert.ok(core.includes('data-action="add-agent-office-aggregate-to-plan"'), 'eligible aggregate cards need a plan action');
assert.match(core, /if \(state\.adminRole === 'owner'\) \{\s*try \{ aggregateResult = await actions\.getAgentOfficeAggregateHealth\(\); \}/, 'only the owner may load aggregate health');
assert.ok(core.includes("if (state.adminRole !== 'owner' || !signal)"), 'aggregate plan action must stay owner-only');
assert.ok(core.includes('if (digestSignalAlreadyLinked(signal)) return setMessage'), 'aggregate action must reject stale duplicates');
assert.ok(core.includes("globalThis.location.hash = 'plans'"), 'aggregate action must hand off to Plans');
assert.ok(core.includes('globalThis.confirm('), 'plan creation must retain explicit confirmation');

const aggregateProjection = core.slice(core.indexOf('function agentOfficeAggregatePlanSignal(input)'), core.indexOf('function buildAgentOfficeAggregatePlanSignals'));
for (const forbidden of ['caseId', 'recommendationId', 'sourceRef', 'uid', 'email', 'summary', 'evidence']) {
  assert.equal(aggregateProjection.includes(forbidden), false, `aggregate projection must not include ${forbidden}`);
}

console.log('Agent Office Admin v2 contract passed');
