import fs from 'fs';
import path from 'path';

describe('admin friends QA section', () => {
  const screen = fs.readFileSync(path.join(process.cwd(), 'app', '_admin_settings_testers.tsx'), 'utf8');

  it('exposes a dedicated friends admin section with gift and activity controls', () => {
    expect(screen).toContain('friends_admin');
    expect(screen).toContain('Друзья — QA и подарки');
    expect(screen).toContain('admin-friends-open');
    expect(screen).toContain('admin-friends-seed-buddy');
    expect(screen).toContain('admin-friends-seed-shards');
    expect(screen).toContain('admin-friends-seed-incoming-gift');
    expect(screen).toContain('admin-friends-seed-activity');
    expect(screen).toContain('admin-friends-open-arena');
    expect(screen).toContain('admin-friends-clear-cache');
  });

  it('seeds all production friend surfaces needed for QA without deleting real data', () => {
    expect(screen).toContain('ADMIN_QA_FRIEND_UID');
    expect(screen).toContain('FRIENDS_TAB_SWR_CACHE_KEY');
    expect(screen).toContain('FRIEND_PROFILES_CACHE_KEY');
    expect(screen).toContain("collection('friends').doc(ADMIN_QA_FRIEND_UID)");
    expect(screen).toContain("collection('shard_rewards').doc(docId)");
    expect(screen).toContain("reason: 'friend_gift'");
    expect(screen).toContain("seen: false");
    expect(screen).toContain("type: 'friend_gift_sent'");
    expect(screen).toContain('replaceShardsBalanceLocal(120)');
    expect(screen).toContain('invalidateFriendsActivityCache');
    expect(screen).not.toContain("collection('users').doc(uid).delete()");
  });
});
