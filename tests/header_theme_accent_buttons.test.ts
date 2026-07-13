import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const THEME_BUTTON_DIR = 'assets/images/header_glyphs/theme-accent-buttons';

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('header accent buttons (vector icons)', () => {
  const videoSource = () => read(path.join('components', 'LingmanVideosButton.tsx'));
  const inboxSource = () => read(path.join('components', 'AppMessagesInbox.tsx'));
  const notificationSource = () => read(path.join('components', 'NotificationCenterButton.tsx'));
  const chatHubSource = () => read(path.join('components', 'CommunityChatHubButton.tsx'));
  const homeSource = () => read(path.join('app', '(tabs)', 'home.tsx'));

  test('video, notifications and Help Board buttons use vector Ionicons, not per-theme assets', () => {
    expect(videoSource()).toContain('play-circle-outline');
    expect(notificationSource()).toContain('notifications-outline');
    expect(chatHubSource()).toContain('chatbubble-ellipses-outline');
  });

  test('no header button references the old per-theme image assets', () => {
    expect(videoSource()).not.toContain('play-button-');
    expect(inboxSource()).not.toContain('message-button-');
  });

  test('the old per-theme button assets are removed from the bundle', () => {
    const dir = path.join(ROOT, THEME_BUTTON_DIR);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    expect(files.filter((f) => f.startsWith('play-button-'))).toHaveLength(0);
    expect(files.filter((f) => f.startsWith('message-button-'))).toHaveLength(0);
  });

  test('video, notifications and chat buttons keep the same visual box (48x46 / 44x38)', () => {
    for (const source of [videoSource(), notificationSource(), chatHubSource()]) {
      expect(source).toContain('width: 48');
      expect(source).toContain('height: 46');
      expect(source).toContain('width: 44');
      expect(source).toContain('height: 38');
    }
  });

  test('video and messages unread indicators share one notification color token', () => {
    const token = read(path.join('components', 'homeNotificationBadge.ts'));

    expect(token).toContain('HOME_NOTIFICATION_BADGE_COLOR');
    expect(videoSource()).toContain('HOME_NOTIFICATION_BADGE_COLOR');
    expect(inboxSource()).toContain('HOME_NOTIFICATION_BADGE_COLOR');
    expect(videoSource()).not.toContain('backgroundColor: chrome.accent');
  });

  test('Help Board button remains separate while team messages move into notifications', () => {
    const home = homeSource();
    const chatHub = chatHubSource();

    expect(home).not.toContain('<AppMessagesInbox />');
    expect(home).toContain('<NotificationCenterButton isHomeTabActive={activeIdx === 0} homeFocusTick={focusTick} />');
    expect(notificationSource()).toContain('mode="notification-center"');
    expect(home).toContain('<CommunityChatHubButton />');
    expect(chatHub).toContain('home-help-board-button');
    expect(chatHub).toContain('community-chat-hub-fullscreen');
    expect(chatHub).toContain('HelpBoardPanel');
    expect(chatHub).not.toContain('LeagueChatPanel');
    expect(chatHub).not.toContain("renderTab('league'");
    expect(chatHub).not.toContain("router.push('/league_screen?openChat=1')");
  });
});
