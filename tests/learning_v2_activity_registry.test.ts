import type {
  V2ActivityCapabilities,
  V2PolicyDescriptorBody,
  V2PolicyKind,
  V2RuntimePolicyRefs,
  VersionedPolicyRef,
} from "../modules/learning-v2/contracts/activity";
import {
  createActivityRegistry,
  type ActivityPolicyCatalogEntry,
} from "../modules/learning-v2/runtime/activity_registry";
import { UnsupportedActivityError } from "../modules/learning-v2/runtime/unsupported_activity";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const policy = (kind: V2PolicyKind, key: string): ActivityPolicyCatalogEntry => {
  const body: V2PolicyDescriptorBody = {
    schemaVersion: "content-studio-policy-body.v1",
    kind,
    key,
    version: 1,
    humanName: `${key} ${kind}`,
    description: "test policy",
    compatibleFamilies: ["visual_discovery"],
    compatibleKernelKeys: ["kernel.visual.v1", "choice.visual-discovery.v1"],
    configurableFieldPaths: [],
    evidenceKinds: ["semantic"],
    claims: ["completion"],
  };
  const contentHash = hashCanonicalBody(body);
  const ref: VersionedPolicyRef = { kind, key, version: 1, contentHash };
  return {
    body,
    ref,
    record: {
      ref,
      object: { contentHash, objectPath: `policies/${kind}/${key}/1`, objectGeneration: "1", byteSize: 1 },
    },
  };
};

const refs = (): V2RuntimePolicyRefs => ({
  evidence: policy("evidence", "p.evidence").ref as V2RuntimePolicyRefs["evidence"],
  scoring: policy("scoring", "p.scoring").ref as V2RuntimePolicyRefs["scoring"],
  progress: policy("progress", "p.progress").ref as V2RuntimePolicyRefs["progress"],
  reward: policy("reward", "p.reward").ref as V2RuntimePolicyRefs["reward"],
  recovery: policy("recovery", "p.recovery").ref as V2RuntimePolicyRefs["recovery"],
});

const catalog = (entries: readonly ActivityPolicyCatalogEntry[]) => ({
  entries,
  resolve: (ref: VersionedPolicyRef) => entries.find((entry) =>
    entry.ref.kind === ref.kind && entry.ref.key === ref.key && entry.ref.version === ref.version &&
    entry.ref.contentHash === ref.contentHash),
});

const capabilities: V2ActivityCapabilities = {
  microphone: "none",
  speechRecognition: "none",
  audioPlayback: false,
  network: "none",
};

const registration = (overrides: Record<string, unknown> = {}) => ({
  activityTypeKey: "visual.discovery.v1",
  family: "visual_discovery" as const,
  kernelVersion: 1,
  payloadSchemaVersion: 1,
  rendererKey: "choice.visual-discovery.v1",
  validatePayload: (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null,
  policies: refs(),
  capabilities,
  accessibilityFallback: { kind: "deterministic_scripted" as const, label: "Use scripted route" },
  resolveRenderer: () => ({ render: "choice" }),
  ...overrides,
});

const allPolicies = (): ActivityPolicyCatalogEntry[] => [
  policy("evidence", "p.evidence"), policy("scoring", "p.scoring"), policy("progress", "p.progress"),
  policy("reward", "p.reward"), policy("recovery", "p.recovery"),
];

describe("Learning V2 activity registry", () => {
  it("rejects duplicate activity types", () => {
    expect(() => createActivityRegistry({
      policyCatalog: catalog(allPolicies()),
      registrations: [registration(), registration()],
    })).toThrow("v2_activity_duplicate_type");
  });

  it("requires all five exact policy refs and rejects hash drift", () => {
    const entries = allPolicies().filter((entry) => entry.ref.kind !== "reward");
    expect(() => createActivityRegistry({ policyCatalog: catalog(entries), registrations: [registration()] }))
      .toThrow("v2_activity_policy_ref_not_found");
    const drifted = { ...registration(), policies: { ...refs(), scoring: { ...refs().scoring, contentHash: "f".repeat(64) } } };
    expect(() => createActivityRegistry({ policyCatalog: catalog(allPolicies()), registrations: [drifted] }))
      .toThrow("v2_activity_policy_ref_not_found");
  });

  it("rejects a policy catalog with the same key/version and different hashes", () => {
    const base = policy("scoring", "p.scoring");
    const conflicting = { ...base, ref: { ...base.ref, contentHash: "f".repeat(64) }, record: {
      ...base.record, ref: { ...base.ref, contentHash: "f".repeat(64) }, object: { ...base.record.object, contentHash: "f".repeat(64) },
    } };
    expect(() => createActivityRegistry({
      policyCatalog: catalog([...allPolicies(), conflicting]),
      registrations: [registration()],
    })).toThrow("v2_activity_policy_ambiguous_ref");
  });

  it("rejects incompatible policy descriptor and immutable record pins", () => {
    const bad = allPolicies().map((entry) => entry.ref.kind === "scoring"
      ? { ...entry, body: { ...entry.body, key: "other" } }
      : entry);
    expect(() => createActivityRegistry({ policyCatalog: catalog(bad), registrations: [registration()] }))
      .toThrow("v2_activity_policy_descriptor_mismatch");
  });

  it("rejects unsupported required runtime capability", () => {
    expect(() => createActivityRegistry({
      policyCatalog: catalog(allPolicies()), registrations: [registration({
        capabilities: { ...capabilities, microphone: "required", speechRecognition: "required" },
      })],
      runtimeCapabilities: { microphone: false, speechRecognition: false, network: false },
    })).toThrow("v2_activity_capability_unsupported");
  });

  it("resolves renderer lazily and gives safe unknown-type recovery", () => {
    const renderer = jest.fn(() => ({ render: "choice" }));
    const registry = createActivityRegistry({
      policyCatalog: catalog(allPolicies()),
      registrations: [registration({ resolveRenderer: renderer })],
    });
    expect(renderer).not.toHaveBeenCalled();
    expect(registry.resolveRenderer("visual.discovery.v1")).toEqual({ render: "choice" });
    expect(renderer).toHaveBeenCalledTimes(1);
    expect(() => registry.get("unknown.mode")).toThrow(UnsupportedActivityError);
    expect(() => registry.get("unknown.mode")).toThrow("v2_activity_unknown_type");
  });
});
