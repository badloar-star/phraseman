"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeFirestoreV2AccessRepository = exports.firestoreV2AccessPath = void 0;
exports.finalizeV2AccessPurchase = finalizeV2AccessPurchase;
const access_boost_1 = require("../../modules/learning-v2/contracts/access_boost");
const access_quote_1 = require("../../modules/learning-v2/contracts/access_quote");
const firestoreV2AccessPath = (key) => {
    const safeSegment = (value) => /^[A-Za-z0-9._-]{1,160}$/.test(value) && value !== '.' && value !== '..';
    if (key.startsWith('learning-v2:access-operation:')) {
        const parts = key.slice('learning-v2:access-operation:'.length).split(':');
        if (parts.length !== 2 || parts.some((part) => !safeSegment(part)))
            throw new Error('access_firestore_key_invalid');
        return `users/${parts[0]}/v2_access_operations/${parts[1]}`;
    }
    if (key.startsWith('learning-v2:access-quote:')) {
        const quoteId = key.slice('learning-v2:access-quote:'.length);
        if (!safeSegment(quoteId))
            throw new Error('access_firestore_key_invalid');
        return `learning_v2_access_quotes/${quoteId}`;
    }
    if (key.startsWith('learning-v2:access-gate:')) {
        const parts = key.slice('learning-v2:access-gate:'.length).split(':');
        if (parts.length !== 3 || parts.some((part) => !safeSegment(part)))
            throw new Error('access_firestore_key_invalid');
        return `users/${parts[0]}/v2_gate_receipts/${parts[1]}__${parts[2]}`;
    }
    if (key.startsWith('learning-v2:access-receipt:')) {
        const parts = key.slice('learning-v2:access-receipt:'.length).split(':');
        if (parts.length !== 2 || parts.some((part) => !safeSegment(part)))
            throw new Error('access_firestore_key_invalid');
        return `users/${parts[0]}/v2_access_ledger/${parts[1]}`;
    }
    if (key.startsWith('users:')) {
        const userId = key.slice('users:'.length);
        if (!safeSegment(userId))
            throw new Error('access_firestore_key_invalid');
        return `users/${userId}`;
    }
    throw new Error('access_firestore_key_invalid');
};
exports.firestoreV2AccessPath = firestoreV2AccessPath;
const operationKey = (stableId, operationId) => `learning-v2:access-operation:${stableId}:${operationId}`;
const quoteKey = (quoteId) => `learning-v2:access-quote:${quoteId}`;
const gateKey = (stableId, seasonId, gateId) => `learning-v2:access-gate:${stableId}:${seasonId}:${gateId}`;
const accountKey = (stableId) => `users:${stableId}`;
const receiptKey = (stableId, operationId) => `learning-v2:access-receipt:${stableId}:${operationId}`;
const sameRequestFields = (quote, request) => quote.stableId === request.stableId &&
    quote.seasonId === request.seasonId &&
    quote.gateId === request.gateId &&
    quote.releaseId === request.releaseId &&
    quote.policyVersion === request.policyVersion;
