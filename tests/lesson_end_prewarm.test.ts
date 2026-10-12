import fs from 'fs';
import path from 'path';
import {
  DEFER_LESSON_END_SFX_PREWARM_TO_SESSION,
  isSessionEntryPath,
  lessonEndPrewarmPlan,
} from '@/modules/audio/lesson_end_prewarm';

/**
 * зачем (координатор 13.10): второй ход ускорения старта подготовлен выключенным — включается по замеру Сверки одной константой.
 * Сторож: по умолчанию прежний путь (таймер на старте), распознавание входа в занятие точное, корень зовёт прогрев по плану.
 */
describe('lesson_end_prewarm — когда греть звуки конца урока', () => {
  it('по умолчанию выключено: прежний таймер на старте', () => {
    expect(DEFER_LESSON_END_SFX_PREWARM_TO_SESSION).toBe(false);
    expect(lessonEndPrewarmPlan()).toBe('startup_timer');
    expect(lessonEndPrewarmPlan(true)).toBe('on_session_entry');
  });

  it('вход в занятие распознаётся по первому сегменту целиком', () => {
    expect(isSessionEntryPath('/lesson1')).toBe(true);
    expect(isSessionEntryPath('/exam?level=A1')).toBe(true);
    expect(isSessionEntryPath('/learning_v2_direct_session_player_v1')).toBe(true);
    expect(isSessionEntryPath('/flashcards_blitz_session')).toBe(true);
    expect(isSessionEntryPath('/mistake_practice_session')).toBe(true);
    // Итог — уже поздно; список уроков, вкладки и похожие имена — не вход.
    expect(isSessionEntryPath('/lesson_complete')).toBe(false);
    expect(isSessionEntryPath('/lessons_list')).toBe(false);
    expect(isSessionEntryPath('/exam_certificate')).toBe(false);
    expect(isSessionEntryPath('/')).toBe(false);
    expect(isSessionEntryPath(null)).toBe(false);
  });

  it('каждый маршрут из списка существует в app/', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'audio', 'lesson_end_prewarm.ts'), 'utf8');
    const block = src.match(/SESSION_ENTRY_ROUTES[^=]*=\s*\[([\s\S]*?)\];/);
    expect(block).not.toBeNull();
    const routes = [...block![1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(10);
    const missing = routes.filter((route) => !fs.existsSync(path.join(__dirname, '..', 'app', `${route}.tsx`)));
    expect(missing).toEqual([]);
  });

  it('корень греет вторую волну по плану: таймер или вход в занятие', () => {
    const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
    expect(layout).toMatch(/lessonEndPlan === 'startup_timer'\s*\?\s*setTimeout\(\(\) => prewarmLessonEndSfx\('startup_timer'\)/);
    expect(layout).toMatch(/lessonEndPrewarmPlan\(\) !== 'on_session_entry' \|\| !isSessionEntryPath\(pathname\)/);
  });
});
