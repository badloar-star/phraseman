"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const voice_dependency_resolver_1 = require("./voice_dependency_resolver");
const future = "2099-01-01T00:00:00.000Z";
const calibrationBody = { expiresAt: future };
const policyBody = { expiresAt: future, processors: [{ purpose: "recognition" }] };
const egressBody = {
    environment: "staging",
    dispatchLifecycleProtocol: "reservation-consume-settle-reconcile.v1",
    providerFinalityContract: "terminal-no-future-writes.v1",
    dispatchDeletionBinding: "operation-target-settlement-hash.v1",
    directProviderCallsAllowed: false,
    requiresSingleUseReservation: true,
};
const refs = {
    calibration: { receiptId: "cal-1", version: 1, contentHash: (0, decision_registry_1.hashCanonicalBody)(calibrationBody) },
    policy: { policyId: "pol-1", version: 1, contentHash: (0, decision_registry_1.hashCanonicalBody)(policyBody) },
    egress: { gatewayId: "voice-network-egress", version: 1, contentHash: (0, decision_registry_1.hashCanonicalBody)(egressBody) },
};
function reader() {
    return {
        async readCalibration() { return { body: calibrationBody, status: "approved", contentHash: refs.calibration.contentHash, identity: { receiptId: "cal-1", version: 1 } }; },
        async readPolicy() { return { body: policyBody, status: "approved", contentHash: refs.policy.contentHash, identity: { policyId: "pol-1", version: 1 } }; },
        async readEgress() { return { body: egressBody, status: "deployed", contentHash: refs.egress.contentHash, identity: { gatewayId: "voice-network-egress", version: 1 } }; },
    };
}
describe("voice dependency resolver", () => {
    it("accepts exact approved/deployed immutable dependencies", async () => {
        await expect((0, voice_dependency_resolver_1.resolveVoiceDependencies)(reader(), { ...refs, activePolicyRegistryKey: "policy-key", requiredNetworkPurposes: ["recognition"], environment: "staging" })).resolves.toBeUndefined();
    });
    it("fails closed when a required purpose is absent", async () => {
        await expect((0, voice_dependency_resolver_1.resolveVoiceDependencies)(reader(), { ...refs, activePolicyRegistryKey: "policy-key", requiredNetworkPurposes: ["speech_scoring"], environment: "staging" })).rejects.toThrow("voice_policy_purpose_missing");
    });
    it("fails closed on an unsafe egress contract", async () => {
        const unsafe = { ...egressBody, directProviderCallsAllowed: true };
        const unsafeReader = { ...reader(), readEgress: async () => ({ body: unsafe, status: "deployed", contentHash: (0, decision_registry_1.hashCanonicalBody)(unsafe), identity: { gatewayId: "voice-network-egress", version: 1 } }) };
        await expect((0, voice_dependency_resolver_1.resolveVoiceDependencies)(unsafeReader, { ...refs, egress: { ...refs.egress, contentHash: (0, decision_registry_1.hashCanonicalBody)(unsafe) }, activePolicyRegistryKey: "policy-key", requiredNetworkPurposes: ["recognition"], environment: "staging" })).rejects.toThrow("voice_egress_contract_invalid");
    });
});
//# sourceMappingURL=voice_dependency_resolver.test.js.map