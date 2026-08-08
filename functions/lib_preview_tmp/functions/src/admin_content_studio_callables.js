"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminArchiveV2ModeTemplate = exports.adminDeprecateV2ModeTemplate = exports.adminPublishV2ModeTemplate = exports.adminArchiveV2SeasonRevision = exports.adminApproveV2SeasonRevision = exports.adminSaveV2SeasonDraft = exports.adminIssueV2ContentGate = exports.adminArchiveV2EpisodeRevision = exports.adminRequestV2EpisodeChanges = exports.adminSubmitV2EpisodeRevision = exports.adminApproveV2EpisodeRevision = exports.adminReviewV2EpisodeRevision = exports.adminIssueV2EpisodeVoiceReceipt = exports.adminIssueV2EpisodeLocalizationReceipt = exports.adminIssueV2EpisodeValidationReceipt = exports.adminValidateV2EpisodeRevision = exports.adminSaveV2EpisodeDraft = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const admin_content_studio_authoring_1 = require("./admin_content_studio_authoring");
const authoring_transaction_repository_1 = require("./content_studio/authoring_transaction_repository");
const season_authoring_transaction_repository_1 = require("./content_studio/season_authoring_transaction_repository");
const firestore_authoring_store_1 = require("./content_studio/firestore_authoring_store");
const episode_revision_resolver_1 = require("./content_studio/episode_revision_resolver");
const episode_review_repository_1 = require("./content_studio/episode_review_repository");
const content_gate_repository_1 = require("./content_studio/content_gate_repository");
const episode_validation_repository_1 = require("./content_studio/episode_validation_repository");
const episode_localization_repository_1 = require("./content_studio/episode_localization_repository");
const episode_voice_repository_1 = require("./content_studio/episode_voice_repository");
const episode_lifecycle_transition_repository_1 = require("./content_studio/episode_lifecycle_transition_repository");
const season_lifecycle_transition_repository_1 = require("./content_studio/season_lifecycle_transition_repository");
const mode_template_transition_repository_1 = require("./content_studio/mode_template_transition_repository");
const callableOptions = {
    region: "us-central1",
    // Content authoring is an admin mutation surface: fail closed unless an
    // explicit local/dev override is supplied.
    enforceAppCheck: process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO !== "false",
};
const asHttpsError = (error) => error instanceof https_1.HttpsError
    ? error
    : new https_1.HttpsError("failed-precondition", error instanceof Error
        ? error.message
        : "V2 authoring mutation rejected");
exports.adminSaveV2EpisodeDraft = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const writer = (0, admin_content_studio_authoring_1.requireContentDraftWriter)(request.auth);
        const mutation = (0, admin_content_studio_authoring_1.parseV2AuthoringRequest)(request.data);
        const repository = new authoring_transaction_repository_1.FirestoreEpisodeDraftRepository((0, firestore_authoring_store_1.createFirestoreEpisodeDraftStore)(admin.firestore()), { ownerId: writer.uid });
        const saved = await repository.save(mutation.draftId, mutation.draft, {
            expectedRevision: mutation.expectedRevision,
            expectedFingerprint: mutation.expectedFingerprint,
        });
        return { ok: true, draft: saved };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
