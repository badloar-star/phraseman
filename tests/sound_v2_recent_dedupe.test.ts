// зачем (координатор 14.10): отклик игры звучит СРАЗУ (без паузы); момент Пика при показе играет своё событие, только если такое же не звучало последние ~400 мс. Задержки ноль, двоения нет.
// Три случая: шаг без момента — звук сразу; шаг + момент — один звук; момент без шага — звук.
jest.mock('../modules/sound_v2/sound_bank', () => ({
  ...jest.requireActual('../modules/sound_v2/sound_bank'),
  playEvent: jest.fn(),
  prewarmSoundV2: jest.fn(),
}));

import { playEvent } from '../modules/sound_v2/sound_bank';
import { setSoundV2FlagForTests } from '../modules/sound_v2/sound_v2_flag';
import {
  RECENT_EVENT_WINDOW_MS, noteSoundEventPlayed, playUnlessRecentlyPlayed, resetRecentSoundEventsForTests, tryPlayV2Event, wasSoundEventPlayedWithin,
} from '../modules/sound_v2/legacy_bridge';

const playMock = playEvent as jest.Mock;

beforeEach(() => {
  playMock.mockReset();
  playMock.mockReturnValue({ event: 'x', played: true });
  resetRecentSoundEventsForTests();
  setSoundV2FlagForTests(true);
  jest.useFakeTimers();
  jest.setSystemTime(1_000_000);
});
afterEach(() => {
  jest.useRealTimers();
  setSoundV2FlagForTests(null);
});

describe('недавно сыгранное событие V2: отклик игры и момент не двоятся', () => {
  it('шаг без момента: звук играет СРАЗУ, без единой паузы', () => {
    expect(tryPlayV2Event('step', 'spire_step_finish')).toBe(true);
    expect(playMock).toHaveBeenCalledTimes(1); // синхронно, таймеры не двигали
    expect(playMock.mock.calls[0]![0]).toBe('step');
    expect(wasSoundEventPlayedWithin('step')).toBe(true);
  });

  it('шаг + момент: один звук — момент молчит и пишет причину', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    tryPlayV2Event('floor', 'spire_step_finish'); // отклик игры
    jest.advanceTimersByTime(150); // момент смонтировался чуть позже
    expect(playUnlessRecentlyPlayed('floor', 'SpireFloorMoment')).toBe(false);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(log.mock.calls.some((c) => String(c[0]).includes('дубль погашен'))).toBe(true);
    log.mockRestore();
  });

  it('момент без шага: звук играет', () => {
    expect(playUnlessRecentlyPlayed('floor', 'SpireFloorMoment')).toBe(true);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock.mock.calls[0]![0]).toBe('floor');
  });

  it('окно ограничено: прошло больше ~400 мс — момент играет (это уже другое событие)', () => {
    tryPlayV2Event('summit', 'spire_step_finish');
    jest.advanceTimersByTime(RECENT_EVENT_WINDOW_MS + 1);
    expect(wasSoundEventPlayedWithin('summit')).toBe(false);
    expect(playUnlessRecentlyPlayed('summit', 'момент')).toBe(true);
    expect(playMock).toHaveBeenCalledTimes(2);
  });

  it('другое событие не гасится; флаг выключен — мост ничего не играет и не отмечает', () => {
    tryPlayV2Event('step', 'spire_step_finish');
    expect(playUnlessRecentlyPlayed('tap', 'момент')).toBe(true); // tap — другое событие
    setSoundV2FlagForTests(false);
    playMock.mockClear();
    expect(playUnlessRecentlyPlayed('floor', 'момент')).toBe(false);
    expect(playMock).not.toHaveBeenCalled();
    expect(wasSoundEventPlayedWithin('floor')).toBe(false);
  });

  it('отметку можно поставить вручную (путь, который играет мимо моста)', () => {
    noteSoundEventPlayed('floor');
    expect(playUnlessRecentlyPlayed('floor', 'момент')).toBe(false);
  });
});
