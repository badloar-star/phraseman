import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const authSource = normalizeEol(fs.readFileSync(path.join(__dirname, '../app/auth_provider.ts'), 'utf8'));
const shardsSource = normalizeEol(fs.readFileSync(path.join(__dirname, '../app/shards_system.ts'), 'utf8'));
const backupSource = normalizeEol(fs.readFileSync(path.join(__dirname, '../app/account_switch_backup_restore.ts'), 'utf8'));

describe('post-auth stale generation guards', () => {
  test('network helpers receive a generation guard instead of holding a transition lock', () => {
    expect(authSource).not.toContain('runAfterRestoreWithAccountMutationLock(');
    // зачем (PM-289): шаг жемчуга снят со входа (D70/D84) — вернуть его нельзя молча.
    expect(authSource).not.toContain('loadShardsFromCloud');
    expect(authSource).toContain('[AUTH-SHARDS] шаг шардов снят');
    expect(authSource).toContain('tryRestoreAccountSwitchBackup(stage, isCurrent)');
    expect(authSource).toContain('syncRevenueCatAfterAuthLink(isCurrent)');
  });

  test('shard and backup restores check generation immediately before local commits', () => {
    // зачем (PM-289 этап 2): загрузка жемчуга сведена к открытию журнала; страж
    // поколения обязан стоять прямо перед единственной локальной записью.
    expect(shardsSource).toContain('loadShardsFromCloud = async (isCallerCurrent: () => boolean = () => true)');
    expect(shardsSource).toMatch(/if \(!isCurrent\(\)\) \{ console\.warn\([^\n]*stale_before_opening[^\n]*\); return; \}\n\s+await initializeClientShardLedgerOpeningBalance/);
    expect(shardsSource).not.toContain('AsyncStorage.multiSet');
    expect(backupSource).toContain('restoreAccountSwitchEmergencyBackupIfSafe(');
    expect(backupSource).toContain("return { status: 'stale_generation' }");
  });
});
