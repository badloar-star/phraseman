"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHADOW_JUDGE_RESERVATION_COLLECTION = exports.SHADOW_JUDGE_BUDGET_COLLECTION = exports.SHADOW_JUDGE_CONFIG_PATH = void 0;
exports.parseShadowJudgeConfig = parseShadowJudgeConfig;
exports.loadShadowJudgeConfig = loadShadowJudgeConfig;
exports.shadowJudgeReservationId = shadowJudgeReservationId;
exports.reserveShadowJudgeBudget = reserveShadowJudgeBudget;
exports.commitShadowJudgeReceipt = commitShadowJudgeReceipt;
const node_crypto_1 = require("node:crypto");
const review_fingerprint_1 = require("./review_fingerprint");
exports.SHADOW_JUDGE_CONFIG_PATH = 'content_factory_config/shadow_judge';
exports.SHADOW_JUDGE_BUDGET_COLLECTION = 'content_factory_shadow_judge_daily_budget';
exports.SHADOW_JUDGE_RESERVATION_COLLECTION = 'content_factory_shadow_judge_reservations';
const ALLOWED_MODELS = Object.freeze(['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini']);
function parseShadowJudgeConfig(value) {
    const data = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const requestedModel = String(data.model ?? '');
    const modelValid = !requestedModel || ALLOWED_MODELS.includes(requestedModel);
    const model = modelValid && requestedModel ? requestedModel : 'gpt-4.1-mini';
    const rawCap = Number(data.dailyCap ?? 0);
    const dailyCap = Number.isFinite(rawCap) ? Math.max(0, Math.min(1000, Math.floor(rawCap))) : 0;
    const configError = data.enabled === true && !modelValid ? 'shadow_judge_model_not_allowed' : null;
    return Object.freeze({ enabled: data.enabled === true && dailyCap > 0 && configError === null, model, dailyCap, configError });
}
async function loadShadowJudgeConfig(db) {
    try {
        return parseShadowJudgeConfig((await db.doc(exports.SHADOW_JUDGE_CONFIG_PATH).get()).data());
    }
    catch {
        return parseShadowJudgeConfig(null);
    }
}
function shadowJudgeReservationId(unitId, nowMs) { return `${new Date(nowMs).toISOString().slice(0, 10)}_${(0, node_crypto_1.createHash)('sha256').update(unitId).digest('hex').slice(0, 48)}`; }
async function reserveShadowJudgeBudget(db, unitId, cap, nowMs = Date.now()) {
    if (!/^[A-Za-z0-9._:-]{1,500}$/.test(unitId))
        throw new Error('shadow_judge_budget_unit_invalid');
    if (!Number.isSafeInteger(cap) || cap < 1 || cap > 1000)
        throw new Error('shadow_judge_budget_cap_invalid');
    const day = new Date(nowMs).toISOString().slice(0, 10);
    const counterRef = db.collection(exports.SHADOW_JUDGE_BUDGET_COLLECTION).doc(day);
    const reservationRef = db.collection(exports.SHADOW_JUDGE_RESERVATION_COLLECTION).doc(shadowJudgeReservationId(unitId, nowMs));
    return db.runTransaction(async (tx) => { const reservation = await tx.get(reservationRef); if (reservation.exists)
        return Object.freeze({ reserved: true, replayed: true }); const counter = await tx.get(counterRef); const used = Number(counter.data()?.requestCount ?? 0); if (!Number.isSafeInteger(used) || used < 0)
        throw new Error('shadow_judge_budget_counter_invalid'); if (used >= cap)
        return Object.freeze({ reserved: false, replayed: false }); tx.set(counterRef, { requestCount: used + 1, cap, updatedAtMs: nowMs }, { merge: true }); tx.create(reservationRef, { unitId, day, reservedAtMs: nowMs }); return Object.freeze({ reserved: true, replayed: false }); });
}
async function commitShadowJudgeReceipt(db, input) {
    const ref = db.collection('content_factory_stages').doc(input.stageId);
    return db.runTransaction(async (tx) => { const snapshot = await tx.get(ref); const stage = snapshot.data() ?? {}; if (!snapshot.exists || stage.state !== 'needs_review' || stage.contentHash !== input.contentHash || stage.revision !== input.expectedRevision || (0, review_fingerprint_1.contentStageReviewFingerprint)(input.stageId, stage) !== input.expectedReviewFingerprint)
        return false; tx.update(ref, { judgeReceipt: input.receipt, judgeUpdatedAt: input.updatedAt, updatedAt: input.updatedAt }); return true; });
}
//# sourceMappingURL=shadow_judge_repository.js.map