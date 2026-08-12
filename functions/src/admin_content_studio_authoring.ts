import { HttpsError, onCall } from "firebase-functions/v2/https";
import { type AdminRole } from "./admin/roles";
import { explicitAdminRoleFromToken, hasPermission } from "./admin/permissions";
import { ENFORCE_APP_CHECK_ADMIN } from "./callable_options";

export interface V2AuthoringRequest {
  readonly draftId: string;
  readonly expectedRevision: number;
  readonly expectedFingerprint: string;
  readonly draft: {
    readonly body: Record<string, unknown>;
    readonly record: Record<string, unknown>;
  };
}

export interface ContentDraftWriter {
  readonly uid: string;
  readonly role: AdminRole;
}

export interface V2AuthoringCallableDependencies<T> {
  save(writer: ContentDraftWriter, request: V2AuthoringRequest): Promise<T>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseV2AuthoringRequest(data: unknown): V2AuthoringRequest {
  if (!isRecord(data))
    throw new HttpsError(
      "invalid-argument",
      "invalid V2 authoring mutation envelope",
    );
  const expectedRevision = data.expectedRevision;
  if (
    typeof data.draftId !== "string" ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(data.draftId) ||
    typeof expectedRevision !== "number" ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0 ||
    typeof data.expectedFingerprint !== "string" ||
    (expectedRevision === 0
      ? data.expectedFingerprint !== ""
      : !data.expectedFingerprint) ||
    !isRecord(data.draft) ||
    !isRecord(data.draft.body) ||
    !isRecord(data.draft.record)
  )
    throw new HttpsError(
      "invalid-argument",
      "invalid V2 authoring mutation envelope",
    );
  return Object.freeze({
    draftId: data.draftId,
    expectedRevision: expectedRevision as number,
    expectedFingerprint: data.expectedFingerprint,
    draft: Object.freeze({ body: data.draft.body, record: data.draft.record }),
  });
}

export function requireContentDraftWriter(
  auth:
    | { readonly uid?: string; readonly token?: Record<string, unknown> }
    | undefined,
): ContentDraftWriter {
  if (!auth?.uid || auth.token?.admin !== true)
    throw new HttpsError("permission-denied", "Admin only");
  const role = explicitAdminRoleFromToken(auth.token);
  if (!role)
    throw new HttpsError("permission-denied", "Explicit Content Studio role required");
  if (!hasPermission(role, "content.draft.write"))
    throw new HttpsError("permission-denied", "Role cannot edit V2 drafts");
  return Object.freeze({ uid: auth.uid, role });
}

export function requireContentPublisher(
  auth:
    | { readonly uid?: string; readonly token?: Record<string, unknown> }
    | undefined,
): ContentDraftWriter {
  if (!auth?.uid || auth.token?.admin !== true)
    throw new HttpsError("permission-denied", "Admin only");
  const role = explicitAdminRoleFromToken(auth.token);
  if (!role)
    throw new HttpsError("permission-denied", "Explicit Content Studio role required");
  if (!hasPermission(role, "content.publish"))
    throw new HttpsError("permission-denied", "Role cannot publish V2 content");
  return Object.freeze({ uid: auth.uid, role });
}

export function requireContentReviewer(
  auth:
    | { readonly uid?: string; readonly token?: Record<string, unknown> }
    | undefined,
): ContentDraftWriter {
  if (!auth?.uid || auth.token?.admin !== true)
    throw new HttpsError("permission-denied", "Admin only");
  const role = explicitAdminRoleFromToken(auth.token);
  if (!role)
    throw new HttpsError("permission-denied", "Explicit Content Studio role required");
  if (!hasPermission(role, "content.review"))
    throw new HttpsError("permission-denied", "Role cannot review V2 content");
  return Object.freeze({ uid: auth.uid, role });
}

export interface V2ModeTemplateLifecycleRequest {
  readonly templateRef: { readonly templateId: string; readonly version: number; readonly contentHash: string };
  readonly expectedLifecycleRevision: number;
  readonly idempotencyKey: string;
  readonly reason: string;
  readonly receiptIds?: {
    readonly validationReceiptId: string;
    readonly localizationReceiptId: string;
    readonly reviewReceiptId: string;
    readonly gateReceiptId: string;
  };
  readonly replacementRef?: { readonly templateId: string; readonly version: number; readonly contentHash: string };
  readonly noReplacement?: true;
}

export interface V2ApprovedEpisodeRevisionRequest {
  readonly draftId: string;
  readonly episodeId: string;
  readonly revision: number;
  readonly revisionFingerprint: string;
  readonly contentHash: string;
  readonly ordinal: number;
  readonly chapterId: string;
}

export interface V2EpisodeReviewRequest extends V2ApprovedEpisodeRevisionRequest {
  readonly status: "approved" | "changes_requested";
  readonly idempotencyKey: string;
  readonly reason: string;
}
export interface V2EpisodeValidationRequest extends V2ApprovedEpisodeRevisionRequest {
  readonly idempotencyKey: string;
  readonly reason: string;
}

export interface V2EpisodeLifecycleRequest extends V2ApprovedEpisodeRevisionRequest {
  readonly expectedLifecycleRevision: number;
  readonly idempotencyKey: string;
  readonly reason: string;
  readonly receiptIds?: { readonly validationReceiptId: string; readonly localizationReceiptId: string; readonly reviewReceiptId: string; readonly gateReceiptId: string };
}

export interface V2SeasonLifecycleRequest {
  readonly seasonRevisionId: string;
  readonly expectedLifecycleRevision: number;
  readonly idempotencyKey: string;
  readonly reason: string;
}

export function parseV2SeasonLifecycleRequest(data: unknown): V2SeasonLifecycleRequest {
  const keys = ["seasonRevisionId", "expectedLifecycleRevision", "idempotencyKey", "reason"];
  if (!isRecord(data) || Object.keys(data).some((key) => !keys.includes(key)) || keys.some((key) => !Object.prototype.hasOwnProperty.call(data, key)) || typeof data.seasonRevisionId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.seasonRevisionId) || !Number.isSafeInteger(data.expectedLifecycleRevision) || Number(data.expectedLifecycleRevision) < 1 || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{8,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length < 3 || data.reason.length > 500) throw new HttpsError("invalid-argument", "invalid Season lifecycle request");
  return Object.freeze({ seasonRevisionId: data.seasonRevisionId, expectedLifecycleRevision: Number(data.expectedLifecycleRevision), idempotencyKey: data.idempotencyKey, reason: data.reason.trim() });
}

export interface V2ContentGateRequest {
  readonly subject: { readonly entityType: "mode_template" | "episode"; readonly entityId: string; readonly entityRevision: number; readonly entityFingerprint: string };
  readonly validationReceiptId: string;
  readonly localizationReceiptId: string;
  readonly reviewReceiptId: string;
  readonly idempotencyKey: string;
  readonly reason: string;
}

export function parseV2ApprovedEpisodeRevisionRef(data: unknown): V2ApprovedEpisodeRevisionRequest {
  if (!isRecord(data) || !isRecord(data.revisionRef))
    throw new HttpsError("invalid-argument", "invalid Episode revision reference");
  const ref = data.revisionRef;
  const keys = ["draftId", "episodeId", "revision", "revisionFingerprint", "contentHash", "ordinal", "chapterId"];
  if (
    Object.keys(ref).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(ref, key)) ||
    typeof ref.draftId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(ref.draftId) ||
    typeof ref.episodeId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(ref.episodeId) ||
    typeof ref.chapterId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(ref.chapterId) ||
    !Number.isSafeInteger(ref.revision) || Number(ref.revision) < 1 ||
    !Number.isSafeInteger(ref.ordinal) || Number(ref.ordinal) < 1 ||
    typeof ref.revisionFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(ref.revisionFingerprint) ||
    typeof ref.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(ref.contentHash)
  )
    throw new HttpsError("invalid-argument", "invalid Episode revision reference");
  return Object.freeze({
    draftId: ref.draftId,
    episodeId: ref.episodeId,
    revision: Number(ref.revision),
    revisionFingerprint: ref.revisionFingerprint,
    contentHash: ref.contentHash,
    ordinal: Number(ref.ordinal),
    chapterId: ref.chapterId,
  });
}

