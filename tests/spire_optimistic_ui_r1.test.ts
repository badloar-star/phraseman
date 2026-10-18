// зачем (координатор 12.10, обзор Дизайна SPIRE_OPTIMISTIC_UI_REVIEW_R1): четыре дыры мгновенного отклика Шпиля.
// 1) «Подняться» без прогретого пакета — экран «Готовим ступень…» в тот же тап, пакет внутри; сбой → кнопка с «Повторить».
// 2) второй тап после ВЕРНОГО ответа в том же кадре не проходит в следующее задание.
// 3) жалоба легла в очередь, сервер отказал → общий тост «отправим позже».
// 4) «не удалось сохранить в «Мои ошибки»» — только при сбое записи, не при штатном пропуске.
import fs from 'fs';
import path from 'path';
import { act, renderHook } from '@testing-library/react-native';
import { arenaAnswerFingerprint } from '../modules/arena/answer_check';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
// зачем (18.10): перед ступенью идёт отсчёт 3-2-1 (его проверяет tests/spire_countdown.test.tsx); здесь проверяется ответ на задание, поэтому отсчёт — мгновенный двойник
jest.mock('../app/spire/use_spire_countdown', () => {
  const mockReact = require('react');
  return { useSpireCountdown: ({ onDone }: { onDone: () => void }) => { mockReact.useEffect(() => { onDone(); }, []); return null; } };
});

// ── useSpireGame: сеть и хранилище подменены, пакет недели отдаётся по команде теста ──
type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
const mockPackCalls: Deferred<unknown>[] = [];
jest.mock('../app/spire/spire_pack_client', () => ({
  spireEnsureWeekPack: jest.fn(() => {
    const d = deferred<unknown>();
    mockPackCalls.push(d);
    return d.promise;
  }),
}));
const mockRoom = { groupId: 'g1', tier: 0, weekId: 'W', members: [] };
jest.mock('../app/spire/spire_room_client', () => ({
  peekSpireRoom: jest.fn(() => mockRoom),
  spireSyncRoom: jest.fn(() => new Promise(() => undefined)),
}));
jest.mock('../app/spire/spire_live_gate', () => ({ spireOpenLiveGate: jest.fn(() => ({ where: 'home' })) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'uid_1') }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable_1') }));
jest.mock('../app/spire/spire_friends_client', () => ({ spireLoadFriendChips: jest.fn(async () => []) }));
jest.mock('../app/spire/spire_week_result_client', () => ({
  spireLoadWeekResult: jest.fn(async () => null),
  spireDismissWeekResult: jest.fn(async () => undefined),
}));
jest.mock('../app/spire_report_client', () => ({
  spireFlushNow: jest.fn(async () => null),
  spireRecordStepResult: jest.fn(async () => ({ persisted: true, local: null, effect: 'applied' })),
}));
jest.mock('../app/spire/spire_local_store', () => ({
  spirePeekStepAttempt: jest.fn(async () => 0),
  spireBumpStepAttempt: jest.fn(async () => undefined),
}));
jest.mock('../modules/spire/room_rows', () => ({ spireBuildRoomRows: () => [], spireMyPlace: () => null }));
jest.mock('../modules/today-tasks/today_tasks_store', () => ({ recordTodayTaskActivity: jest.fn(async () => undefined) }));

// ── Раннер: энергия списывается сразу ──
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({
    confirmSpendOne: jest.fn(async () => 'spent'),
    acknowledgeSessionStart: jest.fn(async () => true),
    refundOne: jest.fn(async () => undefined),
  }),
  useEnergySessionIntent: () => ({ operationId: 'op_1' }),
}));

// ── «Мои ошибки» ──
const mockCapture = jest.fn();
jest.mock('../app/mistake_practice_capture', () => ({ captureCurrentAccountObjectiveAttempt: (...a: unknown[]) => mockCapture(...a) }));

// ── Тост жалобы ──
const mockEmit = jest.fn();
jest.mock('../app/events', () => ({
  ...jest.requireActual('../app/events'),
  emitAppEvent: (...a: unknown[]) => mockEmit(...a),
}));

import { SPIRE_CONFIG_DEFAULTS } from '../modules/spire/config_contract';
import { spireDecodeWeekPack, spirePickStepPlan } from '../modules/spire/pack_plan';
import { spireCurrentWeekKey } from '../components/spire/spire_tower_model';
import { __resetSpireBudgetEstimateForTests, spireEstimateStepBudgetMs, useSpireGame } from '../app/spire/use_spire_game';
import { useSpireStepRunner } from '../app/spire/use_spire_step_runner';
import { spireCaptureMistakeOutcome } from '../app/spire/spire_mistake_capture';
import { SPIRE_REPORT_QUEUED_TOAST, spireReportSubmitVerdict } from '../modules/spire/spire_report_verdict';

