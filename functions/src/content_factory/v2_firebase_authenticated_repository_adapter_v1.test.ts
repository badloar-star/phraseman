import { readFileSync } from "node:fs";
import path from "node:path";
import type { ModeTemplateArtifactBody } from "../../../modules/learning-v2/contracts/activity";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  v2LanguageProfileLifecycleDocumentPathV1,
  v2LanguageProfileObjectPathV1,
  v2LanguageProfileVersionDocumentPathV1,
  v2ModeTemplateLifecycleDocumentPathV1,
  v2ModeTemplateObjectPathV1,
  v2ModeTemplateVersionDocumentPathV1,
  type V2AuthenticatedRepositoryRequirementV1,
} from "./v2_authenticated_repository_contract_v1";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
} from "./v2_activity_instances_validator_capability_v1";
import {
  bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1,
  createFirebaseAdminV2AuthenticatedRepositoryAdapterV1,
  getV2FirebaseAuthenticatedActivityStageCapabilitySummaryV1,
  getV2FirebaseAuthenticatedRepositorySessionSummaryV1,
  isV2FirebaseAuthenticatedActivityStageCapabilityHandleV1,
  isV2FirebaseAuthenticatedRepositorySessionHandleV1,
  resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1,
  resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1,
} from "./v2_firebase_authenticated_repository_adapter_v1";
import { isV2ActivityRepositoryCapabilityBindingV1 } from "./v2_repository_capability_observation_v1";

type MockTimestamp = { seconds: number; nanoseconds: number };
type MockDocument = {
  data: Record<string, unknown>;
  updateTime: MockTimestamp;
};
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

const mockState = {
  app: {
    name: "[DEFAULT]",
    options: {
      projectId: "phraseman-ea0b3",
      storageBucket: "phraseman-ea0b3.firebasestorage.app",
    },
  },
  documents: new Map<string, MockDocument>(),
  objects: new Map<string, MockObject>(),
  firestoreWrites: 0,
  storageWrites: 0,
  generationSequence: 100,
  readSequence: 0,
  generationRacePath: null as string | null,
};

function error(code: number): Error & { code: number } {
  return Object.assign(new Error(String(code)), { code });
}

function snapshot(pathValue: string, readTime: MockTimestamp) {
  const value = mockState.documents.get(pathValue);
  return value
    ? {
        exists: true,
        ref: { path: pathValue },
        readTime,
        updateTime: value.updateTime,
        data: () => value.data,
      }
    : {
        exists: false,
        ref: { path: pathValue },
        readTime,
        updateTime: null,
        data: () => undefined,
      };
}

const mockDb = {
  doc: (pathValue: string) => ({ path: pathValue }),
  getAll: jest.fn(async (...refs: { path: string }[]) => {
    mockState.readSequence += 1;
    const readTime = {
      seconds: 1_800_000_100 + mockState.readSequence,
      nanoseconds: 0,
    };
    return refs.map((ref) => snapshot(ref.path, readTime));
  }),
  runTransaction: jest.fn(
    async (body: (transaction: Record<string, unknown>) => Promise<unknown>) =>
      body({
        get: async (ref: { path: string }) =>
          snapshot(ref.path, { seconds: 1_800_000_000, nanoseconds: 0 }),
        create: (ref: { path: string }, data: Record<string, unknown>) => {
          if (mockState.documents.has(ref.path)) throw error(6);
          mockState.firestoreWrites += 1;
          mockState.documents.set(ref.path, {
            data,
            updateTime: { seconds: 1_800_000_000, nanoseconds: 1 },
          });
        },
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          if (!mockState.documents.has(ref.path)) throw error(5);
          mockState.firestoreWrites += 1;
          mockState.documents.set(ref.path, {
            data,
            updateTime: { seconds: 1_800_000_001, nanoseconds: 1 },
          });
        },
      }),
  ),
};

