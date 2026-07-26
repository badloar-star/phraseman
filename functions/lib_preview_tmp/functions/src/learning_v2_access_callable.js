"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createV2AccessPurchaseCallable = exports.assertV2AccessStableIdentity = exports.normalizeV2AccessPurchaseInput = void 0;
exports.executeV2AccessPurchaseCallable = executeV2AccessPurchaseCallable;
const https_1 = require("firebase-functions/v2/https");
const decision_registry_1 = require("../../modules/learning-v2/policies/decision_registry");
const learning_v2_access_adapter_1 = require("./learning_v2_access_adapter");
const https_2 = require("firebase-functions/v2/https");
const record = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeV2AccessPurchaseInput = (data) => {
    if (!record(data))
        throw new https_1.HttpsError('invalid-argument', 'access_input_invalid');
    const operationId = text(data.operationId);
    const stableId = text(data.stableId);
    const accountGeneration = typeof data.accountGeneration === 'number' ? data.accountGeneration : NaN;
    const request = {
        opId: text(data.opId),
        quoteId: text(data.quoteId),
        stableId,
        seasonId: text(data.seasonId),
        gateId: text(data.gateId),
        releaseId: text(data.releaseId),
        policyVersion: text(data.policyVersion),
        expectedCostShards: typeof data.expectedCostShards === 'number' ? data.expectedCostShards : NaN,
    };
    if (!/^[A-Za-z0-9._-]{8,160}$/.test(operationId) ||
        !stableId ||
        !Number.isSafeInteger(accountGeneration) ||
        accountGeneration < 1 ||
        request.opId !== operationId ||
        !/^[A-Za-z0-9._-]{1,160}$/.test(request.quoteId) ||
        !/^[A-Za-z0-9._-]{1,160}$/.test(request.seasonId) ||
        !/^[A-Za-z0-9._-]{1,160}$/.test(request.gateId) ||
        !/^[A-Za-z0-9._-]{1,160}$/.test(request.releaseId) ||
        !/^[A-Za-z0-9._-]{1,160}$/.test(request.policyVersion) ||
        !Number.isSafeInteger(request.expectedCostShards) ||
        request.expectedCostShards < 0) {
        throw new https_1.HttpsError('invalid-argument', 'access_input_invalid');
    }
    return Object.freeze({ request, operationId, stableId, accountGeneration });
};
exports.normalizeV2AccessPurchaseInput = normalizeV2AccessPurchaseInput;
const assertV2AccessStableIdentity = (normalized, binding) => {
    if (!binding ||
        normalized.stableId !== binding.stableUid ||
        normalized.accountGeneration !== binding.accountGeneration) {
        throw new https_1.HttpsError('permission-denied', 'stable_identity_mismatch');
    }
};
exports.assertV2AccessStableIdentity = assertV2AccessStableIdentity;
async function executeV2AccessPurchaseCallable(request, dependencies) {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const input = (0, exports.normalizeV2AccessPurchaseInput)(request.data);
    const binding = await dependencies.resolveAccountBinding(request.auth.uid);
    (0, exports.assertV2AccessStableIdentity)(input, binding);
    const nowMs = dependencies.nowMs?.() ?? Date.now();
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
        throw new https_1.HttpsError('failed-precondition', 'server_time_invalid');
    }
    const policy = await dependencies.resolvePolicy(input);
    const adapterInput = {
        operationId: input.operationId,
        fingerprint: (0, decision_registry_1.hashCanonicalBody)(input),
        authUid: request.auth.uid,
        stableId: input.stableId,
        accountGeneration: input.accountGeneration,
        request: input.request,
        nowMs,
        decisionRegistryRef: dependencies.decisionRegistryRef,
    };
    try {
        const result = await (0, learning_v2_access_adapter_1.finalizeV2AccessPurchase)(dependencies.repository, policy, adapterInput);
        return { ok: true, replayed: result.replayed, receipt: result.receipt };
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : 'access_purchase_failed';
        const code = reason.includes('insufficient_balance')
            ? 'resource-exhausted'
            : reason.includes('replay_mismatch')
                ? 'already-exists'
                : reason.includes('binding') || reason.includes('identity') ||
                    reason.includes('account_generation') || reason.includes('account_delete') ||
                    reason.includes('quote_') ||
                    reason.includes('already_unlocked') || reason.includes('decision_registry') ||
                    reason.includes('required_') || reason.includes('capability_') || reason.includes('local_') ||
                    reason.includes('checkpoint') || reason.includes('deficit_')
                    ? 'failed-precondition'
                    : 'internal';
        throw new https_1.HttpsError(code, 'access_purchase_rejected');
    }
}
const createV2AccessPurchaseCallable = (dependencies) => (0, https_2.onCall)({ enforceAppCheck: true }, async (request) => executeV2AccessPurchaseCallable(request, dependencies));
exports.createV2AccessPurchaseCallable = createV2AccessPurchaseCallable;
//# sourceMappingURL=learning_v2_access_callable.js.map