import { readFileSync } from "node:fs";
import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { ModeTemplateArtifactBody } from "../../../modules/learning-v2/contracts/activity";
import {
  V2_REPOSITORY_CAPABILITY_LANGUAGE_PROFILE_MAX_BYTES_V1,
  V2_REPOSITORY_CAPABILITY_MODE_TEMPLATE_MAX_BYTES_V1,
  V2_REPOSITORY_CAPABILITY_RECORD_MAX_BYTES_V1,
  V2_REPOSITORY_CAPABILITY_RECEIPT_MAX_BYTES_V1,
  bindV2ActivityRepositoryCapabilityV1,
  isV2RepositoryCapabilityObservationReceiptV1,
  observeV2ActivityRepositoryCapabilityV1,
  v2RepositoryCapabilityObservationFingerprintV1,
  type V2ActivityRepositoryCapabilityObservationInputV1,
  type V2RepositoryCapabilityObservationReaderV1,
  type V2RepositoryCapabilityRequirementV1,
  type V2RepositoryObjectReadPermitV1,
} from "./v2_repository_capability_observation_v1";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";
import {
  V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
  V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
  materializeBlockedV2StructuralStageReceiptV2,
  materializeV2GenerationStageWorkspaceV2,
  parseV2CanonicalStageCandidateV2,
  parseV2StageDependencySnapshotV2,
} from "./v2_generation_workspace_contract_v2";

const encoder = new TextEncoder();
const fingerprint = (seed: string): string => sha256Utf8(seed);
const canonicalBytes = (value: unknown): Uint8Array =>
  encoder.encode(canonicalJsonV1(value));

const fixture = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      "../../../tests/fixtures/learning-v2/episode-01.valid.json",
    ),
    "utf8",
  ),
) as { dependencies: { templates: { body: ModeTemplateArtifactBody }[] } };

const baseTemplate = fixture.dependencies.templates[0].body;

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

class ObservationReader implements V2RepositoryCapabilityObservationReaderV1 {
  readonly bodies = new Map<string, Uint8Array>();
  readonly calls: string[] = [];
  driftLifecycle = false;
  driftRecord = false;
  mismatchReadback = false;
  oversizedFirstRecord = false;
  deeplyNestedFirstRecord = false;
  declaredByteSizeOverride?: number;

  add(requirement: V2RepositoryCapabilityRequirementV1, body: unknown): void {
    this.bodies.set(requirementKey(requirement), canonicalBytes(body));
  }

  private bodyFor(
    requirement: V2RepositoryCapabilityRequirementV1,
  ): Uint8Array {
    const body = this.bodies.get(requirementKey(requirement));
    if (!body) throw new Error("test_body_missing");
    return body;
  }

