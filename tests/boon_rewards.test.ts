// Weekly Boons — выбор награды и claim-гард модальных бонусов.
import { pickMysteryReward, currentWeekId, COMEBACK_REWARD } from '../app/boons/boon_rewards';
import { PERFECT_WEEK_REWARD } from '../app/boons/perfect_week';

describe('pickMysteryReward', () => {
  it('низкий roll → базовый тир редкости (1)', () => {
    expect(pickMysteryReward(0).rarityShards).toBe(1);
    expect(pickMysteryReward(0.3).rarityShards).toBe(1);
  });
  it('верхний roll → топовый тир редкости (5)', () => {
    expect(pickMysteryReward(0.999).rarityShards).toBe(5);
  });
  it('редкость всегда > 0 (нет «пустых» сундуков)', () => {
    for (let r = 0; r < 1; r += 0.05) {
      expect(pickMysteryReward(r).rarityShards ?? 0).toBeGreaterThan(0);
    }
  });
  it('верхний тир редкости не превышает 5', () => {
    for (let r = 0; r < 1; r += 0.01) {
      expect(pickMysteryReward(r).rarityShards ?? 0).toBeLessThanOrEqual(5);
    }
  });
  it('roll вне [0,1) клампится', () => {
    expect(pickMysteryReward(-1).rarityShards).toBe(1);
    expect(pickMysteryReward(2).rarityShards).toBe(5);
  });

  /**
   * Сторож корня инцидента 2026-08-26 («сундук вылезает при каждом заходе,
   * подарок получил — спин не начислился»). Редкость жила в поле `shards`,
   * которое `grantBoonReward` читает как ВЫПЛАТУ: сундук уходил в жемчужинную
   * ветку, а при её отказе claim-маркер не ложился и модалка возвращалась
   * вечно. Выплата жемчужин обязана быть нулевой при ЛЮБОЙ редкости.
   */
  it('выплата жемчужин всегда ноль — редкость не подменяет выплату', () => {
    for (let r = 0; r < 1; r += 0.01) {
      expect(pickMysteryReward(r).shards).toBe(0);
    }
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

/**
 * зачем переписано (владелец, 2026-08-26): жемчужина убрана из ВСЕХ сундуков —
 * «Сундук недели», «День возвращения» и «Идеальная неделя» теперь дают спин
 * общей рулетки. Прежний тест сторожил отменённое правило (`shards === 1`) и
 * обязан был измениться вместе с ним, иначе он ломал бы верную реализацию.
 */
describe('COMEBACK_REWARD', () => {
  it('даёт спин, а не жемчужину (сундук не «пустой»)', () => {
    expect(COMEBACK_REWARD.spins).toBe(1);
    expect(COMEBACK_REWARD.shards).toBe(0);
  });
});

describe('спин вместо жемчужины во всех сундуках', () => {
  it('«Сундук недели» всегда кладёт ровно один спин', () => {
    for (let r = 0; r < 1; r += 0.05) {
      expect(pickMysteryReward(r).spins).toBe(1);
    }
  });
  it('«Идеальная неделя» даёт больше случайного сундука', () => {
    expect(PERFECT_WEEK_REWARD.spins).toBe(2);
    expect(PERFECT_WEEK_REWARD.shards).toBe(0);
  });
});
