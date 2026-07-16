import * as admin from "firebase-admin";
import type { EpisodeDraft } from "../../../modules/learning-v2/authoring/episode_draft";
import type { SeasonDraft } from "../../../modules/learning-v2/authoring/season_draft";
import type { AuthoringTransactionStore } from "./authoring_transaction_repository";
import type { SeasonAuthoringTransactionStore } from "./season_authoring_transaction_repository";
import type {
  ImmutableEpisodeRevisionArtifact,
  ImmutableEpisodeRevisionResolver,
} from "./episode_revision_resolver";
import type { DecisionRegistryResolver } from "./season_authoring_transaction_repository";
import { validateV2EpisodeContract } from "../../../modules/learning-v2/contracts/validation";

export const episodeDraftDocumentPath = (draftId: string): string =>
  `content_episode_drafts/${draftId}`;
export const seasonDraftDocumentPath = (draftId: string): string =>
  `content_season_drafts/${draftId}`;
export const episodeRevisionDocumentPath = (
  episodeId: string,
  revision: number,
): string => `content_episode_revisions/${episodeId}__r${revision}`;
export const decisionRegistryDocumentPath = (
  id: string,
  version: number,
): string => `content_decision_registries/${id}__v${version}`;

export function createFirestoreEpisodeDraftStore(
  db: admin.firestore.Firestore,
): AuthoringTransactionStore {
  return {
    runTransaction: (work) =>
      db.runTransaction(async (transaction) =>
        work(createEpisodeTransactionStore(db, transaction)),
      ),
    read: async (id) => {
      const snap = await db.doc(episodeDraftDocumentPath(id)).get();
      return snap.exists
        ? (snap.data() as { ownerId: string; draft: EpisodeDraft })
        : undefined;
    },
    compareAndSet: async () => {
      throw new Error("authoring_transaction_required");
    },
  };
}

function createEpisodeTransactionStore(
  db: admin.firestore.Firestore,
  transaction: admin.firestore.Transaction,
): AuthoringTransactionStore {
  return {
    runTransaction: async (work) =>
      work(createEpisodeTransactionStore(db, transaction)),
    read: async (id) => {
      const snap = await transaction.get(db.doc(episodeDraftDocumentPath(id)));
      return snap.exists
        ? (snap.data() as { ownerId: string; draft: EpisodeDraft })
        : undefined;
    },
    compareAndSet: async (id, expectedRevision, expectedFingerprint, value) => {
      const ref = db.doc(episodeDraftDocumentPath(id));
      const snap = await transaction.get(ref);
      const current = snap.data() as { draft?: EpisodeDraft } | undefined;
      if (
        !current?.draft ||
        current.draft.record.revision !== expectedRevision ||
        current.draft.record.fingerprint !== expectedFingerprint
      )
        throw new Error("authoring_revision_stale");
      transaction.set(ref, {
        ...value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

export function createFirestoreSeasonDraftStore(
  db: admin.firestore.Firestore,
): SeasonAuthoringTransactionStore {
  return {
    runTransaction: (work) =>
      db.runTransaction(async (transaction) =>
        work(createSeasonTransactionStore(db, transaction)),
      ),
    read: async (id) => {
      const snap = await db.doc(seasonDraftDocumentPath(id)).get();
      return snap.exists
        ? (snap.data() as { ownerId: string; draft: SeasonDraft })
        : undefined;
    },
    compareAndSet: async () => {
      throw new Error("authoring_transaction_required");
    },
  };
}

function createSeasonTransactionStore(
  db: admin.firestore.Firestore,
  transaction: admin.firestore.Transaction,
): SeasonAuthoringTransactionStore {
  return {
    runTransaction: async (work) =>
      work(createSeasonTransactionStore(db, transaction)),
    read: async (id) => {
      const snap = await transaction.get(db.doc(seasonDraftDocumentPath(id)));
      return snap.exists
        ? (snap.data() as { ownerId: string; draft: SeasonDraft })
        : undefined;
    },
    compareAndSet: async (id, expectedRevision, expectedFingerprint, value) => {
      const ref = db.doc(seasonDraftDocumentPath(id));
      const snap = await transaction.get(ref);
      const current = snap.data() as { draft?: SeasonDraft } | undefined;
      if (
        !current?.draft ||
        current.draft.record.revision !== expectedRevision ||
        current.draft.record.fingerprint !== expectedFingerprint
      )
        throw new Error("authoring_revision_stale");
      transaction.set(ref, {
        ...value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

export function createFirestoreEpisodeRevisionResolver(
  db: admin.firestore.Firestore,
): ImmutableEpisodeRevisionResolver {
  return {
    validateBody: (body) => validateV2EpisodeContract(body).ok,
    resolve: async (ref) => {
      const snap = await db
        .doc(episodeRevisionDocumentPath(ref.episodeId, ref.revision))
        .get();
      return snap.exists
        ? (snap.data() as ImmutableEpisodeRevisionArtifact)
        : undefined;
    },
  };
}

export function createFirestoreDecisionRegistryResolver(
  db: admin.firestore.Firestore,
): DecisionRegistryResolver {
  return {
    resolve: async (ref) => {
      const snap = await db
        .doc(decisionRegistryDocumentPath(ref.id, ref.version))
        .get();
      return snap.exists ? (snap.data() as never) : undefined;
    },
  };
}
