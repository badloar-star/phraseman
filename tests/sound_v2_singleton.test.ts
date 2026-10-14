// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
// Публичный API модуля (playEvent / advanceStreak / resetStreak) при выключенном флаге sound_v2:
// ничего не играет, нативный слой (sound_v2_runtime → expo-audio) даже не подгружается.
const runtimeLoaded = jest.fn();
jest.mock('../modules/sound_v2/sound_v2_runtime', () => {
  runtimeLoaded();
  throw new Error('sound_v2_runtime не должен загружаться при выключенном флаге');
});

import {
  advanceStreak,
  disposeSoundV2,
  getStreakStep,
  playEvent,
  prewarmSoundV2,
  resetStreak,
} from '../modules/sound_v2/sound_bank';
import { isSoundV2Enabled, setSoundV2FlagForTests } from '../modules/sound_v2/sound_v2_flag';

describe('sound_v2: публичный API при выключенном флаге', () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  afterEach(() => {
    resetStreak();
    disposeSoundV2();
    setSoundV2FlagForTests(null);
    log.mockClear();
  });

  it('по умолчанию (кэш конфигурации не прочитан) флаг выключен', () => {
    setSoundV2FlagForTests(null);
    expect(isSoundV2Enabled()).toBe(false);
  });

  it('playEvent возвращает flag_off, не бросает и не грузит нативный слой', () => {
    setSoundV2FlagForTests(false);
    for (const id of ['tap', 'correct', 'coin_rank'] as const) {
      expect(playEvent(id)).toEqual({ event: id, played: false, reason: 'flag_off' });
    }
    prewarmSoundV2(['tap', 'correct']);
    expect(runtimeLoaded).not.toHaveBeenCalled();
    expect(log.mock.calls.some((c) => String(c[0]).includes('[SOUND-V2] skip event=tap reason=flag_off'))).toBe(true);
  });

  it('серии работают и при выключенном флаге (чтобы включение посреди сессии не сбило шаг); ошибка рвёт серию', () => {
    setSoundV2FlagForTests(false);
    expect(advanceStreak('correct')).toBe(1);
    expect(advanceStreak('correct')).toBe(2);
    expect(getStreakStep('correct')).toBe(2);
    playEvent('wrong');
    expect(getStreakStep('correct')).toBe(0);
    advanceStreak('coin');
    resetStreak('coin');
    expect(getStreakStep('coin')).toBe(0);
    expect(runtimeLoaded).not.toHaveBeenCalled();
  });
});
