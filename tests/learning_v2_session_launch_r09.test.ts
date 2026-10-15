// зачем (Ревизор f2401f6f6, координатор 15.10, R09): в РЕЛИЗЕ плеер берёт материал только из передачи «готово»
// (consumeLearningV2CourseSessionReadyHandoffV3 по id занятия + sessionRunId из маршрута), иначе уходит на карту.
// Тест воспроизводит именно релизную ветку: Главная → тап «Продолжить» → подготовка → передача → маршрут с sessionRunId →
// «плеер» находит передачу. Вкладка «Уроки» и Главная обязаны идти одним путём (learning_v2_session_launch_v1).
import fs from 'node:fs';
import path from 'node:path';

type FakeHandle = { courseSessionId: string; sessionRunId: string };
const mockStaged = new Map<string, FakeHandle>();
const mockPrepare = jest.fn();
jest.mock('../app/learning_v2_course_released_session_client_v3', () => ({
  prepareCurrentLearningV2CourseSessionV3: (input: { locator: { lessonOrdinal: number; sessionOrdinal: number }; sessionRunId: string }) => mockPrepare(input),
  stageLearningV2CourseSessionReadyHandoffV3: (h: FakeHandle) => { mockStaged.set(`${h.courseSessionId}|${h.sessionRunId}`, h); },
  // как в плеере: взять передачу ровно по паре «занятие + запуск», один раз
  consumeLearningV2CourseSessionReadyHandoffV3: (k: { courseSessionId: string; sessionRunId: string }) => {
    const key = `${k.courseSessionId}|${k.sessionRunId}`;
    const h = mockStaged.get(key) ?? null;
    mockStaged.delete(key);
    return h;
  },
}));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `run-${++mockUuid}` }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { setItem: () => Promise.resolve(), multiGet: () => Promise.resolve([]), multiRemove: () => Promise.resolve() } }));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: () => undefined }));
jest.mock('../app/learning_v2_visibility_switch', () => ({ LEARNING_V2_HIDDEN: false, logLearningV2Hidden: () => undefined }));

import { act, renderHook } from '@testing-library/react-native';
import { launchHomeContinueV2, resetHomeContinueV2LaunchForTests, useHomeContinueV2Launching } from '../app/learning_v2_home_continue_route';
// eslint-disable-next-line import/first
import * as client from '../app/learning_v2_course_released_session_client_v3';

const route = {
  id: 'lesson-01:session:04', runtimeMode: 'direct_v1', previewOrigin: 'course', lessonOrdinal: '1', sessionOrdinal: '4',
  releaseEnvironment: 'production', releaseSeasonId: 'learning-v2', runKind: 'initial',
};
type Href = { pathname: string; params: Record<string, string | undefined> };

describe('R09 · Главная → «Продолжить» V2 → занятие открывается в релизной ветке', () => {
  beforeEach(() => {
    mockStaged.clear(); mockPrepare.mockReset(); resetHomeContinueV2LaunchForTests();
    mockPrepare.mockImplementation(async (input: { sessionRunId: string }) => ({ courseSessionId: route.id, sessionRunId: input.sessionRunId }));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('передача «готово» лежит под id занятия и sessionRunId из маршрута — плеер её находит, не уходит на карту', async () => {
    const pushed: Href[] = [];
    await launchHomeContinueV2(route, { lang: 'ru', studyTarget: 'en', push: (h) => { pushed.push(h as Href); } });
    expect(pushed).toHaveLength(1);
    const href = pushed[0]!;
    expect(href.pathname).toBe('/learning-v2/session/[id]');
    expect(href.params.sessionRunId).toBe('run-1');
    expect(href.params.previewMode).toBeUndefined(); // релизная ветка, не dev-превью
    const consumed = (client as unknown as { consumeLearningV2CourseSessionReadyHandoffV3: (k: object) => unknown })
      .consumeLearningV2CourseSessionReadyHandoffV3({ courseSessionId: href.params.id, sessionRunId: href.params.sessionRunId });
    expect(consumed).toEqual({ courseSessionId: route.id, sessionRunId: 'run-1' });
    expect(mockPrepare.mock.calls[0]![0].locator).toMatchObject({ lessonOrdinal: 1, sessionOrdinal: 4, studyTarget: 'en', learnerSourceLocale: 'ru', environment: 'production' });
  });

  // зачем (Ревизор по R09, 🟡): подготовка до 12 с — карточка узнаёт «готовим» и показывает занятость
  it('состояние «готовим» видно на всё время подготовки и снимается после перехода', async () => {
    let finishPrepare!: () => void;
    mockPrepare.mockImplementationOnce((input: { sessionRunId: string }) => new Promise((resolve) => { finishPrepare = () => resolve({ courseSessionId: route.id, sessionRunId: input.sessionRunId }); }));
    const hook = await renderHook(() => useHomeContinueV2Launching());
    expect(hook.result.current).toBe(false);
    let launch!: Promise<void>;
    await act(async () => { launch = launchHomeContinueV2(route, { lang: 'ru', studyTarget: 'en', push: () => undefined }); });
    expect(hook.result.current).toBe(true);
    await act(async () => { finishPrepare(); await launch; });
    expect(hook.result.current).toBe(false);
  });

  it('двойной тап — одна подготовка и один переход', async () => {
    const pushed: unknown[] = [];
    const ctx = { lang: 'ru', studyTarget: 'en', push: (h: unknown) => { pushed.push(h); } };
    await Promise.all([launchHomeContinueV2(route, ctx), launchHomeContinueV2(route, ctx)]);
    expect(mockPrepare).toHaveBeenCalledTimes(1);
    expect(pushed).toHaveLength(1);
  });

  it('подготовка не удалась — человек на карте курса, причина в журнале, без пустого занятия', async () => {
    mockPrepare.mockRejectedValue(new Error('learning_v2_factory_session_unavailable'));
    const pushed: Href[] = [];
    await launchHomeContinueV2(route, { lang: 'ru', studyTarget: 'en', push: (h) => { pushed.push(h as Href); } });
    expect(pushed.map((h) => (typeof h === 'string' ? h : h.pathname))).toEqual(['/learning-v2/course']);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[V2-LAUNCH] prepare_failed from=home_continue'));
  });
});

describe('R09 · один путь запуска для «Уроков» и Главной', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  it('обе точки готовят и передают через learning_v2_session_launch_v1, копий подготовки нет', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    const home = read('app/learning_v2_home_continue_route.ts');
    for (const src of [lessons, home]) {
      expect(src).toContain('prepareLearningV2SessionRunV1(');
      expect(src).toContain('stageLearningV2ReadyHandoffV1(');
      expect(src).toContain('learningV2SessionHrefV1(');
      expect(src).not.toContain('mod.prepareCurrentLearningV2CourseSessionV3(');
    }
    // плеер в релизе по-прежнему берёт материал только из передачи — значит sessionRunId в маршруте обязателен
    expect(read('app/learning_v2_direct_session_player_v1.tsx')).toMatch(/routedCourseSessionId && routedSessionRunId\s*\?\s*consumeLearningV2CourseSessionReadyHandoffV3/);
  });
});
