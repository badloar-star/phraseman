import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  parseV2AuthoringRequest,
  requireContentDraftWriter,
  parseV2ModeTemplateLifecycleRequest,
  requireContentPublisher,
  requireContentReviewer,
  parseV2ApprovedEpisodeRevisionRef,
  parseV2EpisodeReviewRequest,
  parseV2EpisodeValidationRequest,
  parseV2EpisodeApprovalRequest,
  parseV2EpisodeNonApprovalLifecycleRequest,
  parseV2EpisodeSubmitRequest,
  parseV2ContentGateRequest,
  parseV2SeasonLifecycleRequest,
} from "./admin_content_studio_authoring";
import { FirestoreEpisodeDraftRepository } from "./content_studio/authoring_transaction_repository";
import { FirestoreSeasonDraftRepository } from "./content_studio/season_authoring_transaction_repository";
import {
  createFirestoreDecisionRegistryResolver,
  createFirestoreEpisodeDraftStore,
  createFirestoreEpisodeRevisionResolver,
  createFirestoreModeTemplateResolver,
  createFirestoreSeasonDraftStore,
  createFirestoreModeTemplateLifecycleStore,
  createFirestoreEpisodeReviewStore,
  createFirestoreContentGateIssueStore,
  createFirestoreEpisodeValidationStore,
  createFirestoreEpisodeVoiceStore,
  createFirestoreEpisodeLifecycleStore,
  createFirestoreSeasonLifecycleTransitionStore,
} from "./content_studio/firestore_authoring_store";
import { validateEpisodeRevisionArtifactSemantics } from "./content_studio/episode_revision_resolver";
import { EpisodeReviewRepository } from "./content_studio/episode_review_repository";
import { ContentGateReceiptRepository } from "./content_studio/content_gate_repository";
import { EpisodeValidationRepository } from "./content_studio/episode_validation_repository";
import { EpisodeLocalizationRepository } from "./content_studio/episode_localization_repository";
import { EpisodeVoiceGovernanceRepository } from "./content_studio/episode_voice_repository";
import { EpisodeLifecycleTransitionRepository } from "./content_studio/episode_lifecycle_transition_repository";
import { SeasonLifecycleTransitionRepository } from "./content_studio/season_lifecycle_transition_repository";
import { ModeTemplateLifecycleTransitionRepository } from "./content_studio/mode_template_transition_repository";
import type { EpisodeDraft } from "../../modules/learning-v2/authoring/episode_draft";
import type { SeasonDraft } from "../../modules/learning-v2/authoring/season_draft";
import { ENFORCE_APP_CHECK_ADMIN } from "./callable_options";

const callableOptions = {
  region: "us-central1",
  // Owner invariant: admin App Check remains off unless the dedicated admin
  // flag is explicitly enabled. Auth role checks still fail closed per call.
  enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
} as const;

const asHttpsError = (error: unknown): HttpsError =>
  error instanceof HttpsError
    ? error
    : new HttpsError(
        "failed-precondition",
        error instanceof Error
          ? error.message
          : "V2 authoring mutation rejected",
      );