const SALT = 'spire:test:en:0';
const WEEK = spireCurrentWeekKey(Date.now());

function rawPack() {
  const mkSet = (seed: string) => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      taskId: `${seed}-t${i}`, mode: 'guess_phrase', kind: 'choice', difficulty: 1,
      payload: { phrase: `phrase ${i}`, options: ['a', 'b', 'c', 'd'] },
    }));
    return { tasks, answerFingerprints: tasks.map((t) => [arenaAnswerFingerprint(SALT, t.taskId, 0)]) };
  };
  return {
    schema: 'spire-pack-v1', weekId: WEEK, lang: 'en', tier: 0, packHash: 'sp1_abcdefghijklmnop', saltId: SALT,
    aboveCloudsCyclesFloors: [11, 12, 13, 14, 15],
    floors: Array.from({ length: 15 }, (_, f) => ({
      floor: f + 1, guardian: false,
      steps: Array.from({ length: 5 }, (_, s) => ({ step: s + 1, sets: [mkSet(`f${f + 1}s${s + 1}`)] })),
    })),
  };
}
function decodedPack() {
  const d = spireDecodeWeekPack(rawPack(), { weekId: WEEK, lang: 'en', tier: 0 });
  if (!d.ok) throw new Error(d.reason);
  return d.pack;
}

const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

function renderGame() {
  return renderHook(() => useSpireGame({ config: SPIRE_CONFIG_DEFAULTS, unlocked: true, lang: 'en', week: null, setWeek: jest.fn() }));
}

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());

describe('п.1 «Подняться» без прогретого пакета', () => {
  beforeEach(() => {
    mockPackCalls.length = 0;
    __resetSpireBudgetEstimateForTests();
  });

  async function readyGame() {
    const hook = await renderGame();
    await flush(); // идентичность
    await flush();
    mockPackCalls.length = 0; // прогрев (если был) не считаем
    return hook;
  }

  it('экран «Готовим ступень…» в тот же тап, ступень — когда пакет пришёл', async () => {
    const { result } = await readyGame();
    await act(async () => { void result.current.startStep(); });
    expect(result.current.pending).not.toBeNull();
    expect(result.current.pending?.ctx).toMatchObject({ floor: 1, stepInFloor: 0, tier: 0, lang: 'en' });
    expect(result.current.pending?.budgetMs).toBeGreaterThan(0);
    expect(result.current.session).toBeNull();
    expect(mockPackCalls).toHaveLength(1);
    await act(async () => { mockPackCalls[0].resolve({ status: 'network', source: 'network', reason: 'ok', pack: decodedPack() }); });
    await flush();
    expect(result.current.session).not.toBeNull();
    expect(result.current.pending).toBeNull();
    expect(result.current.starting).toBe(false);
  });

  it('пакета нет — экран ступени закрыт, на кнопке «нет сети» и «Повторить»', async () => {
    const { result } = await readyGame();
    await act(async () => { void result.current.startStep(); });
    await act(async () => { mockPackCalls[0].resolve({ status: 'offline', source: 'none', reason: 'timeout', pack: null }); });
    await flush();
    expect(result.current.pending).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.startBlock).toBe('pack_offline');
  });

  it('«Назад» во время загрузки — отмена; поздний пакет ступень не открывает; новый тап работает', async () => {
    const { result } = await readyGame();
    await act(async () => { void result.current.startStep(); });
    await act(async () => { result.current.cancelPendingStep(); });
    expect(result.current.pending).toBeNull();
    expect(result.current.starting).toBe(false);
    await act(async () => { mockPackCalls[0].resolve({ status: 'network', source: 'network', reason: 'ok', pack: decodedPack() }); });
    await flush();
    expect(result.current.session).toBeNull();
    await act(async () => { void result.current.startStep(); });
    expect(result.current.pending).not.toBeNull();
    expect(mockPackCalls).toHaveLength(2);
  });

  it('двойной тап во время загрузки — одна подготовка', async () => {
    const { result } = await readyGame();
    await act(async () => { void result.current.startStep(); void result.current.startStep(); });
    expect(mockPackCalls).toHaveLength(1);
  });

  it('оценка времени до пакета — положительная (точное время подставит настоящая ступень)', () => {
    const est = spireEstimateStepBudgetMs(SPIRE_CONFIG_DEFAULTS.timer, 3);
    expect(est).toBeGreaterThan(0);
  });

  it('экран ступени открывается при session ИЛИ pending (контракт по исходнику)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/spire/SpireStepScreen.tsx'), 'utf8');
    expect(src).toContain('visible={session !== null || pending !== null}');
    expect(src).toContain('<PendingStepBody');
    const home = fs.readFileSync(path.join(__dirname, '..', 'components/spire/SpireHomeScreen.tsx'), 'utf8');
    expect(home).toContain('onCancelPending={game.cancelPendingStep}');
  });
});

