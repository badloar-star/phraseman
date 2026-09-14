import {
  ENERGY_ACTIVE_CAPACITY_LIMIT,
  ENERGY_BASE_CAPACITY,
  ENERGY_BONUS_CAPACITY_LIMIT,
  ENERGY_MICRO_UNITS_PER_UNIT,
  ENERGY_PASSIVE_UNIT_MS,
  ENERGY_PERMANENT_CAPACITY_LIMIT,
  ENERGY_VIDEO_UNIT_MS,
  LEAGUE_ENERGY_MAX_LEVEL,
  LEAGUE_ENERGY_PER_LEVEL,
  activityEnergyCost,
  permanentEnergyCapacity,
  profileCardEnergyCapacity,
  type EnergyActivityKey,
} from '../app/energy_contract';

describe('numeric energy contract', () => {
  it('uses 100 base, 460 active cap, +1/6m passive and +1/36s video', () => {
    expect(ENERGY_BASE_CAPACITY).toBe(100);
    expect(ENERGY_BONUS_CAPACITY_LIMIT).toBe(200);
    expect(ENERGY_PERMANENT_CAPACITY_LIMIT).toBe(260);
    expect(ENERGY_ACTIVE_CAPACITY_LIMIT).toBe(460);
    expect(ENERGY_PASSIVE_UNIT_MS).toBe(360_000);
    expect(ENERGY_VIDEO_UNIT_MS).toBe(36_000);
    expect(ENERGY_MICRO_UNITS_PER_UNIT).toBe(1_000_000);
  });

  // зачем (владелец, 2026-09-14): «каждая новая лига даёт +10 к общему запасу
  // энергии». Считаем по ТЕКУЩЕЙ лиге, прибавка складывается с карточкой профиля.
  describe('league energy bonus', () => {
    it('adds 10 per league, starting league stays at base', () => {
      expect(LEAGUE_ENERGY_PER_LEVEL).toBe(10);
      expect(LEAGUE_ENERGY_MAX_LEVEL).toBe(11);
      expect(permanentEnergyCapacity({ leagueId: 0 })).toBe(100);
      expect(permanentEnergyCapacity({ leagueId: 1 })).toBe(110);
      expect(permanentEnergyCapacity({ leagueId: 11 })).toBe(210);
    });

    it('stacks with the profile-card bonus up to the permanent limit', () => {
      expect(permanentEnergyCapacity({ profileCardLevel: 5, leagueId: 11 })).toBe(260);
      expect(permanentEnergyCapacity({ profileCardLevel: 3, leagueId: 2 })).toBe(150);
    });

    it('reads an unknown or out-of-range league as no bonus, never as invented capacity', () => {
      expect(permanentEnergyCapacity({})).toBe(100);
      expect(permanentEnergyCapacity({ leagueId: null })).toBe(100);
      expect(permanentEnergyCapacity({ leagueId: 'gold' })).toBe(100);
      expect(permanentEnergyCapacity({ leagueId: -4 })).toBe(100);
      expect(permanentEnergyCapacity({ leagueId: 999 })).toBe(210);
    });

    it('keeps the legacy profile-card wrapper league-free', () => {
      expect(profileCardEnergyCapacity(0)).toBe(100);
      expect(profileCardEnergyCapacity(5)).toBe(150);
    });
  });

  it.each<[EnergyActivityKey, number]>([
    ['flashcards', 10],
    ['lesson_words', 10],
    ['irregular_verbs', 10],
    ['preposition_drill', 10],
    ['mistake_practice', 10],
    ['classic_lesson', 20],
    ['learning_v2_session', 20],
    ['ai_dialog', 20],
    ['personal_plan_exercise', 20],
    ['diagnostic_test', 20],
    ['level_exam', 20],
    ['arena_match', 25],
    ['theory', 0],
    ['reading', 0],
    ['video', 0],
    ['max_call', 0],
  ])('%s costs %i', (key, cost) => {
    expect(activityEnergyCost(key)).toBe(cost);
  });
});
