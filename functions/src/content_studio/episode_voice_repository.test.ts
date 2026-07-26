import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { EpisodeVoiceGovernanceRepository, type EpisodeVoiceReceipt, type EpisodeVoiceStore } from "./episode_voice_repository";

const ref: ApprovedEpisodeRevision = { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" };
class Store implements EpisodeVoiceStore {
  body: unknown = { voiceGovernance: { requirementsByTemplate: [{ requirements: { processingMode: "network_allowed" } }] } };
  operation?: { requestFingerprint: string; receipt: EpisodeVoiceReceipt };
  async runTransaction<T>(work: (tx: EpisodeVoiceStore) => Promise<T>): Promise<T> { return work(this); }
  async readArtifact(): Promise<{ body: unknown }> { return { body: this.body }; }
  async writeReceipt(): Promise<void> { /* operation captures the receipt */ }
  async readOperation(): Promise<{ requestFingerprint: string; receipt: EpisodeVoiceReceipt } | undefined> { return this.operation; }
  async createOperation(_id: string, value: { requestFingerprint: string; receipt: EpisodeVoiceReceipt }): Promise<void> { this.operation = value; }
}

describe("Episode voice governance receipt repository", () => {
  it("fails closed for an incomplete network requirement", async () => {
    const store = new Store();
    await expect(new EpisodeVoiceGovernanceRepository(store, { actorId: "voice-reviewer-1" }).approve(ref, "voice", "voice-1")).rejects.toThrow("episode_voice_governance_invalid");
    expect(store.operation).toBeUndefined();
  });
});

