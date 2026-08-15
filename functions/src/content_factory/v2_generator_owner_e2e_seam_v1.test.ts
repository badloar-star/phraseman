import { createHash } from "node:crypto";
import { handleAdminCreateV2GenerationPlan } from "../admin_v2_generation";
import { loadV2ActivityReleaseHandlesFromUnifiedRootV1 } from "./v2_activity_released_session_callable_v1";
import { contentStageReviewFingerprint } from "./review_fingerprint";
import type {
  V2RepositoryFirestorePortV1,
  V2RepositoryImmutableCreateResultV1,
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableObjectPinV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import type { V2OwnerAuthoredEpisodeInputSummaryV1 } from "./v2_owner_authored_episode_input_v1";
import {
  confirmV2OwnerEpisodeV1,
  type V2OwnerEpisodeConfirmationDependenciesV1,
} from "./v2_owner_episode_confirmation_adapter_v1";
import type { V2OwnerEpisodeConfirmationV1 } from "./v2_owner_episode_confirmation_v1";
import { handleV2OwnerEpisodePreviewV1 } from "./v2_owner_episode_preview_v1";
import {
  importV2OwnerEpisodeStageV1,
  type V2OwnerEpisodeStageDocumentV1,
} from "./v2_owner_episode_stage_repository_v1";
import {
  materializeV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseEpisodeV1,
} from "./v2_unified_course_release_v1";
import {
  createV2UnifiedCourseReleaseRepositoryV1,
  resolveV2UnifiedCourseReleaseActiveMaterialV1,
} from "./v2_unified_course_release_repository_v1";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const repeatedHash = (character: string) => character.repeat(64);
const JSON_CONTENT_TYPE = "application/json; charset=utf-8" as const;
const ownerAuth = Object.freeze({
  uid: "fixture-owner.invalid",
  token: Object.freeze({ admin: true, adminRole: "owner" }),
});

class MemoryStorage implements V2RepositoryImmutableStoragePortV1 {
  readonly values = new Map<
    string,
    { bytes: Uint8Array; metadata: V2RepositoryImmutableObjectMetadataV1 }
  >();
  writes = 0;

  async readMetadataExact(path: string) {
    return this.values.get(path)?.metadata ?? null;
  }

  async createExact(
    input: Parameters<V2RepositoryImmutableStoragePortV1["createExact"]>[0],
  ): Promise<V2RepositoryImmutableCreateResultV1> {
    if (this.values.has(input.objectPath))
      return Object.freeze({ kind: "precondition_failed" as const });
    const metadata = Object.freeze({
      generation: String(this.values.size + 1),
      byteSize: input.bytes.byteLength,
      contentType: input.contentType,
      contentHash: input.contentHash,
    });
    this.values.set(input.objectPath, {
      bytes: new Uint8Array(input.bytes),
      metadata,
    });
    this.writes += 1;
    return Object.freeze({ kind: "created" as const, metadata });
  }

  async downloadGenerationExact(
    input: Parameters<
      V2RepositoryImmutableStoragePortV1["downloadGenerationExact"]
    >[0],
  ) {
    const found = this.values.get(input.objectPath);
    if (!found) return Object.freeze({ kind: "not_found" as const });
    if (found.metadata.generation !== input.ifGenerationMatch)
      return Object.freeze({ kind: "generation_mismatch" as const });
    return Object.freeze({
      kind: "downloaded" as const,
      bytes: new Uint8Array(found.bytes),
    });
  }

  async quarantineConflict() {}
}

class MemoryFirestore implements V2RepositoryFirestorePortV1 {
  readonly values = new Map<string, string>();
  writes = 0;

  async runTransaction<T>(
    body: (transaction: never) => Promise<T>,
  ): Promise<T> {
    const pending: (() => void)[] = [];
    const result = await body({
      readExact: async (path: string) =>
        this.values.has(path)
          ? { exists: true as const, raw: this.values.get(path)! }
          : { exists: false as const },
      createExact: async (path: string, raw: string) => {
        if (this.values.has(path)) throw new Error("create_conflict");
        pending.push(() => {
          this.values.set(path, raw);
          this.writes += 1;
        });
      },
      compareAndSetExact: async (
        path: string,
        expected: { operationRevision: number; operationFingerprint: string },
        raw: string,
      ) => {
        const current = JSON.parse(this.values.get(path) ?? "null") as {
          operationRevision?: number;
          operationFingerprint?: string;
        } | null;
        if (
          current?.operationRevision !== expected.operationRevision ||
          current.operationFingerprint !== expected.operationFingerprint
        )
          throw new Error("cas_conflict");
        pending.push(() => {
          this.values.set(path, raw);
          this.writes += 1;
        });
      },
    } as never);
    pending.forEach((write) => write());
    return result;
  }
}

function generationDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const db = {
    collection(name: string) {
      return { doc: (id: string) => ({ path: `${name}/${id}` }) };
    },
    async runTransaction<T>(
      work: (transaction: {
        get(document: { path: string }): Promise<{
          exists: boolean;
          data(): Record<string, unknown> | undefined;
        }>;
        create(
          document: { path: string },
          value: Record<string, unknown>,
        ): void;
      }) => Promise<T>,
    ) {
      return work({
        async get(document) {
          const value = docs.get(document.path);
          return { exists: Boolean(value), data: () => value };
        },
        create(document, value) {
          if (docs.has(document.path)) throw new Error("already-exists");
          docs.set(document.path, value);
        },
      });
    },
    docs,
  };
  return db;
}

