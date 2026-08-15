import { readFileSync } from "node:fs";
import path from "node:path";
import type { ModeTemplateArtifactBody } from "../../../modules/learning-v2/contracts/activity";
import {
  V2_ACTIVITY_FAMILY_CATALOG_V2,
  V2_REQUIRED_SESSION_FAMILIES_V2,
  V2_REQUIRED_SESSION_FAMILY_POLICY_V2,
} from "../../../modules/learning-v2/contracts/activity_catalog_v2";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1 } from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import {
  V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_FINGERPRINT_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_V1,
  materializeV2ActivityInstancesValidatorCapabilitySnapshotV1,
} from "./v2_activity_instances_validator_capability_v1";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  observeV2ActivityRepositoryCapabilityV1,
  type V2RepositoryCapabilityObservationReaderV1,
  type V2RepositoryCapabilityObservationReceiptV1,
  type V2RepositoryCapabilityRequirementV1,
  type V2RepositoryObjectReadPermitV1,
} from "./v2_repository_capability_observation_v1";

const encoder = new TextEncoder();
const bytes = (value: unknown) => encoder.encode(canonicalJsonV1(value));
const hash = (label: string) => sha256Utf8(`validator-capability:${label}`);
const fixture = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      "../../../tests/fixtures/learning-v2/episode-01.valid.json",
    ),
    "utf8",
  ),
) as { dependencies: { templates: { body: ModeTemplateArtifactBody }[] } };
const baseTemplate = fixture.dependencies.templates[0]!.body;

const languageBody = Object.freeze({
  schemaVersion: "v2-language-profile-body.v1" as const,
  profileId: "english-core",
  version: 1,
  targetLanguage: "en",
  script: Object.freeze({
    system: "latin" as const,
    direction: "ltr" as const,
    tokenization: "space_delimited" as const,
    joiningBehavior: "none" as const,
  }),
  grammar: Object.freeze({
    dominantWordOrders: Object.freeze(["SVO"]),
    morphology: "mixed" as const,
    grammaticalFeatures: Object.freeze(["tense"]),
    registerFeatures: Object.freeze(["neutral"]),
  }),
  speech: Object.freeze({
    lexicalTone: false,
    stressSystem: "lexical" as const,
    ttsLocales: Object.freeze(["en-US"]),
    sttLocales: Object.freeze(["en-US"]),
  }),
  scriptCurricula: Object.freeze([]),
  supportedActivityFamilies: Object.freeze([baseTemplate.family]),
});

function requirementKey(
  requirement: V2RepositoryCapabilityRequirementV1,
): string {
  return requirement.dependencyType === "language_profile"
    ? `language:${requirement.profileId}:${requirement.version}:${requirement.contentHash}`
    : `template:${requirement.templateId}:${requirement.version}:${requirement.contentHash}`;
}

function objectPath(requirement: V2RepositoryCapabilityRequirementV1): string {
  return requirement.dependencyType === "language_profile"
    ? `content-studio/language-profiles/${sha256Utf8(requirement.profileId)}/v${requirement.version}/${requirement.contentHash}.json`
    : `content-studio/mode-templates/${sha256Utf8(requirement.templateId)}/v${requirement.version}/${requirement.contentHash}.json`;
}

class Reader implements V2RepositoryCapabilityObservationReaderV1 {
  readonly bodies = new Map<string, Uint8Array>();

  add(requirement: V2RepositoryCapabilityRequirementV1, body: unknown): void {
    this.bodies.set(requirementKey(requirement), bytes(body));
  }

  body(requirement: V2RepositoryCapabilityRequirementV1): Uint8Array {
    const body = this.bodies.get(requirementKey(requirement));
    if (!body) throw new Error("validator_capability_test_body_missing");
    return body;
  }

  async readRecord(
    requirement: V2RepositoryCapabilityRequirementV1,
  ): Promise<Uint8Array> {
    const body = this.body(requirement);
    const idKey =
      requirement.dependencyType === "language_profile"
        ? "profileId"
        : "templateId";
    const id =
      requirement.dependencyType === "language_profile"
        ? requirement.profileId
        : requirement.templateId;
    return bytes({
      schemaVersion:
        requirement.dependencyType === "language_profile"
          ? "v2-language-profile-record.v1"
          : "v2-mode-template-record.v1",
      [idKey]: id,
      version: requirement.version,
      contentHash: requirement.contentHash,
      object: {
        objectPath: objectPath(requirement),
        contentHash: requirement.contentHash,
        objectGeneration: "generation-1",
        byteSize: body.byteLength,
      },
      provenance: {
        createdAt: "2026-08-12T00:00:00.000Z",
        createdBy: "validator-capability-test",
      },
      createdAt: "2026-08-12T00:00:00.000Z",
    });
  }

