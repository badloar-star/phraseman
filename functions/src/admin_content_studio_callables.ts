import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ENFORCE_APP_CHECK } from "./callable_options";
import {
  parseV2AuthoringRequest,
  requireContentDraftWriter,
} from "./admin_content_studio_authoring";
import { FirestoreEpisodeDraftRepository } from "./content_studio/authoring_transaction_repository";
import { FirestoreSeasonDraftRepository } from "./content_studio/season_authoring_transaction_repository";
import {
  createFirestoreDecisionRegistryResolver,
  createFirestoreEpisodeDraftStore,
  createFirestoreEpisodeRevisionResolver,
  createFirestoreSeasonDraftStore,
} from "./content_studio/firestore_authoring_store";
import type { EpisodeDraft } from "../../modules/learning-v2/authoring/episode_draft";
import type { SeasonDraft } from "../../modules/learning-v2/authoring/season_draft";

const callableOptions = {
  region: "us-central1",
  enforceAppCheck: true,
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
        createFirestoreEpisodeRevisionResolver(db),
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
