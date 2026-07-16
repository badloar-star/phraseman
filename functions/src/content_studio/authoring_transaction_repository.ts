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
      if (!current || current.ownerId !== this.actor.ownerId)
        throw new Error("authoring_owner_forbidden");
      if (candidate.body.draftId !== id)
        throw new Error("authoring_draft_id_mismatch");
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
          ...candidate.record,
          revision,
          contentHash,
          fingerprint: hashCanonicalBody({
            draftId: candidate.body.draftId,
            revision,
            contentHash,
          }),
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
