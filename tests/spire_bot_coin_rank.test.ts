// зачем (владелец 13.10, «аватары игроков = монеты рангов»): у ботов комнаты Шпиля ранга монеты нет в документе — формула.
// Детерминирована (тот же бот той же комнаты — та же монета), зависит от комнаты, в пределах 0…9, чаще низкие ранги.
import { SPIRE_BOT_COIN_RANK_MAX, spireBotCoinRank } from '../modules/spire/bot_coin_rank';

describe('spireBotCoinRank', () => {
  it('детерминирован и в пределах 0…9', () => {
    for (let slot = 0; slot < 30; slot += 1) {
      const r = spireBotCoinRank(`resident_${slot}`, 'room-A');
      expect(r).toBe(spireBotCoinRank(`resident_${slot}`, 'room-A'));
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(SPIRE_BOT_COIN_RANK_MAX);
    }
  });

  it('один и тот же слот в разных комнатах — не одна монета на всех', () => {
    const ranks = new Set(Array.from({ length: 40 }, (_, i) => spireBotCoinRank('resident_0', `room-${i}`)));
    expect(ranks.size).toBeGreaterThan(3);
  });

  it('чаще низкие ранги (как у живых игроков недели)', () => {
    const ranks = Array.from({ length: 400 }, (_, i) => spireBotCoinRank(`resident_${i % 29}`, `room-${i}`));
    const low = ranks.filter((r) => r <= 4).length;
    expect(low).toBeGreaterThan(ranks.length / 2);
  });
});
