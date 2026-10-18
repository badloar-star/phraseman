import { readFileSync } from 'fs';
import { join } from 'path';

describe('account switch pending shard spend UI', () => {
  it('routes pending-spend, quarantine and sync failures through one confirmed forced path that keeps a backup', () => {
    const source = readFileSync(
      join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'),
      'utf8',
    );
    const helperDef = source.indexOf('const runForcedAccountSwitchWithoutSaving');
    const pendingBranch = source.indexOf("res.reason === 'pending_shard_spend'");
    const quarantineBranch = source.indexOf("res.reason === 'shard_queue_quarantined'");
    const syncBranch = source.indexOf("res.reason === 'sync_failed'");

    // Shared forced path is defined before the failure branches.
    expect(helperDef).toBeGreaterThan(-1);
    expect(pendingBranch).toBeGreaterThan(helperDef);
    expect(quarantineBranch).toBeGreaterThan(pendingBranch);
    expect(syncBranch).toBeGreaterThan(quarantineBranch);

    // The forced path must request BOTH permissions: wipe without sync AND
    // discard of a pending shard spend / quarantined queue. In this mode
    // auth_provider writes an emergency backup (including the shard queue)
    // before wiping, so support can restore the balance manually.
    const helperBlock = source.slice(helperDef, pendingBranch);
    expect(helperBlock).toContain('allowWipeWithoutSync: true');
    expect(helperBlock).toContain('allowPendingShardSpendDiscard: true');

    // зачем (правило владельца 18.10, матрица Сайта B8): окно sync_failed («Прогресс не сохранён… смена отменена») убрано — смена идёт с аварийной копией на телефоне.
    // Остаются две ветки с действием через помощник: pending_shard_spend и shard_queue_quarantined не должны быть тупиком.
    const helperUses = source.split('onPress: runForcedAccountSwitchWithoutSaving').length - 1;
    expect(helperUses).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain("L('Прогресс не сохранён'");

    // The forced failure path still aborts safely and the success path still
    // drops linked auth and re-prompts sign-in.
    const forcedFailure = source.indexOf('if (!forced.ok)', helperDef);
    const forcedSuccess = source.indexOf('setLinkedAuth(null)', helperDef);
    expect(forcedFailure).toBeGreaterThan(helperDef);
    expect(forcedSuccess).toBeGreaterThan(forcedFailure);
  });
});
