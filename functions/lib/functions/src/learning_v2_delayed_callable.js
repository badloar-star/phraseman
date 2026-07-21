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
exports.finalizeLearningV2DelayedCandidate = void 0;
exports.normalizeDelayedCallableInput = normalizeDelayedCallableInput;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const decision_registry_1 = require("../../modules/learning-v2/policies/decision_registry");
const learning_v2_delayed_adapter_1 = require("./learning_v2_delayed_adapter");
const text = (value) => typeof value === "string" ? value.trim() : "";
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
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
function firestorePath(key) {
    if (key.startsWith("learning_v2_assignments:"))
        return `learning_v2_assignments/${key.slice("learning_v2_assignments:".length)}`;
    if (key.startsWith("learning_v2_launches:"))
        return `learning_v2_launches/${key.slice("learning_v2_launches:".length)}`;
    if (key.startsWith("learning_v2_timing_receipts:"))
        return `learning_v2_timing_receipts/${key.slice("learning_v2_timing_receipts:".length)}`;
    if (key.startsWith("learning_v2_failure_receipts:"))
        return `learning_v2_failure_receipts/${key.slice("learning_v2_failure_receipts:".length)}`;
    if (key.startsWith("learning-v2:delayed:"))
        return `learning_v2_receipt_operations/${key.slice("learning-v2:delayed:".length).replace(/:/g, "_")}`;
    throw new Error("delayed_firestore_key_invalid");
}
function makeRepository(db) {
    return {
        runTransaction: (fn) => db.runTransaction(async (transaction) => fn({
            get: async (key) => {
                const snapshot = await transaction.get(db.doc(firestorePath(key)));
                return {
                    exists: snapshot.exists,
                    data: snapshot.exists ? snapshot.data() : undefined,
                };
            },
            create: (key, value) => transaction.create(db.doc(firestorePath(key)), value),
        })),
    };
}
exports.finalizeLearningV2DelayedCandidate = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "auth_required");
    const input = normalizeDelayedCallableInput(request.data);
    if (input.stableId !== request.auth.uid)
        throw new https_1.HttpsError("permission-denied", "stable_identity_mismatch");
    const now = Date.now();
    const adapterInput = {
        ...input,
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