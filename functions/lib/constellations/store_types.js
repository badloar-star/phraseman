"use strict";
// ════════════════════════════════════════════════════════════════════════════
// constellations/store_types.ts — контракты Firestore-документов (спек H1).
//
// Коллекции:
//   constellation_queue/{uid}            — очередь (аналог matchmaking_queue)
//   constellation_matches/{matchId}      — ПУБЛИЧНЫЙ матч (читают участники)
//   constellation_players/{matchId}_{uid}— приватный док игрока (вопросы БЕЗ
//                                          correct, ответы; пишется ТОЛЬКО callable)
//   constellation_server/{matchId}       — серверный док (correct-ответы, боты,
//                                          engine-состояние) — клиентам закрыт
//   constellation_results/{matchId}      — финал для истории/статистики
//   constellation_pity/{uid}             — pity Звездопада + дневные капы (серверный)
//
// Анти-чит (D6): правильный индекс НИКОГДА не попадает в match/player-доки —
// он живёт только в constellation_server, который правила не отдают никому.
// ════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSTELLATION_SCHEMA_VERSION = void 0;
exports.publicPlayersFromState = publicPlayersFromState;
exports.liveScoreBySlotFromState = liveScoreBySlotFromState;
exports.CONSTELLATION_SCHEMA_VERSION = 1;
function publicPlayersFromState(state, meta, extras) {
    return state.players.map((p) => {
        const m = meta[p.slot];
        const out = {
            uid: p.uid,
            slot: p.slot,
            name: m?.name ?? 'Игрок',
            avatar: m?.avatar ?? '1',
            avatarLevel: m?.avatarLevel ?? 1,
            status: p.status,
            cores: p.cores,
            fallingLight: p.fallingLight,
            shieldUsed: p.shieldUsed,
            bonusPoints: p.bonusPoints,
            liveScore: extras.liveScoreBySlot?.[p.slot] ?? p.bonusPoints,
            perfectCaptures: p.perfectCaptures,
            dustEarned: p.dustEarned,
            starfallEarned: extras.starfallBySlot[p.slot] ?? 0,
            roundDone: extras.roundDoneSlots.has(p.slot),
        };
        if (m?.aura)
            out.aura = m.aura;
        return out;
    });
}
/** Полный счёт по слотам: стоимость владеемых звёзд + bonusPoints (0.2/A8). */
function liveScoreBySlotFromState(state, starValueOf) {
    const bySlot = {};
    for (const p of state.players)
        bySlot[p.slot] = p.bonusPoints;
    for (const [key, star] of Object.entries(state.stars)) {
        if (star.owner === null)
            continue;
        bySlot[star.owner] = (bySlot[star.owner] ?? 0) + starValueOf(key);
    }
    return bySlot;
}
//# sourceMappingURL=store_types.js.map