  async readLifecycle(
    requirement: V2RepositoryCapabilityRequirementV1,
  ): Promise<Uint8Array> {
    const idKey =
      requirement.dependencyType === "language_profile"
        ? "profileId"
        : "templateId";
    const id =
      requirement.dependencyType === "language_profile"
        ? requirement.profileId
        : requirement.templateId;
    return bytes({
      schemaVersion:
        requirement.dependencyType === "language_profile"
          ? "v2-language-profile-lifecycle.v1"
          : "v2-mode-template-lifecycle.v1",
      [idKey]: id,
      version: requirement.version,
      contentHash: requirement.contentHash,
      status: "published",
      reason: "validator_capability_test",
      changedBy: "validator-capability-test",
      changedAt: "2026-08-12T00:00:00.000Z",
      lifecycleRevision: 1,
    });
  }

  async readObject(permit: V2RepositoryObjectReadPermitV1): Promise<{
    bytes: Uint8Array;
    contentHash: string;
    objectGeneration: string;
  }> {
    return {
      bytes: this.body(permit.requirement),
      contentHash: permit.contentHash,
      objectGeneration: permit.objectGeneration,
    };
  }
}

function request(
  workspaceId: string,
  templates: readonly ModeTemplateArtifactBody[],
) {
  return parseV2CanonicalPlanRequestV2(
    canonicalJsonV1({
      schemaVersion: "v2-canonical-plan-request.v2",
      workspaceId,
      jobId: `job-${workspaceId}`,
      authoringRevision: 1,
      seasonId: "season-01",
      scope: "vertical_slice",
      episodeIds: ["episode-01"],
      recipes: [
        {
          episodeId: "episode-01",
          dialogue: true,
          speakingMission: true,
        },
      ],
      languageProfileRef: {
        profileId: languageBody.profileId,
        targetLanguage: "en",
        version: languageBody.version,
        contentHash: hashCanonicalBody(languageBody),
      },
      speechProfileRef: {
        profileId: "english-speech",
        targetLanguage: "en",
        speechLocale: "en-US",
        version: 1,
        contentHash: hash("speech"),
      },
      voiceGenerationProfileRef: {
        profileId: "voice-generation",
        version: 1,
        contentHash: hash("voice"),
      },
      decisionRegistryRef: {
        decisionId: "HYP-V2-007",
        version: 1,
        contentHash: hash("decision"),
      },
      templateBindings: [
        {
          episodeId: "episode-01",
          templateRefs: templates.map((body) => ({
            templateId: body.templateId,
            version: body.version,
            contentHash: hashCanonicalBody(body),
          })),
        },
      ],
    }),
  );
}

async function fixtureFor(
  workspaceId = "workspace-01",
  templates: readonly ModeTemplateArtifactBody[] = [baseTemplate],
): Promise<{
  plan: V2CanonicalSeasonPlanV2;
  observation: V2RepositoryCapabilityObservationReceiptV1;
  stageId: string;
}> {
  const plan = buildV2CanonicalSeasonPlanV2(request(workspaceId, templates));
  const reader = new Reader();
  const languageRequirement = {
    dependencyType: "language_profile" as const,
    profileId: languageBody.profileId,
    version: languageBody.version,
    contentHash: hashCanonicalBody(languageBody),
  };
  reader.add(languageRequirement, languageBody);
  for (const body of templates) {
    reader.add(
      {
        dependencyType: "published_template",
        templateId: body.templateId,
        version: body.version,
        contentHash: hashCanonicalBody(body),
      },
      body,
    );
  }
  const observation = await observeV2ActivityRepositoryCapabilityV1({
    plan,
    reader,
  });
  const stage = plan.stages.find(
    (candidate) => candidate.kind === "v2_activity_instances",
  );
  if (!stage) throw new Error("validator_capability_test_stage_missing");
  return { plan, observation, stageId: stage.stageId };
}

