import fs from 'node:fs';
import path from 'node:path';

describe('friend chain shield retry contract', () => {
  it('keeps gift perks once in restore keys and once in the outbound server-owned blocklist', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');
    const syncStart = source.indexOf('export const SYNC_KEYS');
    const syncKeys = source.slice(syncStart, source.indexOf('];', syncStart) + 2);
    const serverOwned = source.slice(
      source.indexOf('export const SERVER_OWNED_PROGRESS_KEYS'),
      source.indexOf('export const isServerOwnedProgressKey'),
    );
    for (const key of ['chain_shield', 'gift_xp_multiplier']) {
      expect(syncKeys.match(new RegExp(`'${key}'`, 'g'))).toHaveLength(1);
      expect(serverOwned.match(new RegExp(`'${key}'`, 'g'))).toHaveLength(1);
    }
  });

  it('returns the preserved numeric streak when authoritative consume is temporarily unavailable', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'hall_of_fame_utils.ts'), 'utf8');
    expect(source).toContain('if (!effectiveAccountToken) return streak;');
    expect(source).toContain('if (!serverConsume) return streak;');
    expect(source).not.toContain('if (!serverConsume) return;');
  });

  it('uses one deterministic missed-day occurrence and treats no-shield as definitive', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'hall_of_fame_utils.ts'), 'utf8');
    expect(source).toMatch(/consumeFriendChainShield\(\s*`\$\{lastActive\}_\$\{today\}`/);
    expect(source).toContain('if (!serverConsume.consumed)');
    expect(source).toContain("await AsyncStorage.removeItem('chain_shield');");
  });

  it('persists the exact authoritative consume receipt instead of reconstructing stale local JSON', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'hall_of_fame_utils.ts'), 'utf8');
    expect(source).toContain("await AsyncStorage.setItem('chain_shield', serverConsume.chainShield);");
    expect(source).not.toContain("JSON.stringify({ ...cs, daysLeft: newDaysLeft })");
  });
});
