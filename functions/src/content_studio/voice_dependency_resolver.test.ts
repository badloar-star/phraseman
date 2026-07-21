import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { resolveVoiceDependencies, type VoiceDependencyReader } from "./voice_dependency_resolver";

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
  calibration: { receiptId: "cal-1", version: 1, contentHash: hashCanonicalBody(calibrationBody) },
  policy: { policyId: "pol-1", version: 1, contentHash: hashCanonicalBody(policyBody) },
  egress: { gatewayId: "voice-network-egress" as const, version: 1, contentHash: hashCanonicalBody(egressBody) },
};

function reader(): VoiceDependencyReader {
  return {
    async readCalibration() { return { body: calibrationBody, status: "approved", contentHash: refs.calibration.contentHash, identity: { receiptId: "cal-1", version: 1 } }; },
    async readPolicy() { return { body: policyBody, status: "approved", contentHash: refs.policy.contentHash, identity: { policyId: "pol-1", version: 1 } }; },
    async readEgress() { return { body: egressBody, status: "deployed", contentHash: refs.egress.contentHash, identity: { gatewayId: "voice-network-egress", version: 1 } }; },
  };
}

describe("voice dependency resolver", () => {
  it("accepts exact approved/deployed immutable dependencies", async () => {
    await expect(resolveVoiceDependencies(reader(), { ...refs, activePolicyRegistryKey: "policy-key", requiredNetworkPurposes: ["recognition"], environment: "staging" })).resolves.toBeUndefined();
  });

  it("fails closed when a required purpose is absent", async () => {
    await expect(resolveVoiceDependencies(reader(), { ...refs, activePolicyRegistryKey: "policy-key", requiredNetworkPurposes: ["speech_scoring"], environment: "staging" })).rejects.toThrow("voice_policy_purpose_missing");
  });

  it("fails closed on an unsafe egress contract", async () => {
    const unsafe = { ...egressBody, directProviderCallsAllowed: true };
    const unsafeReader = { ...reader(), readEgress: async () => ({ body: unsafe, status: "deployed", contentHash: hashCanonicalBody(unsafe), identity: { gatewayId: "voice-network-egress", version: 1 } }) };
    await expect(resolveVoiceDependencies(unsafeReader, { ...refs, egress: { ...refs.egress, contentHash: hashCanonicalBody(unsafe) }, activePolicyRegistryKey: "policy-key", requiredNetworkPurposes: ["recognition"], environment: "staging" })).rejects.toThrow("voice_egress_contract_invalid");
  });
});
