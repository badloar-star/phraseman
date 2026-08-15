import { createHash } from "node:crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import { ENFORCE_APP_CHECK_ADMIN } from "../callable_options";
import { contentStageReviewFingerprint } from "./review_fingerprint";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableObjectPinV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  getV2OwnerAuthoredEpisodeInputSummaryV1,
  parseV2OwnerAuthoredEpisodeInputV1,
  type V2OwnerAuthoredEpisodeInputSummaryV1,
} from "./v2_owner_authored_episode_input_v1";
import {
  getV2OwnerAuthoredEpisodeInputSummaryV2,
  parseV2OwnerAuthoredEpisodeInputV2,
  V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
  V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2,
  type V2OwnerAuthoredEpisodeInputSummaryV2,
} from "./v2_owner_authored_episode_input_v2";
import {
  V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
  materializeV2OwnerEpisodeConfirmationV1,
  parseV2OwnerEpisodeConfirmationV1,
  type V2OwnerEpisodeConfirmationV1,
} from "./v2_owner_episode_confirmation_v1";
import {
  V2_OWNER_EPISODE_STAGE_COLLECTION_V1,
  V2_OWNER_EPISODE_STAGE_SCHEMA_V1,
  V2_OWNER_EPISODE_STAGE_SCHEMA_V2,
} from "./v2_owner_episode_stage_repository_v1";
import { requireV2ConfiguredRootOwnerV1 } from "./v2_root_owner_identity_v1";

export const V2_OWNER_EPISODE_CONFIRMATION_COLLECTION_V1 =
  "content_v2_owner_episode_confirmations" as const;
export const V2_OWNER_EPISODE_CONFIRMATION_PREFIX_V1 =
  "learning-v2/owner-episode-confirmations" as const;

interface StoredStage {
  readonly id: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface V2OwnerEpisodeConfirmationCommitPortV1 {
  readStage(stageId: string): Promise<StoredStage | null>;
  commitExact(input: {
    readonly stageId: string;
    readonly expectedReviewFingerprint: string;
    readonly confirmation: V2OwnerEpisodeConfirmationV1;
    readonly confirmationPin: V2RepositoryImmutableObjectPinV1;
    readonly actorUid: string;
    readonly reason: string;
  }): Promise<"created" | "exact_replay">;
}

export interface V2OwnerEpisodeConfirmationDependenciesV1 {
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly repository: V2OwnerEpisodeConfirmationCommitPortV1;
  readonly now: () => string;
  readonly authenticateOwner?: (
    auth: Parameters<typeof requireV2ConfiguredRootOwnerV1>[0],
  ) => ReturnType<typeof requireV2ConfiguredRootOwnerV1>;
  readonly resolveVerifiedStage?: (input: {
    readonly stage: Readonly<Record<string, unknown>>;
    readonly stageId: string;
    readonly storage: V2RepositoryImmutableStoragePortV1;
  }) => Promise<
    V2OwnerAuthoredEpisodeInputSummaryV1 | V2OwnerAuthoredEpisodeInputSummaryV2
  >;
}

interface ConfirmationRequest {
  readonly stageId: string;
  readonly expectedReviewFingerprint: string;
  readonly reason: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/u;
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequest(value: unknown): ConfirmationRequest {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join("|") !==
      "expectedReviewFingerprint|reason|stageId" ||
    typeof value.stageId !== "string" ||
    !STAGE_ID_RE.test(value.stageId) ||
    typeof value.expectedReviewFingerprint !== "string" ||
    !HASH_RE.test(value.expectedReviewFingerprint) ||
    typeof value.reason !== "string" ||
    value.reason.length < 5 ||
    value.reason.length > 500 ||
    value.reason !== value.reason.trim() ||
    value.reason.normalize("NFC") !== value.reason
  )
    fail("v2_owner_episode_confirmation_request_invalid");
  return Object.freeze({
    stageId: value.stageId,
    expectedReviewFingerprint: value.expectedReviewFingerprint,
    reason: value.reason,
  });
}

function stringField(stage: Record<string, unknown>, key: string): string {
  const value = stage[key];
  if (typeof value !== "string" || value.length < 1)
    fail("v2_owner_episode_confirmation_stage_invalid");
  return value;
}

function sizeField(stage: Record<string, unknown>, key: string, max: number) {
  const value = stage[key];
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > max
  )
    fail("v2_owner_episode_confirmation_stage_invalid");
  return value;
}

