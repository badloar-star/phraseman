"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPlansLedger = void 0;
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("./auth");
const contracts_1 = require("./contracts");
const PLANS = 'admin_plans';
const EVENTS = 'admin_plan_events';
function sha256(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value, 'utf8').digest('hex');
}
function safeInteger(value, label) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new https_1.HttpsError('data-loss', `${label} is invalid`);
    }
    return value;
}
function hashValue(value, label) {
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
        throw new https_1.HttpsError('data-loss', `${label} is invalid`);
    }
    return value;
}
function actorUid(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) {
        throw new https_1.HttpsError('data-loss', 'createdByUid is invalid');
    }
    return value;
}
function parsePersistedPlan(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new https_1.HttpsError('data-loss', 'admin plan record is invalid');
    }
    const input = value;
    const keys = [
        'schemaVersion', 'planId', 'planKind', 'title', 'summary', 'priority', 'expectedEffect',
        'source', 'actionCodes', 'steps', 'status',
        'createdAtMs', 'updatedAtMs', 'createdByUid', 'createdByRole', 'idempotencyKeyHash',
        'requestPayloadHash', 'piiClass',
    ];
    if (Object.keys(input).some((key) => !keys.includes(key)) || keys.some((key) => !(key in input))) {
        throw new https_1.HttpsError('data-loss', 'admin plan record fields are invalid');
    }
    const draft = (0, contracts_1.parseAdminPlanDraft)({
        planKind: input.planKind,
        title: input.title,
        summary: input.summary,
        priority: input.priority,
        expectedEffect: input.expectedEffect,
        source: input.source,
        actionCodes: input.actionCodes,
        steps: input.steps,
    });
    if (input.schemaVersion !== 1 || input.status !== 'draft' || input.createdByRole !== 'owner' || input.piiClass !== 'none') {
        throw new https_1.HttpsError('data-loss', 'admin plan record metadata is invalid');
    }
    return Object.freeze({
        ...draft,
        planId: (0, contracts_1.parsePlanId)(input.planId),
        createdAtMs: safeInteger(input.createdAtMs, 'createdAtMs'),
        updatedAtMs: safeInteger(input.updatedAtMs, 'updatedAtMs'),
        createdByUid: actorUid(input.createdByUid),
        createdByRole: 'owner',
        idempotencyKeyHash: hashValue(input.idempotencyKeyHash, 'idempotencyKeyHash'),
        requestPayloadHash: hashValue(input.requestPayloadHash, 'requestPayloadHash'),
        piiClass: 'none',
    });
}
function projectPlan(plan) {
    return Object.freeze({
        schemaVersion: plan.schemaVersion,
        planId: plan.planId,
        planKind: plan.planKind,
        title: plan.title,
        summary: plan.summary,
        priority: plan.priority,
        expectedEffect: plan.expectedEffect,
        source: plan.source,
        actionCodes: plan.actionCodes,
        steps: plan.steps,
        status: plan.status,
        createdAtMs: plan.createdAtMs,
        updatedAtMs: plan.updatedAtMs,
    });
}
class AdminPlansLedger {
    constructor(repository, now = Date.now) {
        this.repository = repository;
        this.now = now;
    }
    async createPlan(auth, value) {
        const actor = (0, auth_1.requireAdminPlansOwner)(auth);
        const input = (0, contracts_1.parseCreatePlanInput)(value);
        const idempotencyKeyHash = sha256(`${actor.actorUid.length}:${actor.actorUid}:${input.idempotencyKey}`);
        const requestPayloadHash = sha256(JSON.stringify(input.draft));
        const planId = `plan_${idempotencyKeyHash}`;
        const nowMs = this.now();
        return this.repository.runTransaction(async (transaction) => {
            const existing = await transaction.get(`${PLANS}/${planId}`);
            if (existing) {
                const plan = parsePersistedPlan(existing.data);
                if (plan.idempotencyKeyHash !== idempotencyKeyHash
                    || plan.requestPayloadHash !== requestPayloadHash
                    || plan.createdByUid !== actor.actorUid) {
                    throw new https_1.HttpsError('failed-precondition', 'idempotency key replay mismatch');
                }
                return Object.freeze({ ok: true, replayed: true, item: projectPlan(plan) });
            }
            const plan = Object.freeze({
                ...input.draft,
                planId,
                createdAtMs: nowMs,
                updatedAtMs: nowMs,
                createdByUid: actor.actorUid,
                createdByRole: 'owner',
                idempotencyKeyHash,
                requestPayloadHash,
                piiClass: 'none',
            });
            transaction.create(`${PLANS}/${planId}`, plan);
            transaction.create(`${EVENTS}/${planId}__created`, {
                schemaVersion: 1,
                eventId: `${planId}__created`,
                eventType: 'plan_created',
                planId,
                actorUid: actor.actorUid,
                actorRole: 'owner',
                occurredAtMs: nowMs,
                requestPayloadHash,
                piiClass: 'none',
            });
            return Object.freeze({ ok: true, replayed: false, item: projectPlan(plan) });
        });
    }
    async getPlan(auth, value) {
        (0, auth_1.requireAdminPlansOwner)(auth);
        const input = (0, contracts_1.parseGetPlanInput)(value);
        const document = await this.repository.get(`${PLANS}/${input.planId}`);
        if (!document)
            throw new https_1.HttpsError('not-found', 'admin plan not found');
        return Object.freeze({ ok: true, item: projectPlan(parsePersistedPlan(document.data)) });
    }
    async listPlans(auth, value) {
        (0, auth_1.requireAdminPlansOwner)(auth);
        const input = (0, contracts_1.parseListPlansInput)(value);
        const documents = await this.repository.query({ collection: PLANS, orderBy: 'createdAtMs', limit: input.limit });
        return Object.freeze({
            ok: true,
            items: Object.freeze(documents.map((document) => projectPlan(parsePersistedPlan(document.data)))),
        });
    }
}
exports.AdminPlansLedger = AdminPlansLedger;
//# sourceMappingURL=ledger.js.map