// ЗАМОК (владелец через координатора 28.10, видео пользователя 2.0.3): тап по уроку в классическом списке ВСЕГДА открывает меню этого
// урока. Было: список решал «открыт», меню перепроверяло замок по другим ключам, решало «закрыто» и делало replace на вкладку —
// человек видел Главную или карту V2 вместо урока. Сработал сторож — вернуть правило, а не ослаблять проверку.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../app/lesson_lock_system', () => ({}));
jest.mock('../app/navigation_back', () => ({ markNextNavigationAsReplace: jest.fn() }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn(), isTesterNoLimitsActive: jest.fn() }));
jest.mock('../app/paywall_navigation', () => ({ openPremiumPaywall: jest.fn() }));

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');

describe('list decision reaches the lesson menu', () => {
  const realNow = Date.now;
  afterEach(() => { Date.now = realNow; });

  it('a fresh "available" from the list is trusted, other decisions and stale ones are not', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gate = require('../app/lesson_premium_gate') as typeof import('../app/lesson_premium_gate');
    let now = 1_000_000;
    Date.now = () => now;
    gate.rememberLessonListDecision(4, 'available');
    expect(gate.lessonListJustOpened(4)).toBe(true);
    now += gate.LESSON_LIST_DECISION_TRUST_MS + 1;
    expect(gate.lessonListJustOpened(4)).toBe(false);
    gate.rememberLessonListDecision(5, 'premium_required');
    expect(gate.lessonListJustOpened(5)).toBe(false);
    expect(gate.lessonListJustOpened(6)).toBe(false);
  });
});

describe('wiring', () => {
  const list = read('app/(tabs)/lessons.tsx');
  const menu = read('app/lesson_menu.tsx');

  it('the list remembers its decision before pushing the lesson menu', () => {
    const at = list.indexOf('const handleLegacyLessonPress = useCallback(');
    expect(at).toBeGreaterThan(-1);
    const body = list.slice(at, list.indexOf('router.push({ pathname: "/lesson_menu"', at));
    expect(body).toContain('rememberLessonListDecision(num, access);');
    expect(body).toContain('noteClassicTap(num, access, isPremium);');
  });

  it('the menu trusts the list in both progress branches, but never in the error fail-closed branch', () => {
    expect(menu).toContain("if (!premiumUnlocked && lessonListJustOpened(lessonId)) {");
    expect(menu).toContain("if (!unlocked && lessonListJustOpened(lessonId)) {");
    const catchAt = menu.indexOf("by: 'error_fail_closed'");
    expect(catchAt).toBeGreaterThan(-1);
    const catchBody = menu.slice(catchAt, menu.indexOf('} finally {', catchAt));
    expect(catchBody).toContain('gatedSetLocked(true);');
    expect(catchBody).not.toContain('lessonListJustOpened');
  });
});
