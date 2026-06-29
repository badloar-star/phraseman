import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const THEME_BUTTON_DIR = 'assets/images/header_glyphs/theme-accent-buttons';

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('header accent buttons (vector icons)', () => {
  // Три кнопки шапки главного экрана рисуются вектором (Ionicons), один значок на
  // все темы, цвет — акцент темы. Картинок-ассетов по темам больше нет.
  const videoSource = () => read(path.join('components', 'LingmanVideosButton.tsx'));
  const inboxSource = () => read(path.join('components', 'AppMessagesInbox.tsx'));
  const homeSource = () => read(path.join('app', '(tabs)', 'home.tsx'));

  test('video, messages and league-chat buttons use vector Ionicons, not per-theme assets', () => {
    expect(videoSource()).toContain('play-circle-outline');
    expect(inboxSource()).toContain('notifications-outline');
    expect(homeSource()).toContain('chatbubbles-outline');
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

  test('video and messages buttons keep the same visual box (66x54 / 56x40)', () => {
    for (const source of [videoSource(), inboxSource()]) {
      expect(source).toContain('width: 66');
      expect(source).toContain('height: 54');
      expect(source).toContain('width: 56');
      expect(source).toContain('height: 40');
    }
  });

  test('league-chat button sits next to the messages inbox in the home header', () => {
    const home = homeSource();
    // Кнопка чата лиг идёт следом за инбоксом сообщений — три иконки рядом.
    expect(home).toContain('home-league-chat-button');
    expect(home.indexOf('<AppMessagesInbox />')).toBeLessThan(home.indexOf('home-league-chat-button'));
    // Ведёт сразу в чат лиги (минуя экран лиги под fullScreen-модалкой).
    expect(home).toContain("router.push('/league_screen?openChat=1')");
  });
});
