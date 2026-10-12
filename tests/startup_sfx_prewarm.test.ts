import {
  SFX_PREWARM_AFTER_PAINT_DELAY_MS,
  SFX_PREWARM_HOME_PAINT_CEILING_MS,
  scheduleStartupSfxPrewarm,
} from '@/modules/audio/startup_sfx_prewarm';

/**
 * зачем (координатор 13.10, вариант «б»; замер Сверки 57ecd26e6): прогрев звуков стартует после кадра Главной + паузы под
 * премаунт вкладок + конца взаимодействий; отмена на любом этапе не запускает прогрев.
 */
describe('scheduleStartupSfxPrewarm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function setup(paint: Promise<'painted' | 'ceiling'>) {
    const calls: string[] = [];
    const ceilings: number[] = [];
    let interactionTask: (() => void) | null = null;
    const cancelInteraction = jest.fn();
    const cancel = scheduleStartupSfxPrewarm({
      whenHomePainted: (ms) => { ceilings.push(ms); return paint; },
      runAfterInteractions: (task) => { interactionTask = task; return { cancel: cancelInteraction }; },
      setTimer: (task, ms) => setTimeout(task, ms),
      clearTimer: (timer) => clearTimeout(timer),
      now: () => Date.now(),
      prewarm: (reason) => calls.push(reason),
    });
    return { calls, ceilings, cancel, cancelInteraction, runInteraction: () => interactionTask?.() };
  }

  it('кадр Главной → пауза → конец взаимодействий → прогрев с причиной', async () => {
    const t = setup(Promise.resolve('painted'));
    expect(t.ceilings).toEqual([SFX_PREWARM_HOME_PAINT_CEILING_MS]);
    await Promise.resolve();
    jest.advanceTimersByTime(SFX_PREWARM_AFTER_PAINT_DELAY_MS - 1);
    t.runInteraction();
    expect(t.calls).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(t.calls).toEqual([]);
    t.runInteraction();
    expect(t.calls).toEqual(['startup:painted']);
  });

  it('потолок кадра тоже запускает прогрев (задача не теряется)', async () => {
    const t = setup(Promise.resolve('ceiling'));
    await Promise.resolve();
    jest.advanceTimersByTime(SFX_PREWARM_AFTER_PAINT_DELAY_MS);
    t.runInteraction();
    expect(t.calls).toEqual(['startup:ceiling']);
  });

  it('отмена во время паузы — прогрева нет', async () => {
    const t = setup(Promise.resolve('painted'));
    await Promise.resolve();
    t.cancel();
    jest.advanceTimersByTime(SFX_PREWARM_AFTER_PAINT_DELAY_MS * 2);
    t.runInteraction();
    expect(t.calls).toEqual([]);
  });

  it('отмена в ожидании взаимодействий снимает задачу', async () => {
    const t = setup(Promise.resolve('painted'));
    await Promise.resolve();
    jest.advanceTimersByTime(SFX_PREWARM_AFTER_PAINT_DELAY_MS);
    t.cancel();
    expect(t.cancelInteraction).toHaveBeenCalled();
    t.runInteraction();
    expect(t.calls).toEqual([]);
  });
});