  async readRecord(
    requirement: V2RepositoryCapabilityRequirementV1,
    phase: "before" | "after",
    maxBytes: number,
  ): Promise<Uint8Array> {
    this.calls.push(`record:${phase}:${maxBytes}`);
    if (this.oversizedFirstRecord && phase === "before") {
      this.oversizedFirstRecord = false;
      return new Uint8Array(V2_REPOSITORY_CAPABILITY_RECORD_MAX_BYTES_V1 + 1);
    }
    if (this.deeplyNestedFirstRecord && phase === "before") {
      this.deeplyNestedFirstRecord = false;
      let nested: unknown = "leaf";
      for (let depth = 0; depth < 30; depth += 1) nested = { nested };
      return encoder.encode(JSON.stringify(nested));
    }
    const body = this.bodyFor(requirement);
    const idKey =
      requirement.dependencyType === "language_profile"
        ? "profileId"
        : "templateId";
    const id =
      requirement.dependencyType === "language_profile"
        ? requirement.profileId
        : requirement.templateId;
    return canonicalBytes({
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
        objectGeneration: "g-1",
        byteSize: this.declaredByteSizeOverride ?? body.byteLength,
      },
      provenance: {
        createdAt: "2026-08-11T00:00:00.000Z",
        createdBy: "test-owner",
      },
      createdAt:
        this.driftRecord && phase === "after"
          ? "2026-08-11T00:00:01.000Z"
          : "2026-08-11T00:00:00.000Z",
    });
  }

  async readLifecycle(
    requirement: V2RepositoryCapabilityRequirementV1,
    phase: "before" | "after",
    maxBytes: number,
  ): Promise<Uint8Array> {
    this.calls.push(`lifecycle:${phase}:${maxBytes}`);
    const idKey =
      requirement.dependencyType === "language_profile"
        ? "profileId"
        : "templateId";
    const id =
      requirement.dependencyType === "language_profile"
        ? requirement.profileId
        : requirement.templateId;
    return canonicalBytes({
      schemaVersion:
        requirement.dependencyType === "language_profile"
          ? "v2-language-profile-lifecycle.v1"
          : "v2-mode-template-lifecycle.v1",
      [idKey]: id,
      version: requirement.version,
      contentHash: requirement.contentHash,
      status: "published",
      reason: "test_publish",
      changedBy: "test-owner",
      changedAt: "2026-08-11T00:00:00.000Z",
      lifecycleRevision: this.driftLifecycle && phase === "after" ? 2 : 1,
    });
  }

  async readObject(permit: V2RepositoryObjectReadPermitV1): Promise<{
    bytes: Uint8Array;
    contentHash: string;
    objectGeneration: string;
  }> {
    this.calls.push(`object:${permit.maxBytes}`);
    return {
      bytes: this.bodyFor(permit.requirement),
      contentHash: this.mismatchReadback
        ? fingerprint("wrong-readback")
        : permit.contentHash,
      objectGeneration: permit.objectGeneration,
    };
  }
}

function makeTemplate(
  templateId = baseTemplate.templateId,
): ModeTemplateArtifactBody {
  return { ...baseTemplate, templateId };
}

function makeInput(
  reader: ObservationReader,
  templates: readonly ModeTemplateArtifactBody[] = [makeTemplate()],
  observedLanguageBody: unknown = languageBody,
  chapterTemplate: ModeTemplateArtifactBody | null = null,
): V2ActivityRepositoryCapabilityObservationInputV1 {
  const languageProfileRef = {
    profileId: languageBody.profileId,
    targetLanguage: "en",
    version: languageBody.version,
    contentHash: hashCanonicalBody(observedLanguageBody),
  };
  reader.add(
    {
      dependencyType: "language_profile",
      profileId: languageProfileRef.profileId,
      version: languageProfileRef.version,
      contentHash: languageProfileRef.contentHash,
    },
    observedLanguageBody,
  );
  const allTemplates = chapterTemplate
    ? [...templates, chapterTemplate]
    : [...templates];
  const templateRefs = templates.map((body) => ({
    templateId: body.templateId,
    version: body.version,
    contentHash: hashCanonicalBody(body),
  }));
  allTemplates.forEach((body) =>
    reader.add(
      {
        dependencyType: "published_template",
        templateId: body.templateId,
        version: body.version,
        contentHash: hashCanonicalBody(body),
      },
      body,
    ),
  );
  const episodeIds = chapterTemplate
    ? Array.from({ length: 8 }, (_, index) => `episode-${index + 1}`)
    : ["episode-01"];
  const request = parseV2CanonicalPlanRequestV2(
    canonicalJsonV1({
      schemaVersion: "v2-canonical-plan-request.v2",
      workspaceId: "workspace-01",
      jobId: "job-01",
      authoringRevision: 1,
      seasonId: "season-01",
      scope: chapterTemplate ? "chapter_internal" : "vertical_slice",
      episodeIds,
      recipes: [
        { episodeId: episodeIds[0], dialogue: true, speakingMission: true },
      ],
      languageProfileRef,
      speechProfileRef: {
        profileId: "english-speech",
        targetLanguage: "en",
        speechLocale: "en-US",
        version: 1,
        contentHash: fingerprint("speech"),
      },
      voiceGenerationProfileRef: {
        profileId: "voice-generation",
        version: 1,
        contentHash: fingerprint("voice"),
      },
      decisionRegistryRef: {
        decisionId: "HYP-V2-007",
        version: 1,
        contentHash: fingerprint("decision"),
      },
      templateBindings: episodeIds.map((episodeId, index) => ({
        episodeId,
        templateRefs:
          index === 0 || !chapterTemplate
            ? templateRefs
            : [
                {
                  templateId: chapterTemplate.templateId,
                  version: chapterTemplate.version,
                  contentHash: hashCanonicalBody(chapterTemplate),
                },
              ],
      })),
    }),
  );
  const plan = buildV2CanonicalSeasonPlanV2(request);
  return { plan, reader };
}

