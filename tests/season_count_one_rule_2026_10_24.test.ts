// зачем (Сверка 24.10 через координатора): одно правило числа заданий и эпизодов — окно эпизода не пишет «0 заданий», когда числа нет
// в данных курса; подзаголовок не повторяет заголовок; «Сцена» Главной не подставляет 50 фраз старого курса в карточку урока V2.
import {
  LEGACY_LESSON_PHRASES,
  homeSceneLessonCount,
  seasonEpisodeSubtitle,
  seasonEpisodeTasksShown,
} from '../components/home/v2/scene/home_scene_count';
import { readSource } from './helpers/read_source';

describe('[SEASON-COUNT] одно правило числа', () => {
  it('Главная: урок V2 — эпизоды урока; пока прогресс V2 читается — числа нет (не 50 старого курса)', () => {
    expect(homeSceneLessonCount({ onPlace: false, v2: true, v2Progress: null, legacyProgress: 0 })).toEqual({ done: null, total: null, source: 'v2_pending' });
    expect(homeSceneLessonCount({ onPlace: false, v2: true, v2Progress: { done: 0, total: 56 }, legacyProgress: 0 })).toEqual({ done: 0, total: 56, source: 'v2_progress' });
    expect(homeSceneLessonCount({ onPlace: false, v2: true, v2Progress: { done: 70, total: 56 }, legacyProgress: null })).toEqual({ done: 56, total: 56, source: 'v2_progress' });
    expect(homeSceneLessonCount({ onPlace: false, v2: false, v2Progress: null, legacyProgress: 12 })).toEqual({ done: 12, total: LEGACY_LESSON_PHRASES, source: 'legacy_lesson' });
    expect(homeSceneLessonCount({ onPlace: true, v2: true, v2Progress: { done: 1, total: 8 }, legacyProgress: 3 }).source).toBe('place');
    expect(homeSceneLessonCount({ onPlace: false, v2: false, v2Progress: null, legacyProgress: null }).source).toBe('none');
  });

  it('окно эпизода: неизвестное число заданий не показывается как «0»', () => {
    expect(seasonEpisodeTasksShown(null)).toBeNull();
    expect(seasonEpisodeTasksShown(0)).toBeNull();
    expect(seasonEpisodeTasksShown(19)).toBe(19);
  });

  it('подзаголовок окна эпизода не повторяет заголовок', () => {
    expect(seasonEpisodeSubtitle('Первый пропуск', 'Первый пропуск')).toBeNull();
    expect(seasonEpisodeSubtitle('Первый пропуск', ' первый пропуск ')).toBeNull();
    expect(seasonEpisodeSubtitle('Первый пропуск', 'Can I come in?')).toBe('Первый пропуск');
    expect(seasonEpisodeSubtitle(null, 'Эпизод 1')).toBeNull();
  });

  it('экраны берут числа из общего правила и пишут [SEASON-COUNT]', () => {
    const season = readSource('components/learning-v2/season/SeasonCourse.tsx');
    expect(season).toContain('const tasksShown = seasonEpisodeTasksShown(info.tasksCount);');
    expect(season).toContain('rightLabel: tasksShown === null ? null : seasonTasksLabel(lang, tasksShown),');
    expect(season).toContain('title: subtitle,');
    expect(season).not.toContain('info.tasksCount ?? 0');
    const home = readSource('app/(tabs)/home.tsx');
    expect(home).toContain('const homeSceneCount = homeSceneLessonCount({');
    expect(home).toContain('done: homeSceneCount.done,');
    expect(home).toContain('total: homeSceneCount.total,');
    expect(home).not.toContain('Math.max(0, Math.min(50, lastLesson.progress ?? 0)) : null,');
    expect(readSource('components/learning-v2/season/SeasonCourseView.tsx')).toContain('SEASON_COUNT_LOG');
  });
});
