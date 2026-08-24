"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRepeatRewardSubunits = exports.legacyWholeStarsToSubunits = exports.createWalletAuthorizedOperation = exports.deriveWalletSemanticSubjectFingerprint = exports.isWalletIdentifier = exports.detachBoundedWalletJson = exports.WALLET_EARNING_CATEGORIES = exports.WALLET_SUBUNITS_PER_STAR = void 0;
const decision_registry_1 = require("../policies/decision_registry");
exports.WALLET_SUBUNITS_PER_STAR = 10_000;
exports.WALLET_EARNING_CATEGORIES = [
    "lesson",
    "repeat",
    "plan",
    "dictionary",
    "irregular_verbs",
    "tournament",
];
const BODY_KEYS = [
    "schemaVersion", "authority", "operationId", "semanticSubjectFingerprint",
    "accountScopeHash", "accountGeneration", "currency", "walletRevisionBefore",
    "kind", "amountSubunits", "earningCategory", "operationReason",
    "sourceReceiptRef", "origin",
];
const OPERATION_KEYS = [...BODY_KEYS, "semanticFingerprint", "operationFingerprint"];
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const MAX_AMOUNT_SUBUNITS = 1_000_000_000_000;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const detachBoundedWalletJson = (input, code) => {
    let nodes = 0;
    let stringUnits = 0;
    const ancestors = new Set();
    const visit = (value, depth) => {
        nodes += 1;
        if (nodes > 512 || depth > 12)
            throw new Error(code);
        if (typeof value === "string") {
            stringUnits += value.length;
            if (stringUnits > 65_536)
                throw new Error(code);
            return;
        }
        if (typeof value !== "object" || value === null)
            return;
        if (ancestors.has(value))
            throw new Error(code);
        ancestors.add(value);
        if (Array.isArray(value)) {
            if (value.length > 64 || Reflect.ownKeys(value).some((key) => typeof key !== "string" || (key !== "length" && !/^(?:0|[1-9][0-9]*)$/.test(key))))
                throw new Error(code);
            for (let index = 0; index < value.length; index += 1) {
                const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
                if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
                    throw new Error(code);
                visit(descriptor.value, depth + 1);
            }
        }
        else {
            const prototype = Object.getPrototypeOf(value);
            if (prototype !== Object.prototype && prototype !== null)
                throw new Error(code);
            if (Reflect.ownKeys(value).some((key) => typeof key !== "string"))
                throw new Error(code);
            const descriptors = Object.getOwnPropertyDescriptors(value);
            const keys = Object.keys(descriptors);
            if (keys.length > 64)
                throw new Error(code);
            for (const key of keys) {
                stringUnits += key.length;
                if (stringUnits > 65_536)
                    throw new Error(code);
                const descriptor = descriptors[key];
                if (!("value" in descriptor) || !descriptor.enumerable)
                    throw new Error(code);
                visit(descriptor.value, depth + 1);
            }
        }
        ancestors.delete(value);
    };
    visit(input, 0);
    try {
        return JSON.parse((0, decision_registry_1.canonicalJsonV1)(input));
    }
    catch {
        throw new Error(code);
    }
};
exports.detachBoundedWalletJson = detachBoundedWalletJson;
const detached = exports.detachBoundedWalletJson;
const isWalletIdentifier = (value) => typeof value === "string" && ID.test(value) && !RESERVED.has(value);
exports.isWalletIdentifier = isWalletIdentifier;
const validId = exports.isWalletIdentifier;
const validHash = (value) => typeof value === "string" && HASH.test(value);
const validSafe = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= minimum && Number(value) <= maximum;
const parseOrigin = (input) => {
    if (!isRecord(input) || typeof input.kind !== "string")
        throw new Error("wallet_operation_invalid");
    if (input.kind === "course") {
        if (!exactKeys(input, ["kind", "courseId", "studyTarget", "requiredSessionOrdinal"]) ||
            !validId(input.courseId) || !validId(input.studyTarget) ||
            !validSafe(input.requiredSessionOrdinal, 1, 384))
            throw new Error("wallet_operation_invalid");
    }
    else if (input.kind === "tournament") {
        if (!exactKeys(input, ["kind", "tournamentId"]) || !validId(input.tournamentId))
            throw new Error("wallet_operation_invalid");
    }
    else if (input.kind === "coin_exchange") {
        if (!exactKeys(input, ["kind", "tradeId"]) || !validId(input.tradeId))
            throw new Error("wallet_operation_invalid");
    }
    else if (input.kind === "legacy_opening") {
        if (!exactKeys(input, ["kind", "importVersion", "sourceSnapshotFingerprint"]) ||
            input.importVersion !== 1 || !validHash(input.sourceSnapshotFingerprint))
            throw new Error("wallet_operation_invalid");
    }
    else if (input.kind === "mistake_correction") {
        if (!exactKeys(input, ["kind", "studyTarget", "mistakeId", "cycleId", "correctionEventId"]) ||
            (input.studyTarget !== "en" && input.studyTarget !== "fr") ||
            !validId(input.mistakeId) || !validId(input.cycleId) || !validId(input.correctionEventId)) {
            throw new Error("wallet_operation_invalid");
        }
    }
    else
        throw new Error("wallet_operation_invalid");
    return input;
};
const parseSourceReceiptRef = (input) => {
    if (!isRecord(input) || !exactKeys(input, ["receiptType", "receiptId", "receiptFingerprint"]) ||
        !["required_session_credit_settlement", "repeat_reward_settlement", "mistake_correction_composite", "plan_reward_settlement", "dictionary_reward_settlement", "irregular_verbs_reward_settlement", "tournament_reward", "coin_exchange_trade", "legacy_wallet_snapshot"].includes(String(input.receiptType)) ||
        !validId(input.receiptId) || !validHash(input.receiptFingerprint))
        throw new Error("wallet_operation_invalid");
    return input;
};
const validateCombination = (value, origin) => {
    if (value.authority === "client_authoritative_composite") {
        const source = value.sourceReceiptRef;
        if (value.kind !== "earning_credit" || value.earningCategory !== "repeat" ||
            value.operationReason !== "mistake_correction" ||
            Number(value.amountSubunits) !== exports.WALLET_SUBUNITS_PER_STAR ||
            source.receiptType !== "mistake_correction_composite" ||
            origin.kind !== "mistake_correction")
            throw new Error("wallet_operation_invalid");
        return;
    }
    if (value.operationReason === "mistake_correction" || origin.kind === "mistake_correction") {
        throw new Error("wallet_operation_invalid");
    }
    const category = value.earningCategory;
    if (value.kind === "earning_credit") {
        const categoryByReason = {
            initial_required_session: "lesson",
            repeat_session: "repeat",
            plan_completion: "plan",
            dictionary_activity: "dictionary",
            irregular_verbs_activity: "irregular_verbs",
            tournament_reward: "tournament",
        };
        const expectedCategory = categoryByReason[String(value.operationReason)];
        if (!expectedCategory || category !== expectedCategory ||
            Number(value.amountSubunits) <= 0)
            throw new Error("wallet_operation_invalid");
        const tournament = value.operationReason === "tournament_reward";
        if ((tournament && origin.kind !== "tournament") || (!tournament && origin.kind !== "course"))
            throw new Error("wallet_operation_invalid");
    }
    else if (value.kind === "external_credit") {
        if (category !== null || value.operationReason !== "coin_exchange" || origin.kind !== "coin_exchange" || Number(value.amountSubunits) <= 0)
            throw new Error("wallet_operation_invalid");
    }
    else if (value.kind === "legacy_opening_import") {
        if (category !== null || value.operationReason !== "legacy_opening_balance" || origin.kind !== "legacy_opening")
            throw new Error("wallet_operation_invalid");
    }
    else
        throw new Error("wallet_operation_invalid");
    const source = value.sourceReceiptRef;
    const sourceTypeByReason = {
        initial_required_session: "required_session_credit_settlement",
        repeat_session: "repeat_reward_settlement",
        plan_completion: "plan_reward_settlement",
        dictionary_activity: "dictionary_reward_settlement",
        irregular_verbs_activity: "irregular_verbs_reward_settlement",
        tournament_reward: "tournament_reward",
        coin_exchange: "coin_exchange_trade",
        legacy_opening_balance: "legacy_wallet_snapshot",
    };
    if (source.receiptType !== sourceTypeByReason[String(value.operationReason)])
        throw new Error("wallet_operation_invalid");
};
const semanticBody = (value) => value;
const deriveWalletSemanticSubjectFingerprint = (input) => (0, decision_registry_1.hashCanonicalBody)({
    schemaVersion: "learning-v2-wallet-semantic-subject.v1",
    accountScopeHash: input.accountScopeHash,
    currency: "access_star",
    operationReason: input.operationReason,
    sourceReceiptType: input.sourceReceiptRef.receiptType,
    sourceReceiptId: input.sourceReceiptRef.receiptId,
});
exports.deriveWalletSemanticSubjectFingerprint = deriveWalletSemanticSubjectFingerprint;
const createWalletAuthorizedOperation = (input) => {
    const value = detached(input, "wallet_operation_invalid");
    if (!isRecord(value))
        throw new Error("wallet_operation_invalid");
    const materialized = Object.prototype.hasOwnProperty.call(value, "operationFingerprint");
    if (!(materialized ? exactKeys(value, OPERATION_KEYS) : exactKeys(value, BODY_KEYS)) ||
        value.schemaVersion !== "learning-v2-wallet-authorized-operation.v1" ||
        (value.authority !== "trusted_server_boundary" && value.authority !== "client_authoritative_composite") ||
        !validId(value.operationId) ||
        !validHash(value.semanticSubjectFingerprint) ||
        typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
        !validSafe(value.accountGeneration) || value.currency !== "access_star" ||
        !validSafe(value.walletRevisionBefore) ||
        !validSafe(value.amountSubunits, 0, MAX_AMOUNT_SUBUNITS))
        throw new Error("wallet_operation_invalid");
    const sourceReceiptRef = parseSourceReceiptRef(value.sourceReceiptRef);
    const origin = parseOrigin(value.origin);
    value.sourceReceiptRef = sourceReceiptRef;
    validateCombination(value, origin);
    const derivedSubject = (0, exports.deriveWalletSemanticSubjectFingerprint)({
        accountScopeHash: value.accountScopeHash,
        operationReason: value.operationReason,
        sourceReceiptRef,
    });
    if (value.semanticSubjectFingerprint !== derivedSubject)
        throw new Error("wallet_operation_invalid");
    const base = {
        schemaVersion: "learning-v2-wallet-authorized-operation.v1",
        authority: value.authority,
        operationId: value.operationId,
        semanticSubjectFingerprint: value.semanticSubjectFingerprint,
        accountScopeHash: value.accountScopeHash,
        accountGeneration: Number(value.accountGeneration),
        currency: "access_star",
        walletRevisionBefore: Number(value.walletRevisionBefore),
        kind: value.kind,
        amountSubunits: Number(value.amountSubunits),
        earningCategory: value.earningCategory,
        operationReason: value.operationReason,
        sourceReceiptRef,
        origin,
    };
    const semantics = semanticBody({
        semanticSubjectFingerprint: base.semanticSubjectFingerprint,
        accountScopeHash: base.accountScopeHash,
        currency: base.currency,
        kind: base.kind,
        amountSubunits: base.amountSubunits,
        earningCategory: base.earningCategory,
        operationReason: base.operationReason,
        sourceReceiptRef: base.sourceReceiptRef,
        origin: base.origin,
    });
    const result = deepFreeze({
        ...base,
        semanticFingerprint: (0, decision_registry_1.hashCanonicalBody)(semantics),
        operationFingerprint: (0, decision_registry_1.hashCanonicalBody)(base),
    });
    if (materialized && (value.semanticFingerprint !== result.semanticFingerprint || value.operationFingerprint !== result.operationFingerprint)) {
        throw new Error("wallet_operation_invalid");
    }
    return result;
};
exports.createWalletAuthorizedOperation = createWalletAuthorizedOperation;
const legacyWholeStarsToSubunits = (wholeStars) => {
    if (!validSafe(wholeStars) || Number(wholeStars) > MAX_AMOUNT_SUBUNITS / exports.WALLET_SUBUNITS_PER_STAR) {
        throw new Error("legacy_wallet_balance_invalid");
    }
    return Number(wholeStars) * exports.WALLET_SUBUNITS_PER_STAR;
};
exports.legacyWholeStarsToSubunits = legacyWholeStarsToSubunits;
const projectRepeatRewardSubunits = (input) => {
    const value = detached(input, "repeat_reward_projection_invalid");
    if (!isRecord(value) || !exactKeys(value, ["referenceNextPriceStars", "rateBasisPoints", "policyFingerprint"]) ||
        ![45, 50, 55, 60, 65].includes(Number(value.referenceNextPriceStars)) ||
        !validSafe(value.referenceNextPriceStars, 1) || !validHash(value.policyFingerprint)) {
        throw new Error("repeat_reward_price_invalid");
    }
    if (![0, 500, 1_200, 2_000].includes(Number(value.rateBasisPoints)))
        throw new Error("repeat_reward_rate_unapproved");
    const rewardSubunits = Number(value.referenceNextPriceStars) * Number(value.rateBasisPoints);
    if (!Number.isSafeInteger(rewardSubunits))
        throw new Error("repeat_reward_overflow");
    return deepFreeze({
        schemaVersion: "learning-v2-repeat-reward-subunits.v1",
        referenceNextPriceStars: Number(value.referenceNextPriceStars),
        rateBasisPoints: Number(value.rateBasisPoints),
        policyFingerprint: value.policyFingerprint,
        rewardSubunits,
    });
};
exports.projectRepeatRewardSubunits = projectRepeatRewardSubunits;
//# sourceMappingURL=wallet.js.map