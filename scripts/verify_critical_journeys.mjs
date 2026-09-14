import fs from 'node:fs';

const file = 'docs/operations/CRITICAL_JOURNEYS.json';
const document = JSON.parse(fs.readFileSync(file, 'utf8'));
if (document.schemaVersion !== 1 || !['baseline_pending', 'active'].includes(document.status)) throw new Error('critical_journeys_status_invalid');
const required = ['id','tier','owner','userPromise','successEvent','latencyTargetMs','errorBudgetPct','offlineRetry','privacyFields','runbook','measurement'];
const ids = new Set();
for (const journey of document.journeys ?? []) {
  for (const key of required) if (journey[key] === undefined || journey[key] === '') throw new Error(`critical_journey_field_missing:${journey.id ?? 'unknown'}:${key}`);
  if (ids.has(journey.id)) throw new Error(`critical_journey_duplicate:${journey.id}`);
  ids.add(journey.id);
  if (![0, 1].includes(journey.tier)) throw new Error(`critical_journey_tier_invalid:${journey.id}`);
  if (!Number.isFinite(journey.latencyTargetMs) || journey.latencyTargetMs <= 0) throw new Error(`critical_journey_latency_invalid:${journey.id}`);
  if (!Number.isFinite(journey.errorBudgetPct) || journey.errorBudgetPct <= 0 || journey.errorBudgetPct > 100) throw new Error(`critical_journey_budget_invalid:${journey.id}`);
  if (!Array.isArray(journey.privacyFields) || journey.privacyFields.length === 0) throw new Error(`critical_journey_privacy_missing:${journey.id}`);
}
if (![...ids].some((id) => id === 'auth.recovery') || ![...ids].some((id) => id === 'purchase.entitlement')) throw new Error('critical_tier0_coverage_missing');
console.log(`critical_journeys_ok journeys=${ids.size} status=${document.status}`);
