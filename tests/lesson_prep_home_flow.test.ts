// зачем (живой макет lesson-preparing-live.html, владелец утвердил 25.10; координатор): запуск с кнопки «Продолжить» Главной:
// обычный случай — переход сразу без «Готовим»; ожидание — ход на кнопке и пауза «дотягивания»; не успело/отказ — кнопка возвращается,
// подсказка снизу, Главная на месте (карту курса НЕ открываем); повторный тап по занятой кнопке ничего не запускает. Журнал [PREP-CTA].
import fs from 'node:fs';
import path from 'node:path';

const mockPrepare = jest.fn();
jest.mock('../app/learning_v2_course_released_session_client_v3', () => ({
  prepareCurrentLearningV2CourseSessionV3: (input: object) => mockPrepare(input),
  stageLearningV2CourseSessionReadyHandoffV3: () => undefined,
  consumeLearningV2CourseSessionReadyHandoffV3: () => null,
}));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `run-${++mockUuid}` }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { setItem: () => Promise.resolve(), multiGet: () => Promise.resolve([]), multiRemove: () => Promise.resolve() } }));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: () => undefined }));
jest.mock('../app/learning_v2_visibility_switch', () => ({ LEARNING_V2_HIDDEN: false, logLearningV2Hidden: () => undefined }));
const mockEmit = jest.fn();
jest.mock('../app/events', () => ({ emitAppEvent: (...a: unknown[]) => mockEmit(...a) }));

import { launchHomeContinueV2, resetHomeContinueV2LaunchForTests } from '../app/learning_v2_home_continue_route';
import { beginLessonPrep, endLessonPrep, isLessonPrepActive, markLessonPrepFinishing, peekLessonPrep, resetLessonPrepForTests } from '../app/lesson_prep_store';

const route = {
  id: 'lesson-01:session:04', runtimeMode: 'direct_v1', previewOrigin: 'course', lessonOrdinal: '1', sessionOrdinal: '4',
  releaseEnvironment: 'production', releaseSeasonId: 'learning-v2', runKind: 'initial',
};
type Href = { pathname: string };
const ok = (input: { sessionRunId: string }) => ({ courseSessionId: route.id, sessionRunId: input.sessionRunId });
const logCalls = (): string[] => (console.log as jest.Mock).mock.calls.filter((c) => c[0] === '[PREP-CTA]').map((c) => `${c[1]} ${c[2] ?? ''}`);

