import fs from 'fs';
import path from 'path';

const authSource = fs.readFileSync(path.join(__dirname, '../app/auth_provider.ts'), 'utf8');
const shardsSource = fs.readFileSync(path.join(__dirname, '../app/shards_system.ts'), 'utf8');
const backupSource = fs.readFileSync(path.join(__dirname, '../app/account_switch_backup_restore.ts'), 'utf8');

describe('post-auth stale generation guards', () => {
  test('network helpers receive a generation guard instead of holding a transition lock', () => {
    expect(authSource).not.toContain('runAfterRestoreWithAccountMutationLock(');
    expect(authSource).toContain('loadShardsFromCloud(isCurrent)');
    expect(authSource).toContain('tryRestoreAccountSwitchBackup(stage, isCurrent)');
    expect(authSource).toContain('syncRevenueCatAfterAuthLink(isCurrent)');
  });

  test('shard and backup restores check generation immediately before local commits', () => {
    expect(shardsSource).toContain('loadShardsFromCloud = async (isCurrent: () => boolean = () => true)');
    expect(shardsSource).toMatch(/if \(!isCurrent\(\)\) return;\s+await AsyncStorage\.multiSet/);
    expect(backupSource).toContain('restoreAccountSwitchEmergencyBackupIfSafe(');
    expect(backupSource).toContain("return { status: 'stale_generation' }");
  });
});
