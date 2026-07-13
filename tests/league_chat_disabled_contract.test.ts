import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('disabled league chat contract', () => {
  it('keeps the single availability flag disabled', () => {
    const source = read('app/league_chat_availability.ts');

    expect(source).toContain('export const LEAGUE_CHAT_ENABLED = false as const');
    expect(source).toContain('league_chat_first');
    expect(source).toContain('isLeagueChatAchievementVisible');
  });

  it('keeps active app surfaces disconnected from league chat runtime modules', () => {
    for (const file of [
      'app/club_screen.tsx',
      'components/CommunityChatHubButton.tsx',
      'app/(tabs)/home.tsx',
    ]) {
      const source = read(file);
      expect(source).not.toContain('LeagueChatPanel');
      expect(source).not.toContain('useLeagueChatUnread');
      expect(source).not.toContain('openChat');
    }
  });

  it('keeps Help Board links active while legacy league chat links are not accepted', () => {
    const source = read('app/community_hub_deeplink.ts');

    expect(source).toContain("tab: 'help'");
    expect(source).toContain('if (link.tab !== \'help\') return;');
    expect(source).not.toContain("tab: 'league'");
    expect(source).not.toContain('messageId: string');
  });

  it('hides league chat notifications and does not navigate to league chat', () => {
    const notifications = read('components/NotificationCenterButton.tsx');
    const notificationModel = read('app/user_notifications.ts');

    expect(notificationModel).toContain('isUserNotificationVisible');
    expect(notificationModel).toContain("row.type === 'league_chat_reply'");
    expect(notificationModel).toContain("row.nav?.kind === 'league_chat'");
    expect(notifications).toContain('isUserNotificationVisible');
    expect(notifications).not.toContain("openCommunityHub({ tab: 'league'");
  });
});
