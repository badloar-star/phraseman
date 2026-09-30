import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hasMeaningfulProgress, resolveSaveOffer } from '../app/manage_subscription_save_offer';

assert.equal(hasMeaningfulProgress({ streak: 0, lessonsCompleted: 0 }), false);
assert.equal(hasMeaningfulProgress({ streak: 1, lessonsCompleted: 0 }), true);
assert.equal(hasMeaningfulProgress({ streak: 0, lessonsCompleted: 3 }), true);
assert.equal(resolveSaveOffer({ reason: 'too_expensive', progress: { streak: 0, lessonsCompleted: 0 } }), 'none');
assert.equal(resolveSaveOffer({ reason: 'too_expensive', progress: { streak: 0, lessonsCompleted: 3 } }), 'progress');

const root = path.resolve(__dirname, '..');
for (const file of ['app/manage_subscription_save_offer.ts', 'app/manage_subscription.tsx', 'app/_dev_cancel_flow_preview.tsx']) {
  assert.equal(fs.readFileSync(path.join(root, file), 'utf8').includes('totalXP'), false, file);
}
console.log('subscription cancellation offer without XP: 8 checks passed');