export function parseV2EpisodeReviewRequest(data: unknown): V2EpisodeReviewRequest {
  const ref = parseV2ApprovedEpisodeRevisionRef(data);
  if (!isRecord(data) || Object.keys(data).some((key) => !["revisionRef", "idempotencyKey", "reason", "status"].includes(key)) || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length === 0 || !["approved", "changes_requested"].includes(String(data.status)))
    throw new HttpsError("invalid-argument", "invalid Episode review request");
  return Object.freeze({ ...ref, status: data.status as V2EpisodeReviewRequest["status"], idempotencyKey: data.idempotencyKey, reason: data.reason.trim() });
}

export function parseV2EpisodeValidationRequest(data: unknown): V2EpisodeValidationRequest {
  const ref = parseV2ApprovedEpisodeRevisionRef(data);
  if (!isRecord(data) || Object.keys(data).some((key) => !["revisionRef", "idempotencyKey", "reason"].includes(key)) || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length === 0)
    throw new HttpsError("invalid-argument", "invalid Episode validation request");
  return Object.freeze({ ...ref, idempotencyKey: data.idempotencyKey, reason: data.reason.trim() });
}

export function parseV2EpisodeLifecycleRequest(data: unknown): V2EpisodeLifecycleRequest {
  const ref = parseV2ApprovedEpisodeRevisionRef(data);
  if (!isRecord(data) || Object.keys(data).some((key) => !["revisionRef", "expectedLifecycleRevision", "idempotencyKey", "reason", "receiptIds"].includes(key)) || !Number.isSafeInteger(data.expectedLifecycleRevision) || Number(data.expectedLifecycleRevision) < 1 || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length === 0)
    throw new HttpsError("invalid-argument", "invalid Episode lifecycle request");
  let receiptIds: V2EpisodeLifecycleRequest["receiptIds"];
  if (data.receiptIds !== undefined) {
    const rawReceiptIds = data.receiptIds;
    if (!isRecord(rawReceiptIds)) throw new HttpsError("invalid-argument", "invalid Episode lifecycle receipt ids");
    const receiptRecord = rawReceiptIds as Record<string, unknown>;
    const receiptKeys = ["validationReceiptId", "localizationReceiptId", "reviewReceiptId", "gateReceiptId"];
    if (Object.keys(receiptRecord).some((key) => !receiptKeys.includes(key)) || receiptKeys.some((key) => typeof receiptRecord[key] !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(String(receiptRecord[key])))) throw new HttpsError("invalid-argument", "invalid Episode lifecycle receipt ids");
    receiptIds = receiptRecord as V2EpisodeLifecycleRequest["receiptIds"];
  }
  return Object.freeze({ ...ref, expectedLifecycleRevision: Number(data.expectedLifecycleRevision), idempotencyKey: data.idempotencyKey, reason: data.reason.trim(), ...(receiptIds ? { receiptIds } : {}) });
}

