/**
 * Verifies the useAudio guard logic that prevents the "ultra-fast jittered TTS"
 * Android bug. We test the hook's underlying contract via a mocked expo-speech.
 *
 * `speak()` теперь откладывает Speech.speak на STOP_SETTLE_MS (=80ms),
 * чтобы дать Android-движку время обработать предыдущий Speech.stop().
 * Поэтому тесты используют jest fake timers + advanceTimersByTime.
 */

const speakMock = jest.fn();
const stopMock = jest.fn();

jest.mock('expo-speech', () => ({
  __esModule: true,
  speak: (...args: unknown[]) => speakMock(...args),
  stop: () => stopMock(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// Minimal React shim so we can drive the hook outside a renderer.
let lastSetState: any = null;
let lastEffect: (() => void) | undefined;
const refStore: any[] = [];
let refIdx = 0;

jest.mock('react', () => ({
  __esModule: true,
  useRef: (initial: any) => {
    const i = refIdx++;
    if (refStore[i] === undefined) refStore[i] = { current: initial };
    return refStore[i];
  },
  useCallback: (fn: any) => fn,
  useEffect: (fn: () => void) => { lastEffect = fn; },
  useState: (init: any) => {
    let v = init;
    lastSetState = (n: any) => { v = n; };
    return [v, lastSetState];
  },
}));

const { useAudio } = require('../hooks/use-audio');

const SETTLE_MS = 100; // > STOP_SETTLE_MS (=80) внутри хука

const resetHookState = () => {
  refStore.length = 0;
  refIdx = 0;
  speakMock.mockReset();
  stopMock.mockReset();
};

describe('useAudio guard', () => {
  beforeEach(() => {
    resetHookState();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('drops same-text re-tap inside the 220ms window', () => {
    refIdx = 0;
    const { speak } = useAudio();
    speak('hello world', 0.9);
    speak('hello world', 0.9); // dedupe
    jest.advanceTimersByTime(SETTLE_MS);
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it('always calls Speech.stop before speaking to prevent overlap', () => {
    refIdx = 0;
    const { speak } = useAudio();
    speak('hello', 0.9);
    speak('different', 0.9);
    // Каждый speak() сразу шлёт Speech.stop() в нативный движок.
    expect(stopMock).toHaveBeenCalledTimes(2);
    // Второй вызов отменяет pending speak от первого, играет только последний —
    // именно так лечится «через раз / эффект перемотки».
    jest.advanceTimersByTime(SETTLE_MS);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0][0]).toBe('different');
  });

  it('delays Speech.speak until the stop-settle gap has elapsed', () => {
    refIdx = 0;
    const { speak } = useAudio();
    speak('settle test', 0.9);
    // Сразу после speak() — stop() ушёл, но Speech.speak ещё НЕ должен был быть вызван.
    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(0);
    // 50ms — внутри settle-окна, всё ещё ждём.
    jest.advanceTimersByTime(50);
    expect(speakMock).toHaveBeenCalledTimes(0);
    // После прохождения полного settle gap — Speech.speak отправлен.
    jest.advanceTimersByTime(SETTLE_MS);
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it('clamps an out-of-range rate before calling expo-speech', () => {
    refIdx = 0;
    const { speak } = useAudio();
    speak('hi', 9.9);
    jest.advanceTimersByTime(SETTLE_MS);
    const call = speakMock.mock.calls[0];
    expect(call[0]).toBe('hi');
    expect(call[1].rate).toBeLessThanOrEqual(1.0);
    expect(call[1].rate).toBeGreaterThanOrEqual(0.5);
  });

  it('explicit stop() cancels a pending speak and clears dedupe for replay', () => {
    refIdx = 0;
    const { speak, stop } = useAudio();
    speak('replay me', 0.9);
    stop();                       // отменяет pending timer + Speech.stop
    speak('replay me', 0.9);      // dedupe сброшен — должен запуститься
    jest.advanceTimersByTime(SETTLE_MS);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0][0]).toBe('replay me');
  });

  it('passes through optional pitch and lifecycle callbacks', () => {
    refIdx = 0;
    const onDone = jest.fn();
    const { speak } = useAudio();
    speak('callback test', 0.9, { pitch: 1.2, onDone });
    jest.advanceTimersByTime(SETTLE_MS);
    const call = speakMock.mock.calls[0];
    expect(call[1].pitch).toBe(1.2);
    expect(call[1].onDone).toBe(onDone);
  });

  it('omits pitch field entirely when caller did not provide it', () => {
    refIdx = 0;
    const { speak } = useAudio();
    speak('no pitch', 0.9);
    jest.advanceTimersByTime(SETTLE_MS);
    const call = speakMock.mock.calls[0];
    // Must NOT pass `pitch: undefined` — некоторые Android TTS-движки трактуют
    // undefined как 0 и дают chipmunk/«ускоренный» эффект.
    expect(Object.prototype.hasOwnProperty.call(call[1], 'pitch')).toBe(false);
  });

  it('falls back to user settings snapshot when no rate is supplied', () => {
    jest.isolateModules(() => {
      const { applyUserSettingsNow, DEFAULT_SETTINGS } = require('../app/user_settings_store');
      applyUserSettingsNow({ ...DEFAULT_SETTINGS, speechRate: 0.6 });
      const { useAudio: useAudioFresh } = require('../hooks/use-audio');
      refStore.length = 0;
      refIdx = 0;
      speakMock.mockReset();
      const { speak } = useAudioFresh();
      speak('use my preferred rate');
      jest.advanceTimersByTime(SETTLE_MS);
      const call = speakMock.mock.calls[0];
      expect(call[1].rate).toBe(0.6);
      // Восстанавливаем дефолт, чтобы не протекало в другие кейсы.
      applyUserSettingsNow({ ...DEFAULT_SETTINGS });
    });
  });
});
