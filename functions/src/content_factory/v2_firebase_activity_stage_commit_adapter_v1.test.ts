import { readFileSync } from "node:fs";
import path from "node:path";
import type { ModeTemplateArtifactBody } from "../../../modules/learning-v2/contracts/activity";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1 } from "./v2_activity_stage_commit_contract_v1";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
  V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
  materializeV2GenerationStageWorkspaceV2,
  parseV2StageDependencySnapshotV2,
} from "./v2_generation_workspace_contract_v2";
import {
  v2LanguageProfileObjectPathV1,
  v2ModeTemplateObjectPathV1,
} from "./v2_authenticated_repository_contract_v1";
import {
  bindV2ActivityRepositoryCapabilityV1,
  observeV2ActivityRepositoryCapabilityV1,
  type V2ActivityRepositoryCapabilityBindingV1,
  type V2RepositoryCapabilityObservationReaderV1,
} from "./v2_repository_capability_observation_v1";
import {
  bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1,
  createFirebaseAdminV2ActivityStageCommitAdapterV1,
  getV2FirebaseActivityInstancesValidatorInputSummaryV1,
  getV2FirebaseActivityStageCommitSummaryV1,
  isV2FirebaseActivityInstancesValidatorInputHandleV1,
  isV2FirebaseActivityStageCommitHandleV1,
  resolveV2FirebaseActivityInstancesValidatorInputMaterialV1,
} from "./v2_firebase_activity_stage_commit_adapter_v1";

type MockObject = {
  bytes: Buffer;
  generation: string;
  contentType: string;
  contentHash: string;
};

const fixture = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      "../../../tests/fixtures/learning-v2/episode-01.valid.json",
    ),
    "utf8",
  ),
) as { dependencies: { templates: { body: ModeTemplateArtifactBody }[] } };
const templateBody = fixture.dependencies.templates[0]!.body;
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
  supportedActivityFamilies: Object.freeze([templateBody.family]),
});

const repositorySession = Object.freeze({ kind: "test-d1-session" });
const authenticatedCapability = Object.freeze({ kind: "test-d2a-capability" });
const mockD1State = {
  plan: null as V2CanonicalSeasonPlanV2 | null,
  stageId: "",
  binding: null as V2ActivityRepositoryCapabilityBindingV1 | null,
  capabilitySummary: null as Record<string, string> | null,
};

jest.mock("./v2_firebase_authenticated_repository_adapter_v1", () => ({
  bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1: jest.fn(
    (input: Record<string, unknown>) => {
      if (
        input.session !== repositorySession ||
        input.plan !== mockD1State.plan ||
        input.stageId !== mockD1State.stageId
      )
        throw new Error("test_d1_session_invalid");
      return authenticatedCapability;
    },
  ),
  getV2FirebaseAuthenticatedActivityStageCapabilitySummaryV1: jest.fn(
    (value: unknown) => {
      if (value !== authenticatedCapability || !mockD1State.capabilitySummary)
        throw new Error("test_d2a_capability_invalid");
      return mockD1State.capabilitySummary;
    },
  ),
  resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1: jest.fn(
    (input: Record<string, unknown>) => {
      if (
        input.capability !== authenticatedCapability ||
        input.plan !== mockD1State.plan ||
        input.stageId !== mockD1State.stageId ||
        !mockD1State.binding
      )
        throw new Error("test_d2a_binding_invalid");
      return mockD1State.binding;
    },
  ),
}));

const mockState = {
  app: {
    name: "[DEFAULT]",
    options: {
      projectId: "phraseman-ea0b3",
      storageBucket: "phraseman-ea0b3.firebasestorage.app",
    },
  },
  documents: new Map<string, { canonicalRaw: string }>(),
  objects: new Map<string, MockObject>(),
  firestoreWrites: 0,
  storageWrites: 0,
  generation: 100,
  crashOnStoragePathToken: null as string | null,
  crashBeforeManifest: false,
  dropGenerationAfterManifestCommitPathToken: null as string | null,
};

function codedError(code: number): Error & { code: number } {
  return Object.assign(new Error(String(code)), { code });
}

