import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const HOME_SOURCE = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

// зачем (координатор §46, 2026-10-01): XP и уровни сняты в 2.0 (PM-055) — полоски
// опыта на Главной нет. Сторож перевёрнут: ни полоски, ни числа опыта.
describe('home XP presentation after the XP retirement', () => {
  it('renders neither an XP bar nor a numeric XP quantity', () => {
    expect(HOME_SOURCE).not.toContain('width: `${xpPct}%`');
    expect(HOME_SOURCE).not.toContain('formatHomeXpProgressLabel');
    expect(HOME_SOURCE).not.toContain('{homeXpProgressLabel}');
  });
});
