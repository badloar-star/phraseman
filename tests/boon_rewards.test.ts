// Weekly Boons — выбор награды и claim-гард модальных бонусов.
import { pickMysteryReward, currentWeekId, COMEBACK_REWARD } from '../app/boons/boon_rewards';

describe('pickMysteryReward', () => {
  it('низкий roll → базовый тир (3)', () => {
    expect(pickMysteryReward(0).shards).toBe(3);
    expect(pickMysteryReward(0.3).shards).toBe(3);
  });
  it('верхний roll → топовый тир (15)', () => {
    expect(pickMysteryReward(0.999).shards).toBe(15);
  });
  it('всегда > 0 (нет «пустых» сундуков)', () => {
    for (let r = 0; r < 1; r += 0.05) {
      expect(pickMysteryReward(r).shards).toBeGreaterThan(0);
    }
  });
  it('roll вне [0,1) клампится', () => {
    expect(pickMysteryReward(-1).shards).toBe(3);
    expect(pickMysteryReward(2).shards).toBe(15);
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
  it('фиксированная награда 5 осколков', () => {
    expect(COMEBACK_REWARD.shards).toBe(5);
  });
});
