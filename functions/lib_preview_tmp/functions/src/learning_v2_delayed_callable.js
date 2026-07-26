"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeLearningV2DelayedCandidate = exports.V2_DELAYED_CALLABLE_OPTIONS = void 0;
exports.normalizeDelayedCallableInput = normalizeDelayedCallableInput;
exports.delayedFirestorePath = delayedFirestorePath;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const decision_registry_1 = require("../../modules/learning-v2/policies/decision_registry");
const learning_v2_delayed_adapter_1 = require("./learning_v2_delayed_adapter");
const progress_event_callable_1 = require("./learning_v2/progress_event_callable");
const text = (value) => typeof value === "string" ? value.trim() : "";
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
exports.V2_DELAYED_CALLABLE_OPTIONS = {
    enforceAppCheck: true,
    region: "us-central1",
    timeoutSeconds: 15,
    memory: "256MiB",
};
function normalizeDelayedCallableInput(data) {
    if (!record(data))
        throw new https_1.HttpsError("invalid-argument", "delayed_input_invalid");
    const operationId = text(data.operationId);
    const stableId = text(data.stableId);
    const accountGeneration = Number(data.accountGeneration);
    const candidate = data.candidate;
    const assignmentRef = data.assignmentRef;
    const launchReceiptRef = data.launchReceiptRef;
    const probeRef = data.probeRef;
    const expectedTupleKeys = data.expectedTupleKeys;
    const timingReceiptId = text(data.timingReceiptId);
    const failureReceiptId = text(data.failureReceiptId);
    const windowPolicyId = text(data.windowPolicyId);
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(operationId) ||
        !stableId ||
        !Number.isSafeInteger(accountGeneration) ||
        accountGeneration < 1 ||
        !record(candidate) ||
        !record(assignmentRef) ||
        !record(launchReceiptRef) ||
        !record(probeRef) ||
        !Array.isArray(expectedTupleKeys) ||
        !expectedTupleKeys.every((key) => typeof key === "string") ||
        !timingReceiptId ||
        !failureReceiptId ||
        !windowPolicyId)
        throw new https_1.HttpsError("invalid-argument", "delayed_input_invalid");
    return Object.freeze({
        operationId,
        stableId,
        accountGeneration,
        candidate,
        assignmentRef: {
            assignmentId: text(assignmentRef.assignmentId),
            contentHash: text(assignmentRef.contentHash),
        },
        launchReceiptRef: {
            launchId: text(launchReceiptRef.launchId),
            contentHash: text(launchReceiptRef.contentHash),
        },
        probeRef: {
            probeId: text(probeRef.probeId),
            contentHash: text(probeRef.contentHash),
        },
        expectedTupleKeys: Object.freeze([...expectedTupleKeys]),
        timingReceiptId,
        failureReceiptId,
        windowPolicyId,
    });
}
function delayedFirestorePath(key) {
    const safe = (value) => /^[A-Za-z0-9._-]{1,192}$/.test(value) && value !== "." && value !== "..";
    const scoped = (prefix, collection) => {
        if (!key.startsWith(prefix))
            return undefined;
        const parts = key.slice(prefix.length).split(":");
        if (parts.length !== 2 || parts.some((part) => !safe(part))) {
            throw new Error("delayed_firestore_key_invalid");
        }
        return `users/${parts[0]}/${collection}/${parts[1]}`;
    };
    const mapped = (() => {
        if (!key.startsWith("auth_links:"))
            return undefined;
        const authUid = key.slice("auth_links:".length);
        if (!authUid || authUid.length > 128 || authUid.includes("/")) {
            throw new Error("delayed_firestore_key_invalid");
        }
        return `auth_links/${authUid}`;
    })() ??
        (() => {
            if (!key.startsWith("users:"))
                return undefined;
            const stableId = key.slice("users:".length);
            if (!safe(stableId))
                throw new Error("delayed_firestore_key_invalid");
            return `users/${stableId}`;
        })() ??
        (() => {
            if (!key.startsWith("account_deletion_tombstones:"))
                return undefined;
            const stableId = key.slice("account_deletion_tombstones:".length);
            if (!safe(stableId))
                throw new Error("delayed_firestore_key_invalid");
            return `account_deletion_tombstones/${stableId}`;
        })() ??
        scoped("learning_v2_assignments:", "v2_delayed_assignments") ??
        scoped("learning_v2_launches:", "v2_delayed_launches") ??
        scoped("learning_v2_timing_receipts:", "v2_delayed_timing_receipts") ??
        scoped("learning_v2_failure_receipts:", "v2_delayed_failure_receipts") ??
        scoped("learning_v2_delayed_terminals:", "v2_delayed_attempts") ??
        scoped("learning-v2:delayed:", "v2_delayed_operations");
    if (mapped)
        return mapped;
    throw new Error("delayed_firestore_key_invalid");
}
function makeRepository(db) {
    return {
        runTransaction: (fn) => db.runTransaction(async (transaction) => fn({
            get: async (key) => {
                const snapshot = await transaction.get(db.doc(delayedFirestorePath(key)));
                return {
                    exists: snapshot.exists,
                    data: snapshot.exists ? snapshot.data() : undefined,
                };
            },
            create: (key, value) => transaction.create(db.doc(delayedFirestorePath(key)), value),
        })),
    };
}
exports.finalizeLearningV2DelayedCandidate = (0, https_1.onCall)(exports.V2_DELAYED_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "auth_required");
    const input = normalizeDelayedCallableInput(request.data);
    // Stable identity and generation are server-owned, exactly as for the
    // regular V2 progress callable. The fields remain in the legacy request
    // envelope for backwards compatibility, but are only accepted when they
    // match the canonical auth anchor and current account generation.
    const binding = await (0, progress_event_callable_1.createProgressEventAuthorization)(admin.firestore())(request.auth.uid);
    if (typeof binding === "string" ||
        input.stableId !== binding.stableUid ||
        input.accountGeneration !== binding.accountGeneration)
        throw new https_1.HttpsError("permission-denied", "stable_identity_mismatch");
    const now = Date.now();
    const adapterInput = {
        ...input,
        authUid: request.auth.uid,
        stableId: binding.stableUid,
        accountGeneration: binding.accountGeneration,
        fingerprint: (0, decision_registry_1.hashCanonicalBody)({ ...input, candidate: input.candidate }),
        acceptedAtServer: new Date(now).toISOString(),
        observedDelayMs: 0,
        serverDecision: { kind: "timed", window: "inside_pinned_window" },
        nowMs: now,
    };
    const result = await (0, learning_v2_delayed_adapter_1.finalizeDelayedCandidate)(makeRepository(admin.firestore()), adapterInput);
    return { ok: true, replayed: result.replayed, receipt: result.receipt };
});
//# sourceMappingURL=learning_v2_delayed_callable.js.map