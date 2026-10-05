import {
  __resetThemedBlockingAlertQueueForTests,
  enqueueThemedBlockingChoiceAlert,
  enqueueThemedBlockingInfoAlert,
  getThemedBlockingAlertHead,
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
