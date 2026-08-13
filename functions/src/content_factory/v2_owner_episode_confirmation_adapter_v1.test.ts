import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import { contentStageReviewFingerprint } from "./review_fingerprint";
import {
  confirmV2OwnerEpisodeV1,
  type V2OwnerEpisodeConfirmationDependenciesV1,
} from "./v2_owner_episode_confirmation_adapter_v1";
import type { V2OwnerAuthoredEpisodeInputSummaryV1 } from "./v2_owner_authored_episode_input_v1";
import type { V2OwnerEpisodeConfirmationV1 } from "./v2_owner_episode_confirmation_v1";
import type { V2OwnerEpisodeStageDocumentV1 } from "./v2_owner_episode_stage_repository_v1";
import type {
  V2RepositoryImmutableCreateResultV1,
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableObjectPinV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";

const hash = (value: string) => value.repeat(64);
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const planRaw = canonicalJsonV1({ fixture: "neutral-plan" });
const ownerRaw = canonicalJsonV1({ fixture: "neutral-owner-input" });

function harness(
  contentClass:
    | "production_candidate"
    | "neutral_test_fixture" = "production_candidate",
) {
  const objects = new Map<
    string,
    { bytes: Uint8Array; metadata: V2RepositoryImmutableObjectMetadataV1 }
  >();
  const put = (path: string, raw: string, generation: string) => {
    const bytes = new TextEncoder().encode(raw);
    objects.set(path, {
      bytes,
      metadata: Object.freeze({
        generation,
        byteSize: bytes.byteLength,
        contentType: "application/json; charset=utf-8" as const,
        contentHash: sha256(raw),
      }),
    });
  };
  put("content-factory-stage-plans/stage/plan.json", planRaw, "7");
  put("content-factory-stages/stage/owner.json", ownerRaw, "8");
  let immutableWrites = 0;
  let commitWrites = 0;
  let confirmation: V2OwnerEpisodeConfirmationV1 | null = null;
  let confirmationPin: V2RepositoryImmutableObjectPinV1 | null = null;
  const summary: V2OwnerAuthoredEpisodeInputSummaryV1 = Object.freeze({
    schemaVersion: "v2-owner-authored-episode-input-summary.v1",
    contentClass,
    ownerInputId: "owner-episode-1-r7",
    planFingerprint: hash("a"),
    courseContractFingerprint: hash("b"),
    stageId: "v2s2:activity:episode-1",
    episodeId: "episode-1",
    targetLanguage: "en",
    authoringRevision: 7,
    sessionCount: 12,
    taskCount: 144,
    inputFingerprint: hash("c"),
    activityAssemblyFingerprint: hash("d"),
    sourceFingerprints: Object.freeze(
      Array.from({ length: 12 }, () => hash("e")),
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
  const stage = {
    schemaVersion: "v2-owner-authored-episode-stage.v1",
    stageId: summary.stageId,
    requestId: "workspace-1",
    kind: "v2_activity_instances",
    scopeId: summary.episodeId,
    studyTarget: "en",
    sourceLocale: "owner-authored",
    state: "needs_review",
    revision: 7,
    artifactId: `artifact:${summary.stageId}`,
    artifactAttempt: 1,
    artifactLeaseTokenHash: hash("f"),
    objectPath: "content-factory-stages/stage/owner.json",
    objectGeneration: "8",
    contentHash: sha256(ownerRaw),
    byteSize: new TextEncoder().encode(ownerRaw).byteLength,
    contentType: "application/json; charset=utf-8",
    planRequestObjectPath: "content-factory-stage-plans/stage/plan.json",
    planRequestObjectGeneration: "7",
    planRequestRawHash: sha256(planRaw),
    planRequestByteSize: new TextEncoder().encode(planRaw).byteLength,
    planRequestContentType: "application/json; charset=utf-8",
    contentClass,
    ownerInputFingerprint: summary.inputFingerprint,
    activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
    planFingerprint: summary.planFingerprint,
    courseContractFingerprint: summary.courseContractFingerprint,
    qaReceipt: {
      status: "passed",
      policyVersion: "v2-owner-episode-import-v1",
      sessionCount: 12,
      taskCount: 144,
      ownerInputFingerprint: summary.inputFingerprint,
      activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
      validationAuthority: "structural_checks_only",
    },
    createdBy: "owner-uid",
    createdAt: "2026-08-13T12:00:00.000Z",
    ownerAuthenticationAuthority:
      "explicit_owner_claim_only_uid_allowlist_not_established",
    ownerInputOriginAuthority: "unverified_canonical_input_claim",
    artifactStorageEvidence: "exact_generation_matched_readback",
    repositoryAuthority: "none",
    humanApprovalAuthority: "none",
    executionAuthority: "none",
    publicationPolicy: "draft_only_no_consumer",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
  } as unknown as V2OwnerEpisodeStageDocumentV1;
  const storage: V2RepositoryImmutableStoragePortV1 = {
    async readMetadataExact(path) {
      return objects.get(path)?.metadata ?? null;
    },
    async createExact(input): Promise<V2RepositoryImmutableCreateResultV1> {
      if (objects.has(input.objectPath))
        return Object.freeze({ kind: "precondition_failed" as const });
      const metadata = Object.freeze({
        generation: "9",
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
      const object = objects.get(input.objectPath);
      if (!object) return Object.freeze({ kind: "not_found" as const });
      if (object.metadata.generation !== input.ifGenerationMatch)
        return Object.freeze({ kind: "generation_mismatch" as const });
      return Object.freeze({
        kind: "downloaded" as const,
        bytes: object.bytes,
      });
    },
    async quarantineConflict() {},
  };
  const dependencies: V2OwnerEpisodeConfirmationDependenciesV1 = {
    storage,
    now: () => "2026-08-13T14:00:00.000Z",
    authenticateOwner(ownerAuth) {
      if (
        ownerAuth?.uid !== "owner-uid" ||
        ownerAuth.token?.admin !== true ||
        ownerAuth.token.adminRole !== "owner"
      )
        throw new Error("Owner admin claim required");
      return Object.freeze({
        actorUid: "owner-uid",
        role: "owner" as const,
        ownerIdentityFingerprint: hash("f"),
        authenticationAuthority:
          "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
        identityPolicyFingerprint: hash("9"),
      });
    },
    async resolveVerifiedStage() {
      return summary;
    },
    repository: {
      async readStage(stageId) {
        return stageId === stage.stageId
          ? Object.freeze({
              id: stageId,
              data: stage as unknown as Readonly<Record<string, unknown>>,
            })
          : null;
      },
      async commitExact(input) {
        if (confirmation) {
          if (
            confirmation.confirmationFingerprint !==
            input.confirmation.confirmationFingerprint
          )
            throw new Error("v2_owner_episode_confirmation_commit_conflict");
          return "exact_replay" as const;
        }
        confirmation = input.confirmation;
        confirmationPin = input.confirmationPin;
        Object.assign(stage as unknown as Record<string, unknown>, {
          state: "owner_confirmed",
          ownerConfirmationFingerprint:
            input.confirmation.confirmationFingerprint,
          ownerConfirmationPin: input.confirmationPin,
          ownerConfirmedBy: input.actorUid,
          ownerConfirmedAt: input.confirmation.confirmedAtIso,
          ownerConfirmationReason: input.confirmation.reason,
          ownerIdentityFingerprint: input.confirmation.ownerIdentityFingerprint,
          ownerConfirmationMode: input.confirmation.confirmationMode,
        });
        commitWrites += 1;
        return "created" as const;
      },
    },
  };
  return {
    dependencies,
    stage,
    summary,
    objects,
    counts: () => ({ immutableWrites, commitWrites }),
    confirmation: () => confirmation,
    confirmationPin: () => confirmationPin,
  };
}

const auth = Object.freeze({
  uid: "owner-uid",
  token: Object.freeze({ admin: true, adminRole: "owner" }),
});

describe("Learning V2 Firebase owner episode confirmation boundary", () => {
  it("cold-revalidates the exact subject and commits an authority-bounded confirmation", async () => {
    const state = harness();
    const reviewFingerprint = contentStageReviewFingerprint(
      state.stage.stageId,
      state.stage as unknown as Record<string, unknown>,
    );
    const result = await confirmV2OwnerEpisodeV1(
      {
        auth,
        data: {
          stageId: state.stage.stageId,
          expectedReviewFingerprint: reviewFingerprint,
          reason:
            "Owner reviewed all twelve sessions and confirms this exact draft.",
        },
      },
      state.dependencies,
    );
    expect(result).toMatchObject({
      state: "owner_confirmed",
      replayed: false,
      humanConfirmationAuthority:
        "firebase_admin_exact_single_owner_confirmation",
      makerCheckerAuthority: "none_single_owner_mode",
      publicationDecisionAuthority: "none",
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(state.confirmation()).toMatchObject({
      contentClass: "production_candidate",
      ownerInputFingerprint: state.summary.inputFingerprint,
      stageReviewFingerprint: reviewFingerprint,
      publicationDecisionAuthority: "none",
    });
    expect(state.confirmationPin()?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(state.counts()).toEqual({ immutableWrites: 1, commitWrites: 1 });
  });

  it("replays the exact confirmation without another immutable write", async () => {
    const state = harness();
    const expectedReviewFingerprint = contentStageReviewFingerprint(
      state.stage.stageId,
      state.stage as unknown as Record<string, unknown>,
    );
    const input = {
      auth,
      data: {
        stageId: state.stage.stageId,
        expectedReviewFingerprint,
        reason:
          "Owner reviewed all twelve sessions and confirms this exact draft.",
      },
    };
    await confirmV2OwnerEpisodeV1(input, state.dependencies);
    const replay = await confirmV2OwnerEpisodeV1(input, state.dependencies);
    expect(replay.replayed).toBe(true);
    expect(state.counts()).toEqual({ immutableWrites: 1, commitWrites: 1 });
  });

  it("blocks neutral fixtures and stale preview fingerprints before persistence", async () => {
    const neutral = harness("neutral_test_fixture");
    const expectedReviewFingerprint = contentStageReviewFingerprint(
      neutral.stage.stageId,
      neutral.stage as unknown as Record<string, unknown>,
    );
    await expect(
      confirmV2OwnerEpisodeV1(
        {
          auth,
          data: {
            stageId: neutral.stage.stageId,
            expectedReviewFingerprint,
            reason: "Owner confirms the neutral fixture.",
          },
        },
        neutral.dependencies,
      ),
    ).rejects.toThrow("v2_owner_episode_confirmation_stage_invalid");
    await expect(
      confirmV2OwnerEpisodeV1(
        {
          auth,
          data: {
            stageId: neutral.stage.stageId,
            expectedReviewFingerprint: hash("1"),
            reason: "Owner confirms the stale preview.",
          },
        },
        neutral.dependencies,
      ),
    ).rejects.toThrow("v2_owner_episode_confirmation_stage_invalid");
    expect(neutral.counts()).toEqual({ immutableWrites: 0, commitWrites: 0 });
  });

  it("requires the explicit owner role", async () => {
    const state = harness();
    await expect(
      confirmV2OwnerEpisodeV1(
        {
          auth: {
            uid: "owner-uid",
            token: { admin: true, adminRole: "admin" },
          },
          data: {
            stageId: state.stage.stageId,
            expectedReviewFingerprint: contentStageReviewFingerprint(
              state.stage.stageId,
              state.stage as unknown as Record<string, unknown>,
            ),
            reason: "Owner confirms the exact preview.",
          },
        },
        state.dependencies,
      ),
    ).rejects.toThrow("Owner admin claim required");
  });
});
