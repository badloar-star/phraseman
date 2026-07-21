import { createEpisodeDraft } from "../../../modules/learning-v2/authoring/episode_draft";
import {
  FirestoreEpisodeDraftRepository,
  type AuthoringTransactionStore,
} from "./authoring_transaction_repository";

class FakeStore implements AuthoringTransactionStore {
  readonly records = new Map<
    string,
    { ownerId: string; draft: ReturnType<typeof createEpisodeDraft> }
  >();
  async runTransaction<T>(
    work: (tx: AuthoringTransactionStore) => Promise<T>,
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
    value: { ownerId: string; draft: ReturnType<typeof createEpisodeDraft> },
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

describe("authoring transaction repository", () => {
  it("enforces owner and recomputes immutable body identity inside the transaction", async () => {
    const store = new FakeStore();
    const initial = createEpisodeDraft({
      draftId: "draft-1",
      episodeId: "ep-1",
      seasonId: "season-1",
      ordinal: 1,
      chapterId: "chapter-1",
    });
    store.records.set("draft-1", { ownerId: "owner-1", draft: initial });
    const repository = new FirestoreEpisodeDraftRepository(store, {
      ownerId: "owner-1",
    });
    await expect(
      repository.save("draft-1", initial, {
        expectedRevision: 1,
        expectedFingerprint: initial.record.fingerprint,
      }),
    ).rejects.toThrow("episode_authoring_invalid");
    await expect(
      new FirestoreEpisodeDraftRepository(store, { ownerId: "owner-2" }).save(
        "draft-1",
        initial,
        {
          expectedRevision: 1,
          expectedFingerprint: initial.record.fingerprint,
        },
      ),
    ).rejects.toThrow("authoring_owner_forbidden");
  });
});
