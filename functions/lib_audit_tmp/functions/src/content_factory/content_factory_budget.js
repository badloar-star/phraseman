"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTENT_FACTORY_BUDGET_RESERVATIONS = exports.CONTENT_FACTORY_BUDGET_COLLECTION = void 0;
exports.contentFactoryBudgetDocId = contentFactoryBudgetDocId;
exports.reserveContentFactoryBudget = reserveContentFactoryBudget;
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
exports.CONTENT_FACTORY_BUDGET_COLLECTION = 'content_factory_daily_budget';
exports.CONTENT_FACTORY_BUDGET_RESERVATIONS = 'content_factory_budget_reservations';
function utcDateKey(nowMs) {
    return new Date(nowMs).toISOString().slice(0, 10);
}
function contentFactoryBudgetDocId(unitId, nowMs) {
    const day = utcDateKey(nowMs);
    const hash = (0, node_crypto_1.createHash)('sha256').update(unitId).digest('hex').slice(0, 48);
    return `${day}_${hash}`;
}
async function reserveContentFactoryBudget(db, unitId, cap, nowMs = Date.now()) {
    if (!/^[A-Za-z0-9._:-]{1,260}$/.test(unitId))
        throw new https_1.HttpsError('invalid-argument', 'content_factory_budget_unit_invalid');
    if (!Number.isFinite(cap) || cap <= 0)
        return Object.freeze({ reserved: false, replayed: false });
    const day = utcDateKey(nowMs);
    const counterRef = db.collection(exports.CONTENT_FACTORY_BUDGET_COLLECTION).doc(day);
    const reservationRef = db.collection(exports.CONTENT_FACTORY_BUDGET_RESERVATIONS).doc(contentFactoryBudgetDocId(unitId, nowMs));
    return db.runTransaction(async (tx) => {
        const reservationSnap = await tx.get(reservationRef);
        if (reservationSnap.exists)
            return Object.freeze({ reserved: true, replayed: true });
        const counterSnap = await tx.get(counterRef);
        const used = Number(counterSnap.data()?.generationCount ?? 0);
        if (!Number.isSafeInteger(used) || used < 0)
            throw new https_1.HttpsError('data-loss', 'content_factory_budget_counter_invalid');
        if (used >= Math.floor(cap))
            throw new https_1.HttpsError('resource-exhausted', 'content_factory_daily_budget_exceeded');
        tx.set(counterRef, { generationCount: used + 1, cap: Math.floor(cap), updatedAtMs: nowMs }, { merge: true });
        tx.create(reservationRef, { unitId, day, reservedAtMs: nowMs });
        return Object.freeze({ reserved: true, replayed: false });
    });
}
//# sourceMappingURL=content_factory_budget.js.map