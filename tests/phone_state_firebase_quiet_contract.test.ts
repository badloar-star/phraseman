import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('quiet Firebase refresh policy', () => {
  test('foreground app messages respect their existing TTL', () => {
    expect(source('app/_layout.tsx')).not.toContain(
      'refreshAppMessagesSnapshotOnce({ force: true, minIntervalMs: 0 })',
    );
  });

  test('Home never fetches foreign league state', () => {
    expect(source('app/(tabs)/home.tsx')).not.toContain('checkLeagueOnAppOpen(');
  });

  test('marketplace owns a persisted six-hour refresh TTL', async () => {
    const marketplace = await import('../app/flashcards/marketplace');
    expect(marketplace.MARKETPLACE_REMOTE_REFRESH_TTL_MS).toBeGreaterThanOrEqual(6 * 60 * 60 * 1000);
    expect(source('app/flashcards/marketplace.ts')).toContain('MARKETPLACE_PACKS_SNAPSHOT_KEY');
  });

  test('GlobalFriendGiftHost is the sole gift poll owner', () => {
    expect(source('components/GlobalFriendGiftHost.tsx')).toContain('claimUnseenFriendGifts');
    expect(source('app/(tabs)/friends.tsx')).not.toContain('claimUnseenFriendGifts');
  });

  test('all friends UI consumers use the shared account store', () => {
    for (const file of [
      'app/(tabs)/friends.tsx',
      'components/PlayerProfileModal.tsx',
      'components/SeasonGiftModal.tsx',
    ]) {
      expect(source(file)).not.toContain('subscribeToFriends(');
      expect(source(file)).toContain('friends_account_store');
    }
  });
});
