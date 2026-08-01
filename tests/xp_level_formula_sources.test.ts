import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

describe('XP level formula source consistency', () => {
  it('uses shared level lookup in app achievements and cloud leaderboard sync', () => {
    expect(read('app/achievements_screen.tsx')).toContain('getLevelFromXP(xp)');
    expect(read('functions/src/sync_leaderboard.ts')).toContain('getLevelFromXP(xp)');
  });

  it('keeps maintenance scripts off legacy sqrt level formulas', () => {
    const files = [
      'scripts/sync_leaderboard.mjs',
      'scripts/migrate_leaderboard.mjs',
      'scripts/fix_leaderboard_avatars.mjs',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/Math\.sqrt\(xp\s*\/\s*50\)/);
      expect(source).not.toMatch(/\(l\s*-\s*1\)\s*\*\*\s*2\s*\*\s*50/);
      expect(source).toContain("from './lib/xp_levels.mjs'");
    }
  });

  it('syncs the restore marker to cloud progress', () => {
    const cloudSync = read('app/cloud_sync.ts');
    expect(cloudSync).toContain("import { XP_LEVEL_RESTORE_250_TO_400_KEY } from './xp_level_restore'");
    expect(cloudSync).toContain('XP_LEVEL_RESTORE_250_TO_400_KEY');
  });

  it('does not blindly double stored XP in the home screen legacy migration', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).not.toContain("setItem('user_total_xp', String(xp * 2))");
    expect(home).not.toContain('setItem("user_total_xp", String(xp * 2))');
  });

  it('keeps the 250-to-400 restore server-owned and marks local migration complete without changing XP', () => {
    const xpManager = read('app/xp_manager.ts');
    expect(read('app/xp_manager.ts')).not.toContain("storageGetString('xp_migration_v2')");
    expect(read('scripts/restore_xp_levels_250_to_400.mjs')).not.toContain('progress.xp_migration_v2');
    expect(xpManager).not.toContain('restoredXPForOld250VisibleLevel(currentXP)');
    expect(xpManager).toContain("['user_total_xp', String(currentXP)]");
    expect(xpManager).toContain("[XP_LEVEL_RESTORE_250_TO_400_KEY, '1']");
    expect(read('scripts/restore_xp_levels_250_to_400.mjs')).toContain('const restored = restoredXPForOld250VisibleLevel(currentXP)');
  });

  it('does not publish stale numeric legacy avatars instead of XP-derived level avatars', () => {
    const hallOfFame = read('app/hall_of_fame_utils.ts');

    expect(hallOfFame).toContain('computedLevelAvatar');
    expect(hallOfFame).toContain('getLevelFromXP');
    expect(hallOfFame).toContain('getBestAvatarForLevel');
    expect(hallOfFame).not.toContain("if (storedAvatar && (!resolvedAvatar || /^\\d+$/.test(resolvedAvatar)))");
    expect(hallOfFame).toContain("if (storedAvatar && !/^\\d+$/.test(storedAvatar)");

    const publicProfileSnapshot = read('app/public_profile_snapshot.ts');
    expect(publicProfileSnapshot).toContain('const fallbackAvatar = String(getBestAvatarForLevel(level))');
    expect(publicProfileSnapshot).toContain("const avatar = storedAvatar && !/^\\d+$/.test(storedAvatar) ? storedAvatar : fallbackAvatar");

    expect(read('scripts/migrate_leaderboard.mjs')).toContain("avatarRaw && !/^\\d+$/.test(avatarRaw) ? avatarRaw : String(levelFromXP)");
  });
});