describe("V2 activity-instances validator capability profile", () => {
  it("pins exact schemas, seven family input kinds and scripted alternates", () => {
    expect(
      V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_FINGERPRINT_V1,
    ).toBe(
      hashCanonicalBody(V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_V1),
    );
    expect(V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1).toBe(
      hashCanonicalBody(V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_V1),
    );
    expect(
      V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
    ).toBe(
      hashCanonicalBody(V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_V1),
    );
    expect(
      V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_V1.requiredFamilies,
    ).toEqual(V2_REQUIRED_SESSION_FAMILIES_V2);
    expect(
      V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_V1.familyInputKinds,
    ).toEqual(V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1);
    expect(
      V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_V1.scriptedAlternatePolicy,
    ).toEqual({
      requiredFamilies: [
        "listen_choose",
        "sound_contrast",
        "listen_build_dictation",
        "scripted_repeat_compare",
      ],
      forbiddenForOtherRequiredFamilies: true,
      voiceEvidenceEquivalent: false,
      canAward: false,
    });
    expect(V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_V1).toMatchObject(
      {
        repositoryResolutionAuthority: "unverified_external_refs",
        runtimeKernelAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
      },
    );
  });

  it("derives a deterministic exact snapshot from branded plan and observation", async () => {
    const { plan, observation, stageId } = await fixtureFor();
    const first = materializeV2ActivityInstancesValidatorCapabilitySnapshotV1({
      plan,
      stageId,
      observation,
    });
    const second = materializeV2ActivityInstancesValidatorCapabilitySnapshotV1({
      plan,
      stageId,
      observation,
    });
    const templateEntry = observation.entries.find(
      (entry) => entry.requirement.dependencyType === "published_template",
    );
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      repositoryResolutionAuthority: "unverified_external_refs",
      languageProfileRef: {
        profileId: languageBody.profileId,
        version: languageBody.version,
        contentHash: hashCanonicalBody(languageBody),
      },
      familyCatalogRef: V2_ACTIVITY_FAMILY_CATALOG_V2.ref,
      requiredSessionFamilyPolicyRef: V2_REQUIRED_SESSION_FAMILY_POLICY_V2.ref,
    });
    expect(first.templates).toHaveLength(1);
    expect(first.templates[0]).toMatchObject({
      templateId: baseTemplate.templateId,
      version: baseTemplate.version,
      contentHash: hashCanonicalBody(baseTemplate),
      kernelBindingFingerprint: templateEntry?.kernelBindingFingerprint,
      policySetFingerprint: templateEntry?.policySetFingerprint,
      projectorRulesFingerprint:
        V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1,
      supportManifestFingerprint:
        V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
    });
  });

  it("rejects plan and observation clones including missing, extra and null declarations", async () => {
    const { plan, observation, stageId } = await fixtureFor();
    expect(() =>
      materializeV2ActivityInstancesValidatorCapabilitySnapshotV1({
        plan: { ...plan },
        stageId,
        observation,
      }),
    ).toThrow(
      "v2_activity_instances_validator_capability_plan_handle_required",
    );
    const clones = [
      { ...observation, entries: observation.entries.slice(1) },
      {
        ...observation,
        entries: [...observation.entries, observation.entries[0]],
      },
      {
        ...observation,
        entries: observation.entries.map((entry) =>
          entry.requirement.dependencyType === "published_template"
            ? { ...entry, kernelBindingFingerprint: null }
            : entry,
        ),
      },
      {
        ...observation,
        entries: observation.entries.map((entry) =>
          entry.requirement.dependencyType === "published_template"
            ? { ...entry, policySetFingerprint: null }
            : entry,
        ),
      },
    ];
    for (const clone of clones) {
      expect(() =>
        materializeV2ActivityInstancesValidatorCapabilitySnapshotV1({
          plan,
          stageId,
          observation: clone as never,
        }),
      ).toThrow(
        "v2_activity_instances_validator_capability_observation_handle_required",
      );
    }
  });

  it("rejects cross-plan and non-activity or missing stages", async () => {
    const first = await fixtureFor("workspace-first");
    const second = await fixtureFor("workspace-second");
    expect(() =>
      materializeV2ActivityInstancesValidatorCapabilitySnapshotV1({
        plan: second.plan,
        stageId: second.stageId,
        observation: first.observation,
      }),
    ).toThrow("v2_activity_instances_validator_capability_cross_plan");
    const speaking = first.plan.stages.find(
      (stage) => stage.kind === "v2_speaking_mission",
    );
    if (!speaking)
      throw new Error("validator_capability_test_speaking_missing");
    for (const stageId of [speaking.stageId, "activity:missing"]) {
      expect(() =>
        materializeV2ActivityInstancesValidatorCapabilitySnapshotV1({
          plan: first.plan,
          stageId,
          observation: first.observation,
        }),
      ).toThrow("v2_activity_instances_validator_capability_stage_invalid");
    }
  });

  it("rejects unknown input fields instead of widening the authority boundary", async () => {
    const value = await fixtureFor();
    expect(() =>
      materializeV2ActivityInstancesValidatorCapabilitySnapshotV1({
        ...value,
        injectedAuthority: "authenticated",
      } as never),
    ).toThrow("v2_activity_instances_validator_capability_input_invalid");
  });
});
