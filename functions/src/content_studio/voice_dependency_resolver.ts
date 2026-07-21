import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import type { SpeechCalibrationReceiptRef, VoiceDataPolicyRef, VoiceNetworkEgressRef } from "../../../modules/learning-v2/contracts/activity";

type RecordWithBody = { readonly body: unknown; readonly status: string; readonly contentHash: string; readonly identity: Record<string, unknown> };

export interface VoiceDependencyReader {
  readCalibration(ref: SpeechCalibrationReceiptRef): Promise<RecordWithBody | undefined>;
  readPolicy(ref: VoiceDataPolicyRef, registryKey: string): Promise<RecordWithBody | undefined>;
  readEgress(ref: VoiceNetworkEgressRef, environment: string): Promise<RecordWithBody | undefined>;
}

function assertRecord(record: RecordWithBody | undefined, expectedHash: string, identity: Record<string, unknown>, status: string): RecordWithBody {
  if (!record || !record.body || typeof record.body !== "object") throw new Error("voice_dependency_missing");
  if (record.status !== status || record.contentHash !== expectedHash || hashCanonicalBody(record.body) !== expectedHash) throw new Error("voice_dependency_binding_invalid");
  for (const [key, value] of Object.entries(identity)) if (record.identity[key] !== value) throw new Error("voice_dependency_identity_invalid");
  return record;
}

export async function resolveVoiceDependencies(reader: VoiceDependencyReader, args: {
  calibration: SpeechCalibrationReceiptRef;
  policy: VoiceDataPolicyRef;
  egress: VoiceNetworkEgressRef;
  activePolicyRegistryKey: string;
  requiredNetworkPurposes: readonly string[];
  environment: string;
}): Promise<void> {
  const calibration = assertRecord(await reader.readCalibration(args.calibration), args.calibration.contentHash, { receiptId: args.calibration.receiptId, version: args.calibration.version }, "approved");
  const calibrationBody = calibration.body as Record<string, unknown>;
  if (typeof calibrationBody.expiresAt !== "string" || Date.parse(calibrationBody.expiresAt) <= Date.now()) throw new Error("voice_calibration_expired");
  const policy = assertRecord(await reader.readPolicy(args.policy, args.activePolicyRegistryKey), args.policy.contentHash, { policyId: args.policy.policyId, version: args.policy.version }, "approved");
  const policyBody = policy.body as Record<string, unknown>;
  if (typeof policyBody.expiresAt !== "string" || Date.parse(policyBody.expiresAt) <= Date.now()) throw new Error("voice_policy_expired");
  const processors = Array.isArray(policyBody.processors) ? policyBody.processors : [];
  const purposes = new Set(processors.filter((p): p is Record<string, unknown> => !!p && typeof p === "object").map((p) => p.purpose).filter((p): p is string => typeof p === "string"));
  if (args.requiredNetworkPurposes.some((purpose) => !purposes.has(purpose))) throw new Error("voice_policy_purpose_missing");
  const egress = assertRecord(await reader.readEgress(args.egress, args.environment), args.egress.contentHash, { gatewayId: "voice-network-egress", version: args.egress.version }, "deployed");
  const egressBody = egress.body as Record<string, unknown>;
  if (egressBody.environment !== args.environment || egressBody.dispatchLifecycleProtocol !== "reservation-consume-settle-reconcile.v1" || egressBody.providerFinalityContract !== "terminal-no-future-writes.v1" || egressBody.dispatchDeletionBinding !== "operation-target-settlement-hash.v1" || egressBody.directProviderCallsAllowed !== false || egressBody.requiresSingleUseReservation !== true) throw new Error("voice_egress_contract_invalid");
}
