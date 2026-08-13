import { createHash } from "node:crypto";

const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const HASH_RE = /^[a-f0-9]{64}$/u;

export function contentStageObjectPathFromHashV1(
  stageId: string,
  revision: number,
  attempt: number,
  leaseTokenHash: string,
): string {
  if (
    !STAGE_ID_RE.test(stageId) ||
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    !Number.isSafeInteger(attempt) ||
    attempt < 1 ||
    !HASH_RE.test(leaseTokenHash)
  )
    throw new Error("content_stage_object_identity_invalid");
  return `content-factory-stages/${createHash("sha256").update(stageId).digest("hex")}/r${revision}/a${attempt}-${leaseTokenHash}.json`;
}

export function contentStagePlanObjectPathV1(
  stageId: string,
  planRequestRawHash: string,
): string {
  if (!STAGE_ID_RE.test(stageId) || !HASH_RE.test(planRequestRawHash))
    throw new Error("content_stage_plan_object_identity_invalid");
  return `content-factory-stage-plans/${createHash("sha256").update(stageId).digest("hex")}/${planRequestRawHash}.json`;
}