export function parseV2EpisodeApprovalRequest(data: unknown): V2EpisodeLifecycleRequest {
  const parsed = parseV2EpisodeLifecycleRequest(data);
  if (!parsed.receiptIds) throw new HttpsError("invalid-argument", "approval receipt ids required");
  return parsed;
}

export function parseV2EpisodeNonApprovalLifecycleRequest(data: unknown): Omit<V2EpisodeLifecycleRequest, "receiptIds"> {
  const parsed = parseV2EpisodeLifecycleRequest(data);
  if (parsed.receiptIds) throw new HttpsError("invalid-argument", "receipt ids are not allowed for this lifecycle action");
  return parsed;
}

export function parseV2EpisodeSubmitRequest(data: unknown): V2EpisodeValidationRequest {
  const ref = parseV2ApprovedEpisodeRevisionRef(data);
  if (!isRecord(data) || Object.keys(data).some((key) => !["revisionRef", "idempotencyKey", "reason"].includes(key)) || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length === 0) throw new HttpsError("invalid-argument", "invalid Episode submit request");
  return Object.freeze({ ...ref, idempotencyKey: data.idempotencyKey, reason: data.reason.trim() });
}

export function parseV2ContentGateRequest(data: unknown): V2ContentGateRequest {
  if (!isRecord(data) || !isRecord(data.subject) || !isRecord(data.receiptIds))
    throw new HttpsError("invalid-argument", "invalid content gate request");
  const subject = data.subject;
  const receiptIds = data.receiptIds;
  const allowed = ["subject", "receiptIds", "idempotencyKey", "reason"];
  const receiptKeys = ["validationReceiptId", "localizationReceiptId", "reviewReceiptId"];
  if (
    Object.keys(data).some((key) => !allowed.includes(key)) ||
    Object.keys(receiptIds).some((key) => !receiptKeys.includes(key)) ||
    receiptKeys.some((key) => typeof receiptIds[key] !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(String(receiptIds[key]))) ||
    !["mode_template", "episode"].includes(String(subject.entityType)) ||
    typeof subject.entityId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(subject.entityId) ||
    !Number.isSafeInteger(subject.entityRevision) || Number(subject.entityRevision) < 1 ||
    typeof subject.entityFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(subject.entityFingerprint) ||
    typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) ||
    typeof data.reason !== "string" || data.reason.trim().length === 0
  ) throw new HttpsError("invalid-argument", "invalid content gate request");
  return Object.freeze({
    subject: { entityType: subject.entityType as "mode_template" | "episode", entityId: subject.entityId, entityRevision: Number(subject.entityRevision), entityFingerprint: subject.entityFingerprint },
    validationReceiptId: receiptIds.validationReceiptId as string,
    localizationReceiptId: receiptIds.localizationReceiptId as string,
    reviewReceiptId: receiptIds.reviewReceiptId as string,
    idempotencyKey: data.idempotencyKey,
    reason: data.reason.trim(),
  });
}

