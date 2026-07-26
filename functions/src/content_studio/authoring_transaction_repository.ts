import {
  validateEpisodeDraft,
  type EpisodeDraft,
} from "../../../modules/learning-v2/authoring/episode_draft";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

export interface AuthoringTransactionStore {
  runTransaction<T>(
    work: (tx: AuthoringTransactionStore) => Promise<T>,
  ): Promise<T>;
  read(
    id: string,
  ): Promise<
    { readonly ownerId: string; readonly draft: EpisodeDraft } | undefined
  >;
  compareAndSet(
    id: string,
    expectedRevision: number,
    expectedFingerprint: string,
    value: { readonly ownerId: string; readonly draft: EpisodeDraft },
  ): Promise<void>;
  createIfAbsent?(
    id: string,
    value: { readonly ownerId: string; readonly draft: EpisodeDraft },
  ): Promise<void>;
}

export class FirestoreEpisodeDraftRepository {
  constructor(
    private readonly store: AuthoringTransactionStore,
    private readonly actor: { readonly ownerId: string },
  ) {}

  async save(
    id: string,
    candidate: EpisodeDraft,
    expected: {
      readonly expectedRevision: number;
      readonly expectedFingerprint: string;
    },
  ): Promise<EpisodeDraft> {
    return this.store.runTransaction(async (tx) => {
      const current = await tx.read(id);
      if (!current) {
        if (
          expected.expectedRevision !== 0 ||
          expected.expectedFingerprint !== ""
        )
          throw new Error("authoring_head_missing");
        if (candidate.body.draftId !== id)
          throw new Error("authoring_draft_id_mismatch");
        const issues = validateEpisodeDraft(candidate);
        if (issues.length)
          throw new Error(`episode_authoring_invalid:${issues[0]}`);
        const contentHash = hashCanonicalBody(candidate.body);
        const next: EpisodeDraft = {
          body: candidate.body,
          record: {
            schemaVersion: "episode-draft-record.v1",
            draftId: candidate.body.draftId,
            episodeId: candidate.body.episodeId,
            revision: 1,
            contentHash,
            fingerprint: hashCanonicalBody({
              draftId: candidate.body.draftId,
              revision: 1,
              contentHash,
            }),
            status: "draft",
          },
        };
        if (!tx.createIfAbsent)
          throw new Error("authoring_create_not_supported");
        await tx.createIfAbsent(id, {
          ownerId: this.actor.ownerId,
          draft: next,
        });
        return next;
      }
      if (current.ownerId !== this.actor.ownerId)
        throw new Error("authoring_owner_forbidden");
      if (candidate.body.draftId !== id)
        throw new Error("authoring_draft_id_mismatch");
      if (
        candidate.body.episodeId !== current.draft.body.episodeId ||
        candidate.body.seasonId !== current.draft.body.seasonId ||
        candidate.body.ordinal !== current.draft.body.ordinal ||
        candidate.body.chapterId !== current.draft.body.chapterId
      )
        throw new Error("authoring_identity_mismatch");
      if (
        current.draft.record.revision !== expected.expectedRevision ||
        current.draft.record.fingerprint !== expected.expectedFingerprint
      )
        throw new Error("authoring_revision_stale");
      const issues = validateEpisodeDraft(candidate);
      if (issues.length)
        throw new Error(`episode_authoring_invalid:${issues[0]}`);
      const contentHash = hashCanonicalBody(candidate.body);
      const revision = current.draft.record.revision + 1;
      const next: EpisodeDraft = {
        body: candidate.body,
        record: {
          schemaVersion: "episode-draft-record.v1",
          draftId: candidate.body.draftId,
          episodeId: candidate.body.episodeId,
          revision,
          contentHash,
          fingerprint: hashCanonicalBody({
            draftId: candidate.body.draftId,
            revision,
            contentHash,
          }),
          status: "draft",
        },
      };
      await tx.compareAndSet(
        id,
        expected.expectedRevision,
        expected.expectedFingerprint,
        { ownerId: current.ownerId, draft: next },
      );
      return next;
    });
  }
}
