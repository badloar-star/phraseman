import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('boot cloud restore integration contract', () => {
  const layout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');
  const authProvider = fs.readFileSync(path.join(root, 'app', 'auth_provider.ts'), 'utf8');
  const cloudSync = fs.readFileSync(path.join(root, 'app', 'cloud_sync.ts'), 'utf8');

  it('preserves the detailed restore outcome instead of erasing it into Promise<void>', () => {
    expect(layout).toContain('createBootCloudRestoreCoordinator');
    expect(layout).toContain('Promise<BootCloudRestoreOutcome>');
    expect(layout).not.toContain('__restoreOk');
    expect(layout).not.toContain('await restoreFromCloud();');
  });

  it('uses the shared full-inventory predicate in boot and provider auth', () => {
    expect(layout).toContain('hasMeaningfulLocalAccountData');
    expect(authProvider).toContain('hasMeaningfulLocalAccountData');
    expect(authProvider).not.toContain('function hasLocalLearningProgress');
    expect(layout).not.toContain("AsyncStorage.multiGet([\n              'user_total_xp',\n              'streak_count',\n              'user_name',");
  });

  it('does not emit cloud hydration or sync after a failed restore', () => {
    expect(layout).toContain('if (bootRestoreOutcome.shouldSync)');
    expect(layout).toContain("if (bootRestoreOutcome.status === 'failed')");
    expect(layout).not.toContain("try { emitAppEvent('cloud_profile_hydrated');");
  });

  it('reconciles a persisted provider identity before either boot restore path', () => {
    expect(layout).toContain('async function restoreCloudProfileForBoot(options: CloudRestoreOptions = {})');
    expect(layout).toContain('reconcileAuthIdentityForBoot');
    expect(layout.match(/return restoreCloudProfileForBoot\(coldExamBestPctRestoreOptions\);/g)).toHaveLength(2);
    expect(layout.match(/return restoreFromCloudDetailed\(options\);/g)).toHaveLength(1);
  });

  it('does not label authentication or permission failures as an internet outage', () => {
    expect(cloudSync).toContain("'auth_unavailable'");
    expect(cloudSync).toContain("'permission_denied'");
    expect(layout).toContain("bootRestoreOutcome.status === 'failed'");
    expect(layout).not.toContain("bootRestoreOutcome.status !== 'restored'");
  });

  it('does not stage level-up rewards while restoring historical cloud XP', () => {
    expect(cloudSync).not.toContain('level_up_reward_reconciler');
    expect(cloudSync).not.toContain('reconcileLevelUpRewards');
  });
});
