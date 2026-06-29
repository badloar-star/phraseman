import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('league chat — open author card by tapping avatar/name', () => {
  const panel = () => read(path.join('components', 'LeagueChatPanel.tsx'));
  const club = () => read(path.join('app', 'club_screen.tsx'));

  test('LeagueChatPanel exposes an onAuthorPress callback', () => {
    expect(panel()).toContain('onAuthorPress');
  });

  test('author avatar and name are wrapped in tappable handlers', () => {
    const source = panel();
    expect(source).toContain('league-chat-author-avatar-');
    expect(source).toContain('league-chat-author-name-');
    // Оба тапа зовут один обработчик открытия карточки автора.
    expect(source).toContain('openAuthor');
  });

  test('only other users are tappable — not my own messages or optimistic ones', () => {
    // canOpenAuthor = чужое сообщение, не оптимистичное, есть колбэк и uid автора.
    expect(panel()).toContain('!isMine && !localMessage && !!onAuthorPress && !!m.authorUid');
  });

  test('club_screen wires onAuthorPress to open the unified player card', () => {
    const source = club();
    expect(source).toContain('onAuthorPress={(author)');
    // Карточка открывается через тот же стейт профиля, что и тап по строке лиги.
    expect(source).toContain('setProfile(');
  });
});
