"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseV2AuthoringRequest = parseV2AuthoringRequest;
exports.requireContentDraftWriter = requireContentDraftWriter;
exports.requireContentPublisher = requireContentPublisher;
exports.requireContentReviewer = requireContentReviewer;
exports.parseV2SeasonLifecycleRequest = parseV2SeasonLifecycleRequest;
exports.parseV2ApprovedEpisodeRevisionRef = parseV2ApprovedEpisodeRevisionRef;
exports.parseV2EpisodeReviewRequest = parseV2EpisodeReviewRequest;
exports.parseV2EpisodeValidationRequest = parseV2EpisodeValidationRequest;
exports.parseV2EpisodeLifecycleRequest = parseV2EpisodeLifecycleRequest;
exports.parseV2EpisodeApprovalRequest = parseV2EpisodeApprovalRequest;
exports.parseV2EpisodeNonApprovalLifecycleRequest = parseV2EpisodeNonApprovalLifecycleRequest;
exports.parseV2EpisodeSubmitRequest = parseV2EpisodeSubmitRequest;
exports.parseV2ContentGateRequest = parseV2ContentGateRequest;
exports.parseV2ModeTemplateLifecycleRequest = parseV2ModeTemplateLifecycleRequest;
exports.handleAdminSaveV2Draft = handleAdminSaveV2Draft;
exports.createAdminSaveV2DraftCallable = createAdminSaveV2DraftCallable;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function parseV2AuthoringRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError("invalid-argument", "invalid V2 authoring mutation envelope");
    const expectedRevision = data.expectedRevision;
    if (typeof data.draftId !== "string" ||
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
        !isRecord(data.draft.record))
        throw new https_1.HttpsError("invalid-argument", "invalid V2 authoring mutation envelope");
    return Object.freeze({
        draftId: data.draftId,
        expectedRevision: expectedRevision,
        expectedFingerprint: data.expectedFingerprint,
        draft: Object.freeze({ body: data.draft.body, record: data.draft.record }),
    });
}
function requireContentDraftWriter(auth) {
    if (!auth?.uid ||
        auth.token?.admin !== true ||
        !(0, roles_1.hasAdminRole)(auth.token.adminRole))
        throw new https_1.HttpsError("permission-denied", "Admin only");
    const role = auth.token.adminRole;
    if (!(0, permissions_1.hasPermission)(role, "content.draft.write"))
        throw new https_1.HttpsError("permission-denied", "Role cannot edit V2 drafts");
    return Object.freeze({ uid: auth.uid, role });
}
function requireContentPublisher(auth) {
    if (!auth?.uid ||
        auth.token?.admin !== true ||
        !(0, roles_1.hasAdminRole)(auth.token.adminRole))
        throw new https_1.HttpsError("permission-denied", "Admin only");
    const role = auth.token.adminRole;
    if (!(0, permissions_1.hasPermission)(role, "content.publish"))
        throw new https_1.HttpsError("permission-denied", "Role cannot publish V2 content");
    return Object.freeze({ uid: auth.uid, role });
}
function requireContentReviewer(auth) {
    if (!auth?.uid ||
        auth.token?.admin !== true ||
        !(0, roles_1.hasAdminRole)(auth.token.adminRole))
        throw new https_1.HttpsError("permission-denied", "Admin only");
    const role = auth.token.adminRole;
    if (!(0, permissions_1.hasPermission)(role, "content.review"))
        throw new https_1.HttpsError("permission-denied", "Role cannot review V2 content");
    return Object.freeze({ uid: auth.uid, role });
}
function parseV2SeasonLifecycleRequest(data) {
    const keys = ["seasonRevisionId", "expectedLifecycleRevision", "idempotencyKey", "reason"];
    if (!isRecord(data) || Object.keys(data).some((key) => !keys.includes(key)) || keys.some((key) => !Object.prototype.hasOwnProperty.call(data, key)) || typeof data.seasonRevisionId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.seasonRevisionId) || !Number.isSafeInteger(data.expectedLifecycleRevision) || Number(data.expectedLifecycleRevision) < 1 || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{8,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length < 3 || data.reason.length > 500)
        throw new https_1.HttpsError("invalid-argument", "invalid Season lifecycle request");
    return Object.freeze({ seasonRevisionId: data.seasonRevisionId, expectedLifecycleRevision: Number(data.expectedLifecycleRevision), idempotencyKey: data.idempotencyKey, reason: data.reason.trim() });
}
function parseV2ApprovedEpisodeRevisionRef(data) {
    if (!isRecord(data) || !isRecord(data.revisionRef))
        throw new https_1.HttpsError("invalid-argument", "invalid Episode revision reference");
    const ref = data.revisionRef;
    const keys = ["draftId", "episodeId", "revision", "revisionFingerprint", "contentHash", "ordinal", "chapterId"];
    if (Object.keys(ref).some((key) => !keys.includes(key)) ||
        keys.some((key) => !Object.prototype.hasOwnProperty.call(ref, key)) ||
        typeof ref.draftId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(ref.draftId) ||
        typeof ref.episodeId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(ref.episodeId) ||
        typeof ref.chapterId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(ref.chapterId) ||
        !Number.isSafeInteger(ref.revision) || Number(ref.revision) < 1 ||
        !Number.isSafeInteger(ref.ordinal) || Number(ref.ordinal) < 1 ||
        typeof ref.revisionFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(ref.revisionFingerprint) ||
        typeof ref.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(ref.contentHash))
        throw new https_1.HttpsError("invalid-argument", "invalid Episode revision reference");
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
function parseV2EpisodeReviewRequest(data) {
    const ref = parseV2ApprovedEpisodeRevisionRef(data);
    if (!isRecord(data) || Object.keys(data).some((key) => !["revisionRef", "idempotencyKey", "reason", "status"].includes(key)) || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length === 0 || !["approved", "changes_requested"].includes(String(data.status)))
        throw new https_1.HttpsError("invalid-argument", "invalid Episode review request");
    return Object.freeze({ ...ref, status: data.status, idempotencyKey: data.idempotencyKey, reason: data.reason.trim() });
}
function parseV2EpisodeValidationRequest(data) {
    const ref = parseV2ApprovedEpisodeRevisionRef(data);
    if (!isRecord(data) || Object.keys(data).some((key) => !["revisionRef", "idempotencyKey", "reason"].includes(key)) || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length === 0)
        throw new https_1.HttpsError("invalid-argument", "invalid Episode validation request");
    return Object.freeze({ ...ref, idempotencyKey: data.idempotencyKey, reason: data.reason.trim() });
}
function parseV2EpisodeLifecycleRequest(data) {
    const ref = parseV2ApprovedEpisodeRevisionRef(data);
    if (!isRecord(data) || Object.keys(data).some((key) => !["revisionRef", "expectedLifecycleRevision", "idempotencyKey", "reason", "receiptIds"].includes(key)) || !Number.isSafeInteger(data.expectedLifecycleRevision) || Number(data.expectedLifecycleRevision) < 1 || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length === 0)
        throw new https_1.HttpsError("invalid-argument", "invalid Episode lifecycle request");
    let receiptIds;
    if (data.receiptIds !== undefined) {
        const rawReceiptIds = data.receiptIds;
        if (!isRecord(rawReceiptIds))
            throw new https_1.HttpsError("invalid-argument", "invalid Episode lifecycle receipt ids");
        const receiptRecord = rawReceiptIds;
        const receiptKeys = ["validationReceiptId", "localizationReceiptId", "reviewReceiptId", "gateReceiptId"];
        if (Object.keys(receiptRecord).some((key) => !receiptKeys.includes(key)) || receiptKeys.some((key) => typeof receiptRecord[key] !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(String(receiptRecord[key]))))
            throw new https_1.HttpsError("invalid-argument", "invalid Episode lifecycle receipt ids");
        receiptIds = receiptRecord;
    }
    return Object.freeze({ ...ref, expectedLifecycleRevision: Number(data.expectedLifecycleRevision), idempotencyKey: data.idempotencyKey, reason: data.reason.trim(), ...(receiptIds ? { receiptIds } : {}) });
}
function parseV2EpisodeApprovalRequest(data) {
    const parsed = parseV2EpisodeLifecycleRequest(data);
    if (!parsed.receiptIds)
        throw new https_1.HttpsError("invalid-argument", "approval receipt ids required");
    return parsed;
}
function parseV2EpisodeNonApprovalLifecycleRequest(data) {
    const parsed = parseV2EpisodeLifecycleRequest(data);
    if (parsed.receiptIds)
        throw new https_1.HttpsError("invalid-argument", "receipt ids are not allowed for this lifecycle action");
    return parsed;
}
function parseV2EpisodeSubmitRequest(data) {
    const ref = parseV2ApprovedEpisodeRevisionRef(data);
    if (!isRecord(data) || Object.keys(data).some((key) => !["revisionRef", "idempotencyKey", "reason"].includes(key)) || typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) || typeof data.reason !== "string" || data.reason.trim().length === 0)
        throw new https_1.HttpsError("invalid-argument", "invalid Episode submit request");
    return Object.freeze({ ...ref, idempotencyKey: data.idempotencyKey, reason: data.reason.trim() });
}
function parseV2ContentGateRequest(data) {
    if (!isRecord(data) || !isRecord(data.subject) || !isRecord(data.receiptIds))
        throw new https_1.HttpsError("invalid-argument", "invalid content gate request");
    const subject = data.subject;
    const receiptIds = data.receiptIds;
    const allowed = ["subject", "receiptIds", "idempotencyKey", "reason"];
    const receiptKeys = ["validationReceiptId", "localizationReceiptId", "reviewReceiptId"];
    if (Object.keys(data).some((key) => !allowed.includes(key)) ||
        Object.keys(receiptIds).some((key) => !receiptKeys.includes(key)) ||
        receiptKeys.some((key) => typeof receiptIds[key] !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(String(receiptIds[key]))) ||
        !["mode_template", "episode"].includes(String(subject.entityType)) ||
        typeof subject.entityId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(subject.entityId) ||
        !Number.isSafeInteger(subject.entityRevision) || Number(subject.entityRevision) < 1 ||
        typeof subject.entityFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(subject.entityFingerprint) ||
        typeof data.idempotencyKey !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(data.idempotencyKey) ||
        typeof data.reason !== "string" || data.reason.trim().length === 0)
        throw new https_1.HttpsError("invalid-argument", "invalid content gate request");
    return Object.freeze({
        subject: { entityType: subject.entityType, entityId: subject.entityId, entityRevision: Number(subject.entityRevision), entityFingerprint: subject.entityFingerprint },
        validationReceiptId: receiptIds.validationReceiptId,
        localizationReceiptId: receiptIds.localizationReceiptId,
        reviewReceiptId: receiptIds.reviewReceiptId,
        idempotencyKey: data.idempotencyKey,
        reason: data.reason.trim(),
    });
}
function parseV2ModeTemplateLifecycleRequest(data) {
    if (!isRecord(data) || !isRecord(data.templateRef))
        throw new https_1.HttpsError("invalid-argument", "invalid ModeTemplate lifecycle request");
    const allowedKeys = ["templateRef", "expectedLifecycleRevision", "idempotencyKey", "reason", "receiptIds", "replacementRef", "noReplacement"];
    if (Object.keys(data).some((key) => !allowedKeys.includes(key)))
        throw new https_1.HttpsError("invalid-argument", "invalid ModeTemplate lifecycle request");
    const ref = data.templateRef;
    if (typeof ref.templateId !== "string" ||
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
        data.reason.trim().length < 1)
        throw new https_1.HttpsError("invalid-argument", "invalid ModeTemplate lifecycle request");
    const output = {
        templateRef: { templateId: ref.templateId, version: Number(ref.version), contentHash: ref.contentHash },
        expectedLifecycleRevision: Number(data.expectedLifecycleRevision),
        idempotencyKey: data.idempotencyKey,
        reason: data.reason.trim(),
    };
    if (isRecord(data.receiptIds)) {
        const receiptIds = data.receiptIds;
        const keys = ["validationReceiptId", "localizationReceiptId", "reviewReceiptId", "gateReceiptId"];
        if (Object.keys(receiptIds).some((key) => !keys.includes(key)) || keys.some((key) => typeof receiptIds[key] !== "string" || String(receiptIds[key]).length === 0))
            throw new https_1.HttpsError("invalid-argument", "invalid ModeTemplate receipt IDs");
        output.receiptIds = receiptIds;
    }
    if (isRecord(data.replacementRef)) {
        const replacement = data.replacementRef;
        if (typeof replacement.templateId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(replacement.templateId) || !Number.isSafeInteger(replacement.version) || Number(replacement.version) < 1 || typeof replacement.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(replacement.contentHash))
            throw new https_1.HttpsError("invalid-argument", "invalid ModeTemplate replacement ref");
        output.replacementRef = replacement;
    }
    if (data.noReplacement !== undefined) {
        if (data.noReplacement !== true || output.replacementRef)
            throw new https_1.HttpsError("invalid-argument", "invalid ModeTemplate replacement choice");
        output.noReplacement = true;
    }
    return Object.freeze(output);
}
async function handleAdminSaveV2Draft(request, dependencies) {
    const writer = requireContentDraftWriter(request.auth);
    const mutation = parseV2AuthoringRequest(request.data);
    return dependencies.save(writer, mutation);
}
function createAdminSaveV2DraftCallable(dependencies) {
    return (0, https_2.onCall)({
        region: "us-central1",
        enforceAppCheck: process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO !== "false",
    }, async (request) => handleAdminSaveV2Draft(request, dependencies));
}
//# sourceMappingURL=admin_content_studio_authoring.js.map