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
exports.decisionRegistryObjectPath = exports.finalizeLearningV2AccessPurchase = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const decision_registry_1 = require("../../modules/learning-v2/policies/decision_registry");
Object.defineProperty(exports, "decisionRegistryObjectPath", { enumerable: true, get: function () { return decision_registry_1.decisionRegistryObjectPath; } });
const learning_v2_decision_registry_resolver_1 = require("./learning_v2_decision_registry_resolver");
const learning_v2_access_adapter_1 = require("./learning_v2_access_adapter");
const learning_v2_access_callable_1 = require("./learning_v2_access_callable");
const gatePath = (stableId, seasonId, gateId) => `users/${stableId}/v2_gate_receipts/${seasonId}__${gateId}`;
exports.finalizeLearningV2AccessPurchase = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const input = (0, learning_v2_access_callable_1.normalizeV2AccessPurchaseInput)(request.data);
    (0, learning_v2_access_callable_1.assertV2AccessStableIdentity)(input, request.auth?.uid);
    const db = admin.firestore();
    const gateSnapshot = await db.doc(gatePath(input.stableId, input.request.seasonId, input.request.gateId)).get();
    const gate = gateSnapshot.data();
    const registryRef = gate?.decisionRegistryRef;
    if (!registryRef ||
        typeof registryRef.id !== 'string' ||
        !Number.isSafeInteger(registryRef.version) ||
        typeof registryRef.contentHash !== 'string') {
        throw new https_1.HttpsError('failed-precondition', 'decision_registry_ref_unavailable');
    }
    const artifact = await (0, learning_v2_decision_registry_resolver_1.resolvePinnedV2AccessPolicy)({
        download: async (objectPath) => {
            const [bytes] = await admin.storage().bucket().file(objectPath).download();
            return bytes;
        },
    }, registryRef);
    if (artifact.access.policyVersion !== registryRef.version) {
        throw new https_1.HttpsError('failed-precondition', 'decision_registry_version_mismatch');
    }
    return (0, learning_v2_access_callable_1.executeV2AccessPurchaseCallable)(request, {
        repository: (0, learning_v2_access_adapter_1.makeFirestoreV2AccessRepository)(db),
        resolvePolicy: async () => artifact.access.policy,
        decisionRegistryRef: registryRef,
    });
});
//# sourceMappingURL=learning_v2_access_production_callable.js.map