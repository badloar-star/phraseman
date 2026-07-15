import fs from 'node:fs';
import path from 'node:path';

describe('friends tab visibility runtime guard', () => {
  it('does not start heavy friend maintenance while the tab is hidden', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'),
      'utf8',
    );

    const syncIndex = source.indexOf('void syncMyInviteCode(() => cancelled);');
    expect(syncIndex).toBeGreaterThanOrEqual(0);

    const effectStart = source.lastIndexOf('useEffect(() => {', syncIndex);
    const effectEnd = source.indexOf('\n  }, [', syncIndex);
    expect(effectStart).toBeGreaterThanOrEqual(0);
    expect(effectEnd).toBeGreaterThan(syncIndex);

    const heavyEffect = source.slice(effectStart, effectEnd);
    const visibilityGuard = heavyEffect.indexOf('if (!friendsTabVisible) return;');

    expect(visibilityGuard).toBeGreaterThanOrEqual(0);
    expect(visibilityGuard).toBeLessThan(heavyEffect.indexOf('void syncMyInviteCode(() => cancelled);'));
    expect(visibilityGuard).toBeLessThan(heavyEffect.indexOf('void fetchMyProfile()'));
    expect(visibilityGuard).toBeLessThan(heavyEffect.indexOf('void cleanupStaleFriendData(() => cancelled);'));
    expect(heavyEffect).toContain('let cancelled = false;');
    expect(heavyEffect).toContain('void syncMyInviteCode(() => cancelled);');
    expect(heavyEffect).toContain('InteractionManager.runAfterInteractions');
    expect(heavyEffect).toContain('void cleanupStaleFriendData(() => cancelled);');
    expect(heavyEffect).toContain('if (cleanupTimer) clearTimeout(cleanupTimer);');
    expect(heavyEffect).toContain('cancelled = true;');
  });
});
