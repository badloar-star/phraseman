import { readFileSync } from "node:fs";
import path from "node:path";
import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { EpisodeValidationRepository, type EpisodeValidationReceipt, type EpisodeValidationStore } from "./episode_validation_repository";

const ref: ApprovedEpisodeRevision = { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" };
class Store implements EpisodeValidationStore {
  body: unknown = { invalid: true };
  operation?: { requestFingerprint: string; receipt: EpisodeValidationReceipt };
  async runTransaction<T>(work: (tx: EpisodeValidationStore) => Promise<T>): Promise<T> { return work(this); }
  async readArtifact(): Promise<{ body: unknown }> { return { body: this.body }; }
  async writeReceipt(): Promise<void> { /* asserted through operation */ }
  async readOperation(): Promise<{ requestFingerprint: string; receipt: EpisodeValidationReceipt } | undefined> { return this.operation; }
  async createOperation(_id: string, value: { requestFingerprint: string; receipt: EpisodeValidationReceipt }): Promise<void> { this.operation = value; }
}

const validBody = (): unknown => {
  const episode = (JSON.parse(readFileSync(path.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"), "utf8")) as { episode: Record<string, unknown> }).episode;
  return { schemaVersion: "episode-authoring-body.v1", draftId: "draft-1", episodeId: episode.episodeId, revision: 1, seasonId: episode.seasonId, ordinal: episode.ordinal, chapterId: episode.chapterId, studyTarget: "en", learnerSourceLocale: "ru", title: episode.title, canDoOutcome: episode.canDoOutcome, scenario: episode.scenario, phraseFrames: episode.phraseFrames, semanticSlots: episode.semanticSlots, criticalConstraints: episode.criticalConstraints, contentUnits: {}, activityInstances: episode.activities, delayedProbeDefinitions: episode.delayedProbeDefinitions, graph: episode.graph, starSlots: episode.starSlots, requiredLoops: episode.requiredLoops, assessmentNodes: episode.assessmentNodes, capstoneContract: episode.capstoneContract, masteryContract: episode.masteryContract, learningDesign: episode.learningDesign, voiceGovernance: { requirementsByTemplate: [] }, reviewLinks: episode.reviewLinks, minAppVersion: "1.0.0", episodeKind: episode.episodeKind, estimatedMinutes: episode.estimatedMinutes, objectiveIds: episode.objectiveIds, skillIds: episode.skillIds, grammarDistinctionIds: episode.grammarDistinctionIds, soundFocusIds: episode.soundFocusIds, assetIds: episode.assetIds, accessibilityRoutes: episode.accessibilityRoutes };
};

describe("Episode validation receipt repository", () => {
  it("rejects invalid semantics without creating an operation", async () => {
    const store = new Store();
    await expect(new EpisodeValidationRepository(store, { actorId: "validator-1" }).validate(ref, "validate", "v-1")).rejects.toThrow("episode_validation_failed");
    expect(store.operation).toBeUndefined();
  });
  it("issues a passed receipt and replays the exact operation", async () => {
    const store = new Store(); store.body = validBody();
    const repo = new EpisodeValidationRepository(store, { actorId: "validator-1" });
    const receipt = await repo.validate(ref, "validate", "v-2");
    expect(receipt.status).toBe("passed");
    await expect(repo.validate(ref, "validate", "v-2")).resolves.toEqual(receipt);
  });
});