beforeEach(() => {
  mockPrepare.mockReset(); mockEmit.mockReset(); resetHomeContinueV2LaunchForTests(); resetLessonPrepForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { jest.restoreAllMocks(); });

describe('хранилище подготовки', () => {
  it('второй begin при идущей подготовке отказывает; end снимает; end без begin безвреден', () => {
    expect(beginLessonPrep('home', 1000)).toBe(true);
    expect(isLessonPrepActive()).toBe(true);
    expect(beginLessonPrep('lessons', 1100)).toBe(false);
    expect(peekLessonPrep()).toMatchObject({ source: 'home', startedAt: 1000, finishing: false });
    markLessonPrepFinishing();
    expect(peekLessonPrep()?.finishing).toBe(true);
    expect(endLessonPrep({ ok: true }, 1200)).toBe('instant');
    expect(isLessonPrepActive()).toBe(false);
    expect(endLessonPrep({ ok: true })).toBeNull();
  });
  it('итог по времени и сроку', () => {
    beginLessonPrep('home', 0);
    expect(endLessonPrep({ ok: false, timedOut: true }, 12_000)).toBe('timeout');
    beginLessonPrep('home', 0);
    expect(endLessonPrep({ ok: true }, 8000)).toBe('prepared_after_still');
  });
});

describe('Главная → «Продолжить»: ветки макета', () => {
  it('обычно (занятие собрано) — переход сразу, кнопка не меняется, подсказки нет', async () => {
    mockPrepare.mockImplementation(async (i: { sessionRunId: string }) => ok(i));
    const pushed: Href[] = [];
    const t0 = Date.now();
    await launchHomeContinueV2(route, { lang: 'ru', studyTarget: 'en', homeCta: true, push: (h) => { pushed.push(h as Href); } });
    expect(Date.now() - t0).toBeLessThan(300); // без паузы «дотягивания»
    expect(pushed.map((h) => h.pathname)).toEqual(['/learning-v2/session/[id]']);
    expect(isLessonPrepActive()).toBe(false);
    expect(mockEmit).not.toHaveBeenCalled();
    expect(logCalls().some((l) => l.startsWith('end') && l.includes('"outcome":"instant"'))).toBe(true);
  });

  it('ожидание дольше 0,35 с — готово: пауза дотягивания, затем переход; итог prepared', async () => {
    mockPrepare.mockImplementation((i: { sessionRunId: string }) => new Promise((resolve) => setTimeout(() => resolve(ok(i)), 450)));
    const pushed: Href[] = [];
    await launchHomeContinueV2(route, { lang: 'ru', studyTarget: 'en', homeCta: true, push: (h) => { pushed.push(h as Href); } });
    expect(pushed).toHaveLength(1);
    expect(logCalls().some((l) => l.startsWith('end') && l.includes('"outcome":"prepared"'))).toBe(true);
  });

  it('не успело за срок — кнопка возвращается, подсказка «ещё готовится», карту курса не открываем', async () => {
    mockPrepare.mockRejectedValue(new Error('learning_v2_session_prepare_timeout: lesson-1:session:4 12000ms'));
    const pushed: unknown[] = [];
    await launchHomeContinueV2(route, { lang: 'ru', studyTarget: 'en', homeCta: true, push: (h) => { pushed.push(h); } });
    expect(pushed).toEqual([]); // решение владельца: Главная на месте
    expect(isLessonPrepActive()).toBe(false);
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit.mock.calls[0]![0]).toBe('action_toast');
    expect(mockEmit.mock.calls[0]![1]).toMatchObject({ type: 'info', messageRu: 'Занятие ещё готовится. Нажми «Продолжить» через пару секунд' });
    expect(logCalls().some((l) => l.startsWith('end') && l.includes('"outcome":"timeout"'))).toBe(true);
  });

  it('иной отказ (материала нет) — тоже остаёмся на Главной, подсказка «сейчас недоступно»', async () => {
    mockPrepare.mockRejectedValue(new Error('learning_v2_factory_session_unavailable'));
    const pushed: unknown[] = [];
    await launchHomeContinueV2(route, { lang: 'ru', studyTarget: 'en', homeCta: true, push: (h) => { pushed.push(h); } });
    expect(pushed).toEqual([]);
    expect(mockEmit.mock.calls[0]![1]).toMatchObject({ messageRu: 'Сейчас недоступно. Попробуй снова чуть позже' });
  });

  it('следующий тап после отказа снова запускает подготовку (кнопка свободна)', async () => {
    mockPrepare.mockRejectedValueOnce(new Error('learning_v2_session_prepare_timeout: x'));
    mockPrepare.mockImplementation(async (i: { sessionRunId: string }) => ok(i));
    const pushed: Href[] = [];
    const ctx = { lang: 'ru', studyTarget: 'en', homeCta: true, push: (h: unknown) => { pushed.push(h as Href); } };
    await launchHomeContinueV2(route, ctx);
    await launchHomeContinueV2(route, ctx);
    expect(mockPrepare).toHaveBeenCalledTimes(2);
    expect(pushed).toHaveLength(1);
  });

  it('повторный тап по занятой кнопке ничего не запускает: одна подготовка, один переход', async () => {
    mockPrepare.mockImplementation((i: { sessionRunId: string }) => new Promise((resolve) => setTimeout(() => resolve(ok(i)), 100)));
    const pushed: unknown[] = [];
    const ctx = { lang: 'ru', studyTarget: 'en', homeCta: true, push: (h: unknown) => { pushed.push(h); } };
    await Promise.all([launchHomeContinueV2(route, ctx), launchHomeContinueV2(route, ctx), launchHomeContinueV2(route, ctx)]);
    expect(mockPrepare).toHaveBeenCalledTimes(1);
    expect(pushed).toHaveLength(1);
  });

  it('вызов без homeCta (кнопка друга и т. п.) — прежнее поведение: отказ уводит на карту курса, хранилище не трогается', async () => {
    mockPrepare.mockRejectedValue(new Error('learning_v2_factory_session_unavailable'));
    const pushed: Href[] = [];
    await launchHomeContinueV2(route, { lang: 'ru', studyTarget: 'en', push: (h) => { pushed.push(h as Href); } });
    expect(pushed.map((h) => (typeof h === 'string' ? h : h.pathname))).toEqual(['/learning-v2/course']);
    expect(mockEmit).not.toHaveBeenCalled();
    expect(logCalls()).toEqual([]);
  });
});

describe('подключение', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  it('кнопка сцены Главной берёт начинку из LessonPrepCtaBody; приглушения 72 % больше нет; Главная помечает запуск homeCta', () => {
    const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('<LessonPrepCtaBody source="home"');
    expect(stage).not.toContain('ctaBusy');
    expect(stage).toContain("overflow: 'hidden'");
    expect(read('app/(tabs)/home.tsx')).toContain('homeCta: true');
  });
  it('вечных циклов нет: ни withRepeat, ни Animated.loop; ход считается на UI-потоке', () => {
    const body = read('components/lesson_prep/LessonPrepCtaBody.tsx');
    expect(body).not.toMatch(/withRepeat|Animated\.loop|ActivityIndicator/);
    expect(body).toContain('useFrameCallback');
    expect(body).toContain('useReducedMotion');
  });
});
