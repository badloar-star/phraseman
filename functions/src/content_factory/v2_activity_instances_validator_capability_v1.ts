import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_FAMILY_CATALOG_V2,
  V2_REQUIRED_SESSION_FAMILIES_V2,
  V2_REQUIRED_SESSION_FAMILY_POLICY_V2,
} from "../../../modules/learning-v2/contracts/activity_catalog_v2";
import { V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1 } from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import {
  V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1,
  V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2,
  V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
  V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
  V2_SCRIPTED_ALTERNATE_REQUIRED_FAMILIES_V2,
} from "./v2_activity_session_projection";
import {
  materializeV2GenerationCapabilitySnapshotV1,
  type V2GenerationCapabilitySnapshotV1,
} from "./v2_activity_instances_package_v2";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalExternalRequirementV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  isV2RepositoryCapabilityObservationReceiptV1,
  type V2RepositoryCapabilityEntryObservationV1,
  type V2RepositoryCapabilityObservationReceiptV1,
} from "./v2_repository_capability_observation_v1";

export const V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_V1 = Object.freeze(
  {
    schemaVersion:
      "v2-activity-instances-validator-projector-rules.v1" as const,
    sourceSchemaVersion: V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
    renderSchemaVersion: V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2,
    capsuleEnvelopeSchemaVersion:
      V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1,
    sidecarSchemaVersion: V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
    sourceDerivedRenderEquality: "exact_canonical_bytes" as const,
    sourceDerivedCapsuleEquality: "exact_canonical_bytes" as const,
    sourceDerivedSidecarEquality: "exact_canonical_bytes" as const,
    capsuleSidecarCommitmentParity: "exact_canonical_bytes" as const,
  },
);

export const V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1 =
  hashCanonicalBody(V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_V1);

const familyInputKinds = Object.freeze(
  Object.fromEntries(
    V2_REQUIRED_SESSION_FAMILIES_V2.map((family) => [
      family,
      V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1[family],
    ]),
  ) as Readonly<
    Record<
      (typeof V2_REQUIRED_SESSION_FAMILIES_V2)[number],
      (typeof V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1)[(typeof V2_REQUIRED_SESSION_FAMILIES_V2)[number]]
    >
  >,
);

export const V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_V1 =
  Object.freeze({
    schemaVersion:
      "v2-activity-instances-validator-support-manifest.v1" as const,
    familyCatalogRef: V2_ACTIVITY_FAMILY_CATALOG_V2.ref,
    requiredSessionFamilyPolicyRef: V2_REQUIRED_SESSION_FAMILY_POLICY_V2.ref,
    requiredFamilies: V2_REQUIRED_SESSION_FAMILIES_V2,
    familyInputKinds,
    scriptedAlternatePolicy: Object.freeze({
      requiredFamilies: V2_SCRIPTED_ALTERNATE_REQUIRED_FAMILIES_V2,
      forbiddenForOtherRequiredFamilies: true as const,
      voiceEvidenceEquivalent: false as const,
      canAward: false as const,
    }),
    sourceSchemaVersion: V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
    renderSchemaVersion: V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2,
    capsuleEnvelopeSchemaVersion:
      V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1,
    sidecarSchemaVersion: V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
  });

export const V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1 =
  hashCanonicalBody(V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_V1);

export const V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_V1 =
  Object.freeze({
    schemaVersion:
      "v2-activity-instances-validator-capability-profile.v1" as const,
    projectorRulesFingerprint:
      V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1,
    supportManifestFingerprint:
      V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
    repositoryResolutionAuthority: "unverified_external_refs" as const,
    runtimeKernelAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });

export const V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_FINGERPRINT_V1 =
  hashCanonicalBody(V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_V1);

type ActivityTemplateRequirement = Extract<
  V2CanonicalExternalRequirementV2,
  { dependencyType: "published_template" }
>;

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  expected: string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function same(left: unknown, right: unknown): boolean {
  return canonicalJsonV1(left) === canonicalJsonV1(right);
}

function templateIdentity(value: {
  templateId: string;
  version: number;
}): string {
  return `${value.templateId}@${value.version}`;
}

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObservedEntry(
  observation: V2RepositoryCapabilityObservationReceiptV1,
  requirement: V2CanonicalExternalRequirementV2,
): V2RepositoryCapabilityEntryObservationV1 {
  const matches = observation.entries.filter((entry) =>
    same(entry.requirement, requirement),
  );
  if (matches.length !== 1)
    fail("v2_activity_instances_validator_capability_observation_mismatch");
  return matches[0]!;
}

