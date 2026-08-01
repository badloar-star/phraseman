// Weekly Boons — защищённый парсинг конфига из «Пульта».
import { parseWeeklyBoonsConfig, DEFAULT_WEEKLY_BOONS_CONFIG } from '../app/boons/boon_config';

describe('parseWeeklyBoonsConfig — fallback to default', () => {
  it('empty string → встроенный дефолт', () => {
    expect(parseWeeklyBoonsConfig('')).toBe(DEFAULT_WEEKLY_BOONS_CONFIG);
  });

  it('whitespace → дефолт', () => {
    expect(parseWeeklyBoonsConfig('   ')).toBe(DEFAULT_WEEKLY_BOONS_CONFIG);
  });

  it('битый JSON → дефолт (не падает)', () => {
    expect(parseWeeklyBoonsConfig('{not json')).toBe(DEFAULT_WEEKLY_BOONS_CONFIG);
  });

  it('JSON-массив (не объект) → дефолт', () => {
    expect(parseWeeklyBoonsConfig('[1,2,3]')).toBe(DEFAULT_WEEKLY_BOONS_CONFIG);
  });

  it('JSON null → дефолт', () => {
    expect(parseWeeklyBoonsConfig('null')).toBe(DEFAULT_WEEKLY_BOONS_CONFIG);
  });
});

describe('parseWeeklyBoonsConfig — valid config', () => {
  it('читает расписание с одиночным бонусом и ротацией', () => {
    const raw = JSON.stringify({
      schedule: { '0': 'streak_saver', '6': ['speaking_saturday', 'turbo_regen'] },
      enabled: { double_xp: false },
      modifiersEnabled: { early_bird: false },
    });
    const c = parseWeeklyBoonsConfig(raw);
    expect(c.schedule[0]).toBe('streak_saver');
    expect(c.schedule[6]).toEqual(['speaking_saturday', 'turbo_regen']);
    expect(c.enabled.double_xp).toBe(false);
    expect(c.modifiersEnabled.early_bird).toBe(false);
  });

  it('тихо отбрасывает невалидные boon-id в расписании', () => {
    const raw = JSON.stringify({
      schedule: { '0': 'NOT_A_BOON', '1': ['mystery_monday', 'garbage'] },
    });
    const c = parseWeeklyBoonsConfig(raw);
    expect(c.schedule[0]).toBeUndefined(); // целиком невалидный слот выкинут
    expect(c.schedule[1]).toBe('mystery_monday'); // массив отфильтрован до одного → схлопнут
  });

  it('отбрасывает weekday вне диапазона 0..6', () => {
    const raw = JSON.stringify({ schedule: { '7': 'double_xp', '-1': 'turbo_regen' } });
    const c = parseWeeklyBoonsConfig(raw);
    expect(Object.keys(c.schedule)).toHaveLength(0);
  });

  it('отбрасывает не-boolean значения в enabled', () => {
    const raw = JSON.stringify({ enabled: { double_xp: 'yes', turbo_regen: true } });
    const c = parseWeeklyBoonsConfig(raw);
    expect(c.enabled.double_xp).toBeUndefined();
    expect(c.enabled.turbo_regen).toBe(true);
  });

  it('пустой массив-слот → слот отсутствует', () => {
    const raw = JSON.stringify({ schedule: { '0': [] } });
    const c = parseWeeklyBoonsConfig(raw);
    expect(c.schedule[0]).toBeUndefined();
  });
});
