"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xp_levels_1 = require("./xp_levels");
describe('Cloud Functions XP levels', () => {
    it('matches the app standard level thresholds', () => {
        expect((0, xp_levels_1.totalXPForLevel)(2)).toBe(400);
        expect((0, xp_levels_1.totalXPForLevel)(50)).toBe(476669);
        expect((0, xp_levels_1.getLevelFromXP)((0, xp_levels_1.totalXPForLevel)(50))).toBe(50);
        expect((0, xp_levels_1.getLevelFromXP)((0, xp_levels_1.totalXPForLevel)(50) - 1)).toBe(49);
    });
    it('matches the app legendary level thresholds', () => {
        const expected = [
            [51, 626669],
            [52, 926669],
            [53, 1376669],
            [54, 1976669],
            [55, 2726669],
            [56, 3626669],
            [57, 4676669],
            [58, 5876669],
            [59, 7226669],
            [60, 8726669],
        ];
        expect(xp_levels_1.MAX_LEVEL).toBe(60);
        for (const [level, totalXP] of expected) {
            expect((0, xp_levels_1.totalXPForLevel)(level)).toBe(totalXP);
            expect((0, xp_levels_1.getLevelFromXP)(totalXP)).toBe(level);
            expect((0, xp_levels_1.getLevelFromXP)(totalXP - 1)).toBe(level - 1);
        }
    });
    it('caps lookup at level 60', () => {
        expect((0, xp_levels_1.getLevelFromXP)((0, xp_levels_1.totalXPForLevel)(60) + 999999999)).toBe(60);
    });
});
//# sourceMappingURL=xp_levels.test.js.map