export function parseV2ModeTemplateLifecycleRequest(data: unknown): V2ModeTemplateLifecycleRequest {
  if (!isRecord(data) || !isRecord(data.templateRef))
    throw new HttpsError("invalid-argument", "invalid ModeTemplate lifecycle request");
  const allowedKeys = ["templateRef", "expectedLifecycleRevision", "idempotencyKey", "reason", "receiptIds", "replacementRef", "noReplacement"];
  if (Object.keys(data).some((key) => !allowedKeys.includes(key)))
    throw new HttpsError("invalid-argument", "invalid ModeTemplate lifecycle request");
  const ref = data.templateRef;
  if (
    typeof ref.templateId !== "string" ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(ref.templateId) ||
    !Number.isSafeInteger(ref.version) ||
    Number(ref.version) < 1 ||
    typeof ref.contentHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(ref.contentHash) ||
    !Number.isSafeInteger(data.expectedLifecycleRevision) ||
    Number(data.expectedLifecycleRevision) < 1 ||
    typeof data.idempotencyKey !== "string" ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) ||
    typeof data.reason !== "string" ||
    data.reason.trim().length < 1
  )
    throw new HttpsError("invalid-argument", "invalid ModeTemplate lifecycle request");
  const output: V2ModeTemplateLifecycleRequest = {
    templateRef: { templateId: ref.templateId, version: Number(ref.version), contentHash: ref.contentHash },
    expectedLifecycleRevision: Number(data.expectedLifecycleRevision),
    idempotencyKey: data.idempotencyKey,
    reason: data.reason.trim(),
  };
  if (isRecord(data.receiptIds)) {
    const receiptIds = data.receiptIds as Record<string, unknown>;
    const keys = ["validationReceiptId", "localizationReceiptId", "reviewReceiptId", "gateReceiptId"];
    if (Object.keys(receiptIds).some((key) => !keys.includes(key)) || keys.some((key) => typeof receiptIds[key] !== "string" || String(receiptIds[key]).length === 0))
      throw new HttpsError("invalid-argument", "invalid ModeTemplate receipt IDs");
    (output as { receiptIds: V2ModeTemplateLifecycleRequest["receiptIds"] }).receiptIds = receiptIds as V2ModeTemplateLifecycleRequest["receiptIds"];
  }
  if (isRecord(data.replacementRef)) {
    const replacement = data.replacementRef;
    if (typeof replacement.templateId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(replacement.templateId) || !Number.isSafeInteger(replacement.version) || Number(replacement.version) < 1 || typeof replacement.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(replacement.contentHash))
      throw new HttpsError("invalid-argument", "invalid ModeTemplate replacement ref");
    (output as { replacementRef: V2ModeTemplateLifecycleRequest["replacementRef"] }).replacementRef = replacement as V2ModeTemplateLifecycleRequest["replacementRef"];
  }
  if (data.noReplacement !== undefined) {
    if (data.noReplacement !== true || output.replacementRef)
      throw new HttpsError("invalid-argument", "invalid ModeTemplate replacement choice");
    (output as { noReplacement: true }).noReplacement = true;
  }
  return Object.freeze(output);
}

export async function handleAdminSaveV2Draft<T>(
  request: {
    readonly auth?: {
      readonly uid?: string;
      readonly token?: Record<string, unknown>;
    };
    readonly data: unknown;
  },
  dependencies: V2AuthoringCallableDependencies<T>,
): Promise<T> {
  const writer = requireContentDraftWriter(request.auth);
  const mutation = parseV2AuthoringRequest(request.data);
  return dependencies.save(writer, mutation);
}

export function createAdminSaveV2DraftCallable<T>(
  dependencies: V2AuthoringCallableDependencies<T>,
) {
  return onCall(
    {
      region: "us-central1",
      enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
    },
    async (request) => handleAdminSaveV2Draft(request, dependencies),
  );
}
