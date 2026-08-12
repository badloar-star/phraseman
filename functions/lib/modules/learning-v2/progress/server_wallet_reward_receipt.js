"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerWalletRewardReceiptAuthority = exports.parseServerWalletRewardRequest = exports.materializeServerWalletRewardRequest = exports.parseServerWalletRewardReceiptRaw = exports.materializeServerWalletRewardReceiptCandidate = void 0;
const wallet_1 = require("../contracts/wallet");
const decision_registry_1 = require("../policies/decision_registry");
const wallet_reducer_1 = require("./wallet_reducer");
const CREATE_KEYS = [
    "rewardId",
    "operationId",
    "accountScopeHash",
    "accountGeneration",
    "amountSubunits",
    "operationReason",
    "origin",
];
const RECORD_KEYS = [
    "schemaVersion",
    "recordKind",
    ...CREATE_KEYS,
    "rewardFingerprint",
    "recordFingerprint",
];
const REQUEST_KEYS = ["schemaVersion", "rewardId", "rewardFingerprint"];
const REASONS = [
    "initial_required_session",
    "repeat_session",
    "plan_completion",
    "dictionary_activity",
    "irregular_verbs_activity",
    "tournament_reward",
    "coin_exchange",
];
const MAX_BYTES = 96 * 1024;
const MAX_AMOUNT = 1000000000000;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => {
    const own = Reflect.ownKeys(value);
    return own.length === keys.length && own.every((key) => typeof key === "string" && keys.includes(key));
};
const safe = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && !Object.is(value, -0) &&
    Number(value) >= minimum && Number(value) <= maximum;
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const same = (left, right) => (0, decision_registry_1.canonicalJsonV1)(left) === (0, decision_registry_1.canonicalJsonV1)(right);
const fail = (code) => { throw new Error(code); };
const detachRecord = (input, keys, code) => {
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, code);
    }
    catch {
        return fail(code);
    }
    if (!isRecord(detached) || !exactKeys(detached, keys))
        return fail(code);
    return detached;
};
const readRecord = (input, keys, code) => {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
        return fail(code);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const own = Reflect.ownKeys(descriptors);
    if (own.length !== keys.length || own.some((key) => typeof key !== "string" || !keys.includes(key)) || keys.some((key) => {
        const descriptor = descriptors[key];
        return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    }))
        return fail(code);
    const result = Object.create(null);
    for (const key of keys)
        result[key] = descriptors[key].value;
    return result;
};
const COMBINATIONS = {
    initial_required_session: {
        kind: "earning_credit", earningCategory: "lesson",
        receiptType: "required_session_credit_settlement", originKind: "course",
    },
    repeat_session: {
        kind: "earning_credit", earningCategory: "repeat",
        receiptType: "repeat_reward_settlement", originKind: "course",
    },
    plan_completion: {
        kind: "earning_credit", earningCategory: "plan",
        receiptType: "plan_reward_settlement", originKind: "course",
    },
    dictionary_activity: {
        kind: "earning_credit", earningCategory: "dictionary",
        receiptType: "dictionary_reward_settlement", originKind: "course",
    },
    irregular_verbs_activity: {
        kind: "earning_credit", earningCategory: "irregular_verbs",
        receiptType: "irregular_verbs_reward_settlement", originKind: "course",
    },
    tournament_reward: {
        kind: "earning_credit", earningCategory: "tournament",
        receiptType: "tournament_reward", originKind: "tournament",
    },
    coin_exchange: {
        kind: "external_credit", earningCategory: null,
        receiptType: "coin_exchange_trade", originKind: "coin_exchange",
    },
};
const rewardBody = (value) => ({
    schemaVersion: "learning-v2-server-wallet-reward-body.v1",
    rewardId: value.rewardId,
    operationId: value.operationId,
    accountScopeHash: value.accountScopeHash,
    accountGeneration: Number(value.accountGeneration),
    amountSubunits: Number(value.amountSubunits),
    operationReason: value.operationReason,
    origin: value.origin,
});
const materializeServerWalletRewardReceiptCandidate = (input) => {
    const value = detachRecord(input, CREATE_KEYS, "server_wallet_reward_receipt_invalid");
    if (!(0, wallet_1.isWalletIdentifier)(value.rewardId) ||
        !(0, wallet_1.isWalletIdentifier)(value.operationId) ||
        typeof value.accountScopeHash !== "string" ||
        !ACCOUNT.test(value.accountScopeHash) ||
        !safe(value.accountGeneration, 1) ||
        !safe(value.amountSubunits, 1, MAX_AMOUNT) ||
        !REASONS.includes(value.operationReason) ||
        !isRecord(value.origin))
        return fail("server_wallet_reward_receipt_invalid");
    const reason = value.operationReason;
    if (value.origin.kind !== COMBINATIONS[reason].originKind)
        return fail("server_wallet_reward_receipt_invalid");
    const body = rewardBody(value);
    const withoutFingerprint = {
        schemaVersion: "learning-v2-server-wallet-reward-receipt.v1",
        recordKind: "server_wallet_reward_receipt",
        rewardId: body.rewardId,
        operationId: body.operationId,
        accountScopeHash: body.accountScopeHash,
        accountGeneration: body.accountGeneration,
        amountSubunits: body.amountSubunits,
        operationReason: body.operationReason,
        origin: body.origin,
        rewardFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    };
    const receipt = deepFreeze({
        ...withoutFingerprint,
        recordFingerprint: (0, decision_registry_1.hashCanonicalBody)(withoutFingerprint),
    });
    const encoded = (0, decision_registry_1.canonicalJsonV1)(receipt);
    if ((0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_BYTES)
        return fail("server_wallet_reward_receipt_invalid");
    return deepFreeze({ receipt, encoded, authority: "structural_candidate" });
};
exports.materializeServerWalletRewardReceiptCandidate = materializeServerWalletRewardReceiptCandidate;
const parseServerWalletRewardReceiptRaw = (raw) => {
    if (typeof raw !== "string")
        return fail("server_wallet_reward_receipt_indeterminate");
    let value;
    try {
        if ((0, decision_registry_1.utf8ByteLengthV1)(raw) > MAX_BYTES)
            return fail("server_wallet_reward_receipt_indeterminate");
        const parsed = JSON.parse(raw);
        if ((0, decision_registry_1.canonicalJsonV1)(parsed) !== raw)
            return fail("server_wallet_reward_receipt_indeterminate");
        value = detachRecord(parsed, RECORD_KEYS, "server_wallet_reward_receipt_indeterminate");
    }
    catch {
        return fail("server_wallet_reward_receipt_indeterminate");
    }
    if (value.schemaVersion !== "learning-v2-server-wallet-reward-receipt.v1" ||
        value.recordKind !== "server_wallet_reward_receipt" ||
        typeof value.rewardFingerprint !== "string" ||
        !HASH.test(value.rewardFingerprint) ||
        typeof value.recordFingerprint !== "string" ||
        !HASH.test(value.recordFingerprint))
        return fail("server_wallet_reward_receipt_indeterminate");
    let rebuilt;
    try {
        rebuilt = (0, exports.materializeServerWalletRewardReceiptCandidate)({
            rewardId: value.rewardId,
            operationId: value.operationId,
            accountScopeHash: value.accountScopeHash,
            accountGeneration: value.accountGeneration,
            amountSubunits: value.amountSubunits,
            operationReason: value.operationReason,
            origin: value.origin,
        });
    }
    catch {
        return fail("server_wallet_reward_receipt_indeterminate");
    }
    if (!same(rebuilt.receipt, value) || rebuilt.encoded !== raw)
        return fail("server_wallet_reward_receipt_indeterminate");
    return rebuilt;
};
exports.parseServerWalletRewardReceiptRaw = parseServerWalletRewardReceiptRaw;
const materializeServerWalletRewardRequest = (input) => deepFreeze({
    schemaVersion: "learning-v2-server-wallet-reward-request.v1",
    rewardId: input.receipt.rewardId,
    rewardFingerprint: input.receipt.rewardFingerprint,
});
exports.materializeServerWalletRewardRequest = materializeServerWalletRewardRequest;
const parseServerWalletRewardRequest = (input) => {
    const value = detachRecord(input, REQUEST_KEYS, "server_wallet_reward_request_invalid");
    if (value.schemaVersion !== "learning-v2-server-wallet-reward-request.v1" ||
        !(0, wallet_1.isWalletIdentifier)(value.rewardId) ||
        typeof value.rewardFingerprint !== "string" ||
        !HASH.test(value.rewardFingerprint)) {
        return fail("server_wallet_reward_request_invalid");
    }
    return deepFreeze({
        schemaVersion: value.schemaVersion,
        rewardId: value.rewardId,
        rewardFingerprint: value.rewardFingerprint,
    });
};
exports.parseServerWalletRewardRequest = parseServerWalletRewardRequest;
const operationForReceipt = (receipt, walletRevisionBefore, acceptedAccountGeneration) => {
    const combination = COMBINATIONS[receipt.operationReason];
    const sourceReceiptRef = {
        receiptType: combination.receiptType,
        receiptId: receipt.rewardId,
        receiptFingerprint: receipt.rewardFingerprint,
    };
    return (0, wallet_1.createWalletAuthorizedOperation)({
        schemaVersion: "learning-v2-wallet-authorized-operation.v1",
        authority: "trusted_server_boundary",
        operationId: receipt.operationId,
        semanticSubjectFingerprint: (0, wallet_1.deriveWalletSemanticSubjectFingerprint)({
            accountScopeHash: receipt.accountScopeHash,
            operationReason: receipt.operationReason,
            sourceReceiptRef,
        }),
        accountScopeHash: receipt.accountScopeHash,
        accountGeneration: acceptedAccountGeneration,
        currency: "access_star",
        walletRevisionBefore,
        kind: combination.kind,
        amountSubunits: receipt.amountSubunits,
        earningCategory: combination.earningCategory,
        operationReason: receipt.operationReason,
        sourceReceiptRef,
        origin: receipt.origin,
    });
};
/**
 * The resolver must read exact bytes from protected server storage. The source
 * reward is revision-independent; only this authority binds it to the current
 * wallet revision. On retry, the repository-verified canonical receipt wins.
 */
const createServerWalletRewardReceiptAuthority = (input) => {
    const options = readRecord(input, ["resolveRewardReceipt"], "server_wallet_reward_authority_invalid");
    if (typeof options.resolveRewardReceipt !== "function")
        return fail("server_wallet_reward_authority_invalid");
    const resolve = options.resolveRewardReceipt;
    return async (request) => {
        const candidate = detachRecord(request.candidate, REQUEST_KEYS, "server_wallet_reward_request_invalid");
        if (candidate.schemaVersion !== "learning-v2-server-wallet-reward-request.v1" ||
            !(0, wallet_1.isWalletIdentifier)(candidate.rewardId) ||
            typeof candidate.rewardFingerprint !== "string" ||
            !HASH.test(candidate.rewardFingerprint))
            return fail("server_wallet_reward_request_invalid");
        let raw;
        try {
            raw = await resolve({
                accountScopeHash: request.scope.accountScopeHash,
                rewardId: candidate.rewardId,
                rewardFingerprint: candidate.rewardFingerprint,
            });
        }
        catch {
            return fail("server_wallet_reward_receipt_unavailable");
        }
        const materialized = (0, exports.parseServerWalletRewardReceiptRaw)(raw);
        const receipt = materialized.receipt;
        if (receipt.rewardId !== candidate.rewardId ||
            receipt.rewardFingerprint !== candidate.rewardFingerprint ||
            receipt.accountScopeHash !== request.scope.accountScopeHash)
            return fail("server_wallet_reward_receipt_conflict");
        if (request.canonicalAppliedReceipt !== null) {
            let canonical;
            try {
                canonical = (0, wallet_reducer_1.parseWalletAppliedReceipt)(request.canonicalAppliedReceipt);
            }
            catch {
                return fail("server_wallet_reward_receipt_conflict");
            }
            // The repository supplies its verified journal head as a restart aid.
            // It is replay authority only for this exact protected operation; an
            // unrelated head must not block the next independently settled reward.
            if (canonical.authorizedOperation.operationId === receipt.operationId) {
                if (canonical.accountGeneration < receipt.accountGeneration)
                    return fail("server_wallet_reward_receipt_conflict");
                const expected = operationForReceipt(receipt, canonical.revisionBefore, canonical.accountGeneration);
                if (!same(canonical.authorizedOperation, expected))
                    return fail("server_wallet_reward_receipt_conflict");
                return expected;
            }
        }
        if (receipt.accountGeneration > request.scope.generation)
            return fail("server_wallet_reward_receipt_stale");
        return operationForReceipt(receipt, request.walletState.revision, request.scope.generation);
    };
};
exports.createServerWalletRewardReceiptAuthority = createServerWalletRewardReceiptAuthority;
//# sourceMappingURL=server_wallet_reward_receipt.js.map