async function readPinnedRaw(input: {
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly objectPath: string;
  readonly objectGeneration: string;
  readonly contentHash: string;
  readonly byteSize: number;
  readonly maximumBytes: number;
}): Promise<string> {
  const metadata = await input.storage.readMetadataExact(input.objectPath);
  if (
    !metadata ||
    metadata.generation !== input.objectGeneration ||
    metadata.contentHash !== input.contentHash ||
    metadata.byteSize !== input.byteSize ||
    metadata.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail("v2_owner_episode_confirmation_readback_invalid");
  const downloaded = await input.storage.downloadGenerationExact({
    objectPath: input.objectPath,
    ifGenerationMatch: input.objectGeneration,
    maximumBytes: input.maximumBytes,
  });
  if (
    downloaded.kind !== "downloaded" ||
    downloaded.bytes.byteLength !== input.byteSize ||
    createHash("sha256").update(downloaded.bytes).digest("hex") !==
      input.contentHash
  )
    fail("v2_owner_episode_confirmation_readback_invalid");
  try {
    return decoder.decode(downloaded.bytes);
  } catch {
    fail("v2_owner_episode_confirmation_readback_invalid");
  }
}

export async function coldResolveV2OwnerEpisodeStageV1(input: {
  readonly stage: Readonly<Record<string, unknown>>;
  readonly stageId: string;
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): Promise<
  V2OwnerAuthoredEpisodeInputSummaryV1 | V2OwnerAuthoredEpisodeInputSummaryV2
> {
  const planRaw = await readPinnedRaw({
    storage: input.storage,
    objectPath: stringField(input.stage, "planRequestObjectPath"),
    objectGeneration: stringField(input.stage, "planRequestObjectGeneration"),
    contentHash: stringField(input.stage, "planRequestRawHash"),
    byteSize: sizeField(input.stage, "planRequestByteSize", 1024 * 1024),
    maximumBytes: 1024 * 1024,
  });
  const ownerInputRaw = await readPinnedRaw({
    storage: input.storage,
    objectPath: stringField(input.stage, "objectPath"),
    objectGeneration: stringField(input.stage, "objectGeneration"),
    contentHash: stringField(input.stage, "contentHash"),
    byteSize: sizeField(
      input.stage,
      "byteSize",
      V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
    ),
    maximumBytes: V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
  });
  const plan = buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(planRaw),
  );
  let schemaVersion = "";
  try {
    const candidate = JSON.parse(ownerInputRaw) as unknown;
    schemaVersion = isRecord(candidate)
      ? String(candidate.schemaVersion ?? "")
      : "";
  } catch {
    fail("v2_owner_episode_confirmation_readback_invalid");
  }
  if (schemaVersion === V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2) {
    return getV2OwnerAuthoredEpisodeInputSummaryV2(
      parseV2OwnerAuthoredEpisodeInputV2(ownerInputRaw, plan, input.stageId),
    );
  }
  return getV2OwnerAuthoredEpisodeInputSummaryV1(
    parseV2OwnerAuthoredEpisodeInputV1(ownerInputRaw, plan, input.stageId),
  );
}

export async function confirmV2OwnerEpisodeV1(
  request: {
    readonly auth?: {
      readonly uid?: string;
      readonly token?: Record<string, unknown>;
    };
    readonly data: unknown;
  },
  dependencies: V2OwnerEpisodeConfirmationDependenciesV1,
) {
  const owner = (
    dependencies.authenticateOwner ?? requireV2ConfiguredRootOwnerV1
  )(request.auth);
  const input = parseRequest(request.data);
  const stored = await dependencies.repository.readStage(input.stageId);
  if (!stored) fail("v2_owner_episode_confirmation_stage_missing");
  const stage = stored.data;
  if (
    (stage.schemaVersion !== V2_OWNER_EPISODE_STAGE_SCHEMA_V1 &&
      stage.schemaVersion !== V2_OWNER_EPISODE_STAGE_SCHEMA_V2) ||
    (stage.state !== "needs_review" && stage.state !== "owner_confirmed") ||
    stage.kind !== "v2_activity_instances" ||
    stage.contentClass !== "production_candidate" ||
    contentStageReviewFingerprint(stored.id, stage) !==
      input.expectedReviewFingerprint
  )
    fail("v2_owner_episode_confirmation_stage_invalid");

  const summary = await (
    dependencies.resolveVerifiedStage ?? coldResolveV2OwnerEpisodeStageV1
  )({
    stage,
    stageId: input.stageId,
    storage: dependencies.storage,
  });
  if (
    summary.planFingerprint !== stage.planFingerprint ||
    summary.courseContractFingerprint !== stage.courseContractFingerprint ||
    summary.inputFingerprint !== stage.ownerInputFingerprint ||
    summary.activityAssemblyFingerprint !== stage.activityAssemblyFingerprint ||
    summary.episodeId !== stage.scopeId ||
    summary.contentClass !== "production_candidate"
  )
    fail("v2_owner_episode_confirmation_subject_mismatch");
  if (
    "introCount" in summary &&
    (stage.introCount !== 12 ||
      stage.introQuestionCount !== 36 ||
      stage.introAggregateFingerprint !== summary.introAggregateFingerprint)
  )
    fail("v2_owner_episode_confirmation_subject_mismatch");

  if (stage.state === "owner_confirmed") {
    const confirmationFingerprint = stringField(
      stage,
      "ownerConfirmationFingerprint",
    );
    const ownerConfirmedBy = stringField(stage, "ownerConfirmedBy");
    const ownerConfirmedAt = stringField(stage, "ownerConfirmedAt");
    const ownerConfirmationReason = stringField(
      stage,
      "ownerConfirmationReason",
    );
    const ownerIdentityFingerprint = stringField(
      stage,
      "ownerIdentityFingerprint",
    );
    const pin = stage.ownerConfirmationPin;
    if (
      !HASH_RE.test(confirmationFingerprint) ||
      ownerConfirmedBy !== owner.actorUid ||
      !isRecord(pin) ||
      typeof pin.objectPath !== "string" ||
      typeof pin.contentHash !== "string" ||
      typeof pin.objectGeneration !== "string" ||
      typeof pin.byteSize !== "number" ||
      stage.ownerConfirmationMode !==
        "single_owner_explicit_two_step_confirmation"
    )
      fail("v2_owner_episode_confirmation_stage_invalid");
    const raw = await readPinnedRaw({
      storage: dependencies.storage,
      objectPath: pin.objectPath,
      objectGeneration: pin.objectGeneration,
      contentHash: pin.contentHash,
      byteSize: pin.byteSize,
      maximumBytes: V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
    });
    const existing = parseV2OwnerEpisodeConfirmationV1(raw, {
      planFingerprint: stringField(stage, "planFingerprint"),
      courseContractFingerprint: stringField(
        stage,
        "courseContractFingerprint",
      ),
      stageId: input.stageId,
      episodeId: stringField(stage, "scopeId"),
      ownerInputFingerprint: stringField(stage, "ownerInputFingerprint"),
      activityAssemblyFingerprint: stringField(
        stage,
        "activityAssemblyFingerprint",
      ),
      stageReviewFingerprint: input.expectedReviewFingerprint,
      ownerIdentityFingerprint,
      confirmedAtIso: ownerConfirmedAt,
      reason: ownerConfirmationReason,
      contentClass: "production_candidate",
    });
    if (existing.confirmationFingerprint !== confirmationFingerprint)
      fail("v2_owner_episode_confirmation_readback_invalid");
    return Object.freeze({
      ok: true as const,
      stageId: input.stageId,
      state: "owner_confirmed" as const,
      replayed: true as const,
      confirmationFingerprint,
      confirmationMode: "single_owner_explicit_two_step_confirmation" as const,
      humanConfirmationAuthority:
        "firebase_admin_exact_single_owner_confirmation" as const,
      makerCheckerAuthority: "none_single_owner_mode" as const,
      publicationDecisionAuthority: "none" as const,
      releaseEligible: false as const,
      releaseAuthority: false as const,
    });
  }

  const confirmation = materializeV2OwnerEpisodeConfirmationV1({
    planFingerprint: summary.planFingerprint,
    courseContractFingerprint: summary.courseContractFingerprint,
    stageId: summary.stageId,
    episodeId: summary.episodeId,
    ownerInputFingerprint: summary.inputFingerprint,
    activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
    stageReviewFingerprint: input.expectedReviewFingerprint,
    ownerIdentityFingerprint: owner.ownerIdentityFingerprint,
    confirmedAtIso: dependencies.now(),
    reason: input.reason,
    contentClass: summary.contentClass,
  });
  const raw = canonicalJsonV1(confirmation);
  const rawHash = createHash("sha256").update(raw).digest("hex");
  const persisted = await persistV2ImmutableRepositoryObjectV1({
    storage: dependencies.storage,
    objectPath: `${V2_OWNER_EPISODE_CONFIRMATION_PREFIX_V1}/${summary.planFingerprint}/${hashCanonicalBody({ stageId: summary.stageId })}/${confirmation.confirmationFingerprint}/${rawHash}.json`,
    bytes: new TextEncoder().encode(raw),
    maximumBytes: V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
    contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    contentHash: rawHash,
  });
  const outcome = await dependencies.repository.commitExact({
    stageId: input.stageId,
    expectedReviewFingerprint: input.expectedReviewFingerprint,
    confirmation,
    confirmationPin: persisted.pin,
    actorUid: owner.actorUid,
    reason: input.reason,
  });
  return Object.freeze({
    ok: true as const,
    stageId: input.stageId,
    state: "owner_confirmed" as const,
    replayed: outcome === "exact_replay",
    confirmationFingerprint: confirmation.confirmationFingerprint,
    confirmationMode: confirmation.confirmationMode,
    humanConfirmationAuthority:
      "firebase_admin_exact_single_owner_confirmation" as const,
    makerCheckerAuthority: "none_single_owner_mode" as const,
    publicationDecisionAuthority: "none" as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
}

function firebaseRepository(
  db: FirebaseFirestore.Firestore,
): V2OwnerEpisodeConfirmationCommitPortV1 {
  const repository: V2OwnerEpisodeConfirmationCommitPortV1 = {
    async readStage(stageId) {
      const snapshot = await db
        .collection(V2_OWNER_EPISODE_STAGE_COLLECTION_V1)
        .doc(stageId)
        .get();
      return snapshot.exists
        ? Object.freeze({
            id: snapshot.id,
            data: Object.freeze(snapshot.data() ?? {}),
          })
        : null;
    },
    async commitExact(input) {
      const stageRef = db
        .collection(V2_OWNER_EPISODE_STAGE_COLLECTION_V1)
        .doc(input.stageId);
      const confirmationRef = db
        .collection(V2_OWNER_EPISODE_CONFIRMATION_COLLECTION_V1)
        .doc(input.confirmation.confirmationFingerprint);
      const auditRef = db
        .collection("admin_log")
        .doc(input.confirmation.confirmationFingerprint);
      return db.runTransaction(async (tx) => {
        const [stageSnapshot, confirmationSnapshot, auditSnapshot] =
          await Promise.all([
            tx.get(stageRef),
            tx.get(confirmationRef),
            tx.get(auditRef),
          ]);
        if (!stageSnapshot.exists)
          fail("v2_owner_episode_confirmation_stage_missing");
        const stage = stageSnapshot.data() ?? {};
        if (
          stage.state === "owner_confirmed" &&
          stage.ownerConfirmationFingerprint ===
            input.confirmation.confirmationFingerprint &&
          confirmationSnapshot.exists &&
          auditSnapshot.exists
        )
          return "exact_replay" as const;
        if (
          stage.state !== "needs_review" ||
          contentStageReviewFingerprint(input.stageId, stage) !==
            input.expectedReviewFingerprint ||
          confirmationSnapshot.exists ||
          auditSnapshot.exists
        )
          fail("v2_owner_episode_confirmation_commit_conflict");
        tx.create(confirmationRef, {
          ...input.confirmation,
          confirmationPin: input.confirmationPin,
        });
        tx.update(stageRef, {
          state: "owner_confirmed",
          ownerConfirmationFingerprint:
            input.confirmation.confirmationFingerprint,
          ownerConfirmationPin: input.confirmationPin,
          ownerConfirmedBy: input.actorUid,
          ownerConfirmedAt: input.confirmation.confirmedAtIso,
          ownerConfirmationReason: input.confirmation.reason,
          ownerIdentityFingerprint: input.confirmation.ownerIdentityFingerprint,
          ownerConfirmationMode: input.confirmation.confirmationMode,
          humanApprovalAuthority: "single_owner_exact_confirmation_only",
          publicationPolicy: "draft_only_no_consumer",
          releaseEligible: false,
          releaseAuthority: false,
        });
        tx.create(auditRef, {
          schemaVersion: "admin-audit.v1",
          action: "learning_v2.owner_episode.confirm",
          actorUid: input.actorUid,
          role: "owner",
          entity: {
            collection: V2_OWNER_EPISODE_STAGE_COLLECTION_V1,
            id: input.stageId,
          },
          operationId: input.confirmation.confirmationFingerprint,
          reason: input.reason,
          before: { state: "needs_review" },
          after: {
            state: "owner_confirmed",
            confirmationFingerprint: input.confirmation.confirmationFingerprint,
          },
          timestamp: input.confirmation.confirmedAtIso,
        });
        return "created" as const;
      });
    },
  };
  return Object.freeze(repository);
}

export function createFirebaseAdminV2OwnerEpisodeConfirmationAdapterV1() {
  const io = createV2FirebaseAdminRepositoryIoV1();
  const repository = firebaseRepository(admin.firestore());
  return Object.freeze({
    confirm(request: Parameters<typeof confirmV2OwnerEpisodeV1>[0]) {
      return confirmV2OwnerEpisodeV1(request, {
        storage: io.storage,
        repository,
        now: () => new Date().toISOString(),
      });
    },
  });
}

function callableError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  const message = error instanceof Error ? error.message : "";
  return new HttpsError(
    "failed-precondition",
    /^v2_owner_episode_confirmation_[a-z0-9_]+$/u.test(message)
      ? message
      : "v2_owner_episode_confirmation_failed",
  );
}

export const adminConfirmV2OwnerEpisode = onCall(
  { region: "us-central1", enforceAppCheck: ENFORCE_APP_CHECK_ADMIN },
  async (request) => {
    try {
      return await createFirebaseAdminV2OwnerEpisodeConfirmationAdapterV1().confirm(
        request,
      );
    } catch (error) {
      throw callableError(error);
    }
  },
);