describe("V2 repository capability structural observation", () => {
  it("issues a branded deterministic receipt with exact authority limits", async () => {
    const firstReader = new ObservationReader();
    const first = await observeV2ActivityRepositoryCapabilityV1(
      makeInput(firstReader),
    );
    const secondReader = new ObservationReader();
    const second = await observeV2ActivityRepositoryCapabilityV1(
      makeInput(secondReader),
    );

    expect(isV2RepositoryCapabilityObservationReceiptV1(first)).toBe(true);
    expect(v2RepositoryCapabilityObservationFingerprintV1(first)).toBe(
      second.receiptFingerprint,
    );
    expect(first).toMatchObject({
      requirementCount: 2,
      templateCount: 1,
      readbackSource: "injected_repository_reader",
      readbackByteMatch: "exact_against_injected_observation",
      repositoryOriginAuthenticity: "not_established_by_pure_packet",
      repositoryOriginAuthority: "none",
      storageExistenceAuthority: "none",
      lifecycleAuthority: "none",
      runtimeKernelAuthority: "none",
      publicationAuthority: "none",
      executionAuthority: "none",
      releaseAuthority: false,
      runtimeConsumer: false,
    });
    expect(first.entries).toHaveLength(2);
    expect(
      first.entries.every(
        (entry) =>
          entry.prePostRecordBytesEqual &&
          entry.prePostLifecycleBytesEqual &&
          entry.lifecycleStatus === "published",
      ),
    ).toBe(true);
    expect(firstReader.calls).toContain(
      `object:${V2_REPOSITORY_CAPABILITY_LANGUAGE_PROFILE_MAX_BYTES_V1}`,
    );
    expect(firstReader.calls).toContain(
      `object:${V2_REPOSITORY_CAPABILITY_MODE_TEMPLATE_MAX_BYTES_V1}`,
    );
  });

  it("rejects a forged plan handle before invoking the reader", async () => {
    const reader = new ObservationReader();
    const input = makeInput(reader);
    await expect(
      observeV2ActivityRepositoryCapabilityV1({
        ...input,
        plan: { ...input.plan },
      }),
    ).rejects.toThrow("repository_observation_plan_handle_required");
    expect(reader.calls).toEqual([]);
  });

  it("rejects the 29th template at the trusted plan boundary", () => {
    const reader = new ObservationReader();
    const templates = Array.from({ length: 29 }, (_, index) =>
      makeTemplate(`template-cap-${index + 1}`),
    );
    expect(() => makeInput(reader, templates)).toThrow();
    expect(reader.calls).toEqual([]);
  });

  it("accepts the exact 28-template activity bound", async () => {
    const reader = new ObservationReader();
    const templates = Array.from({ length: 28 }, (_, index) =>
      makeTemplate(`template-max-${index + 1}`),
    );
    const receipt = await observeV2ActivityRepositoryCapabilityV1(
      makeInput(reader, templates),
    );
    expect(receipt.templateCount).toBe(28);
    expect(receipt.requirementCount).toBe(29);
    expect(
      encoder.encode(canonicalJsonV1(receipt)).byteLength,
    ).toBeLessThanOrEqual(V2_REPOSITORY_CAPABILITY_RECEIPT_MAX_BYTES_V1);
  });

  it("observes the plan-global template catalog once and binds episode subsets", async () => {
    const reader = new ObservationReader();
    const firstTemplate = makeTemplate("template-episode-1");
    const laterTemplate = makeTemplate("template-episodes-2-8");
    const input = makeInput(
      reader,
      [firstTemplate],
      languageBody,
      laterTemplate,
    );
    const observation = await observeV2ActivityRepositoryCapabilityV1(input);
    expect(observation.templateCount).toBe(2);
    expect(observation.requirementCount).toBe(3);
    const stages = input.plan.stages.filter(
      (stage) => stage.kind === "v2_activity_instances",
    );
    const first = bindV2ActivityRepositoryCapabilityV1({
      plan: input.plan,
      stageId: stages[0]!.stageId,
      observation,
    });
    const second = bindV2ActivityRepositoryCapabilityV1({
      plan: input.plan,
      stageId: stages[1]!.stageId,
      observation,
    });
    expect(
      first.templateBindings.map((row) => row.requirement.templateId),
    ).toEqual([firstTemplate.templateId]);
    expect(
      second.templateBindings.map((row) => row.requirement.templateId),
    ).toEqual([laterTemplate.templateId]);
    expect(first.repositoryObservationFingerprint).toBe(
      second.repositoryObservationFingerprint,
    );
    const otherReader = new ObservationReader();
    const otherInput = makeInput(otherReader, [makeTemplate("other-template")]);
    const otherStage = otherInput.plan.stages.find(
      (stage) => stage.kind === "v2_activity_instances",
    );
    if (!otherStage) throw new Error("test_activity_stage_missing");
    expect(() =>
      bindV2ActivityRepositoryCapabilityV1({
        plan: otherInput.plan,
        stageId: otherStage.stageId,
        observation,
      }),
    ).toThrow("repository_capability_binding_input_invalid");
  });

  it("applies the record byte cap before UTF-8 decoding or object reads", async () => {
    const reader = new ObservationReader();
    reader.oversizedFirstRecord = true;
    await expect(
      observeV2ActivityRepositoryCapabilityV1(makeInput(reader)),
    ).rejects.toThrow("repository_record_byte_size_invalid");
    expect(reader.calls.some((call) => call.startsWith("object:"))).toBe(false);
  });

  it("rejects hostile depth before canonical recursion or object reads", async () => {
    const reader = new ObservationReader();
    reader.deeplyNestedFirstRecord = true;
    await expect(
      observeV2ActivityRepositoryCapabilityV1(makeInput(reader)),
    ).rejects.toThrow("repository_record_complexity_invalid");
    expect(reader.calls.some((call) => call.startsWith("object:"))).toBe(false);
  });

  it("rejects a declared object cap violation before object reads", async () => {
    const reader = new ObservationReader();
    reader.declaredByteSizeOverride =
      V2_REPOSITORY_CAPABILITY_MODE_TEMPLATE_MAX_BYTES_V1 + 1;
    await expect(
      observeV2ActivityRepositoryCapabilityV1(makeInput(reader)),
    ).rejects.toThrow("repository_object_pin_invalid");
    expect(reader.calls.some((call) => call.startsWith("object:"))).toBe(false);
  });

  it("rejects lifecycle drift after the bounded object observation", async () => {
    const reader = new ObservationReader();
    reader.driftLifecycle = true;
    await expect(
      observeV2ActivityRepositoryCapabilityV1(makeInput(reader)),
    ).rejects.toThrow("repository_lifecycle_changed_during_read");
  });

  it("rejects exact record-byte drift after the bounded object observation", async () => {
    const reader = new ObservationReader();
    reader.driftRecord = true;
    await expect(
      observeV2ActivityRepositoryCapabilityV1(makeInput(reader)),
    ).rejects.toThrow("repository_record_changed_during_read");
  });

  it("rejects object readback substitution", async () => {
    const reader = new ObservationReader();
    reader.mismatchReadback = true;
    await expect(
      observeV2ActivityRepositoryCapabilityV1(makeInput(reader)),
    ).rejects.toThrow("repository_object_readback_invalid");
  });

  it("rejects strict ModeTemplate body violations", async () => {
    const reader = new ObservationReader();
    const invalid = {
      ...makeTemplate("template-invalid-body"),
      unexpected: true,
    } as unknown as ModeTemplateArtifactBody;
    await expect(
      observeV2ActivityRepositoryCapabilityV1(makeInput(reader, [invalid])),
    ).rejects.toThrow("repository_mode_template_body_invalid");
  });

  it("rejects a language-profile body that does not bind the requested language", async () => {
    const reader = new ObservationReader();
    const wrongLanguageBody = { ...languageBody, targetLanguage: "fr" };
    await expect(
      observeV2ActivityRepositoryCapabilityV1(
        makeInput(reader, [makeTemplate()], wrongLanguageBody),
      ),
    ).rejects.toThrow("repository_language_profile_body_invalid");
  });

  it("does not accept a structurally copied receipt as a branded handle", async () => {
    const reader = new ObservationReader();
    const receipt = await observeV2ActivityRepositoryCapabilityV1(
      makeInput(reader),
    );
    const copied = { ...receipt };
    expect(isV2RepositoryCapabilityObservationReceiptV1(copied)).toBe(false);
    expect(() =>
      v2RepositoryCapabilityObservationFingerprintV1(copied),
    ).toThrow("repository_observation_receipt_handle_required");
  });

  it("binds the branded observation to the exact activity workspace and blocked receipt", async () => {
    const reader = new ObservationReader();
    const input = makeInput(reader, [
      makeTemplate("template-a"),
      makeTemplate("template-b"),
    ]);
    const observation = await observeV2ActivityRepositoryCapabilityV1(input);
    const stage = input.plan.stages.find(
      (candidate) =>
        candidate.kind === "v2_activity_instances" &&
        candidate.episodeId === "episode-01",
    );
    if (!stage) throw new Error("test_activity_stage_missing");
    const capabilityBinding = bindV2ActivityRepositoryCapabilityV1({
      plan: input.plan,
      stageId: stage.stageId,
      observation,
    });
    expect(stage.externalRequirementIds).not.toEqual(
      capabilityBinding.templateBindings.map((row) => row.requirementId),
    );
    const entries = [
      ...stage.dependsOn.map((stageId, index) => ({
        dependencyType: "stage" as const,
        stageId,
        candidateFingerprint: fingerprint(`candidate-${index}`),
        machineReceiptFingerprint: fingerprint(`receipt-${index}`),
        artifactRef: {
          objectPath: `objects/stage-${index}.json`,
          contentHash: fingerprint(`artifact-${index}`),
          objectGeneration: "generation-1",
          byteSize: 100,
        },
        lifecycleFingerprint: fingerprint(`lifecycle-${index}`),
      })),
      ...capabilityBinding.templateBindings.map((template) => ({
        dependencyType: "external" as const,
        requirementId: template.requirementId,
        requirement: template.requirement,
        artifactRef: template.artifactRef,
        lifecycleFingerprint: template.lifecycleFingerprint,
      })),
    ].sort((left, right) => {
      const leftKey =
        left.dependencyType === "stage"
          ? `stage:${left.stageId}`
          : `external:${left.requirementId}`;
      const rightKey =
        right.dependencyType === "stage"
          ? `stage:${right.stageId}`
          : `external:${right.requirementId}`;
      return leftKey.localeCompare(rightKey);
    });
    const snapshotBody = {
      schemaVersion: V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
      planFingerprint: input.plan.planFingerprint,
      stageId: stage.stageId,
      stageKind: stage.kind,
      entries,
      entryCount: entries.length,
      resolutionOrigin: "not_established" as const,
    };
    const snapshot = parseV2StageDependencySnapshotV2(
      input.plan,
      canonicalJsonV1({
        ...snapshotBody,
        snapshotFingerprint: hashCanonicalBody(snapshotBody),
      }),
    );
    const workspace = materializeV2GenerationStageWorkspaceV2({
      plan: input.plan,
      stageId: stage.stageId,
      dependencySnapshot: snapshot,
      capabilityBinding: {
        kind: "activity_instances",
        bindingFingerprint: capabilityBinding.bindingFingerprint,
        resolutionOrigin: "not_established",
      },
    });
    const body = { schemaVersion: "fixture-activity-body.v1" };
    const provenanceRefs = [
      {
        provenanceType: "authoring_revision",
        provenanceId: "revision-1",
        objectPath: "provenance/revision-1.json",
        contentHash: fingerprint("provenance"),
        objectGeneration: "generation-1",
        byteSize: 80,
      },
    ];
    const candidateBody = {
      schemaVersion: V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
      workspaceFingerprint: workspace.workspaceFingerprint,
      planFingerprint: workspace.planFingerprint,
      stageId: workspace.stage.stageId,
      stageKind: workspace.stage.kind,
      subjectFingerprint: workspace.subject.subjectFingerprint,
      bodySchemaVersion: "fixture-activity-body.v1",
      body,
      bodyFingerprint: hashCanonicalBody(body),
      dependencySnapshotFingerprint: workspace.dependencySnapshotFingerprint,
      capabilityBindingFingerprint: capabilityBinding.bindingFingerprint,
      contentClass: "production_candidate",
      provenanceRefs,
      provenanceFingerprint: hashCanonicalBody({
        schemaVersion: "v2-stage-artifact-provenance.v2",
        provenanceRefs,
      }),
      producerFingerprint: fingerprint("producer"),
      configurationFingerprint: fingerprint("configuration"),
      candidateBytesOrigin: "caller_supplied_canonical_bytes",
      candidateOriginAuthenticity: "not_established",
      contentTrackAuthority: "unverified_candidate_claim",
      artifactStorageAuthority: "none",
      repositoryAuthority: "none",
      humanReviewAuthority: "none",
      specialistEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      executionAuthority: "none",
      publicationPolicy: "draft_only_no_consumer",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    };
    const candidateRaw = canonicalJsonV1({
      ...candidateBody,
      candidateFingerprint: hashCanonicalBody({
        schemaVersion: "v2-stage-artifact-candidate-fingerprint.v2",
        candidate: candidateBody,
      }),
    });
    const candidate = parseV2CanonicalStageCandidateV2(workspace, candidateRaw);
    const artifactRefRaw = canonicalJsonV1({
      objectPath: `learning-v2/v2-candidates/${stage.stageId}.json`,
      contentHash: sha256Utf8(candidateRaw),
      objectGeneration: "unpersisted",
      byteSize: utf8ByteLengthV1(candidateRaw),
    });
    const receipt = materializeBlockedV2StructuralStageReceiptV2({
      workspace,
      candidate,
      repositoryCapabilityBinding: capabilityBinding,
      artifactRefRaw,
    });
    expect(receipt).toMatchObject({
      outcome: "blocked",
      repositoryObservationFingerprint: observation.receiptFingerprint,
      externalDependencyAuthority: "unverified_injected_readback",
      releaseAuthority: false,
    });
    const replay = materializeBlockedV2StructuralStageReceiptV2({
      workspace,
      candidate,
      repositoryCapabilityBinding: capabilityBinding,
      artifactRefRaw,
    });
    expect(replay.receiptFingerprint).toBe(receipt.receiptFingerprint);
    expect(() =>
      materializeBlockedV2StructuralStageReceiptV2({
        workspace,
        candidate,
        repositoryCapabilityBinding: { ...capabilityBinding },
        artifactRefRaw,
      }),
    ).toThrow("v2_workspace_receipt_artifact_invalid");
  });
});
