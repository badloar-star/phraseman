import type {
  V2ActivityCapabilities,
  V2ActivityFamily,
  V2PolicyDescriptorBody,
  V2PolicyKind,
  V2RuntimePolicyRefs,
  VersionedPolicyRef,
} from "../contracts/activity";
import { hashCanonicalBody } from "../policies/decision_registry";
import { UnsupportedActivityError } from "./unsupported_activity";

export interface ActivityPolicyRecordPin {
  readonly ref: VersionedPolicyRef;
  readonly object: {
    readonly contentHash: string;
    readonly objectPath: string;
    readonly objectGeneration: string;
    readonly byteSize: number;
  };
}

/** Catalog entry is immutable policy body + exact ref + immutable object pin. */
export interface ActivityPolicyCatalogEntry {
  readonly body: V2PolicyDescriptorBody;
  readonly ref: VersionedPolicyRef;
  readonly record: ActivityPolicyRecordPin;
}

export interface ActivityPolicyCatalog {
  resolve(ref: VersionedPolicyRef): ActivityPolicyCatalogEntry | undefined;
  /** Optional complete list, used to reject ambiguous key/version pairs. */
  readonly entries?: readonly ActivityPolicyCatalogEntry[];
}

export interface ActivityAccessibilityFallback {
  readonly kind: "deterministic_scripted" | "non_voice" | "unsupported";
  readonly label: string;
}

export interface ActivityRegistration<Payload = unknown> {
  readonly activityTypeKey: string;
  readonly family: V2ActivityFamily;
  readonly kernelVersion: number;
  readonly payloadSchemaVersion: number;
  readonly rendererKey: string;
  readonly validatePayload: (value: unknown) => value is Payload;
  readonly policies: V2RuntimePolicyRefs;
  readonly capabilities: V2ActivityCapabilities;
  readonly accessibilityFallback: ActivityAccessibilityFallback;
}

export interface RuntimeCapabilities {
  readonly microphone: boolean;
  readonly speechRecognition: boolean;
  readonly network: boolean;
}

export interface ActivityRegistryOptions {
  readonly policyCatalog: ActivityPolicyCatalog;
  readonly registrations: readonly ActivityRegistration[];
  readonly runtimeCapabilities?: RuntimeCapabilities;
}

const POLICY_KINDS: readonly (keyof V2RuntimePolicyRefs)[] = [
  "evidence", "scoring", "progress", "reward", "recovery",
];

const exactRef = (left: VersionedPolicyRef, right: VersionedPolicyRef): boolean =>
  left.kind === right.kind && left.key === right.key && left.version === right.version &&
  left.contentHash === right.contentHash;

const assertPolicy = (
  catalog: ActivityPolicyCatalog,
  ref: VersionedPolicyRef,
): ActivityPolicyCatalogEntry => {
  const entry = catalog.resolve(ref);
  if (!entry) throw new Error("v2_activity_policy_ref_not_found");
  if (entry.body.schemaVersion !== "content-studio-policy-body.v1" ||
      entry.body.kind !== ref.kind || entry.body.key !== ref.key || entry.body.version !== ref.version ||
      entry.ref.kind !== ref.kind || entry.ref.key !== ref.key || entry.ref.version !== ref.version ||
      entry.ref.contentHash !== ref.contentHash || entry.ref.contentHash !== hashCanonicalBody(entry.body) ||
      !exactRef(entry.record.ref, ref) || entry.record.object.contentHash !== ref.contentHash ||
      !entry.record.object.objectPath || !entry.record.object.objectGeneration ||
      !Number.isSafeInteger(entry.record.object.byteSize) || entry.record.object.byteSize < 1) {
    throw new Error("v2_activity_policy_descriptor_mismatch");
  }
  if (!(entry.body.compatibleFamilies as readonly string[]).length ||
      !(entry.body.compatibleKernelKeys as readonly string[]).length) {
    throw new Error("v2_activity_policy_descriptor_mismatch");
  }
  return entry;
};

const assertCapabilities = (
  registration: ActivityRegistration,
  available: RuntimeCapabilities,
): void => {
  const { capabilities } = registration;
  if (capabilities.microphone === "required" && !available.microphone) {
    throw new Error("v2_activity_capability_unsupported");
  }
  if (capabilities.speechRecognition === "required" && !available.speechRecognition) {
    throw new Error("v2_activity_capability_unsupported");
  }
  if (capabilities.network === "required" && !available.network) {
    throw new Error("v2_activity_capability_unsupported");
  }
  if (capabilities.speechRecognition === "required" && capabilities.microphone === "none") {
    throw new Error("v2_activity_capability_unsupported");
  }
}

export interface ActivityRegistry {
  readonly get: (activityTypeKey: string) => ActivityRegistration;
  readonly list: () => readonly ActivityRegistration[];
}

export const createActivityRegistry = (options: ActivityRegistryOptions): ActivityRegistry => {
  const available = options.runtimeCapabilities ?? {
    microphone: true,
    speechRecognition: true,
    network: true,
  };
  const byType = new Map<string, ActivityRegistration>();
  if (options.policyCatalog.entries) {
    const policyIdentity = new Map<string, string>();
    for (const entry of options.policyCatalog.entries) {
      const identity = `${entry.ref.kind}:${entry.ref.key}@${entry.ref.version}`;
      const previousHash = policyIdentity.get(identity);
      if (previousHash && previousHash !== entry.ref.contentHash) {
        throw new Error("v2_activity_policy_ambiguous_ref");
      }
      policyIdentity.set(identity, entry.ref.contentHash);
    }
  }
  for (const registration of options.registrations) {
    if (!registration || !registration.activityTypeKey || byType.has(registration.activityTypeKey)) {
      throw new Error("v2_activity_duplicate_type");
    }
    if (!Number.isSafeInteger(registration.kernelVersion) || registration.kernelVersion < 1 ||
        !Number.isSafeInteger(registration.payloadSchemaVersion) || registration.payloadSchemaVersion < 1 ||
        !registration.rendererKey || typeof registration.validatePayload !== "function") {
      throw new Error("v2_activity_registration_invalid");
    }
    if (!registration.capabilities || !registration.accessibilityFallback) {
      throw new Error("v2_activity_registration_invalid");
    }
    assertCapabilities(registration, available);
    for (const kind of POLICY_KINDS) {
      assertPolicy(options.policyCatalog, registration.policies[kind]);
      const resolved = options.policyCatalog.resolve(registration.policies[kind]);
      if (!resolved?.body.compatibleFamilies.includes(registration.family) ||
          !resolved.body.compatibleKernelKeys.includes(registration.activityTypeKey)) {
        // Catalogs may publish a kernel alias.  A registration's renderer key is
        // the executable identity, while activity type remains the payload key.
        if (!resolved?.body.compatibleKernelKeys.includes(registration.rendererKey)) {
          throw new Error("v2_activity_policy_incompatible");
        }
      }
    }
    byType.set(registration.activityTypeKey, Object.freeze({ ...registration }));
  }
  return Object.freeze({
    get: (activityTypeKey: string): ActivityRegistration => {
      const registration = byType.get(activityTypeKey);
      if (!registration) throw new UnsupportedActivityError(activityTypeKey);
      return registration;
    },
    list: (): readonly ActivityRegistration[] => Object.freeze([...byType.values()]),
  });
};

export type { V2PolicyKind };
