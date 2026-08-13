import { HttpsError } from "firebase-functions/v2/https";
import {
  explicitAdminRoleFromToken,
  hasPermission,
} from "../admin/permissions";
import { contentStageObjectPathFromHashV1 } from "./content_stage_object_identity_v1";
import { parseHashedJsonBytes } from "./release_surface_delivery";
import { contentStageReviewFingerprint } from "./review_fingerprint";

export const V2_OWNER_EPISODE_PREVIEW_MAX_BYTES_V1 = 8 * 1024 * 1024;

export interface V2OwnerEpisodePreviewDependenciesV1 {
  readStage(stageId: string): Promise<
    Readonly<{
      exists: boolean;
      id: string;
      data: Readonly<Record<string, unknown>>;
    }>
  >;
  readObject(
    input: Readonly<{
      objectPath: string;
      objectGeneration: string;
      maximumBytes: number;
    }>,
  ): Promise<
    Readonly<{
      objectGeneration: string;
      byteSize: number;
      contentType: string;
      bytes: Uint8Array;
    }>
  >;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stageId(value: unknown): string {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    typeof value.stageId !== "string" ||
    !/^[A-Za-z0-9._:-]{1,500}$/u.test(value.stageId)
  )
    throw new HttpsError("invalid-argument", "content_stage_preview_invalid");
  return value.stageId;
}

function requireContentRead(request: {
  auth?: { uid?: string; token?: Record<string, unknown> };
}): void {
  if (!request.auth?.uid || request.auth.token?.admin !== true)
    throw new HttpsError("permission-denied", "Admin only");
  const role = explicitAdminRoleFromToken(request.auth.token);
  if (!role || !hasPermission(role, "content.read"))
    throw new HttpsError("permission-denied", "Role cannot use content.read");
}

export async function handleV2OwnerEpisodePreviewV1(
  request: {
    auth?: { uid?: string; token?: Record<string, unknown> };
    data: unknown;
  },
  dependencies: V2OwnerEpisodePreviewDependenciesV1,
) {
  requireContentRead(request);
  const requestedStageId = stageId(request.data);
  const snapshot = await dependencies.readStage(requestedStageId);
  if (!snapshot.exists)
    throw new HttpsError("not-found", "content_stage_not_found");
  const stage = snapshot.data;
  if (
    ![
      "v2-owner-authored-episode-stage.v1",
      "v2-owner-authored-episode-stage.v2",
    ].includes(String(stage.schemaVersion)) ||
    stage.kind !== "v2_activity_instances"
  )
    throw new HttpsError(
      "failed-precondition",
      "content_stage_not_previewable",
    );
  const revision = Number(stage.revision);
  const objectPath = String(stage.objectPath ?? "");
  const contentHash = String(stage.contentHash ?? "");
  const objectGeneration = String(stage.objectGeneration ?? "");
  const declaredByteSize = Number(stage.byteSize);
  const artifactAttempt = Number(stage.artifactAttempt);
  const artifactLeaseTokenHash = String(stage.artifactLeaseTokenHash ?? "");
  if (
    !["needs_review", "owner_confirmed", "approved", "rejected"].includes(
      String(stage.state),
    ) ||
    objectPath !==
      contentStageObjectPathFromHashV1(
        requestedStageId,
        revision,
        artifactAttempt,
        artifactLeaseTokenHash,
      ) ||
    !/^[a-f0-9]{64}$/u.test(contentHash) ||
    !/^[1-9][0-9]{0,30}$/u.test(objectGeneration) ||
    !Number.isSafeInteger(declaredByteSize) ||
    declaredByteSize < 1 ||
    declaredByteSize > V2_OWNER_EPISODE_PREVIEW_MAX_BYTES_V1
  )
    throw new HttpsError(
      "failed-precondition",
      "content_stage_not_previewable",
    );
  const object = await dependencies.readObject({
    objectPath,
    objectGeneration,
    maximumBytes: V2_OWNER_EPISODE_PREVIEW_MAX_BYTES_V1,
  });
  if (
    object.objectGeneration !== objectGeneration ||
    object.byteSize !== declaredByteSize ||
    object.bytes.byteLength !== declaredByteSize ||
    !/^application\/json(?:;\s*charset=utf-8)?$/iu.test(object.contentType)
  )
    throw new HttpsError("data-loss", "content_stage_object_metadata_mismatch");
  let payload: unknown;
  try {
    payload = parseHashedJsonBytes(Buffer.from(object.bytes), contentHash);
  } catch (error) {
    throw new HttpsError(
      "data-loss",
      error instanceof Error ? error.message : "content_stage_payload_invalid",
    );
  }
  return Object.freeze({
    ok: true as const,
    stage: Object.freeze({ id: snapshot.id, ...stage }),
    payload,
    qaReceipt: isRecord(stage.qaReceipt) ? stage.qaReceipt : null,
    judgeReceipt: isRecord(stage.judgeReceipt) ? stage.judgeReceipt : null,
    reviewFingerprint: contentStageReviewFingerprint(snapshot.id, stage),
  });
}
