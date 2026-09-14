import assert from 'node:assert/strict';

import { energyVisualTransactions, type EnergyVisualTransaction } from '../app/energy_visual_transactions';

const seen: EnergyVisualTransaction[] = [];
const unsubscribe = energyVisualTransactions.subscribe((event) => seen.push(event));
const event = {
  operationId: 'energy:lesson:attempt-1',
  from: 86,
  to: 66,
  reason: 'spend',
  source: 'lesson',
} as const;
energyVisualTransactions.publish(event);
energyVisualTransactions.publish(event);
unsubscribe();
assert.deepEqual(seen, [event]);

console.log('ENERGY VISUAL TRANSACTIONS PROBE: PASS');
