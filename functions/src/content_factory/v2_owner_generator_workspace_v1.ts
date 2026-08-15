import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ENFORCE_APP_CHECK_ADMIN } from "../callable_options";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";
import {
  materializeV2OwnerAuthoredEpisodeDraftV1,
  type V2OwnerAuthoredEpisodeDraftInputV1,
} from "./v2_owner_authored_episode_input_v1";
import {
  materializeV2OwnerAuthoredEpisodeDraftV2,
  type V2OwnerAuthoredEpisodeDraftInputV2,
} from "./v2_owner_authored_episode_input_v2";
import { V2_GENERATION_STAGE_COLLECTION_V2 } from "./v2_generation_stage_repository_v2";
import { requireV2ConfiguredRootOwnerV1 } from "./v2_root_owner_identity_v1";

export const V2_OWNER_GENERATOR_WORKSPACE_SCHEMA_V1 =
  "v2-owner-generator-workspace.v1" as const;

const JOBS = "content_v2_generation_jobs";
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactJobRequest(value: unknown): string {
  if (
    !record(value) ||
    Object.keys(value).length !== 1 ||
    typeof value.jobId !== "string" ||
    !ID_RE.test(value.jobId)
  )
    throw new Error("v2_owner_generator_workspace_request_invalid");
  return value.jobId;
}

function stageState(value: unknown) {
  if (!record(value)) return "reserved" as const;
  switch (value.state) {
    case "needs_review":
      return "ready_for_preview" as const;
    case "owner_confirmed":
      return "owner_confirmed" as const;
    case "approved":
      return "approved_draft" as const;
    case "rejected":
      return "changes_requested" as const;
    default:
      return "reserved" as const;
  }
}

export async function readV2OwnerGeneratorWorkspaceV1(
  request: {
    readonly auth?: {
      readonly uid?: string;
      readonly token?: Record<string, unknown>;
    };
    readonly data: unknown;
  },
  dependencies: Readonly<{
    authenticateOwner?: typeof requireV2ConfiguredRootOwnerV1;
    readJob(jobId: string): Promise<Readonly<Record<string, unknown>> | null>;
    readStages(
      stageIds: readonly string[],
    ): Promise<ReadonlyMap<string, Readonly<Record<string, unknown>>>>;
  }>,
) {
  (dependencies.authenticateOwner ?? requireV2ConfiguredRootOwnerV1)(
    request.auth,
  );
  const jobId = exactJobRequest(request.data);
  const job = await dependencies.readJob(jobId);
  const planRequestRaw = job?.canonicalPlanRequestRaw;
  if (typeof planRequestRaw !== "string")
    throw new Error("v2_owner_generator_workspace_job_not_canonical");
  const plan = buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(planRequestRaw),
  );
  if (
    plan.jobId !== jobId ||
    job?.canonicalPlanFingerprint !== plan.planFingerprint
  )
    throw new Error("v2_owner_generator_workspace_job_mismatch");
  const activityStages = plan.stages.filter(
    (stage) => stage.kind === "v2_activity_instances" && stage.episodeId,
  );
  const stored = await dependencies.readStages(
    activityStages.map((stage) => stage.stageId),
  );
  const episodes = activityStages.map((stage) => {
    const value: Readonly<Record<string, unknown>> =
      stored.get(stage.stageId) ?? Object.freeze({});
    const state = stageState(value);
    return Object.freeze({
      episodeId: stage.episodeId!,
      stageId: stage.stageId,
      state,
      canImport: state === "reserved" || state === "changes_requested",
      canPreview:
        state === "ready_for_preview" ||
        state === "owner_confirmed" ||
        state === "approved_draft" ||
        state === "changes_requested",
      canConfirm: state === "ready_for_preview",
      contentClass:
        typeof value.contentClass === "string" ? value.contentClass : null,
      ownerInputFingerprint:
        typeof value.ownerInputFingerprint === "string"
          ? value.ownerInputFingerprint
          : null,
      ownerConfirmationFingerprint:
        typeof value.ownerConfirmationFingerprint === "string"
          ? value.ownerConfirmationFingerprint
          : null,
    });
  });
  return Object.freeze({
    ok: true as const,
    schemaVersion: V2_OWNER_GENERATOR_WORKSPACE_SCHEMA_V1,
    jobId,
    planFingerprint: plan.planFingerprint,
    courseContractFingerprint: plan.courseContract.courseContractFingerprint,
    planRequestRaw,
    targetLanguage: plan.targetLanguage,
    authoringRevision: plan.authoringRevision,
    expectedEpisodeCount: plan.episodeIds.length,
    episodes: Object.freeze(episodes),
    ownerContentBoundary: "owner_creates_all_real_episode_content" as const,
    automaticContentGenerationAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });
}