export const adminSaveV2EpisodeDraft = onCall(
  callableOptions,
  async (request) => {
    try {
      const writer = requireContentDraftWriter(
        request.auth as
          | { uid?: string; token?: Record<string, unknown> }
          | undefined,
      );
      const mutation = parseV2AuthoringRequest(request.data);
      const repository = new FirestoreEpisodeDraftRepository(
        createFirestoreEpisodeDraftStore(admin.firestore()),
        { ownerId: writer.uid },
      );
      const saved = await repository.save(
        mutation.draftId,
        mutation.draft as unknown as EpisodeDraft,
        {
          expectedRevision: mutation.expectedRevision,
          expectedFingerprint: mutation.expectedFingerprint,
        },
      );
      return { ok: true, draft: saved };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

/** Server-owned semantic review gate for an immutable Episode revision. */
export const adminValidateV2EpisodeRevision = onCall(
  callableOptions,
  async (request) => {
    try {
      requireContentReviewer(
        request.auth as
          | { uid?: string; token?: Record<string, unknown> }
          | undefined,
      );
      const ref = parseV2ApprovedEpisodeRevisionRef(request.data);
      const db = admin.firestore();
      const resolver = createFirestoreEpisodeRevisionResolver(
        db,
        undefined,
        createFirestoreModeTemplateResolver(db),
      );
      const artifact = await resolver.resolve({ ...ref, approvalStatus: "approved" });
      if (!artifact) throw new HttpsError("not-found", "Episode revision not found");
      const result = validateEpisodeRevisionArtifactSemantics(artifact.body);
      return result.ok
        ? { ok: true, revisionRef: ref }
        : { ok: false, revisionRef: ref, issues: result.issues };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminIssueV2EpisodeValidationReceipt = onCall(
  callableOptions,
  async (request) => {
    try {
      const reviewer = requireContentReviewer(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
      const input = parseV2EpisodeValidationRequest(request.data);
      const db = admin.firestore();
      const resolver = createFirestoreEpisodeRevisionResolver(db, undefined, createFirestoreModeTemplateResolver(db));
      const repository = new EpisodeValidationRepository(createFirestoreEpisodeValidationStore(db, resolver), { actorId: reviewer.uid });
      const receipt = await repository.validate({ ...input, approvalStatus: "approved" }, input.reason, input.idempotencyKey);
      return { ok: true, receipt };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminIssueV2EpisodeLocalizationReceipt = onCall(
  callableOptions,
  async (request) => {
    try {
      const reviewer = requireContentReviewer(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
      const input = parseV2EpisodeValidationRequest(request.data);
      const db = admin.firestore();
      const resolver = createFirestoreEpisodeRevisionResolver(db, undefined, createFirestoreModeTemplateResolver(db));
      const repository = new EpisodeLocalizationRepository(
        createFirestoreEpisodeValidationStore(db, resolver, { receiptCollection: "content_studio_localization_receipts", operationCollection: "content_studio_episode_localization_operations" }),
        { actorId: reviewer.uid },
      );
      const receipt = await repository.approve({ ...input, approvalStatus: "approved" }, input.reason, input.idempotencyKey);
      return { ok: true, receipt };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminIssueV2EpisodeVoiceReceipt = onCall(
  callableOptions,
  async (request) => {
    try {
      const reviewer = requireContentReviewer(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
      const input = parseV2EpisodeValidationRequest(request.data);
      const db = admin.firestore();
      const resolver = createFirestoreEpisodeRevisionResolver(db, undefined, createFirestoreModeTemplateResolver(db));
      const repository = new EpisodeVoiceGovernanceRepository(createFirestoreEpisodeVoiceStore(db, resolver), { actorId: reviewer.uid });
      const receipt = await repository.approve({ ...input, approvalStatus: "approved" }, input.reason, input.idempotencyKey);
      return { ok: true, receipt };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminReviewV2EpisodeRevision = onCall(
  callableOptions,
  async (request) => {
    try {
      const reviewer = requireContentReviewer(
        request.auth as
          | { uid?: string; token?: Record<string, unknown> }
          | undefined,
      );
      const input = parseV2EpisodeReviewRequest(request.data);
      const db = admin.firestore();
      const resolver = createFirestoreEpisodeRevisionResolver(
        db,
        undefined,
        createFirestoreModeTemplateResolver(db),
      );
      const repository = new EpisodeReviewRepository(
        createFirestoreEpisodeReviewStore(db, resolver),
        { actorId: reviewer.uid },
      );
      const receipt = await repository.review(
        { ...input, approvalStatus: "approved" },
        input.status,
        input.reason,
        input.idempotencyKey,
      );
      return { ok: true, receipt };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminApproveV2EpisodeRevision = onCall(callableOptions, async (request) => {
  try {
    const reviewer = requireContentReviewer(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
    const input = parseV2EpisodeApprovalRequest(request.data);
    const repository = new EpisodeLifecycleTransitionRepository(createFirestoreEpisodeLifecycleStore(admin.firestore()), { actorId: reviewer.uid });
    const lifecycle = await repository.approve({ ...input, approvalStatus: "approved" }, input.receiptIds!, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
    return { ok: true, lifecycle };
  } catch (error) { throw asHttpsError(error); }
});

export const adminSubmitV2EpisodeRevision = onCall(callableOptions, async (request) => {
  try {
    const writer = requireContentDraftWriter(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
    const input = parseV2EpisodeSubmitRequest(request.data);
    const repository = new EpisodeLifecycleTransitionRepository(createFirestoreEpisodeLifecycleStore(admin.firestore()), { actorId: writer.uid });
    const lifecycle = await repository.submit({ ...input, approvalStatus: "draft" }, input.reason, input.idempotencyKey);
    return { ok: true, lifecycle };
  } catch (error) { throw asHttpsError(error); }
});

export const adminRequestV2EpisodeChanges = onCall(callableOptions, async (request) => {
  try {
    const reviewer = requireContentReviewer(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
    const input = parseV2EpisodeNonApprovalLifecycleRequest(request.data);
    const repository = new EpisodeLifecycleTransitionRepository(createFirestoreEpisodeLifecycleStore(admin.firestore()), { actorId: reviewer.uid });
    const lifecycle = await repository.requestChanges({ ...input, approvalStatus: "approved" }, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
    return { ok: true, lifecycle };
  } catch (error) { throw asHttpsError(error); }
});

export const adminArchiveV2EpisodeRevision = onCall(callableOptions, async (request) => {
  try {
    const reviewer = requireContentReviewer(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
    const input = parseV2EpisodeNonApprovalLifecycleRequest(request.data);
    const repository = new EpisodeLifecycleTransitionRepository(createFirestoreEpisodeLifecycleStore(admin.firestore()), { actorId: reviewer.uid });
    const lifecycle = await repository.archive({ ...input, approvalStatus: "approved" }, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
    return { ok: true, lifecycle };
  } catch (error) { throw asHttpsError(error); }
});

export const adminIssueV2ContentGate = onCall(
  callableOptions,
  async (request) => {
    try {
      const publisher = requireContentPublisher(
        request.auth as
          | { uid?: string; token?: Record<string, unknown> }
          | undefined,
      );
      const input = parseV2ContentGateRequest(request.data);
      const repository = new ContentGateReceiptRepository(
        createFirestoreContentGateIssueStore(admin.firestore()),
        { actorId: publisher.uid },
      );
      const body = await repository.issue(
        input.subject,
        { validationReceiptId: input.validationReceiptId, localizationReceiptId: input.localizationReceiptId, reviewReceiptId: input.reviewReceiptId },
        input.reason,
        input.idempotencyKey,
      );
      return { ok: true, body };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminSaveV2SeasonDraft = onCall(
  callableOptions,
  async (request) => {
    try {
      const writer = requireContentDraftWriter(
        request.auth as
          | { uid?: string; token?: Record<string, unknown> }
          | undefined,
      );
      const mutation = parseV2AuthoringRequest(request.data);
      const db = admin.firestore();
      const repository = new FirestoreSeasonDraftRepository(
        createFirestoreSeasonDraftStore(db),
        { ownerId: writer.uid },
        createFirestoreEpisodeRevisionResolver(
          db,
          undefined,
          createFirestoreModeTemplateResolver(db),
        ),
        createFirestoreDecisionRegistryResolver(db),
      );
      const saved = await repository.save(
        mutation.draftId,
        mutation.draft as unknown as SeasonDraft,
        {
          expectedRevision: mutation.expectedRevision,
          expectedFingerprint: mutation.expectedFingerprint,
        },
      );
      return { ok: true, draft: saved };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminApproveV2SeasonRevision = onCall(callableOptions, async (request) => {
  try {
    const reviewer = requireContentReviewer(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
    const input = parseV2SeasonLifecycleRequest(request.data);
    const repository = new SeasonLifecycleTransitionRepository(createFirestoreSeasonLifecycleTransitionStore(admin.firestore()), reviewer.uid);
    const lifecycle = await repository.approve(input.seasonRevisionId, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
    return { ok: true, lifecycle };
  } catch (error) { throw asHttpsError(error); }
});

export const adminArchiveV2SeasonRevision = onCall(callableOptions, async (request) => {
  try {
    const reviewer = requireContentReviewer(request.auth as { uid?: string; token?: Record<string, unknown> } | undefined);
    const input = parseV2SeasonLifecycleRequest(request.data);
    const repository = new SeasonLifecycleTransitionRepository(createFirestoreSeasonLifecycleTransitionStore(admin.firestore()), reviewer.uid);
    const lifecycle = await repository.archive(input.seasonRevisionId, input.expectedLifecycleRevision, input.reason, input.idempotencyKey);
    return { ok: true, lifecycle };
  } catch (error) { throw asHttpsError(error); }
});

export const adminPublishV2ModeTemplate = onCall(
  callableOptions,
  async (request) => {
    try {
      const publisher = requireContentPublisher(
        request.auth as
          | { uid?: string; token?: Record<string, unknown> }
          | undefined,
      );
      const input = parseV2ModeTemplateLifecycleRequest(request.data);
      if (!input.receiptIds || input.replacementRef || input.noReplacement)
        throw new HttpsError("invalid-argument", "publish requires approval receipt IDs only");
      const repo = new ModeTemplateLifecycleTransitionRepository(
        createFirestoreModeTemplateLifecycleStore(admin.firestore()),
        { actorId: publisher.uid },
      );
      const lifecycle = await repo.publish(
        input.templateRef,
        input.receiptIds,
        input.expectedLifecycleRevision,
        input.reason,
        input.idempotencyKey,
      );
      return { ok: true, lifecycle };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminDeprecateV2ModeTemplate = onCall(
  callableOptions,
  async (request) => {
    try {
      const reviewer = requireContentReviewer(
        request.auth as
          | { uid?: string; token?: Record<string, unknown> }
          | undefined,
      );
      const input = parseV2ModeTemplateLifecycleRequest(request.data);
      if ((input.replacementRef ? 1 : 0) + (input.noReplacement ? 1 : 0) !== 1)
        throw new HttpsError("invalid-argument", "deprecate requires replacement choice");
      const repo = new ModeTemplateLifecycleTransitionRepository(
        createFirestoreModeTemplateLifecycleStore(admin.firestore()),
        { actorId: reviewer.uid },
      );
      const lifecycle = await repo.deprecate(
        input.templateRef,
        input.expectedLifecycleRevision,
        input.reason,
        input.replacementRef,
        input.idempotencyKey,
      );
      return { ok: true, lifecycle };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);

export const adminArchiveV2ModeTemplate = onCall(
  callableOptions,
  async (request) => {
    try {
      const reviewer = requireContentReviewer(
        request.auth as
          | { uid?: string; token?: Record<string, unknown> }
          | undefined,
      );
      const input = parseV2ModeTemplateLifecycleRequest(request.data);
      if (input.receiptIds || input.replacementRef || input.noReplacement)
        throw new HttpsError("invalid-argument", "archive does not accept receipt or replacement fields");
      const repo = new ModeTemplateLifecycleTransitionRepository(
        createFirestoreModeTemplateLifecycleStore(admin.firestore()),
        { actorId: reviewer.uid },
      );
      const lifecycle = await repo.archive(
        input.templateRef,
        input.expectedLifecycleRevision,
        input.reason,
        input.idempotencyKey,
      );
      return { ok: true, lifecycle };
    } catch (error) {
      throw asHttpsError(error);
    }
  },
);
