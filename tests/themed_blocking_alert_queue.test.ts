import {
  __resetThemedBlockingAlertQueueForTests,
  enqueueThemedBlockingChoiceAlert,
  enqueueThemedBlockingInfoAlert,
  getThemedBlockingAlertHead,
  noteThemedBlockingAlertHostState,
  resolveThemedBlockingAlertHead,
  THEMED_ALERT_DISMISSED,
} from '../app/themed_blocking_alert_queue';

// зачем (Дизайн 05.10, макеты 014/038/039): очередь окон умеет несколько кнопок, прежние окна с «OK» не сломаны.
describe('themed blocking alert queue', () => {
  beforeEach(() => __resetThemedBlockingAlertQueueForTests());

  it('info alert keeps one OK button and resolves on it', async () => {
    const done = enqueueThemedBlockingInfoAlert('T', 'M', 'OK', { icon: 'lock-closed' });
    expect(getThemedBlockingAlertHead()?.actions).toEqual([{ label: 'OK', value: 'ok' }]);
    expect(getThemedBlockingAlertHead()?.icon).toBe('lock-closed');
    resolveThemedBlockingAlertHead('ok');
    await expect(done).resolves.toBeUndefined();
    expect(getThemedBlockingAlertHead()).toBeNull();
  });

  it('choice alert returns the pressed value; back returns dismiss; order is kept', async () => {
    const first = enqueueThemedBlockingChoiceAlert('A', '', [
      { label: 'Закрыть', value: 'close', ghost: true },
      { label: 'Повторить', value: 'retry' },
    ]);
    const second = enqueueThemedBlockingChoiceAlert('B', '', [{ label: 'Продолжить', value: 'continue' }], { icon: 'bookmark' });
    expect(getThemedBlockingAlertHead()?.title).toBe('A');
    resolveThemedBlockingAlertHead('retry');
    await expect(first).resolves.toBe('retry');
    expect(getThemedBlockingAlertHead()?.title).toBe('B');
    resolveThemedBlockingAlertHead();
    await expect(second).resolves.toBe(THEMED_ALERT_DISMISSED);
  });

  it('choice without buttons is not shown', async () => {
    await expect(enqueueThemedBlockingChoiceAlert('X', '', [])).resolves.toBe(THEMED_ALERT_DISMISSED);
    expect(getThemedBlockingAlertHead()).toBeNull();
  });
});

// зачем (ревью Ядра 2dba22af6, координатор 13.10): окно, ждущее слот арбитра, не висит молча — лог владельца слота и потолок.
describe('themed blocking alert queue — slotWait', () => {
  const slotWait = { logPrefix: '[ACCOUNT-RESTORE]', warnAfterMs: 2_000, forceAfterMs: 8_000 };
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    __resetThemedBlockingAlertQueueForTests();
    // релиз вырезает console.log — строки ожидания слота обязаны идти через warn
    logSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    __resetThemedBlockingAlertQueueForTests();
    logSpy.mockRestore();
    jest.useRealTimers();
  });
  const lines = () => logSpy.mock.calls.map((c) => String(c[0]));

  it('slot held: logs the holder after 2 s and forces the window visible at 8 s; the answer still resolves', async () => {
    const pending = enqueueThemedBlockingChoiceAlert('Restore?', '', [{ label: 'No', value: 'decline', ghost: true }, { label: 'Yes', value: 'restore' }], { slotWait });
    noteThemedBlockingAlertHostState({ visible: false, arbiterActive: 'appMessageModal', headTitle: 'Restore?' });
    jest.advanceTimersByTime(1_999);
    expect(lines().some((l) => l.includes('waiting_slot'))).toBe(false);
    jest.advanceTimersByTime(1);
    const waiting = lines().find((l) => l.startsWith('[ACCOUNT-RESTORE] waiting_slot'));
    expect(waiting).toContain('"holder":"appMessageModal"');
    expect(waiting).toContain('"queuePos":0');
    expect(getThemedBlockingAlertHead()?.forceVisible).toBeUndefined();
    jest.advanceTimersByTime(6_000);
    expect(lines().some((l) => l.startsWith('[ACCOUNT-RESTORE] slot_timeout_force_visible'))).toBe(true);
    expect(getThemedBlockingAlertHead()?.forceVisible).toBe(true);
    resolveThemedBlockingAlertHead('restore');
    await expect(pending).resolves.toBe('restore');
  });

  it('shown before the ceiling: no waiting log, no forcing', () => {
    void enqueueThemedBlockingChoiceAlert('Restore?', '', [{ label: 'Yes', value: 'restore' }], { slotWait });
    noteThemedBlockingAlertHostState({ visible: true, arbiterActive: 'themedAlert', headTitle: 'Restore?' });
    jest.advanceTimersByTime(10_000);
    expect(lines().some((l) => l.includes('waiting_slot') || l.includes('slot_timeout'))).toBe(false);
    expect(getThemedBlockingAlertHead()?.forceVisible).toBeUndefined();
  });

  it('closed before the ceiling: timers are cleared; without slotWait nothing changes', async () => {
    const pending = enqueueThemedBlockingChoiceAlert('Restore?', '', [{ label: 'Yes', value: 'restore' }], { slotWait });
    resolveThemedBlockingAlertHead();
    await expect(pending).resolves.toBe(THEMED_ALERT_DISMISSED);
    void enqueueThemedBlockingChoiceAlert('Other', '', [{ label: 'OK', value: 'ok' }]);
    jest.advanceTimersByTime(10_000);
    expect(lines().some((l) => l.includes('waiting_slot') || l.includes('slot_timeout'))).toBe(false);
    expect(getThemedBlockingAlertHead()?.forceVisible).toBeUndefined();
  });

  it('host shows a forced head without the arbiter slot and reports its state to the queue', () => {
    const host = require('fs').readFileSync(require('path').join(__dirname, '..', 'components', 'ThemedBlockingAlertHost.tsx'), 'utf8') as string;
    expect(host).toContain("const visible = arbiterVisible || head?.forceVisible === true;");
    expect(host).toContain('noteThemedBlockingAlertHostState({ visible, arbiterActive: activeOverlay, headTitle });');
  });
});
