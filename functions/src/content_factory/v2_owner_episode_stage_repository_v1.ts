import { createHash } from "node:crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ENFORCE_APP_CHECK_ADMIN } from "../callable_options";
import {
  contentStageObjectPathFromHashV1,
  contentStagePlanObjectPathV1,
} from "./content_stage_object_identity_v1";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  persistV2ImmutableRepositoryObjectV1,
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableObjectPinV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  getV2OwnerAuthoredEpisodeInputSummaryV1,
  parseV2OwnerAuthoredEpisodeInputV1,
  resolveV2OwnerAuthoredEpisodeInputMaterialV1,
  type V2OwnerAuthoredEpisodeInputSummaryV1,
} from "./v2_owner_authored_episode_input_v1";
import {
  getV2OwnerAuthoredEpisodeInputSummaryV2,
  parseV2OwnerAuthoredEpisodeInputV2,
  resolveV2OwnerAuthoredEpisodeInputMaterialV2,
  V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
  V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2,
  type V2OwnerAuthoredEpisodeInputSummaryV2,
} from "./v2_owner_authored_episode_input_v2";
import { requireV2ConfiguredRootOwnerV1 } from "./v2_root_owner_identity_v1";
import { V2_GENERATION_STAGE_COLLECTION_V2 } from "./v2_generation_stage_repository_v2";

export const V2_OWNER_EPISODE_STAGE_COLLECTION_V1 =
  V2_GENERATION_STAGE_COLLECTION_V2;
export const V2_OWNER_EPISODE_STAGE_SCHEMA_V1 =
  "v2-owner-authored-episode-stage.v1" as const;
export const V2_OWNER_EPISODE_STAGE_SCHEMA_V2 =
  "v2-owner-authored-episode-stage.v2" as const;

type V2OwnerEpisodeInputSummary =
  | V2OwnerAuthoredEpisodeInputSummaryV1
  | V2OwnerAuthoredEpisodeInputSummaryV2;

export interface V2OwnerEpisodeStageImportRequestV1 {
  readonly planRequestRaw: string;
  readonly stageId: string;
  readonly ownerInputRaw: string;
}

