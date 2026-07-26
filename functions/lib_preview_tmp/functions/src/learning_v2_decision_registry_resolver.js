"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePinnedV2AccessPolicy = resolvePinnedV2AccessPolicy;
const access_boost_1 = require("../../modules/learning-v2/contracts/access_boost");
const decision_registry_1 = require("../../modules/learning-v2/policies/decision_registry");
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const decodeArtifact = (value) => {
    if (typeof value === 'string')
        return JSON.parse(value);
    if (value instanceof Uint8Array)
        return JSON.parse(new TextDecoder().decode(value));
    return value;
};
async function resolvePinnedV2AccessPolicy(store, ref) {
    if (!isRecord(ref) ||
        typeof ref.id !== 'string' ||
        !/^[A-Za-z0-9._-]{1,160}$/.test(ref.id) ||
        !Number.isSafeInteger(ref.version) ||
        ref.version < 1 ||
        !/^[a-f0-9]{64}$/.test(ref.contentHash)) {
        throw new Error('decision_registry_ref_invalid');
    }
    const objectPath = (0, decision_registry_1.decisionRegistryObjectPath)(ref.id, ref.version, ref.contentHash);
    let downloaded;
    try {
        downloaded = await store.download(objectPath);
    }
    catch {
        throw new Error('decision_registry_artifact_unavailable');
    }
    let artifact;
    try {
        artifact = decodeArtifact(downloaded);
    }
    catch {
        throw new Error('decision_registry_artifact_invalid');
    }
    let registry;
    try {
        registry = (0, decision_registry_1.resolveDecisionRegistry)(artifact);
    }
    catch {
        throw new Error('decision_registry_artifact_invalid');
    }
    if (registry.record.ref.id !== ref.id ||
        registry.record.ref.version !== ref.version ||
        registry.record.ref.contentHash !== ref.contentHash) {
        throw new Error('decision_registry_ref_mismatch');
    }
    return { registry, access: (0, access_boost_1.accessBoostPolicyFromRegistry)(registry) };
}
//# sourceMappingURL=learning_v2_decision_registry_resolver.js.map