const mockDb = {
  doc: (value: string) => ({ path: value }),
  getAll: jest.fn(),
  runTransaction: jest.fn(
    async (
      body: (transaction: Record<string, unknown>) => Promise<unknown>,
    ) => {
      if (
        mockState.crashBeforeManifest &&
        mockState.storageWrites === 3 &&
        mockState.documents.size === 0
      ) {
        mockState.crashBeforeManifest = false;
        throw new Error("test_injected_crash_before_manifest");
      }
      const result = await body({
        get: async (ref: { path: string }) => {
          const value = mockState.documents.get(ref.path);
          return {
            exists: value !== undefined,
            ref,
            data: () => value,
          };
        },
        create: (ref: { path: string }, value: { canonicalRaw: string }) => {
          if (mockState.documents.has(ref.path)) throw codedError(6);
          mockState.firestoreWrites += 1;
          mockState.documents.set(ref.path, value);
        },
        update: jest.fn(),
      });
      if (
        mockState.dropGenerationAfterManifestCommitPathToken &&
        mockState.documents.size === 1
      ) {
        const token = mockState.dropGenerationAfterManifestCommitPathToken;
        mockState.dropGenerationAfterManifestCommitPathToken = null;
        const target = [...mockState.objects.entries()].find(([objectPath]) =>
          objectPath.includes(token),
        )?.[1];
        if (!target) throw new Error("test_drop_generation_target_missing");
        delete (target as { generation?: string }).generation;
      }
      return result;
    },
  ),
};

const mockBucket = {
  name: "phraseman-ea0b3.firebasestorage.app",
  file: jest.fn((objectPath: string, options?: { generation?: string }) => ({
    getMetadata: async () => {
      if (
        mockState.crashOnStoragePathToken &&
        objectPath.includes(mockState.crashOnStoragePathToken)
      ) {
        mockState.crashOnStoragePathToken = null;
        throw new Error("test_injected_storage_crash");
      }
      const value = mockState.objects.get(objectPath);
      if (!value) throw codedError(404);
      return [
        {
          generation: value.generation,
          size: String(value.bytes.byteLength),
          contentType: value.contentType,
          metadata: { contentHash: value.contentHash },
        },
      ];
    },
    save: async (bytes: Buffer, saveOptions: Record<string, any>) => {
      if (mockState.objects.has(objectPath)) throw codedError(412);
      mockState.storageWrites += 1;
      mockState.generation += 1;
      mockState.objects.set(objectPath, {
        bytes: Buffer.from(bytes),
        generation: String(mockState.generation),
        contentType: saveOptions.metadata.contentType,
        contentHash: saveOptions.metadata.metadata.contentHash,
      });
    },
    download: async () => {
      const value = mockState.objects.get(objectPath);
      if (!value) throw codedError(404);
      if (options?.generation !== value.generation) throw codedError(412);
      return [Buffer.from(value.bytes)];
    },
  })),
};

jest.mock("firebase-admin", () => ({
  app: jest.fn(() => mockState.app),
  firestore: jest.fn(() => mockDb),
  storage: jest.fn(() => ({ bucket: jest.fn(() => mockBucket) })),
}));

function plan(): V2CanonicalSeasonPlanV2 {
  return buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(
      canonicalJsonV1({
        schemaVersion: "v2-canonical-plan-request.v2",
        workspaceId: "workspace-01",
        jobId: "job-01",
        authoringRevision: 1,
        seasonId: "season-01",
        scope: "vertical_slice",
        episodeIds: ["episode-01"],
        recipes: [
          { episodeId: "episode-01", dialogue: true, speakingMission: true },
        ],
        languageProfileRef: {
          profileId: languageBody.profileId,
          targetLanguage: "en",
          version: 1,
          contentHash: hashCanonicalBody(languageBody),
        },
        speechProfileRef: {
          profileId: "english-speech",
          targetLanguage: "en",
          speechLocale: "en-US",
          version: 1,
          contentHash: sha256Utf8("speech"),
        },
        voiceGenerationProfileRef: {
          profileId: "voice-generation",
          version: 1,
          contentHash: sha256Utf8("voice"),
        },
        decisionRegistryRef: {
          decisionId: "HYP-V2-007",
          version: 1,
          contentHash: sha256Utf8("decision"),
        },
        templateBindings: [
          {
            episodeId: "episode-01",
            templateRefs: [
              {
                templateId: templateBody.templateId,
                version: templateBody.version,
                contentHash: hashCanonicalBody(templateBody),
              },
            ],
          },
        ],
      }),
    ),
  );
}

const encode = (value: unknown) =>
  new TextEncoder().encode(canonicalJsonV1(value));

