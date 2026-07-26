"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
describe('constellations/config — дефолты и парсер admin_runtime_config', () => {
    test('без данных возвращаются дефолты (и это копия, не ссылка)', () => {
        const cfg = (0, config_1.constellationConfigFromData)(undefined);
        expect(cfg).toEqual(config_1.CONSTELLATION_DEFAULTS);
        expect(cfg).not.toBe(config_1.CONSTELLATION_DEFAULTS);
        expect(cfg.scoring).not.toBe(config_1.CONSTELLATION_DEFAULTS.scoring);
    });
    test('мусор любого вида не роняет и не портит дефолты', () => {
        for (const garbage of [null, 42, 'x', [], { roundsTotal: 'ten' }, { scoring: 7 }]) {
            expect((0, config_1.constellationConfigFromData)(garbage)).toEqual(config_1.CONSTELLATION_DEFAULTS);
        }
    });
    test('валидные числовые оверрайды применяются, включая вложенные', () => {
        const cfg = (0, config_1.constellationConfigFromData)({
            roundsTotal: 8,
            matchmaking: { botFillDelaySec: 20 },
            scoring: { starPoints: { polar: 80 } },
        });
        expect(cfg.roundsTotal).toBe(8);
        expect(cfg.matchmaking.botFillDelaySec).toBe(20);
        expect(cfg.scoring.starPoints.polar).toBe(80);
        // не тронутое — из дефолтов
        expect(cfg.scoring.starPoints.outer).toBe(config_1.CONSTELLATION_DEFAULTS.scoring.starPoints.outer);
        expect(cfg.choosePhaseSec).toBe(config_1.CONSTELLATION_DEFAULTS.choosePhaseSec);
    });
    test('невалидные значения игнорируются точечно: отрицательные, NaN, не числа', () => {
        const cfg = (0, config_1.constellationConfigFromData)({
            roundsTotal: -5,
            answerPhaseSec: Number.NaN,
            starfall: { chancePct: 'много', matchCap: 6 },
        });
        expect(cfg.roundsTotal).toBe(config_1.CONSTELLATION_DEFAULTS.roundsTotal);
        expect(cfg.answerPhaseSec).toBe(config_1.CONSTELLATION_DEFAULTS.answerPhaseSec);
        expect(cfg.starfall.chancePct).toBe(config_1.CONSTELLATION_DEFAULTS.starfall.chancePct);
        expect(cfg.starfall.matchCap).toBe(6);
    });
    test('булевы оверрайды применяются', () => {
        const cfg = (0, config_1.constellationConfigFromData)({ revengePush: { enabled: false } });
        expect(cfg.revengePush.enabled).toBe(false);
    });
    test('нулевые значения допустимы там, где это выключение (chancePct: 0)', () => {
        const cfg = (0, config_1.constellationConfigFromData)({ starfall: { chancePct: 0 } });
        expect(cfg.starfall.chancePct).toBe(0);
    });
    test('дефолты соответствуют решениям спека', () => {
        // Решения владельца, прошитые в спек: менять только через спек.
        expect(config_1.CONSTELLATION_DEFAULTS.roundsTotal).toBe(10);
        expect(config_1.CONSTELLATION_DEFAULTS.choosePhaseSec).toBe(12);
        expect(config_1.CONSTELLATION_DEFAULTS.answerPhaseSec).toBe(38);
        expect(config_1.CONSTELLATION_DEFAULTS.duel.targetScore).toBe(3);
        expect(config_1.CONSTELLATION_DEFAULTS.duel.questionSec).toBe(10);
        expect(config_1.CONSTELLATION_DEFAULTS.shieldPerMatch).toBe(1);
        expect(config_1.CONSTELLATION_DEFAULTS.radiance.max).toBe(2);
        expect(config_1.CONSTELLATION_DEFAULTS.polarDust.perRounds).toBe(3);
        expect(config_1.CONSTELLATION_DEFAULTS.polarDust.matchCap).toBe(2);
        expect(config_1.CONSTELLATION_DEFAULTS.polarDust.dailyCap).toBe(4);
        expect(config_1.CONSTELLATION_DEFAULTS.rebirth.correctToRespawn).toBe(2);
        expect(config_1.CONSTELLATION_DEFAULTS.rebirth.minRoundsLeftToFall).toBe(3); // аудит: шанс на возрождение под конец
        expect(config_1.CONSTELLATION_DEFAULTS.matchmaking.botFillDelaySec).toBe(8);
        expect(config_1.CONSTELLATION_DEFAULTS.bots.enabled).toBe(true);
        expect(config_1.CONSTELLATION_DEFAULTS.bots.maxPerMatch).toBe(3);
        expect(config_1.CONSTELLATION_DEFAULTS.starfall.chancePct).toBe(5);
        expect(config_1.CONSTELLATION_DEFAULTS.starfall.pityMatches).toBe(25);
        expect(config_1.CONSTELLATION_DEFAULTS.starfall.matchCap).toBe(12);
        expect(config_1.CONSTELLATION_DEFAULTS.starfall.dailyCap).toBe(20);
        expect(config_1.CONSTELLATION_DEFAULTS.earlyWin.mapSharePct).toBe(60); // 1.4
        expect(config_1.CONSTELLATION_DEFAULTS.newbieProtectionMatches).toBe(5);
        expect(config_1.CONSTELLATION_DEFAULTS.rewards.xpByPlace).toEqual([60, 40, 25, 15]);
        // Балансовый патч этапа 1 (менять только через мастер-план):
        expect(config_1.CONSTELLATION_DEFAULTS.rewards.shardsByPlace).toEqual([3, 1, 1, 0]); // 1.6
        expect(config_1.CONSTELLATION_DEFAULTS.attackQuestionsCap).toBe(5); // 1.5
        expect(config_1.CONSTELLATION_DEFAULTS.radiance.maxCenter).toBe(3); // 1.5
        expect(config_1.CONSTELLATION_DEFAULTS.radiance.captureWear).toBe(1); // 1.5
        expect(config_1.CONSTELLATION_DEFAULTS.scoring.polarHoldByStreak).toEqual([5, 5, 5, 3, 3, 2, 2, 2, 2, 2]); // 1.1
        expect(config_1.CONSTELLATION_DEFAULTS.scoring.constellationBonusPerRound).toBe(3); // 1.4
        expect(config_1.CONSTELLATION_DEFAULTS.rebirth.homeCores).toBe(2); // 1.3
        expect(config_1.CONSTELLATION_DEFAULTS.underdog.maxStarsForDiscount).toBe(3); // 1.4
    });
});
//# sourceMappingURL=config.test.js.map