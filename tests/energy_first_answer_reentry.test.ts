/**
 * D159 (владелец 04.10): урок, «Словарь», «Глаголы» — энергия окончательно списывается после ПЕРВОГО ОТВЕТА;
 * вышел без ответа → возврат (ровно один раз); повторный вход в тот же раздел урока в течение 10 мин — бесплатно.
 */
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
  };
  return { __esModule: true, default: api, ...api };
});

import { ENERGY_FREE_REENTRY_WINDOW_MS } from '../app/energy_contract';
import {
  __resetFirstQuestionGateForTests,
  chargeFirstQuestion,
  markFirstAnswerGiven,
  markFirstQuestionShown,
  noteFirstQuestionSessionExit,
  refundIfFirstQuestionNotShown,
  type FirstQuestionChargeResult,
  type FirstQuestionGateDeps,
} from '../app/energy_first_question_gate';

let nowMs = Date.UTC(2026, 9, 4, 10);
let balance = 5;
let attempt = 0;
const confirm = jest.fn(async (): Promise<FirstQuestionChargeResult> => { balance -= 1; return 'spent'; });
const refund = jest.fn(async (_operationId: string, _reason: string) => { balance += 1; });
const ack = jest.fn(async () => true);
const deps: FirstQuestionGateDeps = {
  confirmActivityStart: confirm,
  refundActivityStart: refund,
  acknowledgeSessionStart: ack,
  getOwnerId: () => 'owner-a',
};

/** Вход в раздел урока: новый operationId (как у экранов), показ первого вопроса. */
async function enter(screen = 'lesson1', activity = 'classic_lesson', subjectId = '1') {
  attempt += 1;
  const operationId = `energy:${activity}:attempt-${attempt}`;
  const result = await chargeFirstQuestion(deps, {
    activity: activity as never,
    intent: { operationId, grant: { kind: activity, subjectId, attemptId: `attempt-${attempt}` } },
    screen,
    finalizeOn: 'first_answer',
  });
  if (result === 'spent' || result === 'unlimited') await markFirstQuestionShown(deps, operationId);
  return { operationId, result };
}
/** Выход: как размонтирование хука — возврат, если не было ответа, затем отметка выхода. */
async function exit(operationId: string, screen = 'lesson1') {
  const refunding = refundIfFirstQuestionNotShown(deps, operationId, `unmounted_before_first_question:${screen}`);
  const noting = noteFirstQuestionSessionExit(operationId);
  await Promise.all([refunding, noting]);
}

beforeEach(() => {
  mockStore.clear();
  __resetFirstQuestionGateForTests();
  confirm.mockClear(); refund.mockClear(); ack.mockClear();
  balance = 5;
  nowMs = Date.UTC(2026, 9, 4, 10);
  jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('enter → exit without answering → energy comes back (+1), exactly once', async () => {
  const s = await enter();
  expect(balance).toBe(4);
  await exit(s.operationId);
  // Повторный сигнал выхода/возврата (двойное размонтирование, гонка) не возвращает второй раз.
  await refundIfFirstQuestionNotShown(deps, s.operationId, 'unmounted_before_first_question:lesson1');
  expect(balance).toBe(5);
  expect(refund).toHaveBeenCalledTimes(1);
  expect(refund.mock.calls[0][1]).toMatch(/^no_answer:/);
  expect(ack).not.toHaveBeenCalled();
});

test('enter → answer → exit → no refund (the charge is final after the first answer)', async () => {
  const s = await enter();
  await markFirstAnswerGiven(deps, s.operationId);
  await exit(s.operationId);
  expect(balance).toBe(4);
  expect(refund).not.toHaveBeenCalled();
  expect(ack).toHaveBeenCalledTimes(1);
});

test('re-entry into the same section within 10 minutes is free; after 11 minutes it is charged', async () => {
  const first = await enter();
  await markFirstAnswerGiven(deps, first.operationId);
  await exit(first.operationId);
  expect(balance).toBe(4);

  nowMs += 5 * 60 * 1000;
  const second = await enter();
  expect(second.result).toBe('unlimited');
  expect(balance).toBe(4);
  expect(confirm).toHaveBeenCalledTimes(1);
  await exit(second.operationId);

  nowMs += 11 * 60 * 1000;
  const third = await enter();
  expect(third.result).toBe('spent');
  expect(balance).toBe(3);
  expect(ENERGY_FREE_REENTRY_WINDOW_MS).toBe(10 * 60 * 1000);
});

test('a refunded session (no answer) does not open the free window — no endless free entries', async () => {
  const first = await enter();
  await exit(first.operationId);
  expect(balance).toBe(5);
  nowMs += 60 * 1000;
  const second = await enter();
  expect(second.result).toBe('spent');
  expect(balance).toBe(4);
});

test('the free window is per section of the same lesson: «Словарь» after the lesson is still charged', async () => {
  const lesson = await enter('lesson1', 'classic_lesson', '1');
  await markFirstAnswerGiven(deps, lesson.operationId);
  await exit(lesson.operationId);
  nowMs += 60 * 1000;
  const words = await enter('lesson_words', 'lesson_words', 'en:1');
  expect(words.result).toBe('spent');
  expect(balance).toBe(3);
});

test('default mode (other activities, D72) is unchanged: shown = final, exit after showing does not refund', async () => {
  const operationId = 'energy:level_exam:attempt-x';
  await chargeFirstQuestion(deps, { activity: 'level_exam' as never, intent: { operationId, grant: { kind: 'level_exam', subjectId: 'a1', attemptId: 'x' } }, screen: 'exam' });
  await markFirstQuestionShown(deps, operationId);
  await refundIfFirstQuestionNotShown(deps, operationId, 'unmounted_before_first_question:exam');
  expect(balance).toBe(4);
  expect(refund).not.toHaveBeenCalled();
});
