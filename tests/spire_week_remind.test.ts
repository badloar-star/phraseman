// D191 m03 «Напомнить вечером» (координатор 14.10): одно напоминание сегодня в 19:00 местного, только при уже данном
// разрешении и включённой категории «Шпиль»; новый запрос разрешения не делаем; после 18:30 кнопки нет.
import {
  scheduleSpireWeekRemind,
  scheduleSpireWeekRemindWithFeedback,
  spireWeekRemindAvailability,
  spireWeekRemindTriggerAt,
} from '../app/spire/spire_week_remind';

let mockStore: Record<string, string> = {};
let mockOffer: { ok: boolean; reason: string } = { ok: true, reason: 'ok' };
const mockSchedule = jest.fn(async () => ({ id: `n${mockSchedule.mock.calls.length}` }));
const mockCancel = jest.fn(async () => undefined);
const mockRequestPermission = jest.fn();
type Token = Readonly<{ generation: number; stableId: string | null; phase: 'active' }>;
const tokenA: Token = Object.freeze({ generation: 1, stableId: 'stable-a', phase: 'active' });
let mockCurrentToken: Token = tokenA;
const mockGetItem = jest.fn(async (key: string) => (key in mockStore ? mockStore[key] : null));
const mockSetItem = jest.fn(async (key: string, value: string) => { mockStore[key] = value; });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: (key: string, value: string) => mockSetItem(key, value),
    getItem: (key: string) => mockGetItem(key),
  },
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockCurrentToken,
  isCurrentAccountGeneration: (token: Token, expected?: string | null) => (
    token.generation === mockCurrentToken.generation
    && token.stableId === mockCurrentToken.stableId
    && (expected === undefined || expected === mockCurrentToken.stableId)
  ),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const mockEmit = jest.fn();
jest.mock('../app/events', () => ({
  emitAppEvent: (...args: unknown[]) => mockEmit(...args),
  actionToastTri: (type: string, m: Record<string, string>) => ({ type, messageRu: m.ru, messageUk: m.uk }),
}));
jest.mock('../app/notifications', () => ({
  canOfferSpireWeekRemind: async () => mockOffer,
  scheduleSpireWeekRemindLocalNotification: (...args: unknown[]) => mockSchedule(...(args as [])),
  cancelScheduledLocalNotificationById: (...args: unknown[]) => mockCancel(...(args as [])),
  requestNotificationPermission: (...args: unknown[]) => mockRequestPermission(...args),
}));

const localAt = (h: number, m: number): number => { const d = new Date(2026, 9, 12, 0, 0, 0, 0); d.setHours(h, m, 0, 0); return d.getTime(); };
const scheduleWithToken = scheduleSpireWeekRemind as unknown as (uiLang: string, nowMs: number, token: Token) => Promise<boolean>;
const scheduleWithFeedbackToken = scheduleSpireWeekRemindWithFeedback as unknown as (uiLang: string, nowMs: number, token: Token) => Promise<boolean>;

