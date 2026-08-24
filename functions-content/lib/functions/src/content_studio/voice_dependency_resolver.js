"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVoiceDependencies = resolveVoiceDependencies;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
function assertRecord(record, expectedHash, identity, status) {
    if (!record || !record.body || typeof record.body !== "object")
        throw new Error("voice_dependency_missing");
    if (record.status !== status || record.contentHash !== expectedHash || (0, decision_registry_1.hashCanonicalBody)(record.body) !== expectedHash)
        throw new Error("voice_dependency_binding_invalid");
    for (const [key, value] of Object.entries(identity))
        if (record.identity[key] !== value)
            throw new Error("voice_dependency_identity_invalid");
    return record;
}
async function resolveVoiceDependencies(reader, args) {
    const calibration = assertRecord(await reader.readCalibration(args.calibration), args.calibration.contentHash, { receiptId: args.calibration.receiptId, version: args.calibration.version }, "approved");
    const calibrationBody = calibration.body;
    if (typeof calibrationBody.expiresAt !== "string" || Date.parse(calibrationBody.expiresAt) <= Date.now())
        throw new Error("voice_calibration_expired");
    const policy = assertRecord(await reader.readPolicy(args.policy, args.activePolicyRegistryKey), args.policy.contentHash, { policyId: args.policy.policyId, version: args.policy.version }, "approved");
    const policyBody = policy.body;
    if (typeof policyBody.expiresAt !== "string" || Date.parse(policyBody.expiresAt) <= Date.now())
        throw new Error("voice_policy_expired");
    const processors = Array.isArray(policyBody.processors) ? policyBody.processors : [];
    const purposes = new Set(processors.filter((p) => !!p && typeof p === "object").map((p) => p.purpose).filter((p) => typeof p === "string"));
    if (args.requiredNetworkPurposes.some((purpose) => !purposes.has(purpose)))
        throw new Error("voice_policy_purpose_missing");
    const egress = assertRecord(await reader.readEgress(args.egress, args.environment), args.egress.contentHash, { gatewayId: "voice-network-egress", version: args.egress.version }, "deployed");
    const egressBody = egress.body;
    if (egressBody.environment !== args.environment || egressBody.dispatchLifecycleProtocol !== "reservation-consume-settle-reconcile.v1" || egressBody.providerFinalityContract !== "terminal-no-future-writes.v1" || egressBody.dispatchDeletionBinding !== "operation-target-settlement-hash.v1" || egressBody.directProviderCallsAllowed !== false || egressBody.requiresSingleUseReservation !== true)
        throw new Error("voice_egress_contract_invalid");
}
//# sourceMappingURL=voice_dependency_resolver.js.map