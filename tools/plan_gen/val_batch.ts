// Reusable: validate a batch drafts JSON (validator + gate + emoji + vocab consistency).
// Usage: npx tsx tools/plan_gen/val_batch.ts <drafts.json>
import * as fs from 'fs';
import { validatePlanContentDay, type PlanContentDay } from '../../app/plan_content_schema';
import { checkPlanContentGate } from '../../app/plan_content_gate_check';

const file = process.argv[2];
const drafts: Record<string, PlanContentDay> = JSON.parse(fs.readFileSync(file, 'utf-8'));
let tot = 0;
for (const k of Object.keys(drafts).sort((a, b) => Number(a) - Number(b))) {
  const day = drafts[k];
  const iss = validatePlanContentDay(day);
  const gate = checkPlanContentGate(day);
  tot += iss.length + (gate.withinGate ? 0 : 1);
  const gb = gate.withinGate ? '' : ' GATE_FAIL:' + gate.warnings.map(w => `${w.phraseId}[${w.aboveGateConstructions}]`).join(',');
  console.log(`DAY ${k}: validator=${iss.length} withinGate=${gate.withinGate}${gb}`);
  for (const i of iss) console.log(`   ${i.code} ${i.phraseId ?? ''} ${i.word ?? ''} ${i.detail}`);
}
console.log('TOTAL issues', tot);