describe('п.2 двойной тап после верного ответа', () => {
  it('второй ответ в том же кадре отклонён — задание сдвинулось ровно на одно', async () => {
    const pick = spirePickStepPlan(decodedPack(), {
      floor: 1, step: 1, attempt: 0, budgetMs: () => 90_000,
    });
    if (!pick) throw new Error('no pick');
    const { result } = await renderHook(() => useSpireStepRunner({
      pick, ctx: { lang: 'en', weekKey: WEEK, tier: 0, floor: 1, stepInFloor: 0 }, uid: 'uid_1', studyTarget: 'en',
      attempt: 0, runId: 'run_1', onFinish: jest.fn(), onAbort: jest.fn(),
    }));
    await flush();
    expect(result.current.phase).toBe('playing');
    await act(async () => {
      result.current.submitChoice(0); // верно
      result.current.submitChoice(0); // тот же кадр — должен отклониться
    });
    expect(result.current.state.taskIndex).toBe(1);
    expect(result.current.state.outcomes).toHaveLength(1);
  });
});

describe('п.3 жалоба: сервер отказал после снятия задания', () => {
  beforeEach(() => mockEmit.mockClear());

  it('в очереди и снято — «отправлено» на кнопке и тост «отправим позже»', () => {
    expect(spireReportSubmitVerdict({ serverConfirmed: false, queuedAndRemoved: true, taskId: 't1' })).toBe('sent');
    expect(mockEmit).toHaveBeenCalledWith('action_toast', SPIRE_REPORT_QUEUED_TOAST);
    expect(SPIRE_REPORT_QUEUED_TOAST.type).toBe('info');
  });

  it('сервер принял — без тоста; ни очереди, ни сервера — «не удалось» на кнопке', () => {
    expect(spireReportSubmitVerdict({ serverConfirmed: true, queuedAndRemoved: true, taskId: 't1' })).toBe('sent');
    expect(spireReportSubmitVerdict({ serverConfirmed: false, queuedAndRemoved: false, taskId: 't1' })).toBe('failed');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('немого catch в отправке жалобы больше нет (контракт по исходнику)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'modules/spire/task_report_client.ts'), 'utf8');
    expect(src).not.toMatch(/catch \{\s*result = null;/);
    expect(src).toContain("step: 'send_threw'");
  });
});

describe('п.4 «Мои ошибки»: три итога', () => {
  const task = { taskId: 'x1', mode: 'guess_phrase', kind: 'choice', difficulty: 1, payload: { phrase: 'p', options: ['a', 'b'] } } as never;

  it('записалось → saved; журнал штатно отказал → skipped; запись упала → failed', async () => {
    mockCapture.mockResolvedValueOnce({ kind: 'captured', mistakeId: 'm', cycleId: 'c', eventId: 'e', appended: true });
    await expect(spireCaptureMistakeOutcome({ studyTarget: 'en', attemptKey: 'a', task, correct: 'a', given: 'b' })).resolves.toBe('saved');
    mockCapture.mockResolvedValueOnce({ kind: 'ignored', reason: 'unsupported' });
    await expect(spireCaptureMistakeOutcome({ studyTarget: 'en', attemptKey: 'a', task, correct: 'a', given: 'b' })).resolves.toBe('skipped');
    mockCapture.mockRejectedValueOnce(new Error('disk full'));
    await expect(spireCaptureMistakeOutcome({ studyTarget: 'en', attemptKey: 'a', task, correct: 'a', given: 'b' })).resolves.toBe('failed');
  });

  it('пары / «найди лишнее» и нераскрытый ответ — skipped, не «не удалось»', async () => {
    const pairs = { ...(task as object), mode: 'match_pairs' } as never;
    await expect(spireCaptureMistakeOutcome({ studyTarget: 'en', attemptKey: 'a', task: pairs, correct: 'a', given: 'b' })).resolves.toBe('skipped');
    await expect(spireCaptureMistakeOutcome({ studyTarget: 'en', attemptKey: 'a', task, correct: null, given: 'b' })).resolves.toBe('skipped');
  });

  it('тихая строка рисуется только при mistakeSaved === false (контракт по исходнику)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/spire/SpireStepScreen.tsx'), 'utf8');
    expect(src).toContain("{fb.mistakeSaved === false ? <Text style={[s.hintSub, { color: p.textSecondary }]} testID=\"spire-step-mistake-not-saved\">{spireGameText(lang, 'mistakeNotSaved')}</Text> : null}");
  });
});