function pin(name: string) {
  return Object.freeze({
    objectPath: `learning-v2/neutral-e2e/${name}.json`,
    contentHash: sha256(name),
    objectGeneration: "1",
    byteSize: 10,
    contentType: JSON_CONTENT_TYPE,
  });
}

function releaseEpisode(
  ordinal: number,
  first?: Readonly<{
    stageId: string;
    ownerInputFingerprint: string;
    confirmation: V2OwnerEpisodeConfirmationV1;
    confirmationPin: V2RepositoryImmutableObjectPinV1;
  }>,
): Omit<V2UnifiedCourseReleaseEpisodeV1, "episodeReleaseFingerprint"> {
  const prefix = `episode-${ordinal}`;
  return {
    episodeOrdinal: ordinal,
    episodeId: prefix,
    stageId:
      ordinal === 1 && first ? first.stageId : `fixture-stage-${ordinal}`,
    activityAssemblyFingerprint:
      ordinal === 1 && first
        ? first.confirmation.activityAssemblyFingerprint
        : sha256(`${prefix}-assembly`),
    activityPackageFingerprint: sha256(`${prefix}-package`),
    ownerInputFingerprint:
      ordinal === 1 && first
        ? first.ownerInputFingerprint
        : sha256(`${prefix}-owner`),
    ownerConfirmationFingerprint:
      ordinal === 1 && first
        ? first.confirmation.confirmationFingerprint
        : sha256(`${prefix}-confirmation`),
    ownerConfirmationObject:
      ordinal === 1 && first
        ? first.confirmationPin
        : pin(`${prefix}-confirmation`),
    learnerCoreIndexFingerprint: sha256(`${prefix}-learner`),
    learnerCoreIndexObject: pin(`${prefix}-learner`),
    serverEvaluatorIndexFingerprint: sha256(`${prefix}-evaluator`),
    serverEvaluatorIndexObject: pin(`${prefix}-evaluator`),
    auxiliaryIndexFingerprint: sha256(`${prefix}-auxiliary`),
    auxiliaryIndexObject: pin(`${prefix}-auxiliary`),
    voiceAudioIndexFingerprint: sha256(`${prefix}-voice`),
    voiceAudioIndexObject: pin(`${prefix}-voice`),
    localizationIndexFingerprint: sha256(`${prefix}-localization`),
    localizationIndexObject: pin(`${prefix}-localization`),
    errorGuidanceIndexFingerprint: sha256(`${prefix}-errors`),
    errorGuidanceIndexObject: pin(`${prefix}-errors`),
  };
}

