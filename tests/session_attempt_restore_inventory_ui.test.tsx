import fs from 'fs';
import path from 'path';

const SCREEN = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'level_gifts_inventory.tsx'),
  'utf8',
);

describe('permanent second-chance gift inventory UI', () => {
  test('opens an information modal and never offers proactive use', () => {
    expect(SCREEN).toContain('session-attempt-restore-info-modal');
    expect(SCREEN).toContain("ru: 'Второй шанс'");
    expect(SCREEN).toContain("ru: 'Использовать подарок можно, когда попытки в сессии закончатся.'");
    expect(SCREEN).not.toContain('session-attempt-restore-apply');
  });

  test('renders the count, exact purpose, and permanent lifetime without a countdown', () => {
    expect(SCREEN).toContain('session-attempt-restore-count');
    expect(SCREEN).toContain("ru: 'Восстанавливает все 3 попытки во время сессии'");
    expect(SCREEN).toContain("ru: 'Без срока действия'");
    expect(SCREEN).toContain("gift.lifetime.kind === 'expires'");
  });
});
