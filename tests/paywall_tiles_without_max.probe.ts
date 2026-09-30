import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'paywall', 'PaywallPlanTiles.tsx'), 'utf8');
for (const removed of ['MAX', 'onOpenMaxPaywall', 'onNavigate', 'ScrollView', 'rowScroll', 'tileFixedWidth']) {
  assert.equal(source.includes(removed), false, `Retired MAX tile path remains: ${removed}`);
}
assert.equal(source.includes("plan: 'monthly'"), true, 'Monthly purchase tile must remain');
assert.equal(source.includes("plan: 'yearly'"), true, 'Yearly purchase tile must remain');
assert.equal(source.includes("plan: 'lifetime'"), true, 'Pro purchase tile must remain');
assert.equal(source.includes('onPress={() => onSelect(tile.plan)}'), true, 'Plan selection must remain');