async function bindingFor(value: V2CanonicalSeasonPlanV2, stageId: string) {
  const objects = new Map<string, Uint8Array>();
  const records = new Map<string, Uint8Array>();
  const lifecycles = new Map<string, Uint8Array>();
  for (const entry of value.externalRequirementCatalog) {
    const requirement = entry.requirement;
    if (
      requirement.dependencyType !== "language_profile" &&
      requirement.dependencyType !== "published_template"
    )
      continue;
    const language = requirement.dependencyType === "language_profile";
    const id = language ? requirement.profileId : requirement.templateId;
    const objectPath = language
      ? v2LanguageProfileObjectPathV1(
          requirement.profileId,
          requirement.version,
          requirement.contentHash,
        )
      : v2ModeTemplateObjectPathV1(
          requirement.templateId,
          requirement.version,
          requirement.contentHash,
        );
    const object = encode(language ? languageBody : templateBody);
    objects.set(requirement.contentHash, object);
    records.set(
      requirement.contentHash,
      encode({
        schemaVersion: language
          ? "v2-language-profile-record.v1"
          : "v2-mode-template-record.v1",
        [language ? "profileId" : "templateId"]: id,
        version: requirement.version,
        contentHash: requirement.contentHash,
        object: {
          objectPath,
          contentHash: requirement.contentHash,
          objectGeneration: "10",
          byteSize: object.byteLength,
        },
        provenance: {
          createdAt: "2026-08-12T00:00:00.000Z",
          createdBy: "test-owner",
        },
        createdAt: "2026-08-12T00:00:00.000Z",
      }),
    );
    lifecycles.set(
      requirement.contentHash,
      encode({
        schemaVersion: language
          ? "v2-language-profile-lifecycle.v1"
          : "v2-mode-template-lifecycle.v1",
        [language ? "profileId" : "templateId"]: id,
        version: requirement.version,
        contentHash: requirement.contentHash,
        status: "published",
        reason: "test_publish",
        changedBy: "test-owner",
        changedAt: "2026-08-12T00:00:00.000Z",
        lifecycleRevision: 1,
      }),
    );
  }
  const reader: V2RepositoryCapabilityObservationReaderV1 = {
    readRecord: async (requirement) => records.get(requirement.contentHash)!,
    readLifecycle: async (requirement) =>
      lifecycles.get(requirement.contentHash)!,
    readObject: async (permit) => ({
      bytes: objects.get(permit.contentHash)!,
      contentHash: permit.contentHash,
      objectGeneration: permit.objectGeneration,
    }),
  };
  const observation = await observeV2ActivityRepositoryCapabilityV1({
    plan: value,
    reader,
  });
  return {
    observation,
    binding: bindV2ActivityRepositoryCapabilityV1({
      plan: value,
      stageId,
      observation,
    }),
  };
}