describe("Learning V2 neutral owner-generator E2E seam", () => {
  test("connects canonical plan, manual import, preview, synthetic confirmation and A→B→A repository rollback", async () => {
    const db = generationDb();
    const generationRequest = {
      schemaVersion: "v2-admin-generation-request.v1",
      seasonId: "fixture-season",
      scope: "vertical_slice",
      episodeIds: ["episode-1"],
      studyTarget: "en",
      sourceLocale: "ru",
      targetLocales: ["uk"],
      templateBindings: [
        {
          episodeId: "episode-1",
          templateRefs: [
            {
              templateId: "fixture-template",
              version: 1,
              contentHash: repeatedHash("a"),
            },
          ],
        },
      ],
      idempotencyKey: "fixture-job",
      languageProfileRef: {
        profileId: "fixture-language",
        version: 1,
        contentHash: repeatedHash("b"),
      },
    };
    const created = await handleAdminCreateV2GenerationPlan(
      {
        auth: ownerAuth,
        data: {
          schemaVersion: "v2-admin-canonical-generation-command.v2",
          generationRequest,
          canonicalBridge: {
            schemaVersion: "v2-admin-canonical-generation-bridge.v1",
            workspaceId: "fixture-workspace",
            authoringRevision: 1,
            speechProfileRef: {
              profileId: "fixture-speech",
              targetLanguage: "en",
              speechLocale: "en-US",
              version: 1,
              contentHash: repeatedHash("c"),
            },
            voiceGenerationProfileRef: {
              profileId: "fixture-voice",
              version: 1,
              contentHash: repeatedHash("d"),
            },
            decisionRegistryRef: {
              decisionId: "HYP-V2-007",
              version: 1,
              contentHash: repeatedHash("e"),
            },
          },
        },
      },
      {
        db: db as never,
        resolveTemplate: async (reference) => reference,
        now: () => "2026-08-13T15:00:00.000Z",
        authenticateRootOwner: () =>
          Object.freeze({
            actorUid: ownerAuth.uid,
            role: "owner" as const,
            ownerIdentityFingerprint: sha256("fixture-owner"),
            authenticationAuthority:
              "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
            identityPolicyFingerprint: sha256("fixture-owner-policy"),
          }),
      },
    );
    expect(created.canonicalV2Authority).toBe("none_draft_plan_only");
    expect(created.canonicalPlanRequestRaw).toContain(
      "v2-canonical-plan-request.v2",
    );
    const job = db.docs.get("content_v2_generation_jobs/fixture-job")!;
    const canonicalPlan = job.canonicalPlan as {
      planFingerprint: string;
      courseContract: { courseContractFingerprint: string };
      stages: {
        stageId: string;
        kind: string;
        episodeId: string | null;
      }[];
    };
    const activityStage = canonicalPlan.stages.find(
      (stage) =>
        stage.kind === "v2_activity_instances" &&
        stage.episodeId === "episode-1",
    );
    expect(activityStage).toBeDefined();

    const summary: V2OwnerAuthoredEpisodeInputSummaryV1 = Object.freeze({
      schemaVersion: "v2-owner-authored-episode-input-summary.v1",
      contentClass: "production_candidate",
      ownerInputId: "fixture.invalid.episode-1",
      planFingerprint: canonicalPlan.planFingerprint,
      courseContractFingerprint:
        canonicalPlan.courseContract.courseContractFingerprint,
      stageId: activityStage!.stageId,
      episodeId: "episode-1",
      targetLanguage: "en",
      authoringRevision: 1,
      sessionCount: 12,
      taskCount: 144,
      inputFingerprint: sha256("fixture-owner-input"),
      activityAssemblyFingerprint: sha256("fixture-activity-assembly"),
      sourceFingerprints: Object.freeze(
        Array.from({ length: 12 }, (_, index) =>
          sha256(`fixture-source-${index + 1}`),
        ),
      ),
      ownerInputOriginAuthority: "unverified_canonical_input_claim",
      interfaceLocalizationAuthority: "none",
      repositoryAuthority: "none",
      humanApprovalAuthority: "none",
      executionAuthority: "none",
      publicationPolicy: "draft_only_no_consumer",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    const ownerRaw = JSON.stringify({ fixture: "synthetic-owner-input" });
    const storage = new MemoryStorage();
    let stage: V2OwnerEpisodeStageDocumentV1 | null = null;
    await importV2OwnerEpisodeStageV1(
      {
        auth: ownerAuth,
        data: {
          planRequestRaw: created.canonicalPlanRequestRaw,
          stageId: summary.stageId,
          ownerInputRaw: ownerRaw,
        },
      },
      {
        storage,
        now: () => "2026-08-13T15:01:00.000Z",
        authenticateOwner: () =>
          Object.freeze({
            actorUid: ownerAuth.uid,
            role: "owner" as const,
            ownerIdentityFingerprint: sha256("fixture-owner"),
            authenticationAuthority:
              "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
            identityPolicyFingerprint: sha256("fixture-owner-policy"),
          }),
        resolveOwnerInput: () =>
          Object.freeze({
            summary,
            raw: ownerRaw,
            planRequestRaw: created.canonicalPlanRequestRaw!,
            workspaceId: "fixture-workspace",
          }),
        stages: {
          async commitExact(input) {
            const reserved = db.docs.get(
              `content_factory_stages/${input.stageId}`,
            );
            expect(reserved).toMatchObject({
              schemaVersion: "v2-generation-stage.v2",
              state: "queued",
              executionMode: "owner_authored_manual_import_only",
              planFingerprint: summary.planFingerprint,
              courseContractFingerprint: summary.courseContractFingerprint,
              episodeId: summary.episodeId,
            });
            db.docs.set(`content_factory_stages/${input.stageId}`, {
              ...input.document,
            });
            stage = input.document;
            return "materialized_reserved" as const;
          },
        },
      },
    );
    expect(
      db.docs.get(`content_factory_stages/${summary.stageId}`),
    ).toMatchObject({
      schemaVersion: "v2-owner-authored-episode-stage.v1",
      state: "needs_review",
      ownerInputFingerprint: summary.inputFingerprint,
    });
    const preview = await handleV2OwnerEpisodePreviewV1(
      {
        auth: {
          uid: "fixture-reviewer.invalid",
          token: { admin: true, adminRole: "content_reviewer" },
        },
        data: { stageId: summary.stageId },
      },
      {
        async readStage() {
          return Object.freeze({
            exists: true,
            id: summary.stageId,
            data: stage! as unknown as Readonly<Record<string, unknown>>,
          });
        },
        async readObject(input) {
          const found = storage.values.get(input.objectPath)!;
          return Object.freeze({
            objectGeneration: found.metadata.generation,
            byteSize: found.metadata.byteSize,
            contentType: found.metadata.contentType,
            bytes: found.bytes,
          });
        },
      },
    );
    expect(preview.payload).toEqual({ fixture: "synthetic-owner-input" });

    let confirmation: V2OwnerEpisodeConfirmationV1 | null = null;
    let confirmationPin: V2RepositoryImmutableObjectPinV1 | null = null;
    const confirmationDependencies: V2OwnerEpisodeConfirmationDependenciesV1 = {
      storage,
      now: () => "2026-08-13T15:02:00.000Z",
      authenticateOwner: () =>
        Object.freeze({
          actorUid: ownerAuth.uid,
          role: "owner" as const,
          ownerIdentityFingerprint: sha256("fixture-owner"),
          authenticationAuthority:
            "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
          identityPolicyFingerprint: sha256("fixture-owner-policy"),
        }),
      async resolveVerifiedStage() {
        return summary;
      },
      repository: {
        async readStage() {
          return Object.freeze({
            id: summary.stageId,
            data: stage! as unknown as Readonly<Record<string, unknown>>,
          });
        },
        async commitExact(input) {
          confirmation = input.confirmation;
          confirmationPin = input.confirmationPin;
          return "created" as const;
        },
      },
    };
    const confirmed = await confirmV2OwnerEpisodeV1(
      {
        auth: ownerAuth,
        data: {
          stageId: summary.stageId,
          expectedReviewFingerprint: contentStageReviewFingerprint(
            summary.stageId,
            stage! as unknown as Record<string, unknown>,
          ),
          reason: "Synthetic E2E seam confirmation; not real owner approval.",
        },
      },
      confirmationDependencies,
    );
    expect(confirmed.releaseAuthority).toBe(false);
    expect(confirmation).not.toBeNull();
    expect(confirmationPin).not.toBeNull();

    const makeRelease = (releaseId: string) =>
      materializeV2UnifiedCourseReleaseRootV1({
        environment: "lab",
        releaseId,
        activeManifestHash: sha256(`${releaseId}-manifest`),
        planFingerprint: canonicalPlan.planFingerprint,
        courseContractFingerprint:
          canonicalPlan.courseContract.courseContractFingerprint,
        seasonId: "fixture-season",
        targetLanguage: "en-US",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
        contentClass: "neutral_test_fixture",
        releaseScope: "full_season",
        rollout: {
          revision: 1,
          state: "internal",
          percent: 0,
          cohortSaltVersion: 1,
          allowlistCohortIds: [],
          excludeCohortIds: [],
        },
        episodes: Array.from({ length: 32 }, (_, index) =>
          releaseEpisode(
            index + 1,
            index === 0
              ? {
                  stageId: summary.stageId,
                  ownerInputFingerprint: summary.inputFingerprint,
                  confirmation: confirmation!,
                  confirmationPin: confirmationPin!,
                }
              : undefined,
          ),
        ),
      });
    const firestore = new MemoryFirestore();
    const releaseStorage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV1({
      firestore,
      storage: releaseStorage,
    });
    const releaseA = makeRelease("fixture-release-a");
    const releaseB = makeRelease("fixture-release-b");
    await repository.persistAndAdvance({
      target: releaseA,
      action: "activate",
      expectedRevision: 0,
      operationId: "fixture-activate-a",
      updatedAtIso: "2026-08-13T15:03:00.000Z",
    });
    await repository.persistAndAdvance({
      target: releaseB,
      action: "activate",
      expectedRevision: 1,
      operationId: "fixture-activate-b",
      updatedAtIso: "2026-08-13T15:04:00.000Z",
    });
    const rolledBack = await repository.persistAndAdvance({
      target: releaseA,
      action: "rollback",
      expectedRevision: 2,
      operationId: "fixture-rollback-a",
      updatedAtIso: "2026-08-13T15:05:00.000Z",
    });
    const active = await repository.readActive({
      environment: "lab",
      seasonId: "fixture-season",
      studyTarget: "en",
      learnerSourceLocale: "ru",
    });
    expect(rolledBack.head.state).toBe("rolled_back");
    expect(active.root.rootFingerprint).toBe(releaseA.rootFingerprint);
    expect(active.root.releaseAuthority).toBe(false);
    expect(active.root.contentClass).toBe("neutral_test_fixture");

    const legacyPointerRead = jest.fn(async () => {
      throw new Error("legacy_pointer_must_not_be_read");
    });
    const pinnedLoader = (kind: string) =>
      jest.fn(async (activeHandle, episodeId) => {
        const material = resolveV2UnifiedCourseReleaseActiveMaterialV1(
          activeHandle as never,
        );
        expect(material.root).toBe(active.root);
        expect(material.head.state).toBe("rolled_back");
        expect(episodeId).toBe("episode-1");
        return Object.freeze({ kind, releaseId: material.root.releaseId });
      });
    const auxiliaryPinned = pinnedLoader("auxiliary");
    const learnerPinned = pinnedLoader("learner");
    const evaluatorPinned = pinnedLoader("evaluator");
    const releaseHandles = await loadV2ActivityReleaseHandlesFromUnifiedRootV1({
      activeHandle: active.activeHandle,
      episodeId: "episode-1",
      auxiliary: {
        load: legacyPointerRead,
        loadPinned: auxiliaryPinned,
      } as never,
      learnerCore: {
        load: legacyPointerRead,
        loadPinned: learnerPinned,
      } as never,
      evaluator: {
        load: legacyPointerRead,
        loadPinned: evaluatorPinned,
      } as never,
    });
    expect(legacyPointerRead).not.toHaveBeenCalled();
    expect(releaseHandles).toEqual({
      auxiliaryHandle: { kind: "auxiliary", releaseId: "fixture-release-a" },
      learnerCoreHandle: { kind: "learner", releaseId: "fixture-release-a" },
      evaluatorHandle: { kind: "evaluator", releaseId: "fixture-release-a" },
    });
  });
});
