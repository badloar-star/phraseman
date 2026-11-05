// Governance-ID: TG-0B078CB3F5EA
import { homeHeroProgressBranch, logHomeHeroPick } from '../app/home_hero_log';

// зачем (координатор 05.11, «0-day streak / Day counted» у новичка; «сперва логи»): журнал [HOME-HERO] pick называет ветку выбора героя значением
describe('[HOME-HERO] pick: ветка выбора hasProgress', () => {
  const base = { rank0: true, lessonNo: 1, lastLessonId: null, doneInLesson: 0, continueKind: 'lesson', continueResolved: true };
  test('новичок ранга 0, урок 1 нетронут', () => expect(homeHeroProgressBranch(base)).toBe('newbie_rank0_lesson1_untouched'));
  test('ранг 0, но урок уже открывали (lastLesson) — не новичок', () => expect(homeHeroProgressBranch({ ...base, lastLessonId: 1 })).toBe('continue_resolved'));
  test('нет цели продолжения', () => expect(homeHeroProgressBranch({ ...base, rank0: false, continueKind: 'none' })).toBe('no_continue_target'));
  test('ещё не разрешено', () => expect(homeHeroProgressBranch({ ...base, rank0: false, continueResolved: false })).toBe('not_resolved_yet'));
  test('журнал пишется один раз на смену решения и не бросает', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const f = { ...base, streakDays: 0, streakToday: 'counted', hasProgress: true, branch: 'continue_resolved', lastLessonId: 7 };
    expect(() => { logHomeHeroPick(f); logHomeHeroPick(f); }).not.toThrow();
    expect(log.mock.calls.filter((c) => c[0] === '[HOME-HERO]' && c[1] === 'pick')).toHaveLength(1);
    log.mockRestore();
  });
});