function dependencySnapshotRaw(
  value: V2CanonicalSeasonPlanV2,
  stageId: string,
  binding: V2ActivityRepositoryCapabilityBindingV1,
) {
  const stage = value.stages.find(
    (candidate) => candidate.stageId === stageId,
  )!;
  const entries = [
    ...stage.dependsOn.map((dependency, index) => ({
      dependencyType: "stage" as const,
      stageId: dependency,
      candidateFingerprint: hashCanonicalBody(["candidate", dependency]),
      machineReceiptFingerprint: hashCanonicalBody(["receipt", dependency]),
      artifactRef: {
        objectPath: `objects/stage-${index}.json`,
        contentHash: hashCanonicalBody(["artifact", dependency]),
        objectGeneration: "generation-1",
        byteSize: 100,
      },
      lifecycleFingerprint: hashCanonicalBody(["lifecycle", dependency]),
    })),
    ...binding.templateBindings.map((template) => ({
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
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  const body = {
    schemaVersion: V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
    planFingerprint: value.planFingerprint,
    stageId,
    stageKind: stage.kind,
    entries,
    entryCount: entries.length,
    resolutionOrigin: "not_established" as const,
  };
  return canonicalJsonV1({
    ...body,
    snapshotFingerprint: hashCanonicalBody(body),
  });
}

function candidateRaw(
  value: V2CanonicalSeasonPlanV2,
  stageId: string,
  snapshotRaw: string,
  binding: V2ActivityRepositoryCapabilityBindingV1,
  title = "Fixture",
) {
  const snapshot = parseV2StageDependencySnapshotV2(value, snapshotRaw);
  const workspace = materializeV2GenerationStageWorkspaceV2({
    plan: value,
    stageId,
    dependencySnapshot: snapshot,
    capabilityBinding: {
      kind: "activity_instances",
      bindingFingerprint: binding.bindingFingerprint,
      resolutionOrigin: "not_established",
    },
  });
  const body = { schemaVersion: "fixture-body.v1", title };
  const provenanceRefs = [
    {
      provenanceType: "authoring_revision",
      provenanceId: "revision-1",
      objectPath: "provenance/revision-1.json",
      contentHash: sha256Utf8("provenance"),
      objectGeneration: "generation-1",
      byteSize: 80,
    },
  ];
  const base = {
    schemaVersion: V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
    workspaceFingerprint: workspace.workspaceFingerprint,
    planFingerprint: workspace.planFingerprint,
    stageId: workspace.stage.stageId,
    stageKind: workspace.stage.kind,
    subjectFingerprint: workspace.subject.subjectFingerprint,
    bodySchemaVersion: "fixture-body.v1",
    body,
    bodyFingerprint: hashCanonicalBody(body),
    dependencySnapshotFingerprint: workspace.dependencySnapshotFingerprint,
    capabilityBindingFingerprint: binding.bindingFingerprint,
    contentClass: "production_candidate",
    provenanceRefs,
    provenanceFingerprint: hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-provenance.v2",
      provenanceRefs,
    }),
    producerFingerprint: sha256Utf8("producer"),
    configurationFingerprint: sha256Utf8("configuration"),
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
  return canonicalJsonV1({
    ...base,
    candidateFingerprint: hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-candidate-fingerprint.v2",
      candidate: base,
    }),
  });
}

async function setup() {
  jest.clearAllMocks();
  mockState.documents.clear();
  mockState.objects.clear();
  mockState.firestoreWrites = 0;
  mockState.storageWrites = 0;
  mockState.generation = 100;
  mockState.crashOnStoragePathToken = null;
  mockState.crashBeforeManifest = false;
  mockState.dropGenerationAfterManifestCommitPathToken = null;
  mockState.app.options.projectId = "phraseman-ea0b3";
  mockState.app.options.storageBucket = "phraseman-ea0b3.firebasestorage.app";
  mockBucket.name = "phraseman-ea0b3.firebasestorage.app";
  for (const key of [
    "FUNCTIONS_EMULATOR",
    "FIRESTORE_EMULATOR_HOST",
    "STORAGE_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
    "FIREBASE_EMULATOR_HUB",
  ])
    delete process.env[key];
  const currentPlan = plan();
  const stage = currentPlan.stages.find(
    (candidate) => candidate.kind === "v2_activity_instances",
  )!;
  const { observation, binding } = await bindingFor(currentPlan, stage.stageId);
  mockD1State.plan = currentPlan;
  mockD1State.stageId = stage.stageId;
  mockD1State.binding = binding;
  mockD1State.capabilitySummary = {
    repositoryOriginReceiptFingerprint: sha256Utf8("origin-receipt"),
    repositoryObservationFingerprint: observation.receiptFingerprint,
    authenticatedCapabilityFingerprint: sha256Utf8("authenticated-capability"),
  };
  const snapshotRaw = dependencySnapshotRaw(
    currentPlan,
    stage.stageId,
    binding,
  );
  return {
    plan: currentPlan,
    stageId: stage.stageId,
    dependencySnapshotRaw: snapshotRaw,
    candidateRaw: candidateRaw(
      currentPlan,
      stage.stageId,
      snapshotRaw,
      binding,
    ),
  };
}

describe("V2 Firebase Activity-stage blocked commit adapter", () => {
  it("persists, atomically commits, cold-replays, and exact-replays without writes", async () => {
    const input = await setup();
    expect(createFirebaseAdminV2ActivityStageCommitAdapterV1.length).toBe(0);
    const first =
      await createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        { ...input, repositorySession: repositorySession as never },
      );
    expect(isV2FirebaseActivityStageCommitHandleV1(first)).toBe(true);
    expect(getV2FirebaseActivityStageCommitSummaryV1(first)).toMatchObject({
      planFingerprint: input.plan.planFingerprint,
      stageId: input.stageId,
      outcome: "blocked",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      dependencyResolutionAuthority:
        "authenticated_repository_stage_subset_only",
      artifactStorageAuthority: "firebase_admin_generation_pinned_readback",
      durableCommitAuthority: "firebase_admin_transaction_exact_readback",
      candidateOriginAuthority: "none",
      machineValidationAuthority: "none",
      humanReviewAuthority: "none",
      executionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    expect(mockState.storageWrites).toBe(3);
    expect(mockState.firestoreWrites).toBe(1);
    const writes = [mockState.storageWrites, mockState.firestoreWrites];
    const replay =
      await createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        { ...input, repositorySession: repositorySession as never },
      );
    expect(isV2FirebaseActivityStageCommitHandleV1(replay)).toBe(true);
    expect([mockState.storageWrites, mockState.firestoreWrites]).toEqual(
      writes,
    );
    expect(isV2FirebaseActivityStageCommitHandleV1({ ...first })).toBe(false);
    expect(
      isV2FirebaseActivityStageCommitHandleV1(
        JSON.parse(JSON.stringify(first)),
      ),
    ).toBe(false);
  });

  it("binds exact cold-replayed commit material to an opaque validator input", async () => {
    const input = await setup();
    const commit =
      await createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        { ...input, repositorySession: repositorySession as never },
      );
    const validatorInput =
      bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1({
        commitHandle: commit,
        plan: input.plan,
        stageId: input.stageId,
      });
    expect(
      isV2FirebaseActivityInstancesValidatorInputHandleV1(validatorInput),
    ).toBe(true);
    const summary =
      getV2FirebaseActivityInstancesValidatorInputSummaryV1(validatorInput);
    expect(summary).toMatchObject({
      planFingerprint: input.plan.planFingerprint,
      stageId: input.stageId,
      candidateFingerprint:
        getV2FirebaseActivityStageCommitSummaryV1(commit).candidateFingerprint,
      validatorInputAuthority:
        "authenticated_commit_exact_material_binding_only",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      dependencyResolutionAuthority:
        "authenticated_repository_stage_subset_only",
      candidateStorageAuthority: "firebase_admin_generation_pinned_readback",
      childArtifactStorageAuthority: "none",
      machineValidationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    const material = resolveV2FirebaseActivityInstancesValidatorInputMaterialV1(
      {
        inputHandle: validatorInput,
        plan: input.plan,
        stageId: input.stageId,
      },
    );
    expect(material.plan).toBe(input.plan);
    expect(material.candidateRaw).toBe(input.candidateRaw);
    expect(material.dependencySnapshotRaw).toBe(input.dependencySnapshotRaw);
    expect(material.candidate.candidateFingerprint).toBe(
      summary.candidateFingerprint,
    );
    expect(material.workspace.workspaceFingerprint).toBe(
      summary.workspaceFingerprint,
    );
    expect(material.activityStageCapability).toBe(authenticatedCapability);
    expect(material.structuralBinding).toBe(mockD1State.binding);
    expect(material.committedOuterReceipt.receiptFingerprint).toBe(
      summary.outerReceiptFingerprint,
    );
    expect(material.committedManifest.commitFingerprint).toBe(
      summary.committedManifestFingerprint,
    );
    expect(Object.keys(material)).not.toContain("observation");

    expect(
      isV2FirebaseActivityInstancesValidatorInputHandleV1({
        ...validatorInput,
      }),
    ).toBe(false);
    expect(() =>
      getV2FirebaseActivityInstancesValidatorInputSummaryV1({
        ...validatorInput,
      } as never),
    ).toThrow("v2_firebase_activity_instances_validator_input_handle_invalid");
    expect(() =>
      bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1({
        commitHandle: { ...commit },
        plan: input.plan,
        stageId: input.stageId,
      } as never),
    ).toThrow("v2_firebase_activity_instances_validator_input_binding_invalid");
    expect(() =>
      bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1({
        commitHandle: summary as never,
        plan: input.plan,
        stageId: input.stageId,
      }),
    ).toThrow("v2_firebase_activity_instances_validator_input_binding_invalid");
    expect(() =>
      resolveV2FirebaseActivityInstancesValidatorInputMaterialV1({
        inputHandle: { ...validatorInput },
        plan: input.plan,
        stageId: input.stageId,
      } as never),
    ).toThrow("v2_firebase_activity_instances_validator_input_resolve_invalid");
    expect(() =>
      resolveV2FirebaseActivityInstancesValidatorInputMaterialV1({
        inputHandle: validatorInput,
        plan: plan(),
        stageId: input.stageId,
      }),
    ).toThrow("v2_firebase_activity_instances_validator_input_resolve_invalid");
    expect(() =>
      resolveV2FirebaseActivityInstancesValidatorInputMaterialV1({
        inputHandle: validatorInput,
        plan: input.plan,
        stageId: `${input.stageId}:other`,
      }),
    ).toThrow("v2_firebase_activity_instances_validator_input_resolve_invalid");
  });

  it.each([
    {
      cut: "after candidate write",
      nextPathMarker: "activity-stage-inner-receipts",
      beforeManifest: false,
      writesAtCrash: 1,
    },
    {
      cut: "after inner receipt write",
      nextPathMarker: "activity-stage-commit-receipts",
      beforeManifest: false,
      writesAtCrash: 2,
    },
    {
      cut: "after outer receipt write before manifest",
      nextPathMarker: null,
      beforeManifest: true,
      writesAtCrash: 3,
    },
  ])("converges from a fresh adapter after a crash $cut", async (scenario) => {
    const input = await setup();
    mockState.crashOnStoragePathToken = scenario.nextPathMarker;
    mockState.crashBeforeManifest = scenario.beforeManifest;
    await expect(
      createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        { ...input, repositorySession: repositorySession as never },
      ),
    ).rejects.toThrow("test_injected");
    expect(mockState.storageWrites).toBe(scenario.writesAtCrash);
    expect(mockState.firestoreWrites).toBe(0);
    expect(mockState.documents.size).toBe(0);

    const recovered =
      await createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        { ...input, repositorySession: repositorySession as never },
      );
    expect(isV2FirebaseActivityStageCommitHandleV1(recovered)).toBe(true);
    expect(mockState.storageWrites).toBe(3);
    expect(mockState.firestoreWrites).toBe(1);
  });

  it("fails closed when generation disappears before cold replay", async () => {
    const input = await setup();
    mockState.dropGenerationAfterManifestCommitPathToken =
      "activity-stage-commit-receipts";
    await expect(
      createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        { ...input, repositorySession: repositorySession as never },
      ),
    ).rejects.toThrow("v2_firebase_admin_repository_storage_metadata_invalid");
    expect(mockState.storageWrites).toBe(3);
    expect(mockState.firestoreWrites).toBe(1);
  });

  it("rejects candidate cap+1 before any repository I/O", async () => {
    const input = await setup();
    await expect(
      createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        {
          ...input,
          candidateRaw: "x".repeat(
            V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1 + 1,
          ),
          repositorySession: repositorySession as never,
        },
      ),
    ).rejects.toThrow("v2_workspace_candidate_invalid");
    expect(mockBucket.file).not.toHaveBeenCalled();
    expect(mockDb.runTransaction).not.toHaveBeenCalled();
    expect(mockState.storageWrites).toBe(0);
    expect(mockState.firestoreWrites).toBe(0);
  });

  it.each([
    "activity-stage-candidates",
    "activity-stage-inner-receipts",
    "activity-stage-commit-receipts",
  ])("fails closed on same-size persisted %s tampering", async (pathToken) => {
    const input = await setup();
    await createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
      { ...input, repositorySession: repositorySession as never },
    );
    const target = [...mockState.objects.entries()].find(([objectPath]) =>
      objectPath.includes(pathToken),
    )![1];
    target.bytes[0] = target.bytes[0] === 0 ? 1 : target.bytes[0]! ^ 1;
    await expect(
      createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        { ...input, repositorySession: repositorySession as never },
      ),
    ).rejects.toThrow("v2_repository_immutable_object_conflict");
  });

  it("fails closed on a tampered committed Firestore manifest", async () => {
    const input = await setup();
    await createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
      { ...input, repositorySession: repositorySession as never },
    );
    const [documentPath, current] = [...mockState.documents.entries()][0]!;
    mockState.documents.set(documentPath, {
      canonicalRaw: canonicalJsonV1({
        ...JSON.parse(current.canonicalRaw),
        operationFingerprint: sha256Utf8("tampered-operation"),
      }),
    });
    await expect(
      createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        { ...input, repositorySession: repositorySession as never },
      ),
    ).rejects.toThrow("v2_activity_stage_committed_manifest_invalid");
  });

  it("rejects dependency snapshot drift and wrong production namespace", async () => {
    const input = await setup();
    await expect(
      createFirebaseAdminV2ActivityStageCommitAdapterV1().commitBlockedActivityStage(
        {
          ...input,
          dependencySnapshotRaw: canonicalJsonV1({}),
          repositorySession: repositorySession as never,
        },
      ),
    ).rejects.toThrow("v2_workspace_dependency_snapshot_invalid");
    mockState.app.options.projectId = "demo-wrong";
    expect(() => createFirebaseAdminV2ActivityStageCommitAdapterV1()).toThrow(
      "v2_firebase_admin_repository_app_invalid",
    );
  });
});
