// зачем (владелец 22.10, «Очистить все ошибки»; Optimistic UI): экран пустеет ДО записи журнала, сбой откатывает и говорит человеку, двойной вызов
// отбивается, тост «Ошибки удалены» несёт «Вернуть», а «Вернуть» пишет откат один раз и сообщает подписчикам. Журнал замокан: проверяем ход действия.
const hideAllMistakes = jest.fn();
const restoreMistakes = jest.fn();
const emitAppEvent = jest.fn();

jest.mock('../app/mistake_clear_all', () => ({
  hideAllMistakes: (...args: unknown[]) => hideAllMistakes(...args),
  restoreMistakes: (...args: unknown[]) => restoreMistakes(...args),
}));
jest.mock('../app/stable_id', () => ({ getStableId: async () => 'account-a' }));
jest.mock('../app/mistake_practice_analytics', () => ({ trackMistakePracticeEvent: jest.fn() }));
jest.mock('../app/events', () => {
  const actual = jest.requireActual('../app/events');
  return { ...actual, emitAppEvent: (...args: unknown[]) => emitAppEvent(...args) };
});

import { __resetClearAllFlowForTests, clearAllMistakesWithUndo, subscribeMistakeClearAllChanged } from '../app/mistake_clear_all_flow';
import { __resetLocallyHiddenMistakesForTests, withoutLocallyHiddenMistakes } from '../app/mistake_local_hidden';

const rows = [{ mistakeId: 'm1' }, { mistakeId: 'm2' }];
const cleared = [
  { mistakeId: 'm1', cycleId: 'c1', hiddenAtMs: 100 },
  { mistakeId: 'm2', cycleId: 'c2', hiddenAtMs: 100 },
];

const input = (over: Partial<Parameters<typeof clearAllMistakesWithUndo>[0]> = {}) => ({
  studyTarget: 'en' as const,
  lang: 'ru' as const,
  visibleMistakeIds: ['m1', 'm2'],
  onOptimistic: jest.fn(),
  onRevertOptimistic: jest.fn(),
  ...over,
});

const toastsOf = (type: string) => emitAppEvent.mock.calls.filter(([name, payload]) => name === 'action_toast' && payload.type === type).map(([, payload]) => payload);

beforeEach(() => {
  __resetClearAllFlowForTests();
  __resetLocallyHiddenMistakesForTests();
  hideAllMistakes.mockReset();
  restoreMistakes.mockReset();
  emitAppEvent.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('clearAllMistakesWithUndo', () => {
  test('экран пустеет и ошибки помечены скрытыми ДО ответа журнала', async () => {
    let release: (value: unknown) => void = () => undefined;
    hideAllMistakes.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const args = input();
    const running = clearAllMistakesWithUndo(args);
    await Promise.resolve();
    await Promise.resolve();

    expect(args.onOptimistic).toHaveBeenCalledTimes(1);
    expect(withoutLocallyHiddenMistakes(rows)).toEqual([]);
    expect(hideAllMistakes).toHaveBeenCalledTimes(1);

    release({ ok: true, mistakes: cleared, appendedCount: 2 });
    await expect(running).resolves.toBe('cleared');
  });

  test('успех: тост «Ошибки удалены» с «Вернуть», пометки в памяти сняты (новая такая же ошибка не прячется), подписчики оповещены', async () => {
    hideAllMistakes.mockResolvedValue({ ok: true, mistakes: cleared, appendedCount: 2 });
    const changed = jest.fn();
    const off = subscribeMistakeClearAllChanged(changed);
    await expect(clearAllMistakesWithUndo(input())).resolves.toBe('cleared');

    const [toast] = toastsOf('success');
    expect(toast.messageRu).toBe('Ошибки удалены');
    expect(toast.action.labelRu).toBe('Вернуть');
    expect(withoutLocallyHiddenMistakes(rows)).toEqual(rows);
    expect(changed).toHaveBeenCalledTimes(1);
    off();
  });

  test('сбой записи: пометки сняты, экран возвращён, тост об ошибке на русском', async () => {
    hideAllMistakes.mockResolvedValue({ ok: false, reason: 'write_failed' });
    const args = input();
    await expect(clearAllMistakesWithUndo(args)).resolves.toBe('failed');
    expect(args.onRevertOptimistic).toHaveBeenCalledTimes(1);
    expect(withoutLocallyHiddenMistakes(rows)).toEqual(rows);
    expect(toastsOf('error')[0].messageRu).toContain('Не удалось удалить');
    expect(toastsOf('success')).toHaveLength(0);
  });

  test('исключение при записи тоже откатывает и не оставляет замок', async () => {
    hideAllMistakes.mockRejectedValue(new Error('disk'));
    const args = input();
    await expect(clearAllMistakesWithUndo(args)).resolves.toBe('failed');
    expect(args.onRevertOptimistic).toHaveBeenCalledTimes(1);
    hideAllMistakes.mockResolvedValue({ ok: true, mistakes: cleared, appendedCount: 2 });
    await expect(clearAllMistakesWithUndo(input())).resolves.toBe('cleared');
  });

  test('журнал оказался пуст (nothing_to_clear): откат без тоста', async () => {
    hideAllMistakes.mockResolvedValue({ ok: false, reason: 'nothing_to_clear' });
    const args = input();
    await expect(clearAllMistakesWithUndo(args)).resolves.toBe('nothing');
    expect(args.onRevertOptimistic).toHaveBeenCalledTimes(1);
    expect(emitAppEvent).not.toHaveBeenCalled();
  });

  test('двойное нажатие: второй вызов во время записи отбит, запись одна', async () => {
    let release: (value: unknown) => void = () => undefined;
    hideAllMistakes.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const first = clearAllMistakesWithUndo(input());
    await expect(clearAllMistakesWithUndo(input())).resolves.toBe('busy');
    release({ ok: true, mistakes: cleared, appendedCount: 2 });
    await first;
    expect(hideAllMistakes).toHaveBeenCalledTimes(1);
  });

  test('«Вернуть»: откат пишется один раз, экран возвращается сразу, подписчики оповещены; второе нажатие не пишет', async () => {
    hideAllMistakes.mockResolvedValue({ ok: true, mistakes: cleared, appendedCount: 2 });
    restoreMistakes.mockResolvedValue({ ok: true, appendedCount: 2 });
    const changed = jest.fn();
    subscribeMistakeClearAllChanged(changed);
    const args = input();
    await clearAllMistakesWithUndo(args);
    changed.mockClear();

    const undo = toastsOf('success')[0].action.onPress as () => void;
    undo();
    undo();
    expect(args.onRevertOptimistic).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setImmediate(resolve));

    expect(restoreMistakes).toHaveBeenCalledTimes(1);
    expect(restoreMistakes.mock.calls[0][0]).toMatchObject({ accountScope: 'account-a', studyTarget: 'en', mistakes: cleared });
    expect(changed).toHaveBeenCalledTimes(1);
  });

  test('«Вернуть» не записалось: тост об ошибке, подписчики перечитывают журнал (там ошибки всё ещё скрыты)', async () => {
    hideAllMistakes.mockResolvedValue({ ok: true, mistakes: cleared, appendedCount: 2 });
    restoreMistakes.mockResolvedValue({ ok: false, reason: 'write_failed' });
    const changed = jest.fn();
    subscribeMistakeClearAllChanged(changed);
    await clearAllMistakesWithUndo(input());
    changed.mockClear();

    (toastsOf('success')[0].action.onPress as () => void)();
    await new Promise((resolve) => setImmediate(resolve));

    expect(toastsOf('error').some((toast) => toast.messageRu.includes('вернуть'))).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
