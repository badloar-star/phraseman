import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('home pearl balance live update', () => {
  it('uses the client-authoritative balance event immediately after a local gift credit', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

    const subscriptionStart = home.indexOf("onAppEvent('shards_balance_updated'");
    expect(subscriptionStart).toBeGreaterThanOrEqual(0);

    const subscription = home.slice(subscriptionStart, subscriptionStart + 520);
    expect(subscription).toContain('setShardsBalance(payload.balance);');
    expect(subscription).toContain('shardsDirtyRef.current = true;');
    expect(subscription).not.toContain('refreshShardsBalanceFromCloudAuthoritative');
    expect(subscription).not.toContain('getShardsBalance()');
  });
});
