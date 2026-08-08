import { readFileSync } from 'fs';
import { join } from 'path';

describe('all runtime level-ups use spin credits after v1 cutover', () => {
  test('friend quest XP queues only exact server-minted Spin credits', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'friend_quests.ts'), 'utf8');
    expect(source).toContain('enqueueAuthoritativeLevelSpinLevels');
    expect(source).toContain('levelSpinMintedCredits');
    expect(source).toContain('level_spin_v1_');
    expect(source).not.toContain('getLevelFromXP(freshBefore)');
    expect(source).not.toContain('getLevelFromXP(serverXp)');
    expect(source).not.toContain('reconcileLevelUpRewards');
  });

  test('no runtime module calls legacy reconciliation outside its compatibility owner', () => {
    const runtimeFiles = ['progress_events_client.ts', 'xp_manager.ts', 'friend_quests.ts'];
    for (const file of runtimeFiles) {
      const source = readFileSync(join(process.cwd(), 'app', file), 'utf8');
      expect(source).not.toContain('reconcileLevelUpRewards(');
    }
  });
});
