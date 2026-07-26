import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EpisodeReviewRepository, type EpisodeReviewReceipt, type EpisodeReviewStore } from "./episode_review_repository";

const ref: ApprovedEpisodeRevision = {
  draftId: "draft-1", episodeId: "episode-1", revision: 1,
  revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1,
  chapterId: "chapter-1", approvalStatus: "approved",
};

class Store implements EpisodeReviewStore {
  body: unknown = { not: "semantic" };
  receipt?: EpisodeReviewReceipt;
  operation?: { requestFingerprint: string; receipt: EpisodeReviewReceipt };
  async runTransaction<T>(work: (tx: EpisodeReviewStore) => Promise<T>): Promise<T> { return work(this); }
  async readArtifact(): Promise<{ body: unknown }> { return { body: this.body }; }
  async readReceipt(): Promise<EpisodeReviewReceipt | undefined> { return this.receipt; }
  async writeReceipt(_id: string, receipt: EpisodeReviewReceipt): Promise<void> { this.receipt = receipt; }
  async readOperation(): Promise<{ requestFingerprint: string; receipt: EpisodeReviewReceipt } | undefined> { return this.operation; }
  async createOperation(_id: string, value: { requestFingerprint: string; receipt: EpisodeReviewReceipt }): Promise<void> { this.operation = value; }
}

const validBody = (): unknown => {
  const episode = (JSON.parse(readFileSync(path.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"), "utf8")) as { episode: Record<string, unknown> }).episode;
  return {
    schemaVersion: "episode-authoring-body.v1", draftId: "draft-1", episodeId: episode.episodeId,
    revision: 1, seasonId: episode.seasonId, ordinal: episode.ordinal, chapterId: episode.chapterId,
    studyTarget: "en", learnerSourceLocale: "ru", title: episode.title, canDoOutcome: episode.canDoOutcome,
    scenario: episode.scenario, phraseFrames: episode.phraseFrames, semanticSlots: episode.semanticSlots,
    criticalConstraints: episode.criticalConstraints, contentUnits: {}, activityInstances: episode.activities,
    delayedProbeDefinitions: episode.delayedProbeDefinitions, graph: episode.graph, starSlots: episode.starSlots,
    requiredLoops: episode.requiredLoops, assessmentNodes: episode.assessmentNodes, capstoneContract: episode.capstoneContract,
    masteryContract: episode.masteryContract, learningDesign: episode.learningDesign,
    voiceGovernance: { requirementsByTemplate: [] }, reviewLinks: episode.reviewLinks, minAppVersion: "1.0.0",
    episodeKind: episode.episodeKind, estimatedMinutes: episode.estimatedMinutes, objectiveIds: episode.objectiveIds,
    skillIds: episode.skillIds, grammarDistinctionIds: episode.grammarDistinctionIds, soundFocusIds: episode.soundFocusIds,
    assetIds: episode.assetIds, accessibilityRoutes: episode.accessibilityRoutes,
  };
};

describe("Episode review receipt repository", () => {
  it("fails closed before writing a receipt for non-semantic content", async () => {
    const store = new Store();
    const repo = new EpisodeReviewRepository(store, { actorId: "reviewer-1" });
    await expect(repo.review(ref, "approved", "review", "op-1")).rejects.toThrow("episode_review_semantics_invalid");
    expect(store.receipt).toBeUndefined();
  });

  it("writes an exact subject receipt and replays idempotently", async () => {
    const store = new Store();
    store.body = validBody();
    const repo = new EpisodeReviewRepository(store, { actorId: "reviewer-1" });
    const receipt = await repo.review(ref, "approved", "review", "op-2");
    expect(receipt.subject).toEqual({ entityType: "episode", entityId: "episode-1", entityRevision: 1, entityFingerprint: "b".repeat(64) });
    await expect(repo.review(ref, "approved", "review", "op-2")).resolves.toEqual(receipt);
  });
});
