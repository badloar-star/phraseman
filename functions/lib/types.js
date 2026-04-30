"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANK_TO_QUESTION_LEVEL = exports.RANK_LEVELS = exports.RANK_TIERS = void 0;
exports.rankToIndex = rankToIndex;
exports.RANK_TIERS = [
    'bronze', 'silver', 'gold', 'platinum',
    'diamond', 'master', 'grandmaster', 'legend',
];
exports.RANK_LEVELS = ['I', 'II', 'III'];
/** 0 = Bronze I … 23 = Legend III — как на клиенте (arena rankToIndex) */
function rankToIndex(tier, level) {
    const ti = exports.RANK_TIERS.indexOf(tier);
    const li = exports.RANK_LEVELS.indexOf(level);
    return (ti >= 0 ? ti : 0) * 3 + (li >= 0 ? li : 0);
}
exports.RANK_TO_QUESTION_LEVEL = {
    bronze: 'A1',
    silver: 'A2',
    gold: 'A2',
    platinum: 'A2',
    diamond: 'B1',
    master: 'B1',
    grandmaster: 'B2',
    legend: 'C1',
};
//# sourceMappingURL=types.js.map