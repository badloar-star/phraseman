"use strict";
// ════════════════════════════════════════════════════════════════════════════
// constellations/scoring.ts — чистый расчёт очков и мест (спек A7a/A8).
//
// БЕЗ firebase-admin: вся денежно-рейтинговая математика тестируется юнитами.
// Значения-ручки приходят параметрами из ConstellationConfig — модуль не
// знает про Firestore и дефолты.
// ════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.starPointsFor = starPointsFor;
exports.roundConstellationBonus = roundConstellationBonus;
exports.computeFinalScores = computeFinalScores;
exports.rankPlayers = rankPlayers;
const hex_1 = require("./hex");
/** Очки за владение звёздами на конец матча — по кольцам (A8). */
function starPointsFor(starKeys, starPoints) {
    let total = 0;
    for (const key of starKeys) {
        total += starPoints[(0, hex_1.ringOf)((0, hex_1.parseHexKey)(key))];
    }
    return total;
}
/**
 * Бонус смежности «собери созвездие» (A7a): каждое созвездие из minSize+
 * соединённых звёзд даёт perGroup очков за раунд — за ГРУППУ, не за звезду.
 */
function roundConstellationBonus(ownedKeys, opts) {
    const groups = (0, hex_1.connectedGroups)(ownedKeys);
    const qualifying = groups.filter((g) => g.length >= opts.minSize);
    return qualifying.length * opts.perGroup;
}
function computeFinalScores(rows, starPoints) {
    return rows.map((row) => ({
        uid: row.uid,
        total: starPointsFor(row.starKeys, starPoints) + row.bonusPoints,
    }));
}
/**
 * Места 1–4 (A8): очки → число звёзд → идеальные захваты → меньшее среднее
 * время ответа. Полное равенство разруливается uid — результат детерминирован
 * и не зависит от порядка вставки (важно для идемпотентной финализации).
 */
function rankPlayers(rows) {
    const sorted = [...rows].sort((a, b) => b.points - a.points
        || b.starCount - a.starCount
        || b.perfectCaptures - a.perfectCaptures
        || a.avgAnswerMs - b.avgAnswerMs
        || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
    return sorted.map((row, i) => ({ uid: row.uid, place: i + 1 }));
}
//# sourceMappingURL=scoring.js.map