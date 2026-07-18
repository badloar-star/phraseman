import { readFileSync } from 'fs';
import { join } from 'path';

describe('account switch pending shard spend UI', () => {
  it('handles the non-bypassable spend result separately from the force-without-sync path', () => {
    const source = readFileSync(
      join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'),
      'utf8',
    );
    const pendingBranch = source.indexOf("res.reason === 'pending_shard_spend'");
    const quarantineBranch = source.indexOf("res.reason === 'shard_queue_quarantined'");
    const syncBranch = source.indexOf("res.reason === 'sync_failed'");
    const forceAction = source.indexOf('allowWipeWithoutSync: true');
    const forcedFailure = source.indexOf('if (!forced.ok)', forceAction);
    const forcedSuccess = source.indexOf('setLinkedAuth(null)', forceAction);

    expect(pendingBranch).toBeGreaterThan(-1);
    expect(quarantineBranch).toBeGreaterThan(pendingBranch);
    expect(syncBranch).toBeGreaterThan(quarantineBranch);
    expect(forceAction).toBeGreaterThan(syncBranch);
    expect(forcedFailure).toBeGreaterThan(forceAction);
    expect(forcedSuccess).toBeGreaterThan(forcedFailure);
  });
});
