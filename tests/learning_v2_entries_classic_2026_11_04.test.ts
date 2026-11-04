// Заморозка Learning V2, главное правило (владелец 04.11): таб «Уроки», плитка «Уроки» и «Начать урок 1» на Главной, «Продолжить», «Сегодня»
// ВСЕГДА открывают ОБЫЧНЫЙ курс — у нового пользователя и у пользователя с прогрессом V2. V2 открывается ТОЛЬКО явной кнопкой (вкладка «V2»
// в верхней панели «Уроков») и ТОЛЬКО при ≥1 завершённом занятии. Внешняя ссылка в V2 у нового пользователя V2 не открывает.
import fs from 'node:fs';
import path from 'node:path';

const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, store.get(key) ?? null])) },
}));

import * as visibility from '../app/learning_v2_visibility_switch';
import { refreshLearningV2ProgressGate, resetLearningV2ProgressGateForTests } from '../app/learning_v2_progress_gate';
import { isHomeContinueV2Enabled } from '../app/learning_v2_home_continue_route';
import { TODAY_LESSON_ROUTE, TODAY_TASK_ROUTES } from '../modules/today-tasks/today_tasks_view';
import { redirectSystemPath } from '../app/+native-intent';
import { LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, packCourseMasksV1 } from '../modules/learning-v2/progress/course_progress_masks_v1';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const STABLE_ID = 'stable-uid-entries-test';
const withProgress = () => store.set(LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, packCourseMasksV1({ completed: new Set([0]), opened: new Set<number>() }));

beforeEach(() => {
  store.clear();
  resetLearningV2ProgressGateForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('(а) входы «Сегодня» и «Продолжить» никогда не ведут в V2', () => {
  it.each([
    ['новый пользователь', false],
    ['пользователь с V2-прогрессом', true],
  ])('%s: маршрут «Сегодня» — обычный список, карточка V2 на Главной выключена', async (_name, hasProgress) => {
    if (hasProgress) withProgress();
    await refreshLearningV2ProgressGate(STABLE_ID, 'test_entries');
    expect(visibility.LEARNING_V2_HIDDEN).toBe(!hasProgress);
    expect(TODAY_LESSON_ROUTE).toBe('/lessons_list');
    expect(TODAY_TASK_ROUTES.lesson).toBe('/lessons_list');
    expect(isHomeContinueV2Enabled()).toBe(false);
  });

  it('таб «Уроки» не стартует на странице V2 сам, плитка Главной не просит карту V2, «Начать урок 1» ведёт в меню урока 1', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).not.toContain('presentation === "tab" && learningV2CanOpen ? "v2"');
    expect(lessons).not.toMatch(/initial === "lessons"[^\n]*\? "v2"/);
    const home = read('app/(tabs)/home.tsx');
    expect(home).not.toMatch(/^\s*(if \(!v2Hidden\) )?requestLessonsV2Page\(source\);/m);
    expect(home).toContain("nav.push({ pathname: '/lesson_menu', params: { id: '1' } } as never);");
    expect(home).not.toMatch(/if \(isLearningV2Hidden\(\)\) \{\s*nav\.push\(\{ pathname: '\/lesson_menu'/);
  });
});

describe('(б) явная кнопка V2 видна только при ≥1 завершённом занятии', () => {
  it('без прогресса V2 закрыт, с одним занятием — открыт', async () => {
    await refreshLearningV2ProgressGate(STABLE_ID, 'test_button_new');
    expect(visibility.LEARNING_V2_HIDDEN).toBe(true);
    withProgress();
    await refreshLearningV2ProgressGate(STABLE_ID, 'test_button_progress');
    expect(visibility.LEARNING_V2_HIDDEN).toBe(false);
  });

  it('кнопка «V2» в верхней панели «Уроков» рисуется только под learningV2CanOpen, а оно зависит от живого флага', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('const learningV2CanOpen = learningV2CourseCanBeOpenedManually() && isLearningV2OpenForUiLangV1(lang, "lessons_tab");');
    expect(lessons).toMatch(/const learningV2CourseCanBeOpenedManually = \(\): boolean => !LEARNING_V2_HIDDEN && /);
    expect(lessons).toContain('testID="lessons-tab-v2"');
  });
});

describe('(в) внешняя ссылка в V2 у нового пользователя V2 не открывает', () => {
  it.each(['/learning-v2/course', '/learning-v2/session/es-s1', '/learning_v2_direct_session_player_v1', 'learning-v2/course?x=1'])(
    '%s → обычный список уроков',
    async (link) => {
      await refreshLearningV2ProgressGate(STABLE_ID, 'test_deeplink_new');
      expect(visibility.LEARNING_V2_HIDDEN).toBe(true);
      expect(redirectSystemPath({ path: link, initial: true })).toBe('/lessons_list');
    },
  );
});
