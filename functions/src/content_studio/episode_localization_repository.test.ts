import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { EpisodeLocalizationRepository } from "./episode_localization_repository";
import type { EpisodeValidationReceipt, EpisodeValidationStore } from "./episode_validation_repository";

const ref: ApprovedEpisodeRevision = { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" };
class Store implements EpisodeValidationStore {
  body: unknown = { invalid: true };
  operation?: { requestFingerprint: string; receipt: EpisodeValidationReceipt };
  async runTransaction<T>(work: (tx: EpisodeValidationStore) => Promise<T>): Promise<T> { return work(this); }
  async readArtifact(): Promise<{ body: unknown }> { return { body: this.body }; }
  async writeReceipt(): Promise<void> { /* operation captures the receipt */ }
  async readOperation(): Promise<{ requestFingerprint: string; receipt: EpisodeValidationReceipt } | undefined> { return this.operation; }
  async createOperation(_id: string, value: { requestFingerprint: string; receipt: EpisodeValidationReceipt }): Promise<void> { this.operation = value; }
}

describe("Episode localization receipt repository", () => {
  it("fails closed before issuing an approved localization receipt", async () => {
    const store = new Store();
    await expect(new EpisodeLocalizationRepository(store, { actorId: "localizer-1" }).approve(ref, "localize", "l-1")).rejects.toThrow("episode_localization_failed");
    expect(store.operation).toBeUndefined();
  });
});

