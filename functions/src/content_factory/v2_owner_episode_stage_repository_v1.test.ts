import {
  type V2RepositoryImmutableCreateResultV1,
  type V2RepositoryImmutableObjectMetadataV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  importV2OwnerEpisodeStageV1,
  type V2OwnerEpisodeStageDocumentV1,
  type V2OwnerEpisodeStageImportDependenciesV1,
} from "./v2_owner_episode_stage_repository_v1";
import { handleV2OwnerEpisodePreviewV1 } from "./v2_owner_episode_preview_v1";

const hash = (character: string) => character.repeat(64);
const summary = Object.freeze({
  schemaVersion: "v2-owner-authored-episode-input-summary.v1" as const,
  contentClass: "neutral_test_fixture" as const,
  ownerInputId: "neutral-fixture.episode-1-r7",
  planFingerprint: hash("a"),
  courseContractFingerprint: hash("b"),
  stageId: "v2s2:activity:episode-1",
  episodeId: "episode-1",
  targetLanguage: "en",
  authoringRevision: 7,
  sessionCount: 12 as const,
  taskCount: 144 as const,
  inputFingerprint: hash("c"),
  activityAssemblyFingerprint: hash("d"),
  sourceFingerprints: Object.freeze(
    Array.from({ length: 12 }, () => hash("e")),
  ),
  ownerInputOriginAuthority: "unverified_canonical_input_claim" as const,
  interfaceLocalizationAuthority: "none" as const,
  repositoryAuthority: "none" as const,
  humanApprovalAuthority: "none" as const,
  executionAuthority: "none" as const,
  publicationPolicy: "draft_only_no_consumer" as const,
  runtimeConsumer: false as const,
  releaseEligible: false as const,
  releaseAuthority: false as const,
});
const summaryV2 = Object.freeze({
  ...summary,
  schemaVersion: "v2-owner-authored-episode-input-summary.v2" as const,
  contentClass: "production_candidate" as const,
  introCount: 12 as const,
  introQuestionCount: 36 as const,
  introAggregateFingerprint: hash("f"),
  introFingerprints: Object.freeze(Array.from({ length: 12 }, () => hash("7"))),
  introContentAuthority: "unverified_owner_input_claim" as const,
  languageAccuracyAuthority: "none" as const,
  curriculumAuthority: "none" as const,
});
const ownerInputRaw = JSON.stringify({ neutral: true });
const request = Object.freeze({
  auth: Object.freeze({
    uid: "owner-uid",
    token: Object.freeze({ admin: true, adminRole: "owner" }),
  }),
  data: Object.freeze({
    planRequestRaw: "{}",
    stageId: summary.stageId,
    ownerInputRaw,
  }),
});

function harness() {
  const objects = new Map<
    string,
    { bytes: Uint8Array; metadata: V2RepositoryImmutableObjectMetadataV1 }
  >();
  let immutableWrites = 0;
  let stageWrites = 0;
  let auditWrites = 0;
  let stage: V2OwnerEpisodeStageDocumentV1 | null = null;
  const storage: V2RepositoryImmutableStoragePortV1 = {
    async readMetadataExact(path) {
      return objects.get(path)?.metadata ?? null;
    },
    async createExact(input): Promise<V2RepositoryImmutableCreateResultV1> {
      if (objects.has(input.objectPath))
        return Object.freeze({ kind: "precondition_failed" as const });
      const metadata = Object.freeze({
        generation: "7",
        byteSize: input.bytes.byteLength,
        contentType: input.contentType,
        contentHash: input.contentHash,
      });
      objects.set(input.objectPath, {
        bytes: new Uint8Array(input.bytes),
        metadata,
      });
      immutableWrites += 1;
      return Object.freeze({ kind: "created" as const, metadata });
    },
    async downloadGenerationExact(input) {
      const found = objects.get(input.objectPath);
      if (!found) return Object.freeze({ kind: "not_found" as const });
      if (found.metadata.generation !== input.ifGenerationMatch)
        return Object.freeze({ kind: "generation_mismatch" as const });
      return Object.freeze({ kind: "downloaded" as const, bytes: found.bytes });
    },
    async quarantineConflict() {},
  };
  const dependencies: V2OwnerEpisodeStageImportDependenciesV1 = {
    storage,
    now: () => "2026-08-13T12:00:00.000Z",
    authenticateOwner(auth) {
      if (
        auth?.uid !== "owner-uid" ||
        auth.token?.admin !== true ||
        auth.token.adminRole !== "owner"
      )
        throw new Error("Owner admin claim required");
      return Object.freeze({
        actorUid: "owner-uid",
        role: "owner" as const,
        ownerIdentityFingerprint: hash("9"),
        authenticationAuthority:
          "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
        identityPolicyFingerprint: hash("8"),
      });
    },
    resolveOwnerInput: () =>
      Object.freeze({
        summary,
        raw: ownerInputRaw,
        planRequestRaw: request.data.planRequestRaw,
        workspaceId: "workspace-1",
      }),
    stages: {
      async commitExact(input) {
        if (stage) {
          if (
            stage.ownerInputFingerprint !==
              input.document.ownerInputFingerprint ||
            stage.contentHash !== input.document.contentHash ||
            stage.objectGeneration !== input.document.objectGeneration
          )
            throw new Error("v2_owner_episode_stage_commit_conflict");
          return "exact_replay" as const;
        }
        stage = input.document;
        stageWrites += 1;
        auditWrites += 1;
        return "created" as const;
      },
    },
  };
  return {
    dependencies,
    objects,
    get stage() {
      return stage;
    },
    counts: () => ({ immutableWrites, stageWrites, auditWrites }),
  };
}