export interface V2OwnerEpisodeStageDocumentV1 {
  readonly schemaVersion:
    | typeof V2_OWNER_EPISODE_STAGE_SCHEMA_V1
    | typeof V2_OWNER_EPISODE_STAGE_SCHEMA_V2;
  readonly stageId: string;
  readonly requestId: string;
  readonly kind: "v2_activity_instances";
  readonly scopeId: string;
  readonly studyTarget: string;
  readonly sourceLocale: "owner-authored";
  readonly state: "needs_review";
  readonly revision: number;
  readonly artifactId: string;
  readonly artifactAttempt: 1;
  readonly artifactLeaseTokenHash: string;
  readonly objectPath: string;
  readonly objectGeneration: string;
  readonly contentHash: string;
  readonly byteSize: number;
  readonly contentType: typeof V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1;
  readonly planRequestObjectPath: string;
  readonly planRequestObjectGeneration: string;
  readonly planRequestRawHash: string;
  readonly planRequestByteSize: number;
  readonly planRequestContentType: typeof V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1;
  readonly contentClass: V2OwnerEpisodeInputSummary["contentClass"];
  readonly ownerInputSchemaVersion?:
    | "v2-owner-authored-episode-input.v1"
    | typeof V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2;
  readonly introCount?: 12;
  readonly introQuestionCount?: 36;
  readonly introAggregateFingerprint?: string;
  readonly ownerInputFingerprint: string;
  readonly activityAssemblyFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly qaReceipt: Readonly<{
    status: "passed";
    policyVersion: "v2-owner-episode-import-v1";
    sessionCount: 12;
    taskCount: 144;
    ownerInputFingerprint: string;
    activityAssemblyFingerprint: string;
    validationAuthority: "structural_checks_only";
  }>;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly ownerAuthenticationAuthority: "firebase_auth_explicit_owner_role_and_server_configured_uid_hash";
  readonly ownerInputOriginAuthority: "unverified_canonical_input_claim";
  readonly artifactStorageEvidence: "exact_generation_matched_readback";
  readonly repositoryAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

export interface V2OwnerEpisodeStageCommitPortV1 {
  commitExact(input: {
    readonly stageId: string;
    readonly document: V2OwnerEpisodeStageDocumentV1;
    readonly auditId: string;
    readonly audit: Readonly<Record<string, unknown>>;
  }): Promise<"created" | "materialized_reserved" | "exact_replay">;
}

export interface V2OwnerEpisodeStageImportDependenciesV1 {
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly stages: V2OwnerEpisodeStageCommitPortV1;
  readonly resolveOwnerInput: (
    input: V2OwnerEpisodeStageImportRequestV1,
  ) => Readonly<{
    summary: V2OwnerEpisodeInputSummary;
    raw: string;
    planRequestRaw: string;
    workspaceId: string;
  }>;
  readonly now: () => string;
  readonly authenticateOwner?: (
    auth: Parameters<typeof requireV2ConfiguredRootOwnerV1>[0],
  ) => ReturnType<typeof requireV2ConfiguredRootOwnerV1>;
}

export interface V2OwnerEpisodeStageImportResultV1 {
  readonly ok: true;
  readonly stageId: string;
  readonly state: "needs_review";
  readonly replayed: boolean;
  readonly ownerInputFingerprint: string;
  readonly activityAssemblyFingerprint: string;
  readonly sessionCount: 12;
  readonly taskCount: 144;
  readonly humanApprovalAuthority: "none";
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

const REQUEST_KEYS = ["planRequestRaw", "stageId", "ownerInputRaw"] as const;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequest(value: unknown): V2OwnerEpisodeStageImportRequestV1 {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== REQUEST_KEYS.length ||
    !REQUEST_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    ) ||
    typeof value.planRequestRaw !== "string" ||
    value.planRequestRaw.length < 1 ||
    value.planRequestRaw.length > 1024 * 1024 ||
    typeof value.stageId !== "string" ||
    !STAGE_ID_RE.test(value.stageId) ||
    typeof value.ownerInputRaw !== "string" ||
    value.ownerInputRaw.length < 1 ||
    value.ownerInputRaw.length > V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2
  ) {
    fail("v2_owner_episode_stage_import_request_invalid");
  }
  return Object.freeze({
    planRequestRaw: value.planRequestRaw,
    stageId: value.stageId,
    ownerInputRaw: value.ownerInputRaw,
  });
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function materializeStage(
  summary: V2OwnerEpisodeInputSummary,
  pin: V2RepositoryImmutableObjectPinV1,
  planPin: V2RepositoryImmutableObjectPinV1,
  actorUid: string,
  workspaceId: string,
  createdAt: string,
  artifactLeaseTokenHash: string,
): V2OwnerEpisodeStageDocumentV1 {
  const hasIntros = "introCount" in summary;
  return Object.freeze({
    schemaVersion: hasIntros
      ? V2_OWNER_EPISODE_STAGE_SCHEMA_V2
      : V2_OWNER_EPISODE_STAGE_SCHEMA_V1,
    stageId: summary.stageId,
    requestId: workspaceId,
    kind: "v2_activity_instances" as const,
    scopeId: summary.episodeId,
    studyTarget: summary.targetLanguage,
    sourceLocale: "owner-authored" as const,
    state: "needs_review" as const,
    revision: summary.authoringRevision,
    artifactId: `artifact:${summary.stageId}`,
    artifactAttempt: 1 as const,
    artifactLeaseTokenHash,
    objectPath: pin.objectPath,
    objectGeneration: pin.objectGeneration,
    contentHash: pin.contentHash,
    byteSize: pin.byteSize,
    contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    planRequestObjectPath: planPin.objectPath,
    planRequestObjectGeneration: planPin.objectGeneration,
    planRequestRawHash: planPin.contentHash,
    planRequestByteSize: planPin.byteSize,
    planRequestContentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    contentClass: summary.contentClass,
    ...(hasIntros
      ? {
          ownerInputSchemaVersion: V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2,
          introCount: 12 as const,
          introQuestionCount: 36 as const,
          introAggregateFingerprint: summary.introAggregateFingerprint,
        }
      : {}),
    ownerInputFingerprint: summary.inputFingerprint,
    activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
    planFingerprint: summary.planFingerprint,
    courseContractFingerprint: summary.courseContractFingerprint,
    qaReceipt: Object.freeze({
      status: "passed" as const,
      policyVersion: "v2-owner-episode-import-v1" as const,
      sessionCount: 12 as const,
      taskCount: 144 as const,
      ownerInputFingerprint: summary.inputFingerprint,
      activityAssemblyFingerprint: summary.activityAssemblyFingerprint,
      validationAuthority: "structural_checks_only" as const,
    }),
    createdBy: actorUid,
    createdAt,
    ownerAuthenticationAuthority:
      "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
    ownerInputOriginAuthority: "unverified_canonical_input_claim" as const,
    artifactStorageEvidence: "exact_generation_matched_readback" as const,
    repositoryAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
}

export async function importV2OwnerEpisodeStageV1(
  request: {
    readonly auth?: {
      readonly uid?: string;
      readonly token?: Record<string, unknown>;
    };
    readonly data: unknown;
  },
  dependencies: V2OwnerEpisodeStageImportDependenciesV1,
): Promise<V2OwnerEpisodeStageImportResultV1> {
  const actor = (
    dependencies.authenticateOwner ?? requireV2ConfiguredRootOwnerV1
  )(request.auth);
  const input = parseRequest(request.data);
  const resolved = dependencies.resolveOwnerInput(input);
  if (
    resolved.summary.stageId !== input.stageId ||
    resolved.raw !== input.ownerInputRaw ||
    resolved.planRequestRaw !== input.planRequestRaw
  ) {
    fail("v2_owner_episode_stage_resolver_mismatch");
  }
  const artifactLeaseTokenHash = sha256(
    `v2-owner-episode-import-v1\n${resolved.summary.stageId}\n${resolved.summary.inputFingerprint}`,
  );
  const objectPath = contentStageObjectPathFromHashV1(
    resolved.summary.stageId,
    resolved.summary.authoringRevision,
    1,
    artifactLeaseTokenHash,
  );
  const planBytes = new TextEncoder().encode(resolved.planRequestRaw);
  const planRequestRawHash = sha256(resolved.planRequestRaw);
  const planPersisted = await persistV2ImmutableRepositoryObjectV1({
    storage: dependencies.storage,
    objectPath: contentStagePlanObjectPathV1(
      resolved.summary.stageId,
      planRequestRawHash,
    ),
    bytes: planBytes,
    maximumBytes: 1024 * 1024,
    contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    contentHash: planRequestRawHash,
  });
  const bytes = new TextEncoder().encode(resolved.raw);
  const persisted = await persistV2ImmutableRepositoryObjectV1({
    storage: dependencies.storage,
    objectPath,
    bytes,
    maximumBytes: V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
    contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    contentHash: sha256(resolved.raw),
  });
  const createdAt = dependencies.now();
  const document = materializeStage(
    resolved.summary,
    persisted.pin,
    planPersisted.pin,
    actor.actorUid,
    resolved.workspaceId,
    createdAt,
    artifactLeaseTokenHash,
  );
  const auditId = sha256(
    `v2-owner-episode-stage-import-v1\n${document.stageId}\n${document.ownerInputFingerprint}`,
  );
  const committed = await dependencies.stages.commitExact({
    stageId: document.stageId,
    document,
    auditId,
    audit: Object.freeze({
      schemaVersion: "admin-audit.v1",
      action: "learning_v2.owner_episode.import",
      actorUid: actor.actorUid,
      role: actor.role,
      entity: Object.freeze({
        collection: V2_OWNER_EPISODE_STAGE_COLLECTION_V1,
        id: document.stageId,
      }),
      operationId: auditId,
      ownerInputFingerprint: document.ownerInputFingerprint,
      planFingerprint: document.planFingerprint,
      timestamp: createdAt,
    }),
  });
  return Object.freeze({
    ok: true as const,
    stageId: document.stageId,
    state: "needs_review" as const,
    replayed: committed === "exact_replay",
    ownerInputFingerprint: document.ownerInputFingerprint,
    activityAssemblyFingerprint: document.activityAssemblyFingerprint,
    sessionCount: 12 as const,
    taskCount: 144 as const,
    humanApprovalAuthority: "none" as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
}

function firebaseStagePort(
  db: FirebaseFirestore.Firestore,
): V2OwnerEpisodeStageCommitPortV1 {
  const port: V2OwnerEpisodeStageCommitPortV1 = {
    async commitExact(input) {
      const stageRef = db
        .collection(V2_OWNER_EPISODE_STAGE_COLLECTION_V1)
        .doc(input.stageId);
      const auditRef = db.collection("admin_log").doc(input.auditId);
      return db.runTransaction(async (transaction) => {
        const [stageSnapshot, auditSnapshot] = await Promise.all([
          transaction.get(stageRef),
          transaction.get(auditRef),
        ]);
        if (stageSnapshot.exists) {
          const current = stageSnapshot.data() ?? {};
          const reservedCanonicalStage =
            current.schemaVersion === "v2-generation-stage.v2" &&
            current.stageId === input.document.stageId &&
            current.kind === input.document.kind &&
            current.state === "queued" &&
            current.planFingerprint === input.document.planFingerprint &&
            current.courseContractFingerprint ===
              input.document.courseContractFingerprint &&
            current.episodeId === input.document.scopeId &&
            current.requestId === input.document.requestId &&
            current.studyTarget === input.document.studyTarget &&
            current.revision === input.document.revision;
          if (reservedCanonicalStage && !auditSnapshot.exists) {
            transaction.set(stageRef, input.document);
            transaction.create(auditRef, input.audit);
            return "materialized_reserved" as const;
          }
          if (
            current.schemaVersion !== input.document.schemaVersion ||
            current.ownerInputFingerprint !==
              input.document.ownerInputFingerprint ||
            current.planFingerprint !== input.document.planFingerprint ||
            current.contentHash !== input.document.contentHash ||
            current.objectGeneration !== input.document.objectGeneration ||
            current.objectPath !== input.document.objectPath ||
            current.planRequestObjectPath !==
              input.document.planRequestObjectPath ||
            current.planRequestObjectGeneration !==
              input.document.planRequestObjectGeneration ||
            current.planRequestRawHash !== input.document.planRequestRawHash ||
            current.introCount !== input.document.introCount ||
            current.introQuestionCount !== input.document.introQuestionCount ||
            current.introAggregateFingerprint !==
              input.document.introAggregateFingerprint ||
            !auditSnapshot.exists
          ) {
            fail("v2_owner_episode_stage_commit_conflict");
          }
          return "exact_replay" as const;
        }
        if (auditSnapshot.exists)
          fail("v2_owner_episode_stage_commit_conflict");
        transaction.create(stageRef, input.document);
        transaction.create(auditRef, input.audit);
        return "created" as const;
      });
    },
  };
  return Object.freeze(port);
}

export interface FirebaseAdminV2OwnerEpisodeStageImporterV1 {
  import(
    request: Parameters<typeof importV2OwnerEpisodeStageV1>[0],
  ): Promise<V2OwnerEpisodeStageImportResultV1>;
}

export function createFirebaseAdminV2OwnerEpisodeStageImporterV1(): FirebaseAdminV2OwnerEpisodeStageImporterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  const db = admin.firestore();
  const stages = firebaseStagePort(db);
  const importer: FirebaseAdminV2OwnerEpisodeStageImporterV1 = {
    import(request) {
      return importV2OwnerEpisodeStageV1(request, {
        storage: io.storage,
        stages,
        now: () => new Date().toISOString(),
        resolveOwnerInput(input) {
          const plan = buildV2CanonicalSeasonPlanV2(
            parseV2CanonicalPlanRequestV2(input.planRequestRaw),
          );
          let schemaVersion = "";
          try {
            const candidate = JSON.parse(input.ownerInputRaw) as unknown;
            schemaVersion = isRecord(candidate)
              ? String(candidate.schemaVersion ?? "")
              : "";
          } catch {
            fail("v2_owner_episode_stage_import_request_invalid");
          }
          if (schemaVersion === V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2) {
            const handle = parseV2OwnerAuthoredEpisodeInputV2(
              input.ownerInputRaw,
              plan,
              input.stageId,
            );
            return Object.freeze({
              summary: getV2OwnerAuthoredEpisodeInputSummaryV2(handle),
              raw: resolveV2OwnerAuthoredEpisodeInputMaterialV2(handle).raw,
              planRequestRaw: input.planRequestRaw,
              workspaceId: plan.workspaceId,
            });
          }
          const handle = parseV2OwnerAuthoredEpisodeInputV1(
            input.ownerInputRaw,
            plan,
            input.stageId,
          );
          return Object.freeze({
            summary: getV2OwnerAuthoredEpisodeInputSummaryV1(handle),
            raw: resolveV2OwnerAuthoredEpisodeInputMaterialV1(handle).raw,
            planRequestRaw: input.planRequestRaw,
            workspaceId: plan.workspaceId,
          });
        },
      });
    },
  };
  return Object.freeze(importer);
}

function callableError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  const message = error instanceof Error ? error.message : "";
  const safe = /^v2_owner_episode_[a-z0-9_]+$/u.test(message)
    ? message
    : "v2_owner_episode_stage_import_failed";
  return new HttpsError("failed-precondition", safe);
}

export const adminImportV2OwnerEpisodeStage = onCall(
  { region: "us-central1", enforceAppCheck: ENFORCE_APP_CHECK_ADMIN },
  async (request) => {
    try {
      return await createFirebaseAdminV2OwnerEpisodeStageImporterV1().import(
        request,
      );
    } catch (error) {
      throw callableError(error);
    }
  },
);
