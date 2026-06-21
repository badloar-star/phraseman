// Weekly Boons — энергетические эффекты: «окно без энергии» (чистая часовая логика).
import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import { utcWeekdayFromTodayKey } from '../app/boons/boon_engine';
import {
  isEnergyFreeWindowActive,
  ENERGY_FREE_WINDOW_START_HOUR,
  ENERGY_FREE_WINDOW_END_HOUR,
} from '../app/boons/boon_effects_energy';

// Сегодняшний UTC-день недели — чтобы тест не зависел от реальной даты прогона.
const todayWd = utcWeekdayFromTodayKey();

function setEnergyWindowToday(): void {
  applyRemoteConfigSnapshot({
    texts: {
      weekly_boons_config: JSON.stringify({
        schedule: { [todayWd]: 'energy_free_window' },
        enabled: {},
        modifiersEnabled: {},
      }),
    },
  });
}

function setNoBoonsToday(): void {
  applyRemoteConfigSnapshot({
    texts: { weekly_boons_config: JSON.stringify({ schedule: {}, enabled: {}, modifiersEnabled: {} }) },
  });
}

afterEach(() => {
  // сбрасываем override, чтобы не протекало в другие тесты
  applyRemoteConfigSnapshot({});
});

describe('isEnergyFreeWindowActive', () => {
  it('активно внутри вечернего окна, когда бонус назначен на сегодня', () => {
    setEnergyWindowToday();
    expect(isEnergyFreeWindowActive(ENERGY_FREE_WINDOW_START_HOUR)).toBe(true);
    expect(isEnergyFreeWindowActive(ENERGY_FREE_WINDOW_END_HOUR - 1)).toBe(true);
  });

  it('НЕ активно вне окна (раньше старта / на границе конца)', () => {
    setEnergyWindowToday();
    expect(isEnergyFreeWindowActive(ENERGY_FREE_WINDOW_START_HOUR - 1)).toBe(false);
    expect(isEnergyFreeWindowActive(ENERGY_FREE_WINDOW_END_HOUR)).toBe(false);
    expect(isEnergyFreeWindowActive(8)).toBe(false);
  });

  it('НЕ активно, если бонус energy_free_window не назначен на сегодня', () => {
    setNoBoonsToday();
    expect(isEnergyFreeWindowActive(ENERGY_FREE_WINDOW_START_HOUR)).toBe(false);
  });
});