export async function prepareV2OwnerEpisodeDraftV1(
  request: {
    readonly auth?: {
      readonly uid?: string;
      readonly token?: Record<string, unknown>;
    };
    readonly data: unknown;
  },
  dependencies: Readonly<{
    authenticateOwner?: typeof requireV2ConfiguredRootOwnerV1;
  }> = {},
) {
  const owner = (
    dependencies.authenticateOwner ?? requireV2ConfiguredRootOwnerV1
  )(request.auth);
  if (
    !record(request.data) ||
    ![
      "ownerInputId|planRequestRaw|sessionSources|stageId",
      "ownerInputId|planRequestRaw|sessionIntros|sessionSources|stageId",
    ].includes(Object.keys(request.data).sort().join("|")) ||
    typeof request.data.planRequestRaw !== "string"
  )
    throw new Error("v2_owner_episode_draft_request_invalid");
  const plan = buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(request.data.planRequestRaw),
  );
  const common = {
    contentClass: "production_candidate" as const,
    ownerInputId: String(request.data.ownerInputId ?? ""),
    claimedAuthorId: `owner.${owner.ownerIdentityFingerprint.slice(0, 24)}`,
    stageId: String(request.data.stageId ?? ""),
    sessionSources: Array.isArray(request.data.sessionSources)
      ? request.data.sessionSources
      : [],
  };
  const hasIntros = Array.isArray(request.data.sessionIntros);
  const material = hasIntros
    ? materializeV2OwnerAuthoredEpisodeDraftV2(
        Object.freeze({
          ...common,
          sessionIntros: request.data
            .sessionIntros as V2OwnerAuthoredEpisodeDraftInputV2["sessionIntros"],
        }),
        plan,
      )
    : materializeV2OwnerAuthoredEpisodeDraftV1(
        Object.freeze(common) as V2OwnerAuthoredEpisodeDraftInputV1,
        plan,
      );
  return Object.freeze({
    ok: true as const,
    stageId: material.summary.stageId,
    episodeId: material.summary.episodeId,
    ownerInputRaw: material.raw,
    inputFingerprint: material.summary.inputFingerprint,
    sessionCount: material.summary.sessionCount,
    taskCount: material.summary.taskCount,
    introCount:
      "introCount" in material.summary ? material.summary.introCount : 0,
    humanApprovalAuthority: "none" as const,
    releaseAuthority: false as const,
  });
}

export const adminGetV2OwnerGeneratorWorkspace = onCall(
  { region: "us-central1", enforceAppCheck: ENFORCE_APP_CHECK_ADMIN },
  async (request) => {
    try {
      const db = admin.firestore();
      return await readV2OwnerGeneratorWorkspaceV1(request, {
        async readJob(jobId) {
          const snapshot = await db.collection(JOBS).doc(jobId).get();
          return snapshot.exists ? Object.freeze(snapshot.data() ?? {}) : null;
        },
        async readStages(stageIds) {
          const snapshots = await Promise.all(
            stageIds.map((stageId) =>
              db
                .collection(V2_GENERATION_STAGE_COLLECTION_V2)
                .doc(stageId)
                .get(),
            ),
          );
          return new Map(
            snapshots
              .filter((snapshot) => snapshot.exists)
              .map((snapshot) => [
                snapshot.id,
                Object.freeze(snapshot.data() ?? {}),
              ]),
          );
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      throw new HttpsError(
        message.endsWith("_not_found") ? "not-found" : "failed-precondition",
        /^v2_[a-z0-9_]+$/u.test(message)
          ? message
          : "v2_owner_generator_workspace_failed",
      );
    }
  },
);

export const adminPrepareV2OwnerEpisodeDraft = onCall(
  { region: "us-central1", enforceAppCheck: ENFORCE_APP_CHECK_ADMIN },
  async (request) => {
    try {
      return await prepareV2OwnerEpisodeDraftV1(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      throw new HttpsError(
        "failed-precondition",
        /^v2_[a-z0-9_]+$/u.test(message)
          ? message
          : "v2_owner_episode_draft_failed",
      );
    }
  },
);
