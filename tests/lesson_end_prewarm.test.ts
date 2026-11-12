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
    // зачем (d8a0a685a, 11.11): курс Learning V2 удалён вместе со своим маршрутом — вместо него занятие диалога
    expect(isSessionEntryPath('/learning_v2_direct_session_player_v1')).toBe(false);
    expect(isSessionEntryPath('/dialogue_v2_session')).toBe(true);
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

  // зачем (d8a0a685a, 11.11): по политике владельца (modules/audio/sfx_music_policy.ts) звуков интерфейса в выпуске нет —
  // корень больше не греет ни нажатия, ни конец урока. Сторожим новую форму: прогрев не вернулся в корень молча,
  // а сама политика по-прежнему запрещает звуки в выпуске. Вернут звуки — вернуть и прежнюю проверку двух волн
  // (вторая волна той же очередью сразу после нажатий: `if (lessonEndPlan === 'startup_timer') prewarmLessonEndSfx(reason)`).
  it('корень не греет звуки интерфейса: в выпуске их нет по политике владельца', () => {
    const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
    expect(layout).not.toMatch(/prewarmLessonEndSfx|scheduleStartupSfxPrewarm|lessonEndPrewarmPlan/);
    expect(layout).toContain('Production policy removes SFX/music, so no startup or session-entry SFX');
    const policy = fs.readFileSync(path.join(__dirname, '..', 'modules', 'audio', 'sfx_music_policy.ts'), 'utf8');
    expect(policy).toContain('Owner policy: production SFX/music is removed');
  });
});
