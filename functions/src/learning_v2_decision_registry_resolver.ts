import {
  accessBoostPolicyFromRegistry,
  type ResolvedAccessBoostPolicy,
} from '../../modules/learning-v2/contracts/access_boost';
import {
  decisionRegistryObjectPath,
  resolveDecisionRegistry,
  type ResolvedDecisionRegistry,
} from '../../modules/learning-v2/policies/decision_registry';

export interface PinnedDecisionRegistryRef {
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface DecisionRegistryArtifactStore {
  download(objectPath: string): Promise<Uint8Array | string | Record<string, unknown>>;
}

export interface ResolvedV2AccessPolicyArtifact {
  readonly registry: ResolvedDecisionRegistry;
  readonly access: ResolvedAccessBoostPolicy;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const decodeArtifact = (value: Uint8Array | string | Record<string, unknown>): unknown => {
  if (typeof value === 'string') return JSON.parse(value);
  if (value instanceof Uint8Array) return JSON.parse(new TextDecoder().decode(value));
  return value;
};

export async function resolvePinnedV2AccessPolicy(
  store: DecisionRegistryArtifactStore,
  ref: PinnedDecisionRegistryRef,
): Promise<ResolvedV2AccessPolicyArtifact> {
  if (
    !isRecord(ref) ||
    typeof ref.id !== 'string' ||
    ref.id.trim().length === 0 ||
    !Number.isSafeInteger(ref.version) ||
    ref.version < 1 ||
    !/^[a-f0-9]{64}$/.test(ref.contentHash)
  ) {
    throw new Error('decision_registry_ref_invalid');
  }
  const objectPath = decisionRegistryObjectPath(ref.id, ref.version, ref.contentHash);
  let artifact: unknown;
  try {
    artifact = decodeArtifact(await store.download(objectPath));
  } catch {
    throw new Error('decision_registry_artifact_unavailable');
  }
  const registry = resolveDecisionRegistry(artifact);
  if (
    registry.record.ref.id !== ref.id ||
    registry.record.ref.version !== ref.version ||
    registry.record.ref.contentHash !== ref.contentHash
  ) {
    throw new Error('decision_registry_ref_mismatch');
  }
  return { registry, access: accessBoostPolicyFromRegistry(registry) };
}
