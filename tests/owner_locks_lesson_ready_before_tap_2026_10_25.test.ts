// ЗАМОК ВЛАДЕЛЬЦА 25.10: «урок всегда должен быть готов, то есть он должен быть собран до того, как юзер его попробует начать».
// Следующее занятие собирается заранее (после первого кадра Главной, при входе на «Обучение», сразу после финиша занятия),
// а тап берёт готовую заготовку без ожидания. В памяти — одна заготовка. Использованная заготовка второй раз не выдаётся:
// у каждого запуска свой sessionRunId.
import fs from 'node:fs';
import path from 'node:path';

const mockPrepare = jest.fn();
jest.mock('../app/learning_v2_course_released_session_client_v3', () => ({
  prepareCurrentLearningV2CourseSessionV3: (input: unknown) => mockPrepare(input),
  stageLearningV2CourseSessionReadyHandoffV3: () => undefined,
}));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `run-${++mockUuid}` }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), warn: jest.fn() } }));
const mockAppListeners: ((state: string) => void)[] = [];
jest.mock('react-native', () => ({
  InteractionManager: { runAfterInteractions: (cb: () => void) => { cb(); return { cancel: () => undefined }; } },
  AppState: { currentState: 'active', addEventListener: (_: string, cb: (state: string) => void) => { mockAppListeners.push(cb); return { remove: () => undefined }; } },
}));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: () => undefined }));

import {
  __resetLearningV2PreparedSlotForTests,
  isLearningV2SessionReadyV1,
  prepareLearningV2SessionRunV1,
  prewarmLearningV2SessionRunV1,
  scheduleLearningV2SessionPrewarmV1,
  stageLearningV2ReadyHandoffV1,
} from '../app/learning_v2_session_launch_v1';

const at = (lessonOrdinal: number, sessionOrdinal: number) => ({
  environment: 'production' as const, seasonId: 'learning-v2', studyTarget: 'en', learnerSourceLocale: 'ru',
  lessonOrdinal, sessionOrdinal,
});
const tap = { devUnlockedDrafts: false };

beforeEach(() => {
  __resetLearningV2PreparedSlotForTests();
  mockPrepare.mockReset();
  mockPrepare.mockImplementation((input: { sessionRunId: string }) => Promise.resolve({ handleFor: input.sessionRunId }));
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('ЗАМОК ВЛАДЕЛЬЦА 25.10: урок готов до тапа', () => {
  it('a prewarmed lesson is handed to the tap at once, without a second build', async () => {
    await prewarmLearningV2SessionRunV1(at(1, 3), 'home');
    expect(isLearningV2SessionReadyV1(at(1, 3))).toBe(true);
    expect(mockPrepare).toHaveBeenCalledTimes(1);

    const ready = await prepareLearningV2SessionRunV1(at(1, 3), tap);
    expect(mockPrepare).toHaveBeenCalledTimes(1);
    expect(ready.handle).toEqual({ handleFor: ready.sessionRunId });
  });

  it('a used prepared lesson is never handed out twice: the next start builds its own run', async () => {
    await prewarmLearningV2SessionRunV1(at(1, 3), 'home');
    const first = await prepareLearningV2SessionRunV1(at(1, 3), tap);
    expect(isLearningV2SessionReadyV1(at(1, 3))).toBe(false);
    const second = await prepareLearningV2SessionRunV1(at(1, 3), tap);
    expect(second.sessionRunId).not.toBe(first.sessionRunId);
    expect(mockPrepare).toHaveBeenCalledTimes(2);
  });

  it('a tap during a running prewarm waits for it and the result does not stay as a spare', async () => {
    let finish!: (value: unknown) => void;
    mockPrepare.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const warming = prewarmLearningV2SessionRunV1(at(2, 1), 'lessons_entry');
    const tapped = prepareLearningV2SessionRunV1(at(2, 1), tap);
    // сборка стартует после уступки кадра и загрузки модуля — ждём, пока заглушка будет вызвана
    for (let i = 0; i < 20 && mockPrepare.mock.calls.length === 0; i += 1) await new Promise((resolve) => setTimeout(resolve, 1));
    finish({ warm: true });
    await warming;
    const ready = await tapped;
    expect(ready.handle).toEqual({ warm: true });
    expect(mockPrepare).toHaveBeenCalledTimes(1);
    expect(isLearningV2SessionReadyV1(at(2, 1))).toBe(false);
  });

  it('only one prepared lesson is kept in memory', async () => {
    await prewarmLearningV2SessionRunV1(at(1, 3), 'home');
    await prewarmLearningV2SessionRunV1(at(1, 4), 'session_finish');
    expect(isLearningV2SessionReadyV1(at(1, 3))).toBe(false);
    expect(isLearningV2SessionReadyV1(at(1, 4))).toBe(true);
  });

  it('every trigger is wired: Home after the first frame, «Обучение» entry, the end of a session', () => {
    const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    expect(read('app/(tabs)/home.tsx')).toMatch(/useHomeContinueV2Prewarm\(/);
    expect(read('app/learning_v2_home_continue_route.ts')).toMatch(/scheduleLearningV2SessionPrewarmV1\([\s\S]{0,500}?'home'\)/);
    expect(read('app/(tabs)/lessons.tsx')).toMatch(/prewarmLearningV2SessionRunV1\(/);
    const player = read('app/learning_v2_direct_session_player_v1.tsx');
    const commitAt = player.indexOf('await commitLocalProgress();');
    const prewarmAt = player.indexOf('scheduleNextLearningV2SessionPrewarmV1(');
    expect(commitAt).toBeGreaterThan(0);
    expect(prewarmAt).toBeGreaterThan(commitAt);
  });

  it('the app went to the background before the pause ended: no build until it is back', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppState } = require('react-native') as { AppState: { currentState: string } };
    AppState.currentState = 'background';
    scheduleLearningV2SessionPrewarmV1(at(3, 2), 'home', 5);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockPrepare).not.toHaveBeenCalled();
    AppState.currentState = 'active';
    mockAppListeners.forEach((listener) => listener('active'));
    for (let i = 0; i < 40 && mockPrepare.mock.calls.length === 0; i += 1) await new Promise((resolve) => setTimeout(resolve, 2));
    expect(mockPrepare).toHaveBeenCalledTimes(1);
  });

  it('the prewarm stays off the first frame: after interactions, with a pause', () => {
    const launch = fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_session_launch_v1.ts'), 'utf8');
    expect(launch).toMatch(/InteractionManager\.runAfterInteractions/);
  });

  // перемер Сверки 25.10: вход через Сезон не писал [V2-START] — замер «тап → готово» в общей передаче, на любом входе
  it('handoff after a tap logs the tap kind and tap-to-ready time; without a tap — no_tap', async () => {
    await prewarmLearningV2SessionRunV1(at(1, 5), 'home');
    const ready = await prepareLearningV2SessionRunV1(at(1, 5), tap);
    stageLearningV2ReadyHandoffV1(ready.handle as never);
    const lines = (console.log as jest.Mock).mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[V2-START] handoff '));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('"session":"lesson-1:session:5"');
    expect(lines[0]).toContain('"kind":"take_ready"');
    expect(lines[0]).toMatch(/"tapToReadyMs":\d+/);
    stageLearningV2ReadyHandoffV1(ready.handle as never);
    expect(String((console.log as jest.Mock).mock.calls.at(-1)?.[0])).toContain('"kind":"no_tap"');
  });
});
