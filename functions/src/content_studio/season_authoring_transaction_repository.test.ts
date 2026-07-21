import {
  createSeasonDraft,
  pinApprovedEpisodeRevisions,
  type ApprovedEpisodeRevision,
} from "../../../modules/learning-v2/authoring/season_draft";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  FirestoreSeasonDraftRepository,
  type SeasonAuthoringTransactionStore,
} from "./season_authoring_transaction_repository";

const episodeBody = {};
const ref: ApprovedEpisodeRevision = {
  draftId: "draft-1",
  episodeId: "ep-01",
  revision: 1,
  revisionFingerprint: "fingerprint-1",
  contentHash: hashCanonicalBody(episodeBody),
  ordinal: 1,
  chapterId: "chapter-1",
  approvalStatus: "approved",
};

class FakeSeasonStore implements SeasonAuthoringTransactionStore {
  readonly records = new Map<
    string,
    { ownerId: string; draft: ReturnType<typeof createSeasonDraft> }
  >();
  async runTransaction<T>(
    work: (tx: SeasonAuthoringTransactionStore) => Promise<T>,
  ): Promise<T> {
    return work(this);
  }
  async read(id: string) {
    return this.records.get(id);
  }
  async compareAndSet(
    id: string,
    expectedRevision: number,
    expectedFingerprint: string,
    value: { ownerId: string; draft: ReturnType<typeof createSeasonDraft> },
  ) {
    const current = this.records.get(id);
    if (
      !current ||
      current.draft.record.revision !== expectedRevision ||
      current.draft.record.fingerprint !== expectedFingerprint
    )
      throw new Error("authoring_revision_stale");
    this.records.set(id, value);
  }
}

describe("season authoring transaction repository", () => {
  it("rejects a missing immutable episode artifact before compare-and-set", async () => {
    const store = new FakeSeasonStore();
    const draft = createSeasonDraft({
      draftId: "season-draft-1",
      seasonId: "season-1",
      scope: "vertical_slice",
    });
    store.records.set("season-draft-1", { ownerId: "owner-1", draft });
    const candidate = pinApprovedEpisodeRevisions(draft, [ref], {
      version: "v2-gates-1",
    });
    const repository = new FirestoreSeasonDraftRepository(
      store,
      { ownerId: "owner-1" },
      { resolve: async () => undefined },
    );
    await expect(
      repository.save("season-draft-1", candidate, {
        expectedRevision: 1,
        expectedFingerprint: draft.record.fingerprint,
      }),
    ).rejects.toThrow("season_episode_revision_not_approved_or_stale");
  });

  it("accepts only an exact immutable artifact and recomputes the record", async () => {
    const store = new FakeSeasonStore();
    const draft = createSeasonDraft({
      draftId: "season-draft-2",
      seasonId: "season-2",
      scope: "vertical_slice",
    });
    store.records.set("season-draft-2", { ownerId: "owner-1", draft });
    const candidate = pinApprovedEpisodeRevisions(draft, [ref], {
      version: "v2-gates-1",
    });
    const repository = new FirestoreSeasonDraftRepository(
      store,
      { ownerId: "owner-1" },
      {
        resolve: async (requested) => ({
          ...requested,
          body: episodeBody,
          bodyHash: requested.contentHash,
          objectGeneration: "generation-1",
        }),
      },
    );
    const poisoned = {
      ...candidate,
      record: {
        ...candidate.record,
        contentHash: "tampered",
        fingerprint: "tampered",
      },
    };
    const saved = await repository.save("season-draft-2", poisoned, {
      expectedRevision: 1,
      expectedFingerprint: draft.record.fingerprint,
    });
    expect(saved.record.revision).toBe(2);
    expect(store.records.get("season-draft-2")?.draft.record.contentHash).toBe(
      candidate.record.contentHash,
    );
    expect(store.records.get("season-draft-2")?.draft.record.fingerprint).toBe(
      candidate.record.fingerprint,
    );
  });
});