const mockBucket = {
  name: "phraseman-ea0b3.firebasestorage.app",
  file: jest.fn((objectPath: string, options?: { generation?: string }) => ({
    getMetadata: async () => {
      const value = mockState.objects.get(objectPath);
      if (!value) throw error(404);
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
      if (mockState.objects.has(objectPath)) throw error(412);
      mockState.storageWrites += 1;
      mockState.generationSequence += 1;
      mockState.objects.set(objectPath, {
        bytes: Buffer.from(bytes),
        generation: String(mockState.generationSequence),
        contentType: saveOptions.metadata.contentType,
        contentHash: saveOptions.metadata.metadata.contentHash,
      });
    },
    download: async () => {
      const value = mockState.objects.get(objectPath);
      if (!value) throw error(404);
      if (mockState.generationRacePath === objectPath) throw error(412);
      if (options?.generation !== value.generation) throw error(412);
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
          version: languageBody.version,
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

function relevantRequirements(
  value: V2CanonicalSeasonPlanV2,
): V2AuthenticatedRepositoryRequirementV1[] {
  return value.externalRequirementCatalog.flatMap((entry) =>
    entry.requirement.dependencyType === "language_profile" ||
    entry.requirement.dependencyType === "published_template"
      ? [entry.requirement]
      : [],
  );
}

function seedRequirement(requirement: V2AuthenticatedRepositoryRequirementV1) {
  const isLanguage = requirement.dependencyType === "language_profile";
  const idKey = isLanguage ? "profileId" : "templateId";
  const id = isLanguage ? requirement.profileId : requirement.templateId;
  const body = isLanguage ? languageBody : templateBody;
  const objectRaw = canonicalJsonV1(body);
  const objectPath = isLanguage
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
  const versionPath = isLanguage
    ? v2LanguageProfileVersionDocumentPathV1(
        requirement.profileId,
        requirement.version,
      )
    : v2ModeTemplateVersionDocumentPathV1(
        requirement.templateId,
        requirement.version,
      );
  const lifecyclePath = isLanguage
    ? v2LanguageProfileLifecycleDocumentPathV1(
        requirement.profileId,
        requirement.version,
      )
    : v2ModeTemplateLifecycleDocumentPathV1(
        requirement.templateId,
        requirement.version,
      );
  mockState.objects.set(objectPath, {
    bytes: Buffer.from(objectRaw),
    generation: "10",
    contentType: "application/json; charset=utf-8",
    contentHash: requirement.contentHash,
  });
  mockState.documents.set(versionPath, {
    data: {
      schemaVersion: isLanguage
        ? "v2-language-profile-record.v1"
        : "v2-mode-template-record.v1",
      [idKey]: id,
      version: requirement.version,
      contentHash: requirement.contentHash,
      object: {
        objectPath,
        contentHash: requirement.contentHash,
        objectGeneration: "10",
        byteSize: Buffer.byteLength(objectRaw),
      },
      provenance: {
        createdAt: "2026-08-12T00:00:00.000Z",
        createdBy: "test-owner",
      },
      createdAt: "2026-08-12T00:00:00.000Z",
    },
    updateTime: { seconds: 1_800_000_010, nanoseconds: 1 },
  });
  mockState.documents.set(lifecyclePath, {
    data: {
      schemaVersion: isLanguage
        ? "v2-language-profile-lifecycle.v1"
        : "v2-mode-template-lifecycle.v1",
      [idKey]: id,
      version: requirement.version,
      contentHash: requirement.contentHash,
      status: "published",
      reason: "test_publish",
      changedBy: "test-owner",
      changedAt: "2026-08-12T00:00:00.000Z",
      lifecycleRevision: 1,
    },
    updateTime: { seconds: 1_800_000_011, nanoseconds: 1 },
  });
}

function reset() {
  jest.clearAllMocks();
  mockState.app.name = "[DEFAULT]";
  mockState.app.options.projectId = "phraseman-ea0b3";
  mockState.app.options.storageBucket = "phraseman-ea0b3.firebasestorage.app";
  mockBucket.name = "phraseman-ea0b3.firebasestorage.app";
  mockState.documents.clear();
  mockState.objects.clear();
  mockState.firestoreWrites = 0;
  mockState.storageWrites = 0;
  mockState.generationSequence = 100;
  mockState.readSequence = 0;
  mockState.generationRacePath = null;
  for (const key of [
    "FUNCTIONS_EMULATOR",
    "FIRESTORE_EMULATOR_HOST",
    "STORAGE_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
    "FIREBASE_EMULATOR_HUB",
  ])
    delete process.env[key];
  const value = plan();
  relevantRequirements(value).forEach(seedRequirement);
  return value;
}

function privateObjectPaths(): string[] {
  return [...mockState.objects.keys()].filter((value) =>
    value.startsWith("learning-v2/repository-auth/"),
  );
}

describe("V2 private Firebase authenticated repository adapter", () => {
  it("materializes, persists, finalizes, cold-loads, and exact-replays without rewrites", async () => {
    const value = reset();
    expect(createFirebaseAdminV2AuthenticatedRepositoryAdapterV1.length).toBe(
      0,
    );
    const first =
      await createFirebaseAdminV2AuthenticatedRepositoryAdapterV1().authenticatePlan(
        value,
      );
    expect(isV2FirebaseAuthenticatedRepositorySessionHandleV1(first)).toBe(
      true,
    );
    const summary = getV2FirebaseAuthenticatedRepositorySessionSummaryV1(first);
    expect(summary).toMatchObject({
      planFingerprint: value.planFingerprint,
      repositoryOriginAuthenticity: "server_admin_sdk_authenticated_readback",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      principalIdentityAuthority: "none",
      humanReviewAuthority: "none",
      publicationDecisionAuthority: "none",
      runtimeKernelAuthority: "none",
      executionAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
      requirementCount: 2,
      templateCount: 1,
    });
    expect(privateObjectPaths()).toHaveLength(4);
    const writes = {
      firestore: mockState.firestoreWrites,
      storage: mockState.storageWrites,
    };

    const replay =
      await createFirebaseAdminV2AuthenticatedRepositoryAdapterV1().authenticatePlan(
        value,
      );
    expect(isV2FirebaseAuthenticatedRepositorySessionHandleV1(replay)).toBe(
      true,
    );
    expect(mockState.firestoreWrites).toBe(writes.firestore);
    expect(mockState.storageWrites).toBe(writes.storage);
    expect(
      getV2FirebaseAuthenticatedRepositorySessionSummaryV1(replay),
    ).toMatchObject({
      receiptFingerprint: summary.receiptFingerprint,
      repositoryObservationFingerprint:
        summary.repositoryObservationFingerprint,
      repositoryOriginAuthority: summary.repositoryOriginAuthority,
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    expect(
      isV2FirebaseAuthenticatedRepositorySessionHandleV1({ ...first }),
    ).toBe(false);
    expect(
      isV2FirebaseAuthenticatedRepositorySessionHandleV1(
        JSON.parse(JSON.stringify(first)),
      ),
    ).toBe(false);

    const activityStage = value.stages.find(
      (stage) => stage.kind === "v2_activity_instances",
    )!;
    const capability =
      bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1({
        session: first,
        plan: value,
        stageId: activityStage.stageId,
      });
    expect(
      isV2FirebaseAuthenticatedActivityStageCapabilityHandleV1(capability),
    ).toBe(true);
    const capabilitySummary =
      getV2FirebaseAuthenticatedActivityStageCapabilitySummaryV1(capability);
    expect(capabilitySummary).toMatchObject({
      namespaceFingerprint: summary.namespaceFingerprint,
      repositoryOriginReceiptFingerprint: summary.receiptFingerprint,
      repositoryObservationFingerprint:
        summary.repositoryObservationFingerprint,
      planFingerprint: value.planFingerprint,
      courseContractFingerprint: value.courseContract.courseContractFingerprint,
      repositoryScopeFingerprint: summary.repositoryScopeFingerprint,
      requestFingerprint: summary.requestFingerprint,
      stageId: activityStage.stageId,
      episodeId: activityStage.episodeId,
      connectionAuthentication: "firebase_admin_default_app_exact_trust_root",
      repositoryOriginAuthenticity: "server_admin_sdk_authenticated_readback",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      capabilityBindingAuthority: "structural_exact_match_only",
      principalIdentityAuthority: "none",
      contentValidationAuthority: "none",
      humanReviewAuthority: "none",
      specialistEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      runtimeKernelAuthority: "none",
      executionAuthority: "none",
      publicationDecisionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    const structural =
      resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1({
        capability,
        plan: value,
        stageId: activityStage.stageId,
      });
    expect(isV2ActivityRepositoryCapabilityBindingV1(structural)).toBe(true);
    expect(structural.bindingFingerprint).toBe(
      capabilitySummary.structuralBindingFingerprint,
    );
    const validatorCapability =
      resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1({
        capability,
        plan: value,
        stageId: activityStage.stageId,
      });
    expect(validatorCapability).toMatchObject({
      repositoryResolutionAuthority: "unverified_external_refs",
      languageProfileRef: {
        profileId: languageBody.profileId,
        version: languageBody.version,
        contentHash: hashCanonicalBody(languageBody),
      },
      familyCatalogRef: value.courseContract.familyCatalogRef,
      requiredSessionFamilyPolicyRef:
        value.courseContract.requiredSessionFamilyPolicyRef,
    });
    expect(validatorCapability.templates).toHaveLength(1);
    expect(validatorCapability.templates[0]).toMatchObject({
      templateId: templateBody.templateId,
      version: templateBody.version,
      contentHash: hashCanonicalBody(templateBody),
      projectorRulesFingerprint:
        V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1,
      supportManifestFingerprint:
        V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
    });
    expect(
      resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1({
        capability,
        plan: value,
        stageId: activityStage.stageId,
      }),
    ).toEqual(validatorCapability);
    expect(
      isV2FirebaseAuthenticatedActivityStageCapabilityHandleV1({
        ...capability,
      }),
    ).toBe(false);
    expect(() =>
      resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1({
        capability: capabilitySummary as never,
        plan: value,
        stageId: activityStage.stageId,
      }),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_handle_invalid",
    );
    for (const invalidCapability of [
      { ...capability },
      capabilitySummary,
      validatorCapability,
    ]) {
      expect(() =>
        resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1(
          {
            capability: invalidCapability as never,
            plan: value,
            stageId: activityStage.stageId,
          },
        ),
      ).toThrow(
        "v2_firebase_authenticated_activity_stage_capability_handle_invalid",
      );
    }
    expect(() =>
      bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1({
        session: first,
        plan: plan(),
        stageId: activityStage.stageId,
      }),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_input_invalid",
    );
    expect(() =>
      bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1({
        session: summary as never,
        plan: value,
        stageId: activityStage.stageId,
      }),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_input_invalid",
    );
    expect(() =>
      bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1({
        session: { ...first },
        plan: value,
        stageId: activityStage.stageId,
      }),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_input_invalid",
    );
    const nonActivityStage = value.stages.find(
      (stage) => stage.kind !== "v2_activity_instances",
    )!;
    expect(() =>
      bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1({
        session: first,
        plan: value,
        stageId: nonActivityStage.stageId,
      }),
    ).toThrow("repository_capability_binding_stage_invalid");
    expect(() =>
      resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1({
        capability,
        plan: value,
        stageId: `${activityStage.stageId}:other`,
      }),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_handle_invalid",
    );
    expect(() =>
      resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1({
        capability,
        plan: value,
        stageId: `${activityStage.stageId}:other`,
      }),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_handle_invalid",
    );
    expect(() =>
      resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1({
        capability,
        plan: plan(),
        stageId: activityStage.stageId,
      }),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_handle_invalid",
    );
  });

  it.each(["manifest", "blob", "observation", "receipt"])(
    "fails closed when persisted %s bytes are tampered after commit",
    async (kind) => {
      const value = reset();
      await createFirebaseAdminV2AuthenticatedRepositoryAdapterV1().authenticatePlan(
        value,
      );
      const pathValue = privateObjectPaths().find((candidate) =>
        kind === "receipt"
          ? !candidate.includes("/private/")
          : candidate.includes(
              `/private/${kind === "blob" ? "bundles" : `${kind}s`}/`,
            ),
      );
      expect(pathValue).toBeDefined();
      const stored = mockState.objects.get(pathValue!)!;
      const tampered = Buffer.from(stored.bytes);
      tampered[0] = tampered[0] === 0 ? 1 : tampered[0]! ^ 1;
      stored.bytes = tampered;
      await expect(
        createFirebaseAdminV2AuthenticatedRepositoryAdapterV1().authenticatePlan(
          value,
        ),
      ).rejects.toThrow(
        "v2_firebase_authenticated_repository_pin_readback_mismatch",
      );
    },
  );

  it("rejects current Firestore head updateTime drift on cold replay", async () => {
    const value = reset();
    await createFirebaseAdminV2AuthenticatedRepositoryAdapterV1().authenticatePlan(
      value,
    );
    const requirement = relevantRequirements(value)[0]!;
    const versionPath =
      requirement.dependencyType === "language_profile"
        ? v2LanguageProfileVersionDocumentPathV1(
            requirement.profileId,
            requirement.version,
          )
        : v2ModeTemplateVersionDocumentPathV1(
            requirement.templateId,
            requirement.version,
          );
    const document = mockState.documents.get(versionPath)!;
    document.updateTime = {
      seconds: document.updateTime.seconds + 1,
      nanoseconds: document.updateTime.nanoseconds,
    };
    await expect(
      createFirebaseAdminV2AuthenticatedRepositoryAdapterV1().authenticatePlan(
        value,
      ),
    ).rejects.toThrow("v2_authenticated_repository_cold_replay_head_mismatch");
  });

  it("rejects a source-object generation race before any session handle exists", async () => {
    const value = reset();
    const requirement = relevantRequirements(value)[0]!;
    mockState.generationRacePath =
      requirement.dependencyType === "language_profile"
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
    await expect(
      createFirebaseAdminV2AuthenticatedRepositoryAdapterV1().authenticatePlan(
        value,
      ),
    ).rejects.toThrow(
      "v2_firebase_admin_repository_object_generation_mismatch",
    );
  });

  it("rejects wrong production coordinates before repository reads", () => {
    reset();
    mockState.app.options.projectId = "demo-wrong";
    expect(() =>
      createFirebaseAdminV2AuthenticatedRepositoryAdapterV1(),
    ).toThrow("v2_firebase_admin_repository_app_invalid");
    expect(mockDb.getAll).not.toHaveBeenCalled();
  });
});
