"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const scoring_1 = require("./scoring");
const SCORING = config_1.CONSTELLATION_DEFAULTS.scoring;
describe('constellations/scoring — очки за звёзды', () => {
    test('очки по кольцам: внешнее 10, среднее 20, внутреннее 30, Полярная 50', () => {
        expect((0, scoring_1.starPointsFor)(['3,0'], SCORING.starPoints)).toBe(10); // внешнее
        expect((0, scoring_1.starPointsFor)(['2,0'], SCORING.starPoints)).toBe(20); // среднее
        expect((0, scoring_1.starPointsFor)(['1,0'], SCORING.starPoints)).toBe(30); // внутреннее
        expect((0, scoring_1.starPointsFor)(['0,0'], SCORING.starPoints)).toBe(50); // Полярная
        expect((0, scoring_1.starPointsFor)(['3,0', '0,0'], SCORING.starPoints)).toBe(60);
        expect((0, scoring_1.starPointsFor)([], SCORING.starPoints)).toBe(0);
    });
});
describe('constellations/scoring — бонус смежности (созвездия)', () => {
    const opts = {
        minSize: SCORING.constellationMinSize,
        perGroup: SCORING.constellationBonusPerRound,
    };
    test('меньше 3 соединённых звёзд — бонуса нет', () => {
        expect((0, scoring_1.roundConstellationBonus)([], opts)).toBe(0);
        expect((0, scoring_1.roundConstellationBonus)(['0,0'], opts)).toBe(0);
        expect((0, scoring_1.roundConstellationBonus)(['0,0', '1,0'], opts)).toBe(0);
    });
    test('созвездие из 3+ даёт бонус за ГРУППУ, не за звезду (perGroup=3, 1.4)', () => {
        expect((0, scoring_1.roundConstellationBonus)(['0,0', '1,0', '1,-1'], opts)).toBe(3);
        expect((0, scoring_1.roundConstellationBonus)(['0,0', '1,0', '1,-1', '0,1', '2,-1'], opts)).toBe(3);
    });
    test('два отдельных созвездия — бонус за каждое', () => {
        // группа у центра + группа на противоположном краю
        const groupA = ['0,0', '1,0', '1,-1'];
        const groupB = ['-3,0', '-3,1', '-2,0'];
        expect((0, scoring_1.roundConstellationBonus)([...groupA, ...groupB], opts)).toBe(6);
    });
    test('одинокие звезды рядом с группой не ломают счёт групп', () => {
        expect((0, scoring_1.roundConstellationBonus)(['0,0', '1,0', '1,-1', '3,0'], opts)).toBe(3);
    });
});
describe('constellations/scoring — финальный счёт и места', () => {
    test('финал = звёзды по кольцам + накопленные бонусы матча', () => {
        const rows = (0, scoring_1.computeFinalScores)([
            { uid: 'a', starKeys: ['0,0', '3,0'], bonusPoints: 15 }, // 50+10+15 = 75
            { uid: 'b', starKeys: [], bonusPoints: 0 },
        ], SCORING.starPoints);
        expect(rows.find((r) => r.uid === 'a')?.total).toBe(75);
        expect(rows.find((r) => r.uid === 'b')?.total).toBe(0);
    });
    test('места по очкам, тайбрейки: звёзды → идеальные захваты → среднее время → uid', () => {
        const base = { points: 100, starCount: 5, perfectCaptures: 2, avgAnswerMs: 5000 };
        const ranked = (0, scoring_1.rankPlayers)([
            { uid: 'byTime', ...base, avgAnswerMs: 3000 },
            { uid: 'byPoints', ...base, points: 120 },
            { uid: 'byStars', ...base, starCount: 7 },
            { uid: 'byPerfect', ...base, perfectCaptures: 4 },
        ]);
        expect(ranked.map((r) => r.uid)).toEqual(['byPoints', 'byStars', 'byPerfect', 'byTime']);
        expect(ranked.map((r) => r.place)).toEqual([1, 2, 3, 4]);
    });
    test('полное равенство разруливается детерминированно (по uid), не порядком вставки', () => {
        const base = { points: 10, starCount: 1, perfectCaptures: 0, avgAnswerMs: 4000 };
        const a = (0, scoring_1.rankPlayers)([{ uid: 'zz', ...base }, { uid: 'aa', ...base }]);
        const b = (0, scoring_1.rankPlayers)([{ uid: 'aa', ...base }, { uid: 'zz', ...base }]);
        expect(a.map((r) => r.uid)).toEqual(b.map((r) => r.uid));
    });
});
//# sourceMappingURL=scoring.test.js.map