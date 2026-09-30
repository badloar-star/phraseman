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

  test('retired official marketplace performs no remote refresh', async () => {
    const marketplace = await import('../app/flashcards/marketplace');
    expect(marketplace.BUNDLED_MARKETPLACE_PACKS).toEqual([]);
    expect(source('app/flashcards/marketplace.ts')).not.toContain(".collection('card_packs')");
  });

  test('the root layout no longer mounts a global gift poll', () => {
    expect(source('app/_layout.tsx')).not.toContain('GlobalFriendGiftHost');
    expect(source('app/(tabs)/friends.tsx')).not.toContain('claimUnseenFriendGifts');
  });

  test('all friends UI consumers use the shared account store', () => {
    for (const file of [
      'app/(tabs)/friends.tsx',
      // Друзья визитки живут в хуке после переноса макета (2026-09-30).
      'components/profile-card/usePlayerProfileSocial.ts',
    ]) {
      expect(source(file)).not.toContain('subscribeToFriends(');
      expect(source(file)).toContain('friends_account_store');
    }
  });
});
