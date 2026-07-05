import { CONSTELLATION_DEFAULTS, constellationConfigFromData } from './config';

describe('constellations/config — дефолты и парсер admin_runtime_config', () => {
  test('без данных возвращаются дефолты (и это копия, не ссылка)', () => {
    const cfg = constellationConfigFromData(undefined);
    expect(cfg).toEqual(CONSTELLATION_DEFAULTS);
    expect(cfg).not.toBe(CONSTELLATION_DEFAULTS);
    expect(cfg.scoring).not.toBe(CONSTELLATION_DEFAULTS.scoring);
  });

  test('мусор любого вида не роняет и не портит дефолты', () => {
    for (const garbage of [null, 42, 'x', [], { roundsTotal: 'ten' }, { scoring: 7 }]) {
      expect(constellationConfigFromData(garbage)).toEqual(CONSTELLATION_DEFAULTS);
    }
  });

  test('валидные числовые оверрайды применяются, включая вложенные', () => {
    const cfg = constellationConfigFromData({
      roundsTotal: 8,
      matchmaking: { botFillDelaySec: 20 },
      scoring: { starPoints: { polar: 80 } },
    });
    expect(cfg.roundsTotal).toBe(8);
    expect(cfg.matchmaking.botFillDelaySec).toBe(20);
    expect(cfg.scoring.starPoints.polar).toBe(80);
    // не тронутое — из дефолтов
    expect(cfg.scoring.starPoints.outer).toBe(CONSTELLATION_DEFAULTS.scoring.starPoints.outer);
    expect(cfg.choosePhaseSec).toBe(CONSTELLATION_DEFAULTS.choosePhaseSec);
  });

  test('невалидные значения игнорируются точечно: отрицательные, NaN, не числа', () => {
    const cfg = constellationConfigFromData({
      roundsTotal: -5,
      answerPhaseSec: Number.NaN,
      starfall: { chancePct: 'много', matchCap: 6 },
    });
    expect(cfg.roundsTotal).toBe(CONSTELLATION_DEFAULTS.roundsTotal);
    expect(cfg.answerPhaseSec).toBe(CONSTELLATION_DEFAULTS.answerPhaseSec);
    expect(cfg.starfall.chancePct).toBe(CONSTELLATION_DEFAULTS.starfall.chancePct);
    expect(cfg.starfall.matchCap).toBe(6);
  });

  test('булевы оверрайды применяются', () => {
    const cfg = constellationConfigFromData({ revengePush: { enabled: false } });
    expect(cfg.revengePush.enabled).toBe(false);
  });

  test('нулевые значения допустимы там, где это выключение (chancePct: 0)', () => {
    const cfg = constellationConfigFromData({ starfall: { chancePct: 0 } });
    expect(cfg.starfall.chancePct).toBe(0);
  });

  test('дефолты соответствуют решениям спека', () => {
    // Решения владельца, прошитые в спек: менять только через спек.
    expect(CONSTELLATION_DEFAULTS.roundsTotal).toBe(10);
    expect(CONSTELLATION_DEFAULTS.choosePhaseSec).toBe(12);
    expect(CONSTELLATION_DEFAULTS.answerPhaseSec).toBe(38);
    expect(CONSTELLATION_DEFAULTS.duel.targetScore).toBe(3);
    expect(CONSTELLATION_DEFAULTS.duel.questionSec).toBe(10);
    expect(CONSTELLATION_DEFAULTS.shieldPerMatch).toBe(1);
    expect(CONSTELLATION_DEFAULTS.radiance.max).toBe(2);
    expect(CONSTELLATION_DEFAULTS.polarDust.perRounds).toBe(3);
    expect(CONSTELLATION_DEFAULTS.polarDust.matchCap).toBe(2);
    expect(CONSTELLATION_DEFAULTS.polarDust.dailyCap).toBe(4);
    expect(CONSTELLATION_DEFAULTS.rebirth.correctToRespawn).toBe(2);
    expect(CONSTELLATION_DEFAULTS.rebirth.minRoundsLeftToFall).toBe(4);
    expect(CONSTELLATION_DEFAULTS.matchmaking.botFillDelaySec).toBe(30);
    expect(CONSTELLATION_DEFAULTS.bots.enabled).toBe(true);
    expect(CONSTELLATION_DEFAULTS.bots.maxPerMatch).toBe(3);
    expect(CONSTELLATION_DEFAULTS.starfall.chancePct).toBe(5);
    expect(CONSTELLATION_DEFAULTS.starfall.pityMatches).toBe(25);
    expect(CONSTELLATION_DEFAULTS.starfall.matchCap).toBe(12);
    expect(CONSTELLATION_DEFAULTS.starfall.dailyCap).toBe(20);
    expect(CONSTELLATION_DEFAULTS.earlyWin.mapSharePct).toBe(60); // 1.4
    expect(CONSTELLATION_DEFAULTS.newbieProtectionMatches).toBe(5);
    expect(CONSTELLATION_DEFAULTS.rewards.xpByPlace).toEqual([60, 40, 25, 15]);
    // Балансовый патч этапа 1 (менять только через мастер-план):
    expect(CONSTELLATION_DEFAULTS.rewards.shardsByPlace).toEqual([3, 1, 1, 0]); // 1.6
    expect(CONSTELLATION_DEFAULTS.attackQuestionsCap).toBe(5); // 1.5
    expect(CONSTELLATION_DEFAULTS.radiance.maxCenter).toBe(3); // 1.5
    expect(CONSTELLATION_DEFAULTS.radiance.captureWear).toBe(1); // 1.5
    expect(CONSTELLATION_DEFAULTS.scoring.polarHoldByStreak).toEqual([5, 5, 5, 3, 3, 2, 2, 2, 2, 2]); // 1.1
    expect(CONSTELLATION_DEFAULTS.scoring.constellationBonusPerRound).toBe(3); // 1.4
    expect(CONSTELLATION_DEFAULTS.rebirth.homeCores).toBe(2); // 1.3
    expect(CONSTELLATION_DEFAULTS.underdog.maxStarsForDiscount).toBe(3); // 1.4
  });
});