async function finalizeV2AccessPurchase(repository, policy, input) {
    if (!/^[A-Za-z0-9._-]{8,160}$/.test(input.operationId) ||
        !/^[a-f0-9]{64}$/.test(input.fingerprint) ||
        typeof input.stableId !== 'string' ||
        input.stableId.length === 0 ||
        input.request.stableId !== input.stableId ||
        input.request.opId !== input.operationId ||
        !Number.isSafeInteger(input.accountGeneration) ||
        input.accountGeneration < 1 ||
        !Number.isSafeInteger(input.nowMs) ||
        input.nowMs < 0) {
        throw new Error('access_purchase_identity_invalid');
    }
    return repository.runTransaction(async (transaction) => {
        const operation = await transaction.get(operationKey(input.stableId, input.operationId));
        if (operation.exists) {
            if (operation.data?.fingerprint !== input.fingerprint) {
                throw new Error('access_purchase_replay_mismatch');
            }
            if (!operation.data?.receipt)
                throw new Error('access_purchase_operation_invalid');
            return { replayed: true, receipt: operation.data.receipt };
        }
        const [quoteDocument, gateDocument, accountDocument] = await Promise.all([
            transaction.get(quoteKey(input.request.quoteId)),
            transaction.get(gateKey(input.stableId, input.request.seasonId, input.request.gateId)),
            transaction.get(accountKey(input.stableId)),
        ]);
        const quote = quoteDocument.data;
        const gate = gateDocument.data;
        const account = accountDocument.data;
        if (!quoteDocument.exists || !quote || !gateDocument.exists || !gate || !accountDocument.exists || !account) {
            throw new Error('access_purchase_binding_unavailable');
        }
        if (!sameRequestFields(quote, input.request) ||
            gate.stableId !== input.stableId ||
            gate.accountGeneration !== input.accountGeneration ||
            gate.seasonId !== input.request.seasonId ||
            gate.gateId !== input.request.gateId ||
            gate.releaseId !== input.request.releaseId ||
            gate.policyVersion !== input.request.policyVersion ||
            account.stableId !== input.stableId ||
            account.accountGeneration !== input.accountGeneration) {
            throw new Error('access_purchase_binding_mismatch');
        }
        if (input.decisionRegistryRef &&
            (!gate.decisionRegistryRef ||
                gate.decisionRegistryRef.id !== input.decisionRegistryRef.id ||
                gate.decisionRegistryRef.version !== input.decisionRegistryRef.version ||
                gate.decisionRegistryRef.contentHash !== input.decisionRegistryRef.contentHash)) {
            throw new Error('access_decision_registry_mismatch');
        }
        if (gate.unlocked)
            throw new Error('access_gate_already_unlocked');
        if (!Number.isSafeInteger(account.shards) || account.shards < 0) {
            throw new Error('access_account_balance_invalid');
        }
        const quoteValidation = (0, access_quote_1.validateAccessQuoteForPurchase)(quote, input.request, input.nowMs);
        if (quoteValidation.valid === false)
            throw new Error(`access_${quoteValidation.reason}`);
        const eligibility = (0, access_boost_1.evaluateAccessBoostEligibility)({
            requiredLoopsComplete: gate.requiredLoopsComplete,
            capabilityFallbackComplete: gate.capabilityFallbackComplete,
            localPerformanceComplete: gate.localPerformanceComplete,
            checkpointComplete: gate.checkpointComplete,
            honestBlockCount: gate.honestBlockCount,
            recoveryReviewImpressionCount: gate.recoveryReviewImpressionCount,
            earnedDeficit: gate.earnedDeficit,
            purchasedForGate: gate.purchasedForGate,
            purchasedForChapter: gate.purchasedForChapter,
            purchasedForSeason: gate.purchasedForSeason,
            serverQuoteAvailable: true,
        }, policy);
        if (eligibility.eligible === false)
            throw new Error(`access_${eligibility.reason}`);
        if (eligibility.totalCostShards !== quote.totalCostShards) {
            throw new Error('access_quote_policy_mismatch');
        }
        if (account.shards < eligibility.totalCostShards)
            throw new Error('access_insufficient_balance');
        const balanceAfter = account.shards - eligibility.totalCostShards;
        if (!Number.isSafeInteger(balanceAfter) || balanceAfter < 0) {
            throw new Error('access_account_balance_invalid');
        }
        const receipt = {
            opId: input.operationId,
            stableId: input.stableId,
            seasonId: input.request.seasonId,
            gateId: input.request.gateId,
            accessStarsApplied: eligibility.accessStarsToApply,
            shardsSpent: eligibility.totalCostShards,
            balanceAfter,
            basis: 'earned_plus_boost',
        };
        transaction.update(accountKey(input.stableId), { shards: balanceAfter });
        transaction.update(gateKey(input.stableId, input.request.seasonId, input.request.gateId), {
            purchasedForGate: gate.purchasedForGate + eligibility.accessStarsToApply,
            purchasedForChapter: gate.purchasedForChapter + eligibility.accessStarsToApply,
            purchasedForSeason: gate.purchasedForSeason + eligibility.accessStarsToApply,
            earnedDeficit: 0,
            unlocked: true,
        });
        transaction.create(receiptKey(input.stableId, input.operationId), receipt);
        transaction.create(operationKey(input.stableId, input.operationId), {
            operationId: input.operationId,
            fingerprint: input.fingerprint,
            receipt,
        });
        return { replayed: false, receipt };
    });
}
const makeFirestoreV2AccessRepository = (db) => ({
    runTransaction: (fn) => db.runTransaction(async (transaction) => fn({
        get: async (key) => {
            const snapshot = await transaction.get(db.doc((0, exports.firestoreV2AccessPath)(key)));
            return {
                exists: snapshot.exists,
                data: snapshot.exists ? snapshot.data() : undefined,
            };
        },
        create: (key, value) => {
            const ref = db.doc((0, exports.firestoreV2AccessPath)(key));
            const candidate = transaction;
            if (candidate.create)
                candidate.create(ref, value);
            else if (candidate.set)
                candidate.set(ref, value);
            else
                throw new Error('access_firestore_create_unavailable');
        },
        update: (key, value) => {
            const ref = db.doc((0, exports.firestoreV2AccessPath)(key));
            const candidate = transaction;
            if (candidate.update)
                candidate.update(ref, value);
            else if (candidate.set)
                candidate.set(ref, value, { merge: true });
            else
                throw new Error('access_firestore_update_unavailable');
        },
    })),
});
exports.makeFirestoreV2AccessRepository = makeFirestoreV2AccessRepository;
//# sourceMappingURL=learning_v2_access_adapter.js.map