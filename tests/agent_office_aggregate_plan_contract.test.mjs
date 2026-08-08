import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const firebase = read('admin/v2/scripts/admin-firebase.js');
const core = read('admin/v2/scripts/admin-core.js');

assert.ok(firebase.includes("httpsCallable(functionsUs, 'agentOfficeGetAggregateHealth')"));
assert.ok(firebase.includes('getAgentOfficeAggregateHealth: async ()'));
assert.ok(core.includes('const AGENT_OFFICE_AGGREGATE_PLAN_SIGNALS = Object.freeze'));
assert.ok(core.includes('function agentOfficeAggregatePlanSignal(input)'));
assert.ok(core.includes('Object.keys(input).length !== 5'));
assert.ok(core.includes('input.truncated !== false'));
assert.match(core, /if \(state\.adminRole === 'owner'\) \{\s*try \{ aggregateResult = await actions\.getAgentOfficeAggregateHealth\(\); \}/);
assert.ok(core.includes('data-action="add-agent-office-aggregate-to-plan"'));
assert.ok(core.includes("if (state.adminRole !== 'owner' || !signal)"));
assert.ok(core.includes('if (digestSignalAlreadyLinked(signal)) return setMessage'));
assert.ok(core.includes("globalThis.confirm('Подготовить черновик плана по этому агрегату Офиса агентов?"));
assert.ok(core.includes("globalThis.location.hash = 'plans'"));

const projection = core.slice(core.indexOf('function agentOfficeAggregatePlanSignal(input)'), core.indexOf('function buildAgentOfficeAggregatePlanSignals'));
for (const forbidden of ['caseId', 'recommendationId', 'sourceRef', 'uid', 'email', 'summary', 'evidence']) {
  assert.equal(projection.includes(forbidden), false, `unsafe aggregate field: ${forbidden}`);
}

console.log('Agent Office aggregate Add-to-Plan contract passed');