export function materializeV2ActivityInstancesValidatorCapabilitySnapshotV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly observation: V2RepositoryCapabilityObservationReceiptV1;
}): V2GenerationCapabilitySnapshotV1 {
  if (
    !isRecord(input) ||
    !exactKeys(input, ["plan", "stageId", "observation"])
  ) {
    fail("v2_activity_instances_validator_capability_input_invalid");
  }
  if (!isV2CanonicalSeasonPlanV2(input.plan))
    fail("v2_activity_instances_validator_capability_plan_handle_required");
  if (!isV2RepositoryCapabilityObservationReceiptV1(input.observation))
    fail(
      "v2_activity_instances_validator_capability_observation_handle_required",
    );
  if (
    input.observation.planFingerprint !== input.plan.planFingerprint ||
    input.observation.courseContractFingerprint !==
      input.plan.courseContract.courseContractFingerprint ||
    input.observation.workspaceId !== input.plan.workspaceId ||
    input.observation.authoringRevision !== input.plan.authoringRevision ||
    input.observation.targetLanguage !== input.plan.targetLanguage
  ) {
    fail("v2_activity_instances_validator_capability_cross_plan");
  }
  const stage = input.plan.stages.find(
    (candidate) => candidate.stageId === input.stageId,
  );
  if (
    !stage ||
    stage.kind !== "v2_activity_instances" ||
    stage.episodeId === null ||
    stage.locale !== null
  ) {
    fail("v2_activity_instances_validator_capability_stage_invalid");
  }
  if (
    !same(
      input.plan.courseContract.familyCatalogRef,
      V2_ACTIVITY_FAMILY_CATALOG_V2.ref,
    ) ||
    !same(
      input.plan.courseContract.requiredSessionFamilyPolicyRef,
      V2_REQUIRED_SESSION_FAMILY_POLICY_V2.ref,
    ) ||
    input.observation.familyCatalogFingerprint !==
      V2_ACTIVITY_FAMILY_CATALOG_V2.ref.contentHash ||
    input.observation.requiredSessionFamilyPolicyFingerprint !==
      V2_REQUIRED_SESSION_FAMILY_POLICY_V2.ref.contentHash
  ) {
    fail("v2_activity_instances_validator_capability_policy_mismatch");
  }
  const catalog = new Map(
    input.plan.externalRequirementCatalog.map((entry) => [
      entry.requirementId,
      entry.requirement,
    ]),
  );
  const languageRequirements = input.plan.externalRequirementCatalog
    .map((entry) => entry.requirement)
    .filter((requirement) => requirement.dependencyType === "language_profile");
  if (languageRequirements.length !== 1)
    fail("v2_activity_instances_validator_capability_language_mismatch");
  const language = languageRequirements[0]!;
  if (language.dependencyType !== "language_profile")
    fail("v2_activity_instances_validator_capability_language_mismatch");
  const languageEntry = exactObservedEntry(input.observation, language);
  if (
    input.observation.languageProfileFingerprint !==
    languageEntry.entryFingerprint
  ) {
    fail("v2_activity_instances_validator_capability_language_mismatch");
  }
  const requirements = stage.externalRequirementIds.map((requirementId) => {
    const requirement = catalog.get(requirementId);
    if (!requirement || requirement.dependencyType !== "published_template")
      fail("v2_activity_instances_validator_capability_template_mismatch");
    return requirement as ActivityTemplateRequirement;
  });
  if (requirements.length < 1 || requirements.length > 28)
    fail("v2_activity_instances_validator_capability_template_mismatch");
  const requirementIdentities = requirements.map(templateIdentity);
  if (new Set(requirementIdentities).size !== requirementIdentities.length)
    fail("v2_activity_instances_validator_capability_template_mismatch");
  const templates = requirements
    .map((requirement) => {
      const observed = exactObservedEntry(input.observation, requirement);
      if (
        observed.kernelBindingFingerprint === null ||
        observed.policySetFingerprint === null
      ) {
        fail("v2_activity_instances_validator_capability_declaration_missing");
      }
      return Object.freeze({
        templateId: requirement.templateId,
        version: requirement.version,
        contentHash: requirement.contentHash,
        kernelBindingFingerprint: observed.kernelBindingFingerprint,
        policySetFingerprint: observed.policySetFingerprint,
        projectorRulesFingerprint:
          V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1,
        supportManifestFingerprint:
          V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
      });
    })
    .sort((left, right) =>
      compareCodePoint(templateIdentity(left), templateIdentity(right)),
    );
  return materializeV2GenerationCapabilitySnapshotV1({
    languageProfileRef: Object.freeze({
      profileId: language.profileId,
      version: language.version,
      contentHash: language.contentHash,
    }),
    familyCatalogRef: V2_ACTIVITY_FAMILY_CATALOG_V2.ref,
    requiredSessionFamilyPolicyRef: V2_REQUIRED_SESSION_FAMILY_POLICY_V2.ref,
    templates,
  });
}
