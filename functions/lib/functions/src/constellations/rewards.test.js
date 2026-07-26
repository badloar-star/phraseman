"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const rewards_1 = require("./rewards");
const CFG = config_1.CONSTELLATION_DEFAULTS;
function baseInput(over) {
    return {
        place: 1,
        isBot: false,
        golden: false,
        wager: 0,
        dustEarned: 0,
        starfallEarned: 0,
        matchesPlayedBefore: 10,
        perfectCaptures: 0,
        livingHumans: 2,
        dustToday: 0,
        starfallToday: 0,
        cfg: CFG,
        ...over,
    };
}
describe('constellations/rewards — расчёт наград за место', () => {
    test('XP по месту из конфига [60,40,25,15]', () => {
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 1 })).xp).toBe(60);
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 2 })).xp).toBe(40);
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 3 })).xp).toBe(25);
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 4 })).xp).toBe(15);
    });
    test('осколки за место [3,1,1,0] (обновлено этапом 1.6) + пыль + звездопад + wager-выигрыш', () => {
        const r = (0, rewards_1.computeMatchRewards)(baseInput({
            place: 1, dustEarned: 2, starfallEarned: 5, wager: 2,
        }));
        // место 1 = shardsByPlace[0] + пыль 2 + звездопад 5 + wager возврат×3 = 3+2+5+6
        expect(r.shards).toBe(3 + 2 + 5 + 6);
    });
    test('wager: 1 место ×3, 2 место возврат, 3-4 сгорает', () => {
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 1, wager: 2 })).shards).toBe(3 + 2 * 3);
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 2, wager: 2 })).shards).toBe(1 + 2); // возврат
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 3, wager: 2 })).shards).toBe(1 + 0); // сгорела
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 4, wager: 2 })).shards).toBe(0 + 0);
    });
    test('дельта звёзд по месту [1,0,0,-1]', () => {
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 1 })).starDelta).toBe(1);
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 2 })).starDelta).toBe(0);
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 4 })).starDelta).toBe(-1);
    });
    test('SR-дельта по месту [25,10,-5,-20]', () => {
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 1 })).srDelta).toBe(25);
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 4 })).srDelta).toBe(-20);
    });
});
describe('constellations/rewards — защита новичка', () => {
    test('первые 5 матчей: отрицательная дельта звёзд НЕ применяется (только вверх)', () => {
        // 4-е место, но новичок (сыграл 3 матча до) → минус не применяется
        expect((0, rewards_1.resolveStarDeltaWithNewbieGuard)(-1, 3, CFG)).toBe(0);
        expect((0, rewards_1.resolveStarDeltaWithNewbieGuard)(-1, 4, CFG)).toBe(0); // 5-й матч (индекс 4) ещё защищён
        // положительная дельта проходит всегда
        expect((0, rewards_1.resolveStarDeltaWithNewbieGuard)(1, 0, CFG)).toBe(1);
    });
    test('после 5 матчей минус применяется', () => {
        expect((0, rewards_1.resolveStarDeltaWithNewbieGuard)(-1, 5, CFG)).toBe(-1);
        expect((0, rewards_1.resolveStarDeltaWithNewbieGuard)(-1, 20, CFG)).toBe(-1);
    });
    test('SR-минус тоже гасится защитой новичка', () => {
        const r = (0, rewards_1.computeMatchRewards)(baseInput({ place: 4, matchesPlayedBefore: 2 }));
        expect(r.starDelta).toBe(0);
        expect(r.srDelta).toBe(0);
        // XP всё равно начисляется
        expect(r.xp).toBe(15);
    });
});
describe('constellations/rewards — античит-фарм и боты', () => {
    test('боту награды не начисляются (все нули)', () => {
        const r = (0, rewards_1.computeMatchRewards)(baseInput({ isBot: true, place: 1, dustEarned: 2 }));
        expect(r).toEqual({
            xp: 0, shards: 0, starDelta: 0, srDelta: 0, collectibleEligible: false,
            dustGranted: 0, starfallGranted: 0,
        });
    });
    test('< 2 живых людей: пыль и звездопад режутся вдвое (анти-бот-фарм 1.6)', () => {
        const r = (0, rewards_1.computeMatchRewards)(baseInput({
            place: 1, dustEarned: 2, starfallEarned: 4, livingHumans: 1,
        }));
        // пыль 2→1, звездопад 4→2, + место 3
        expect(r.shards).toBe(3 + 1 + 2);
    });
    test('дневной кап пыли/звездопада обрезает начисление (аудит: dailyCap теперь работает)', () => {
        // polarDust.dailyCap=4, starfall.dailyCap=20. Сегодня уже 3 пыли и 19 звездопада.
        const r = (0, rewards_1.computeMatchRewards)(baseInput({
            place: 1, dustEarned: 5, starfallEarned: 5, dustToday: 3, starfallToday: 19,
        }));
        // пыли осталось 4-3=1 (из 5), звездопада 20-19=1 (из 5).
        expect(r.dustGranted).toBe(1);
        expect(r.starfallGranted).toBe(1);
        expect(r.shards).toBe(3 + 1 + 1); // место 1 + обрезанные пыль/звездопад
    });
    test('дневной кап исчерпан → пыль/звездопад не начисляются', () => {
        const r = (0, rewards_1.computeMatchRewards)(baseInput({
            place: 2, dustEarned: 3, starfallEarned: 3, dustToday: 4, starfallToday: 20,
        }));
        expect(r.dustGranted).toBe(0);
        expect(r.starfallGranted).toBe(0);
        expect(r.shards).toBe(1); // только осколки за место 2
    });
    test('коллекционный дроп положен только не-ботам не-туториалу', () => {
        expect((0, rewards_1.computeMatchRewards)(baseInput({ place: 3 })).collectibleEligible).toBe(true);
        expect((0, rewards_1.computeMatchRewards)(baseInput({ isBot: true })).collectibleEligible).toBe(false);
    });
});
//# sourceMappingURL=rewards.test.js.map