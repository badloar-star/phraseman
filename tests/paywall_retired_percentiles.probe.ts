import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
for (const name of ['paywall_b.tsx', 'paywall_c.tsx']) {
  const source = fs.readFileSync(path.join(root, 'app', name), 'utf8');
  for (const marker of ['pickPercentileLine', 'loadPercentileData', 'setPercentileLine', 'percentileLine=']) {
    assert.equal(source.includes(marker), false, `${name} still contains ${marker}`);
  }
  assert.equal(source.includes('readProgressMirror'), true, `${name} lost the local progress mirror`);
  assert.equal(source.includes('usePaywallPurchase'), true, `${name} lost the purchase flow`);
}
const analytics = fs.readFileSync(path.join(root, 'app', 'daily_analytics_sync.ts'), 'utf8');
assert.equal(analytics.includes("from './leaderboard_stats'"), false, 'Analytics must not load remote leaderboard stats');
const proofCard = fs.readFileSync(path.join(root, 'components', 'paywall', 'PaywallProofCards.tsx'), 'utf8');
assert.equal(proofCard.includes('percentileLine'), false, 'Paywall proof card still includes retired percentile line');
