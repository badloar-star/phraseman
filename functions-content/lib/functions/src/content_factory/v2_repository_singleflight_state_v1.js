"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_REPOSITORY_SINGLEFLIGHT_MAX_LEASE_SECONDS_V1 = exports.V2_REPOSITORY_SINGLEFLIGHT_MIN_LEASE_SECONDS_V1 = exports.V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_MAX_BYTES_V1 = exports.V2_REPOSITORY_SINGLEFLIGHT_MAX_STATE_BYTES_V1 = exports.V2_REPOSITORY_SINGLEFLIGHT_COMMITTED_SCHEMA_V1 = exports.V2_REPOSITORY_SINGLEFLIGHT_CLAIM_SCHEMA_V1 = exports.V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_PREFIX_V1 = exports.V2_REPOSITORY_SINGLEFLIGHT_COLLECTION_V1 = void 0;
exports.v2RepositorySingleflightDocumentPathV1 = v2RepositorySingleflightDocumentPathV1;
exports.parseV2RepositorySingleflightStateV1 = parseV2RepositorySingleflightStateV1;
exports.serializeV2RepositorySingleflightStateV1 = serializeV2RepositorySingleflightStateV1;
exports.decideV2RepositorySingleflightClaimV1 = decideV2RepositorySingleflightClaimV1;
exports.decideV2RepositorySingleflightFinalizeV1 = decideV2RepositorySingleflightFinalizeV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_firebase_repository_trust_root_v1_1 = require("./v2_firebase_repository_trust_root_v1");
exports.V2_REPOSITORY_SINGLEFLIGHT_COLLECTION_V1 = v2_firebase_repository_trust_root_v1_1.V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.firestore.repositoryAuthState;
exports.V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_PREFIX_V1 = v2_firebase_repository_trust_root_v1_1.V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage
    .repositoryOriginReceiptPrefix;