/** Server-owned semantic review gate for an immutable Episode revision. */
exports.adminValidateV2EpisodeRevision = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const ref = (0, admin_content_studio_authoring_1.parseV2ApprovedEpisodeRevisionRef)(request.data);
        const db = admin.firestore();
        const resolver = (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db));
        const artifact = await resolver.resolve({ ...ref, approvalStatus: "approved" });
        if (!artifact)
            throw new https_1.HttpsError("not-found", "Episode revision not found");
        const result = (0, episode_revision_resolver_1.validateEpisodeRevisionArtifactSemantics)(artifact.body);
        return result.ok
            ? { ok: true, revisionRef: ref }
            : { ok: false, revisionRef: ref, issues: result.issues };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminIssueV2EpisodeValidationReceipt = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2EpisodeValidationRequest)(request.data);
        const db = admin.firestore();
        const resolver = (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db));
        const repository = new episode_validation_repository_1.EpisodeValidationRepository((0, firestore_authoring_store_1.createFirestoreEpisodeValidationStore)(db, resolver), { actorId: reviewer.uid });
        const receipt = await repository.validate({ ...input, approvalStatus: "approved" }, input.reason, input.idempotencyKey);
        return { ok: true, receipt };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminIssueV2EpisodeLocalizationReceipt = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2EpisodeValidationRequest)(request.data);
        const db = admin.firestore();
        const resolver = (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db));
        const repository = new episode_localization_repository_1.EpisodeLocalizationRepository((0, firestore_authoring_store_1.createFirestoreEpisodeValidationStore)(db, resolver, { receiptCollection: "content_studio_localization_receipts", operationCollection: "content_studio_episode_localization_operations" }), { actorId: reviewer.uid });
        const receipt = await repository.approve({ ...input, approvalStatus: "approved" }, input.reason, input.idempotencyKey);
        return { ok: true, receipt };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminIssueV2EpisodeVoiceReceipt = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2EpisodeValidationRequest)(request.data);
        const db = admin.firestore();
        const resolver = (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db));
        const repository = new episode_voice_repository_1.EpisodeVoiceGovernanceRepository((0, firestore_authoring_store_1.createFirestoreEpisodeVoiceStore)(db, resolver), { actorId: reviewer.uid });
        const receipt = await repository.approve({ ...input, approvalStatus: "approved" }, input.reason, input.idempotencyKey);
        return { ok: true, receipt };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminReviewV2EpisodeRevision = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2EpisodeReviewRequest)(request.data);
        const db = admin.firestore();
        const resolver = (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db));
        const repository = new episode_review_repository_1.EpisodeReviewRepository((0, firestore_authoring_store_1.createFirestoreEpisodeReviewStore)(db, resolver), { actorId: reviewer.uid });
        const receipt = await repository.review({ ...input, approvalStatus: "approved" }, input.status, input.reason, input.idempotencyKey);
        return { ok: true, receipt };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminApproveV2EpisodeRevision = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2EpisodeApprovalRequest)(request.data);
        const repository = new episode_lifecycle_transition_repository_1.EpisodeLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreEpisodeLifecycleStore)(admin.firestore()), { actorId: reviewer.uid });
        const lifecycle = await repository.approve({ ...input, approvalStatus: "approved" }, input.receiptIds, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminSubmitV2EpisodeRevision = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const writer = (0, admin_content_studio_authoring_1.requireContentDraftWriter)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2EpisodeSubmitRequest)(request.data);
        const repository = new episode_lifecycle_transition_repository_1.EpisodeLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreEpisodeLifecycleStore)(admin.firestore()), { actorId: writer.uid });
        const lifecycle = await repository.submit({ ...input, approvalStatus: "draft" }, input.reason, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminRequestV2EpisodeChanges = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2EpisodeNonApprovalLifecycleRequest)(request.data);
        const repository = new episode_lifecycle_transition_repository_1.EpisodeLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreEpisodeLifecycleStore)(admin.firestore()), { actorId: reviewer.uid });
        const lifecycle = await repository.requestChanges({ ...input, approvalStatus: "approved" }, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminArchiveV2EpisodeRevision = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2EpisodeNonApprovalLifecycleRequest)(request.data);
        const repository = new episode_lifecycle_transition_repository_1.EpisodeLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreEpisodeLifecycleStore)(admin.firestore()), { actorId: reviewer.uid });
        const lifecycle = await repository.archive({ ...input, approvalStatus: "approved" }, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminIssueV2ContentGate = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const publisher = (0, admin_content_studio_authoring_1.requireContentPublisher)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2ContentGateRequest)(request.data);
        const repository = new content_gate_repository_1.ContentGateReceiptRepository((0, firestore_authoring_store_1.createFirestoreContentGateIssueStore)(admin.firestore()), { actorId: publisher.uid });
        const body = await repository.issue(input.subject, { validationReceiptId: input.validationReceiptId, localizationReceiptId: input.localizationReceiptId, reviewReceiptId: input.reviewReceiptId }, input.reason, input.idempotencyKey);
        return { ok: true, body };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminSaveV2SeasonDraft = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const writer = (0, admin_content_studio_authoring_1.requireContentDraftWriter)(request.auth);
        const mutation = (0, admin_content_studio_authoring_1.parseV2AuthoringRequest)(request.data);
        const db = admin.firestore();
        const repository = new season_authoring_transaction_repository_1.FirestoreSeasonDraftRepository((0, firestore_authoring_store_1.createFirestoreSeasonDraftStore)(db), { ownerId: writer.uid }, (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db, undefined, (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(db)), (0, firestore_authoring_store_1.createFirestoreDecisionRegistryResolver)(db));
        const saved = await repository.save(mutation.draftId, mutation.draft, {
            expectedRevision: mutation.expectedRevision,
            expectedFingerprint: mutation.expectedFingerprint,
        });
        return { ok: true, draft: saved };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminApproveV2SeasonRevision = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2SeasonLifecycleRequest)(request.data);
        const repository = new season_lifecycle_transition_repository_1.SeasonLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreSeasonLifecycleTransitionStore)(admin.firestore()), reviewer.uid);
        const lifecycle = await repository.approve(input.seasonRevisionId, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminArchiveV2SeasonRevision = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2SeasonLifecycleRequest)(request.data);
        const repository = new season_lifecycle_transition_repository_1.SeasonLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreSeasonLifecycleTransitionStore)(admin.firestore()), reviewer.uid);
        const lifecycle = await repository.archive(input.seasonRevisionId, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminPublishV2ModeTemplate = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const publisher = (0, admin_content_studio_authoring_1.requireContentPublisher)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2ModeTemplateLifecycleRequest)(request.data);
        if (!input.receiptIds || input.replacementRef || input.noReplacement)
            throw new https_1.HttpsError("invalid-argument", "publish requires approval receipt IDs only");
        const repo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreModeTemplateLifecycleStore)(admin.firestore()), { actorId: publisher.uid });
        const lifecycle = await repo.publish(input.templateRef, input.receiptIds, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminDeprecateV2ModeTemplate = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2ModeTemplateLifecycleRequest)(request.data);
        if ((input.replacementRef ? 1 : 0) + (input.noReplacement ? 1 : 0) !== 1)
            throw new https_1.HttpsError("invalid-argument", "deprecate requires replacement choice");
        const repo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreModeTemplateLifecycleStore)(admin.firestore()), { actorId: reviewer.uid });
        const lifecycle = await repo.deprecate(input.templateRef, input.expectedLifecycleRevision, input.reason, input.replacementRef, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminArchiveV2ModeTemplate = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const reviewer = (0, admin_content_studio_authoring_1.requireContentReviewer)(request.auth);
        const input = (0, admin_content_studio_authoring_1.parseV2ModeTemplateLifecycleRequest)(request.data);
        if (input.receiptIds || input.replacementRef || input.noReplacement)
            throw new https_1.HttpsError("invalid-argument", "archive does not accept receipt or replacement fields");
        const repo = new mode_template_transition_repository_1.ModeTemplateLifecycleTransitionRepository((0, firestore_authoring_store_1.createFirestoreModeTemplateLifecycleStore)(admin.firestore()), { actorId: reviewer.uid });
        const lifecycle = await repo.archive(input.templateRef, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
        return { ok: true, lifecycle };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
//# sourceMappingURL=admin_content_studio_callables.js.map