describe("Learning V2 owner episode shared stage repository", () => {
  it("persists exact owner bytes and creates the previewable stage in one shared collection contract", async () => {
    const state = harness();
    const result = await importV2OwnerEpisodeStageV1(
      request,
      state.dependencies,
    );
    expect(result).toMatchObject({
      ok: true,
      state: "needs_review",
      replayed: false,
      sessionCount: 12,
      taskCount: 144,
      humanApprovalAuthority: "none",
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(state.stage).toMatchObject({
      schemaVersion: "v2-owner-authored-episode-stage.v1",
      kind: "v2_activity_instances",
      state: "needs_review",
      contentClass: "neutral_test_fixture",
      ownerInputFingerprint: summary.inputFingerprint,
      activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
      artifactStorageEvidence: "exact_generation_matched_readback",
      ownerAuthenticationAuthority:
        "firebase_auth_explicit_owner_role_and_server_configured_uid_hash",
      ownerInputOriginAuthority: "unverified_canonical_input_claim",
      humanApprovalAuthority: "none",
      publicationPolicy: "draft_only_no_consumer",
      releaseEligible: false,
    });
    expect(state.stage?.objectPath).toMatch(/^content-factory-stages\//);
    expect(state.stage?.planRequestObjectPath).toMatch(
      /^content-factory-stage-plans\//,
    );
    expect(state.counts()).toEqual({
      // One immutable plan request plus one immutable owner episode input.
      immutableWrites: 2,
      stageWrites: 1,
      auditWrites: 1,
    });

    const preview = await handleV2OwnerEpisodePreviewV1(
      {
        auth: {
          uid: "reviewer-uid",
          token: { admin: true, adminRole: "content_reviewer" },
        },
        data: { stageId: summary.stageId },
      },
      {
        async readStage(stageId) {
          return Object.freeze({
            exists: stageId === state.stage?.stageId,
            id: stageId,
            data: state.stage ?? Object.freeze({}),
          });
        },
        async readObject(input) {
          const found = state.objects.get(input.objectPath);
          if (!found) throw new Error("missing_object");
          return Object.freeze({
            objectGeneration: found.metadata.generation,
            byteSize: found.metadata.byteSize,
            contentType: found.metadata.contentType,
            bytes: found.bytes,
          });
        },
      },
    );
    expect(preview).toMatchObject({
      ok: true,
      stage: {
        id: summary.stageId,
        ownerInputFingerprint: summary.inputFingerprint,
      },
      payload: { neutral: true },
      qaReceipt: {
        status: "passed",
        sessionCount: 12,
        taskCount: 144,
      },
      reviewFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("is an exact zero-write replay after immutable bytes and the stage were committed", async () => {
    const state = harness();
    await importV2OwnerEpisodeStageV1(request, state.dependencies);
    const replay = await importV2OwnerEpisodeStageV1(
      request,
      state.dependencies,
    );
    expect(replay.replayed).toBe(true);
    expect(state.counts()).toEqual({
      immutableWrites: 2,
      stageWrites: 1,
      auditWrites: 1,
    });
  });

  it("stores a v2 stage with the exact 12-intro aggregate and previews the unchanged bytes", async () => {
    const state = harness();
    const dependencies = Object.freeze({
      ...state.dependencies,
      resolveOwnerInput: () =>
        Object.freeze({
          summary: summaryV2,
          raw: ownerInputRaw,
          planRequestRaw: request.data.planRequestRaw,
          workspaceId: "workspace-1",
        }),
    });
    await importV2OwnerEpisodeStageV1(request, dependencies);
    expect(state.stage).toMatchObject({
      schemaVersion: "v2-owner-authored-episode-stage.v2",
      ownerInputSchemaVersion: "v2-owner-authored-episode-input.v2",
      introCount: 12,
      introQuestionCount: 36,
      introAggregateFingerprint: summaryV2.introAggregateFingerprint,
    });
    const preview = await handleV2OwnerEpisodePreviewV1(
      {
        auth: {
          uid: "reviewer-uid",
          token: { admin: true, adminRole: "content_reviewer" },
        },
        data: { stageId: summary.stageId },
      },
      {
        async readStage(stageId) {
          return Object.freeze({
            exists: true,
            id: stageId,
            data: state.stage ?? Object.freeze({}),
          });
        },
        async readObject(input) {
          const found = state.objects.get(input.objectPath)!;
          return Object.freeze({
            objectGeneration: found.metadata.generation,
            byteSize: found.metadata.byteSize,
            contentType: found.metadata.contentType,
            bytes: found.bytes,
          });
        },
      },
    );
    expect(preview.payload).toEqual({ neutral: true });
  });

  it.each([
    [
      "generation",
      { objectGeneration: "8" },
      "content_stage_object_metadata_mismatch",
    ],
    ["byte size", { byteSize: 1 }, "content_stage_object_metadata_mismatch"],
    [
      "content type",
      { contentType: "text/plain" },
      "content_stage_object_metadata_mismatch",
    ],
  ])("rejects preview %s substitution", async (_label, mutation, code) => {
    const state = harness();
    await importV2OwnerEpisodeStageV1(request, state.dependencies);
    await expect(
      handleV2OwnerEpisodePreviewV1(
        {
          auth: {
            uid: "reviewer-uid",
            token: { admin: true, adminRole: "content_reviewer" },
          },
          data: { stageId: summary.stageId },
        },
        {
          async readStage(stageId) {
            return Object.freeze({
              exists: true,
              id: stageId,
              data: state.stage! as unknown as Readonly<
                Record<string, unknown>
              >,
            });
          },
          async readObject(input) {
            const found = state.objects.get(input.objectPath)!;
            return Object.freeze({
              objectGeneration: found.metadata.generation,
              byteSize: found.metadata.byteSize,
              contentType: found.metadata.contentType,
              bytes: found.bytes,
              ...mutation,
            });
          },
        },
      ),
    ).rejects.toThrow(code);
  });

  it("requires the explicit owner claim and rejects resolver or same-stage conflicts", async () => {
    const state = harness();
    await expect(
      importV2OwnerEpisodeStageV1(
        {
          ...request,
          auth: { uid: "owner-uid", token: { admin: true } },
        },
        state.dependencies,
      ),
    ).rejects.toThrow("Owner admin claim required");

    await expect(
      importV2OwnerEpisodeStageV1(request, {
        ...state.dependencies,
        resolveOwnerInput: () =>
          Object.freeze({
            summary: { ...summary, stageId: "other-stage" },
            raw: ownerInputRaw,
            planRequestRaw: request.data.planRequestRaw,
            workspaceId: "workspace-1",
          }),
      }),
    ).rejects.toThrow("v2_owner_episode_stage_resolver_mismatch");

    await importV2OwnerEpisodeStageV1(request, state.dependencies);
    const conflictedSummary = Object.freeze({
      ...summary,
      inputFingerprint: hash("f"),
    });
    await expect(
      importV2OwnerEpisodeStageV1(request, {
        ...state.dependencies,
        resolveOwnerInput: () =>
          Object.freeze({
            summary: conflictedSummary,
            raw: ownerInputRaw,
            planRequestRaw: request.data.planRequestRaw,
            workspaceId: "workspace-1",
          }),
      }),
    ).rejects.toThrow("v2_owner_episode_stage_commit_conflict");
  });
});