describe('D191 «Напомнить вечером»', () => {
  beforeEach(() => {
    mockStore = {};
    mockOffer = { ok: true, reason: 'ok' };
    mockSchedule.mockClear();
    mockCancel.mockClear();
    mockRequestPermission.mockClear();
    mockEmit.mockClear();
    mockCurrentToken = tokenA;
    mockGetItem.mockReset();
    mockGetItem.mockImplementation(async (key: string) => (key in mockStore ? mockStore[key] : null));
    mockSetItem.mockClear();
  });

  it('до 18:30 — сегодня в 19:00 по местному; после 18:30 — кнопки нет', async () => {
    expect(spireWeekRemindTriggerAt(localAt(18, 0))).toBe(localAt(19, 0));
    expect(spireWeekRemindTriggerAt(localAt(18, 30))).toBe(localAt(19, 0));
    expect(spireWeekRemindTriggerAt(localAt(18, 31))).toBeNull();
    await expect(spireWeekRemindAvailability(localAt(18, 0))).resolves.toEqual({ available: true, triggerAtMs: localAt(19, 0) });
    await expect(spireWeekRemindAvailability(localAt(21, 0))).resolves.toEqual({ available: false, reason: 'too_late' });
  });

  it('нет разрешения или категория выключена — кнопки нет, и разрешение НЕ запрашиваем', async () => {
    mockOffer = { ok: false, reason: 'permission' };
    await expect(spireWeekRemindAvailability(localAt(10, 0))).resolves.toEqual({ available: false, reason: 'permission' });
    mockOffer = { ok: false, reason: 'muted' };
    await expect(spireWeekRemindAvailability(localAt(10, 0))).resolves.toEqual({ available: false, reason: 'muted' });
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('ставит одно напоминание; повторный тап заменяет прежнее, а не добавляет второе', async () => {
    await expect(scheduleSpireWeekRemind('uk', localAt(9, 0))).resolves.toBe(true);
    expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({ title: 'Пік чекає', triggerAtMs: localAt(19, 0) }));
    expect(mockCancel).not.toHaveBeenCalled();
    await scheduleSpireWeekRemind('ru', localAt(9, 5));
    expect(mockCancel).toHaveBeenCalledWith('n1');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });

  // координатор 14.10 (аудит Optimistic UI): окно закрылось сразу — при отказе человек должен узнать, что напоминания нет.
  it('отказ постановки → тихий тост ровно один раз; успех → тоста нет', async () => {
    mockEmit.mockClear();
    mockSchedule.mockImplementationOnce(async () => ({ id: null, reason: 'permission' }) as never);
    await expect(scheduleSpireWeekRemindWithFeedback('ru', localAt(9, 0))).resolves.toBe(false);
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('action_toast', { type: 'info', messageRu: 'Не получилось поставить напоминание', messageUk: 'Не вдалося поставити нагадування' });
    mockEmit.mockClear();
    await expect(scheduleSpireWeekRemindWithFeedback('uk', localAt(9, 5))).resolves.toBe(true);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('после 18:30 даже по прямому вызову не ставит', async () => {
    await expect(scheduleSpireWeekRemind('ru', localAt(20, 0))).resolves.toBe(false);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('owner stale during storage read preserves the existing reminder and performs no cancel/schedule/persist/toast', async () => {
    const read = deferred<string | null>();
    mockStore.spire_week_remind_id_v1 = 'legitimate-a';
    mockGetItem.mockImplementationOnce(() => read.promise);
    const pending = scheduleWithFeedbackToken('ru', localAt(9, 0), tokenA);
    await new Promise((resolve) => setTimeout(resolve, 0));

    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-b', phase: 'active' });
    read.resolve('legitimate-a');

    await expect(pending).resolves.toBe(false);
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
    expect(mockStore.spire_week_remind_id_v1).toBe('legitimate-a');
  });

  it('owner stale after native schedule cancels only the just-created id and never B reminder', async () => {
    const scheduled = deferred<{ id: string }>();
    mockSchedule.mockImplementationOnce(() => scheduled.promise);
    const pending = scheduleWithFeedbackToken('ru', localAt(9, 0), tokenA);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockSchedule).toHaveBeenCalledTimes(1);

    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-b', phase: 'active' });
    mockStore.spire_week_remind_id_v1 = 'b-reminder';
    scheduled.resolve({ id: 'just-created-a' });

    await expect(pending).resolves.toBe(false);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledWith('just-created-a');
    expect(mockCancel).not.toHaveBeenCalledWith('b-reminder');
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
    expect(mockStore.spire_week_remind_id_v1).toBe('b-reminder');
  });

  it('current owner token preserves normal schedule and persistence behavior', async () => {
    await expect(scheduleWithToken('uk', localAt(9, 0), tokenA)).resolves.toBe(true);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith('spire_week_remind_id_v1', 'n1');
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
