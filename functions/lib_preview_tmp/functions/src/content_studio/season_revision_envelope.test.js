"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const season_revision_1 = require("../../../modules/learning-v2/authoring/season_revision");
const body = { schemaVersion: "season-authoring-body.v1", seasonId: "season-1", draftId: "draft-1", releaseScope: { kind: "vertical_slice", includedChapterOrdinals: [1], includedEpisodeOrdinals: [1] }, episodeRevisionRefs: [{ draftId: "episode-draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-01", approvalStatus: "approved" }], chapters: [], gates: [], gatePolicyVersion: "v2-gates-1", decisionRegistryRef: { id: "registry", version: 1, contentHash: "c".repeat(64) } };
const envelope = () => {
    const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
    const revision = 1;
    const fingerprint = (0, season_revision_1.seasonRevisionFingerprint)("draft-1", revision, contentHash);
    return {
        body,
        record: {
            schemaVersion: "season-authoring-record.v1", draftId: "draft-1", seasonId: "season-1", revision,
            contentHash, revisionFingerprint: fingerprint,
            object: { objectPath: (0, season_revision_1.seasonRevisionObjectPath)("draft-1", 1, contentHash), contentHash, objectGeneration: "7", byteSize: 128 },
            provenance: { createdBy: "author-1", createdAt: "2026-07-17T00:00:00.000Z" }, createdAt: "2026-07-17T00:00:00.000Z",
        },
        lifecycle: {
            schemaVersion: "season-lifecycle.v1", draftId: "draft-1", seasonId: "season-1", revision, revisionFingerprint: fingerprint,
            status: "approved", changedBy: "reviewer-1", changedAt: "2026-07-17T00:00:00.000Z", lifecycleRevision: 1,
        },
    };
};
describe("SeasonRevision immutable envelope", () => {
    it("accepts a hash/object/lifecycle-bound envelope", () => expect((0, season_revision_1.validateSeasonRevisionEnvelope)(envelope())).toBe(true));
    it.each([
        ["body", (value) => ({ ...value, body: { ...value.body, seasonId: "tampered" } })],
        ["object hash", (value) => ({ ...value, record: { ...value.record, object: { ...value.record.object, contentHash: "f".repeat(64) } } })],
        ["lifecycle identity", (value) => ({ ...value, lifecycle: { ...value.lifecycle, seasonId: "other" } })],
        ["extra key", (value) => ({ ...value, record: { ...value.record, extra: true } })],
    ])("rejects %s tampering", (_label, mutate) => expect((0, season_revision_1.validateSeasonRevisionEnvelope)(mutate(envelope()))).toBe(false));
});
//# sourceMappingURL=season_revision_envelope.test.js.map