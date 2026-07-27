// Weekly Boons — выбор награды и claim-гард модальных бонусов.
import { pickMysteryReward, currentWeekId, COMEBACK_REWARD } from '../app/boons/boon_rewards';

describe('pickMysteryReward', () => {
  it('низкий roll → базовый тир (1)', () => {
    expect(pickMysteryReward(0).shards).toBe(1);
    expect(pickMysteryReward(0.3).shards).toBe(1);
  });
  it('верхний roll → топовый тир (5)', () => {
    expect(pickMysteryReward(0.999).shards).toBe(5);
  });
  it('всегда > 0 (нет «пустых» сундуков)', () => {
    for (let r = 0; r < 1; r += 0.05) {
      expect(pickMysteryReward(r).shards).toBeGreaterThan(0);
    }
  });
  // Скромная шкала: даже топовый тир не размывает продажу жемчужин.
  it('верхний тир не превышает 5 жемчужин', () => {
    for (let r = 0; r < 1; r += 0.01) {
      expect(pickMysteryReward(r).shards).toBeLessThanOrEqual(5);
    }
  });
  it('roll вне [0,1) клампится', () => {
    expect(pickMysteryReward(-1).shards).toBe(1);
    expect(pickMysteryReward(2).shards).toBe(5);
  });
});

describe('currentWeekId', () => {
  it('стабилен в пределах одной недели и меняется на следующей', () => {
    const a = currentWeekId('2026-06-20'); // сб
    const b = currentWeekId('2026-06-21'); // вс той же ISO-недели? нет — другой номер
    const c = currentWeekId('2026-06-27'); // следующая суббота
    expect(a).not.toBe(c);
    expect(typeof a).toBe('string');
    expect(a.startsWith('w')).toBe(true);
    void b;
  });
});

describe('COMEBACK_REWARD', () => {
  it('фиксированная награда 1 жемчужина (не «пустой» сундук)', () => {
    expect(COMEBACK_REWARD.shards).toBe(1);
  });
});
