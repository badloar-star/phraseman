import {
  ENERGY_ACTIVE_CAPACITY_LIMIT,
  ENERGY_BASE_CAPACITY,
  ENERGY_BONUS_CAPACITY_LIMIT,
  ENERGY_MICRO_UNITS_PER_UNIT,
  ENERGY_PASSIVE_UNIT_MS,
  ENERGY_PERMANENT_CAPACITY_LIMIT,
  ENERGY_VIDEO_UNIT_MS,
  activityEnergyCost,
  permanentEnergyCapacity,
  profileCardEnergyCapacity,
  type EnergyActivityKey,
} from '../app/energy_contract';

describe('numeric energy contract', () => {
  // PM-081 (BIBLE «Энергия: 5, −1 за начавшееся учебное занятие, +1 за 10
  // минут, Plus не расходует»; D06/D07): запас 5, без прибавок сверху.
  // Прежние 100/260/460 — отменённое правило.
  it('uses a capacity of exactly 5 and no permanent expansion', () => {
    expect(ENERGY_BASE_CAPACITY).toBe(5);
    expect(ENERGY_PERMANENT_CAPACITY_LIMIT).toBe(5);
    // Бонусный пул подарков — зона PM-088, здесь только фиксируем текущее.
    expect(ENERGY_BONUS_CAPACITY_LIMIT).toBe(200);
    expect(ENERGY_ACTIVE_CAPACITY_LIMIT).toBe(205);
    expect(ENERGY_VIDEO_UNIT_MS).toBe(36_000);
    expect(ENERGY_MICRO_UNITS_PER_UNIT).toBe(1_000_000);
    expect(ENERGY_PASSIVE_UNIT_MS).toBeGreaterThan(0);
  });

  // PM-081 (D07): «никаких бонусов cap/rate от визиток/лиги/видео».
  describe('no league or profile-card capacity bonus', () => {
    it('ignores the league', () => {
      expect(permanentEnergyCapacity({ leagueId: 0 })).toBe(5);
      expect(permanentEnergyCapacity({ leagueId: 1 })).toBe(5);
      expect(permanentEnergyCapacity({ leagueId: 11 })).toBe(5);
      expect(permanentEnergyCapacity({ leagueId: 999 })).toBe(5);
    });

    it('ignores the profile card, the remote base and garbage input', () => {
      expect(permanentEnergyCapacity({ profileCardLevel: 5, leagueId: 11 })).toBe(5);
      expect(permanentEnergyCapacity({ base: 100 })).toBe(5);
      expect(permanentEnergyCapacity({})).toBe(5);
      expect(permanentEnergyCapacity({ leagueId: 'gold' })).toBe(5);
      expect(profileCardEnergyCapacity(0)).toBe(5);
      expect(profileCardEnergyCapacity(5)).toBe(5);
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
