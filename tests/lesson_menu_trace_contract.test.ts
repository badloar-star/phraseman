// зачем (координатор 12.10, «сперва логи»): кадры energy-modes ушли на Главную, а после тапа «Начать» в меню урока в журнале
// не было ни одной строки — причину нельзя было установить. Сторож держит трассировку [LESSON-MENU]: решение о замке
// по каждой ветке, вход каждого обработчика старта, каждый ранний выход, итог навигации и молчаливый выход строки при disabled.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_menu.tsx'), 'utf8');
const count = (needle: string) => source.split(needle).length - 1;

describe('lesson_menu: трассировка [LESSON-MENU]', () => {
  test('решение о замке пишется в каждой ветке (включая ошибку)', () => {
    expect(count('[LESSON-MENU] lock:resolved')).toBe(8); // зачем (владелец 04.11): +1 ветка — замок дополнительного языка (language_lock)
    for (const by of ['language_lock', 'always_open_lesson', 'free_or_purchased', 'access_pending', 'premium_required', 'premium_course', 'earned_progress', 'error_fail_closed']) {
      expect(source).toContain(by);
    }
    expect(source).toContain('isPremiumAccessDecisionConfirmedForCurrentAccount()');
    expect(source.indexOf("by: 'access_pending'"))
      .toBeLessThan(source.indexOf("by: 'premium_required'"));
  });

  test('обработчики старта: вход, ранние выходы с причиной, навигация', () => {
    expect(source).toContain("lessonMenuTrace('primary:start')");
    expect(source).toContain("lessonMenuTrace('primary:continue')");
    expect(count("lessonMenuTrace('primary:exit', { reason: 'launch_blocked' })")).toBe(2);
    expect(count("lessonMenuTrace('primary:exit', { reason: 'french_source_gated'")).toBe(2);
    expect(count("lessonMenuTrace('primary:navigate'")).toBe(2);
  });

  test('тап по строке меню логируется, включая молчаливый выход при disabled', () => {
    expect(source).toContain("lessonMenuTrace('row:tap_ignored', { row: item.testID, reason: 'disabled' })");
    expect(source).toContain("lessonMenuTrace('row:tap', { row: item.testID })");
  });
});