exports.V2_REPOSITORY_SINGLEFLIGHT_CLAIM_SCHEMA_V1 = "v2-repository-singleflight-claim.v1";
exports.V2_REPOSITORY_SINGLEFLIGHT_COMMITTED_SCHEMA_V1 = "v2-repository-singleflight-committed.v1";
exports.V2_REPOSITORY_SINGLEFLIGHT_MAX_STATE_BYTES_V1 = 32 * 1024;
exports.V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_MAX_BYTES_V1 = 64 * 1024;
exports.V2_REPOSITORY_SINGLEFLIGHT_MIN_LEASE_SECONDS_V1 = 60;
exports.V2_REPOSITORY_SINGLEFLIGHT_MAX_LEASE_SECONDS_V1 = 900;
const HASH_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[A-Za-z0-9._:-]{32,256}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_EPOCH = 1_000_000;
const CLAIM_KEYS = Object.freeze([
    "schemaVersion",
    "state",
    "planFingerprint",
    "courseContractFingerprint",
    "repositoryScopeFingerprint",
    "resolverContractFingerprint",
    "requestFingerprint",
    "claimEpoch",
    "claimTokenHash",
    "leaseExpiresAtEpochMs",
    "operationRevision",
    "createdAtEpochMs",
    "updatedAtEpochMs",
    "operationFingerprint",
]);
const COMMITTED_KEYS = Object.freeze([
    "schemaVersion",
    "state",
    "planFingerprint",
    "courseContractFingerprint",
    "repositoryScopeFingerprint",
    "resolverContractFingerprint",
    "requestFingerprint",
    "claimEpoch",
    "receiptFingerprint",
    "receiptPin",
    "operationRevision",
    "createdAtEpochMs",
    "committedAtEpochMs",
    "operationFingerprint",
]);
const PIN_KEYS = Object.freeze([
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
]);
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, expected, code) {
    if (!isRecord(value))
        fail(code);
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length ||
        actual.some((key, index) => key !== wanted[index])) {
        fail(code);
    }
}
function exactHash(value, code) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail(code);
    return value;
}
function exactInteger(value, min, max, code) {
    if (!Number.isSafeInteger(value) ||
        Number(value) < min ||
        Number(value) > max) {
        fail(code);
    }
    return Number(value);
}
function normalizeIdentity(value, code) {
    exactKeys(value, [
        "planFingerprint",
        "courseContractFingerprint",
        "repositoryScopeFingerprint",
        "resolverContractFingerprint",
        "requestFingerprint",
    ], code);
    return Object.freeze({
        planFingerprint: exactHash(value.planFingerprint, code),
        courseContractFingerprint: exactHash(value.courseContractFingerprint, code),
        repositoryScopeFingerprint: exactHash(value.repositoryScopeFingerprint, code),
        resolverContractFingerprint: exactHash(value.resolverContractFingerprint, code),
        requestFingerprint: exactHash(value.requestFingerprint, code),
    });
}
function identityMatches(state, identity) {
    return (state.planFingerprint === identity.planFingerprint &&
        state.courseContractFingerprint === identity.courseContractFingerprint &&
        state.repositoryScopeFingerprint === identity.repositoryScopeFingerprint &&
        state.resolverContractFingerprint ===
            identity.resolverContractFingerprint &&
        state.requestFingerprint === identity.requestFingerprint);
}
function stateBody(state) {
    return state;
}
function deepFreeze(value) {
    if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) {
            deepFreeze(child);
        }
        Object.freeze(value);
    }
    return value;
}
function parsePin(value, planFingerprint, receiptFingerprint) {
    const code = "v2_repository_singleflight_receipt_pin_invalid";
    exactKeys(value, PIN_KEYS, code);
    const expectedPath = `${exports.V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_PREFIX_V1}/${planFingerprint}/${receiptFingerprint}.json`;
    if (value.objectPath !== expectedPath ||
        typeof value.objectGeneration !== "string" ||
        !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) ||
        Number(value.byteSize) < 1 ||
        Number(value.byteSize) > exports.V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_MAX_BYTES_V1) {
        fail(code);
    }
    const contentHash = exactHash(value.contentHash, code);
    return Object.freeze({
        objectPath: expectedPath,
        contentHash,
        objectGeneration: value.objectGeneration,
        byteSize: Number(value.byteSize),
    });
}
function parseClaim(value) {
    const code = "v2_repository_singleflight_claim_invalid";
    exactKeys(value, CLAIM_KEYS, code);
    const identity = Object.freeze({
        planFingerprint: exactHash(value.planFingerprint, code),
        courseContractFingerprint: exactHash(value.courseContractFingerprint, code),
        repositoryScopeFingerprint: exactHash(value.repositoryScopeFingerprint, code),
        resolverContractFingerprint: exactHash(value.resolverContractFingerprint, code),
        requestFingerprint: exactHash(value.requestFingerprint, code),
    });
    if (value.schemaVersion !== exports.V2_REPOSITORY_SINGLEFLIGHT_CLAIM_SCHEMA_V1 ||
        value.state !== "claiming") {
        fail(code);
    }
    const claimEpoch = exactInteger(value.claimEpoch, 1, MAX_EPOCH, code);
    const operationRevision = exactInteger(value.operationRevision, 1, MAX_EPOCH, code);
    const createdAtEpochMs = exactInteger(value.createdAtEpochMs, 0, Number.MAX_SAFE_INTEGER, code);
    const updatedAtEpochMs = exactInteger(value.updatedAtEpochMs, createdAtEpochMs, Number.MAX_SAFE_INTEGER, code);
    const leaseExpiresAtEpochMs = exactInteger(value.leaseExpiresAtEpochMs, updatedAtEpochMs + exports.V2_REPOSITORY_SINGLEFLIGHT_MIN_LEASE_SECONDS_V1 * 1000, updatedAtEpochMs + exports.V2_REPOSITORY_SINGLEFLIGHT_MAX_LEASE_SECONDS_V1 * 1000, code);
    const base = {
        schemaVersion: exports.V2_REPOSITORY_SINGLEFLIGHT_CLAIM_SCHEMA_V1,
        state: "claiming",
        ...identity,
        claimEpoch,
        claimTokenHash: exactHash(value.claimTokenHash, code),
        leaseExpiresAtEpochMs,
        operationRevision,
        createdAtEpochMs,
        updatedAtEpochMs,
    };
    const operationFingerprint = exactHash(value.operationFingerprint, code);
    if (operationFingerprint !== (0, decision_registry_1.hashCanonicalBody)(stateBody(base)))
        fail(code);
    return deepFreeze({ ...base, operationFingerprint });
}
function parseCommitted(value) {
    const code = "v2_repository_singleflight_committed_invalid";
    exactKeys(value, COMMITTED_KEYS, code);
    const identity = Object.freeze({
        planFingerprint: exactHash(value.planFingerprint, code),
        courseContractFingerprint: exactHash(value.courseContractFingerprint, code),
        repositoryScopeFingerprint: exactHash(value.repositoryScopeFingerprint, code),
        resolverContractFingerprint: exactHash(value.resolverContractFingerprint, code),
        requestFingerprint: exactHash(value.requestFingerprint, code),
    });
    if (value.schemaVersion !== exports.V2_REPOSITORY_SINGLEFLIGHT_COMMITTED_SCHEMA_V1 ||
        value.state !== "committed") {
        fail(code);
    }
    const claimEpoch = exactInteger(value.claimEpoch, 1, MAX_EPOCH, code);
    const operationRevision = exactInteger(value.operationRevision, 2, MAX_EPOCH, code);
    const createdAtEpochMs = exactInteger(value.createdAtEpochMs, 0, Number.MAX_SAFE_INTEGER, code);
    const committedAtEpochMs = exactInteger(value.committedAtEpochMs, createdAtEpochMs, Number.MAX_SAFE_INTEGER, code);
    const receiptFingerprint = exactHash(value.receiptFingerprint, code);
    const receiptPin = parsePin(value.receiptPin, identity.planFingerprint, receiptFingerprint);
    const base = {
        schemaVersion: exports.V2_REPOSITORY_SINGLEFLIGHT_COMMITTED_SCHEMA_V1,
        state: "committed",
        ...identity,
        claimEpoch,
        receiptFingerprint,
        receiptPin,
        operationRevision,
        createdAtEpochMs,
        committedAtEpochMs,
    };
    const operationFingerprint = exactHash(value.operationFingerprint, code);
    if (operationFingerprint !== (0, decision_registry_1.hashCanonicalBody)(stateBody(base)))
        fail(code);
    return deepFreeze({ ...base, operationFingerprint });
}
function v2RepositorySingleflightDocumentPathV1(planFingerprint) {
    return `${exports.V2_REPOSITORY_SINGLEFLIGHT_COLLECTION_V1}/${exactHash(planFingerprint, "v2_repository_singleflight_plan_invalid")}`;
}
function parseV2RepositorySingleflightStateV1(raw) {
    const code = "v2_repository_singleflight_state_invalid";
    if (typeof raw !== "string" ||
        raw.length < 2 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_REPOSITORY_SINGLEFLIGHT_MAX_STATE_BYTES_V1) {
        fail(code);
    }
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail(code);
    }
    if (!isRecord(value))
        fail(code);
    const parsed = value.state === "claiming"
        ? parseClaim(value)
        : value.state === "committed"
            ? parseCommitted(value)
            : fail(code);
    if ((0, decision_registry_1.canonicalJsonV1)(parsed) !== raw)
        fail(code);
    return parsed;
}
function serializeV2RepositorySingleflightStateV1(value) {
    const raw = (0, decision_registry_1.canonicalJsonV1)(value);
    const parsed = parseV2RepositorySingleflightStateV1(raw);
    return (0, decision_registry_1.canonicalJsonV1)(parsed);
}
function parseCurrent(raw) {
    return raw === null ? null : parseV2RepositorySingleflightStateV1(raw);
}
function normalizedClaimInput(input) {
    const code = "v2_repository_singleflight_claim_input_invalid";
    exactKeys(input, ["identity", "claimToken", "nowEpochMs", "leaseSeconds"], code);
    const identity = normalizeIdentity(input.identity, code);
    if (typeof input.claimToken !== "string" ||
        !TOKEN_RE.test(input.claimToken)) {
        fail(code);
    }
    const nowEpochMs = exactInteger(input.nowEpochMs, 0, Number.MAX_SAFE_INTEGER, code);
    const leaseSeconds = exactInteger(input.leaseSeconds, exports.V2_REPOSITORY_SINGLEFLIGHT_MIN_LEASE_SECONDS_V1, exports.V2_REPOSITORY_SINGLEFLIGHT_MAX_LEASE_SECONDS_V1, code);
    const leaseExpiresAtEpochMs = nowEpochMs + leaseSeconds * 1000;
    if (!Number.isSafeInteger(leaseExpiresAtEpochMs))
        fail(code);
    return Object.freeze({
        identity,
        claimTokenHash: (0, decision_registry_1.sha256Utf8)(input.claimToken),
        nowEpochMs,
        leaseExpiresAtEpochMs,
    });
}
function materializeClaim(input) {
    const base = {
        schemaVersion: exports.V2_REPOSITORY_SINGLEFLIGHT_CLAIM_SCHEMA_V1,
        state: "claiming",
        ...input.identity,
        claimEpoch: input.claimEpoch,
        claimTokenHash: input.claimTokenHash,
        leaseExpiresAtEpochMs: input.leaseExpiresAtEpochMs,
        operationRevision: input.operationRevision,
        createdAtEpochMs: input.createdAtEpochMs,
        updatedAtEpochMs: input.updatedAtEpochMs,
    };
    return deepFreeze({
        ...base,
        operationFingerprint: (0, decision_registry_1.hashCanonicalBody)(stateBody(base)),
    });
}
function decideV2RepositorySingleflightClaimV1(input) {
    const code = "v2_repository_singleflight_claim_input_invalid";
    exactKeys(input, ["currentRaw", "identity", "claimToken", "nowEpochMs", "leaseSeconds"], code);
    if (input.currentRaw !== null && typeof input.currentRaw !== "string") {
        fail(code);
    }
    const normalized = normalizedClaimInput({
        identity: input.identity,
        claimToken: input.claimToken,
        nowEpochMs: input.nowEpochMs,
        leaseSeconds: input.leaseSeconds,
    });
    const current = parseCurrent(input.currentRaw);
    const documentPath = v2RepositorySingleflightDocumentPathV1(normalized.identity.planFingerprint);
    if (current === null) {
        const next = materializeClaim({
            identity: normalized.identity,
            claimEpoch: 1,
            claimTokenHash: normalized.claimTokenHash,
            leaseExpiresAtEpochMs: normalized.leaseExpiresAtEpochMs,
            operationRevision: 1,
            createdAtEpochMs: normalized.nowEpochMs,
            updatedAtEpochMs: normalized.nowEpochMs,
        });
        return Object.freeze({
            kind: "create",
            command: Object.freeze({
                documentPath,
                expectedOperationRevision: null,
                expectedOperationFingerprint: null,
                next,
            }),
        });
    }
    if (!identityMatches(current, normalized.identity)) {
        fail("v2_repository_singleflight_identity_conflict");
    }
    if (current.state === "committed") {
        return Object.freeze({
            kind: "exact_replay",
            documentPath,
            committed: current,
        });
    }
    if (normalized.nowEpochMs < current.updatedAtEpochMs) {
        fail("v2_repository_singleflight_clock_invalid");
    }
    if (normalized.nowEpochMs < current.leaseExpiresAtEpochMs) {
        return Object.freeze({
            kind: "in_progress",
            documentPath,
            claimEpoch: current.claimEpoch,
            retryAtEpochMs: current.leaseExpiresAtEpochMs,
            operationFingerprint: current.operationFingerprint,
        });
    }
    if (current.claimEpoch >= MAX_EPOCH ||
        current.operationRevision >= MAX_EPOCH) {
        fail("v2_repository_singleflight_epoch_exhausted");
    }
    if (current.claimTokenHash === normalized.claimTokenHash) {
        fail("v2_repository_singleflight_takeover_token_reused");
    }
    const next = materializeClaim({
        identity: normalized.identity,
        claimEpoch: current.claimEpoch + 1,
        claimTokenHash: normalized.claimTokenHash,
        leaseExpiresAtEpochMs: normalized.leaseExpiresAtEpochMs,
        operationRevision: current.operationRevision + 1,
        createdAtEpochMs: current.createdAtEpochMs,
        updatedAtEpochMs: normalized.nowEpochMs,
    });
    return Object.freeze({
        kind: "stale_takeover",
        command: Object.freeze({
            documentPath,
            expectedOperationRevision: current.operationRevision,
            expectedOperationFingerprint: current.operationFingerprint,
            next,
        }),
    });
}
function decideV2RepositorySingleflightFinalizeV1(input) {
    const code = "v2_repository_singleflight_finalize_input_invalid";
    exactKeys(input, [
        "currentRaw",
        "identity",
        "claimEpoch",
        "claimToken",
        "nowEpochMs",
        "receiptFingerprint",
        "receiptPin",
    ], code);
    if (typeof input.currentRaw !== "string")
        fail(code);
    const identity = normalizeIdentity(input.identity, code);
    const claimEpoch = exactInteger(input.claimEpoch, 1, MAX_EPOCH, code);
    if (typeof input.claimToken !== "string" ||
        !TOKEN_RE.test(input.claimToken)) {
        fail(code);
    }
    const claimTokenHash = (0, decision_registry_1.sha256Utf8)(input.claimToken);
    const nowEpochMs = exactInteger(input.nowEpochMs, 0, Number.MAX_SAFE_INTEGER, code);
    const receiptFingerprint = exactHash(input.receiptFingerprint, code);
    const receiptPin = parsePin(input.receiptPin, identity.planFingerprint, receiptFingerprint);
    const current = parseV2RepositorySingleflightStateV1(input.currentRaw);
    const documentPath = v2RepositorySingleflightDocumentPathV1(identity.planFingerprint);
    if (!identityMatches(current, identity)) {
        fail("v2_repository_singleflight_identity_conflict");
    }
    if (current.state === "committed") {
        if (current.receiptFingerprint !== receiptFingerprint ||
            (0, decision_registry_1.canonicalJsonV1)(current.receiptPin) !== (0, decision_registry_1.canonicalJsonV1)(receiptPin)) {
            fail("v2_repository_singleflight_commit_conflict");
        }
        return Object.freeze({
            kind: "exact_replay",
            documentPath,
            committed: current,
        });
    }
    if (current.claimEpoch !== claimEpoch ||
        current.claimTokenHash !== claimTokenHash) {
        fail("v2_repository_singleflight_claim_lost");
    }
    if (nowEpochMs < current.updatedAtEpochMs ||
        nowEpochMs >= current.leaseExpiresAtEpochMs) {
        fail("v2_repository_singleflight_lease_expired");
    }
    if (current.operationRevision >= MAX_EPOCH) {
        fail("v2_repository_singleflight_epoch_exhausted");
    }
    const base = {
        schemaVersion: exports.V2_REPOSITORY_SINGLEFLIGHT_COMMITTED_SCHEMA_V1,
        state: "committed",
        ...identity,
        claimEpoch,
        receiptFingerprint,
        receiptPin,
        operationRevision: current.operationRevision + 1,
        createdAtEpochMs: current.createdAtEpochMs,
        committedAtEpochMs: nowEpochMs,
    };
    const next = deepFreeze({
        ...base,
        operationFingerprint: (0, decision_registry_1.hashCanonicalBody)(stateBody(base)),
    });
    return Object.freeze({
        kind: "finalize",
        command: Object.freeze({
            documentPath,
            expectedOperationRevision: current.operationRevision,
            expectedOperationFingerprint: current.operationFingerprint,
            next,
        }),
    });
}
//# sourceMappingURL=v2_repository_singleflight_state_v1.js.map