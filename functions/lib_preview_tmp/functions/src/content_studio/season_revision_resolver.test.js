"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const season_revision_1 = require("../../../modules/learning-v2/authoring/season_revision");
const season_revision_resolver_1 = require("./season_revision_resolver");
const makeDocs = () => {
    const body = { schemaVersion: "season-authoring-body.v1", seasonId: "s1", draftId: "d1", releaseScope: { kind: "vertical_slice", includedChapterOrdinals: [1], includedEpisodeOrdinals: [1] }, episodeRevisionRefs: [{ draftId: "episode-draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-01", approvalStatus: "approved" }], chapters: [], gates: [], gatePolicyVersion: "v2-gates-1", decisionRegistryRef: { id: "registry", version: 1, contentHash: "c".repeat(64) } };
    const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
    const record = { schemaVersion: "season-authoring-record.v1", draftId: "d1", seasonId: "s1", revision: 1, contentHash, revisionFingerprint: (0, season_revision_1.seasonRevisionFingerprint)("d1", 1, contentHash), object: { objectPath: (0, season_revision_1.seasonRevisionObjectPath)("d1", 1, contentHash), contentHash, objectGeneration: "11", byteSize: 128 }, provenance: {}, createdAt: "2026-07-17T00:00:00.000Z" };
    const lifecycle = { schemaVersion: "season-lifecycle.v1", draftId: "d1", seasonId: "s1", revision: 1, revisionFingerprint: record.revisionFingerprint, status: "approved", changedBy: "reviewer", changedAt: "2026-07-17T00:00:00.000Z", lifecycleRevision: 1 };
    return { body, record, lifecycle };
};
describe("Storage-backed SeasonRevision resolver", () => {
    it("reads the pinned object and rejects a tampered object reader result", async () => {
        const docs = makeDocs();
        const documentReader = { read: async (path) => ({ exists: true, data: () => path.includes("lifecycle") ? docs.lifecycle : docs.record }) };
        const objectReader = { read: async () => ({ body: docs.body, contentHash: docs.record.contentHash, objectGeneration: "11", byteSize: 128 }) };
        await expect((0, season_revision_resolver_1.resolveImmutableSeasonRevision)({ revisionPath: "revision", lifecyclePath: "lifecycle", documentReader, objectReader })).resolves.toMatchObject({ body: docs.body, lifecycle: docs.lifecycle });
        await expect((0, season_revision_resolver_1.resolveImmutableSeasonRevision)({ revisionPath: "revision", lifecyclePath: "lifecycle", documentReader, objectReader: { read: async () => ({ body: { ...docs.body, seasonId: "tampered" }, contentHash: docs.record.contentHash, objectGeneration: "11", byteSize: 128 }) } })).rejects.toThrow("season_revision_object_invalid");
    });
    it.each(["missing-object", "hash-mismatch", "generation-mismatch", "byte-size-mismatch"])("propagates %s from the immutable reader", async (reason) => {
        const docs = makeDocs();
        const documentReader = { read: async (path) => ({ exists: true, data: () => path.includes("lifecycle") ? docs.lifecycle : docs.record }) };
        const objectReader = { read: async () => { throw new Error(`immutable_object_${reason}`); } };
        await expect((0, season_revision_resolver_1.resolveImmutableSeasonRevision)({ revisionPath: "revision", lifecyclePath: "lifecycle", documentReader, objectReader })).rejects.toThrow(`immutable_object_${reason}`);
    });
    it.each([
        ["contentHash", { contentHash: "f".repeat(64), objectGeneration: "11", byteSize: 128 }],
        ["generation", { contentHash: undefined, objectGeneration: "12", byteSize: 128 }],
        ["byteSize", { contentHash: undefined, objectGeneration: "11", byteSize: 129 }],
    ])("rejects returned %s metadata drift", async (_label, drift) => {
        const docs = makeDocs();
        const documentReader = { read: async (path) => ({ exists: true, data: () => path.includes("lifecycle") ? docs.lifecycle : docs.record }) };
        const objectReader = { read: async () => ({ body: docs.body, contentHash: drift.contentHash ?? docs.record.contentHash, objectGeneration: drift.objectGeneration, byteSize: drift.byteSize }) };
        await expect((0, season_revision_resolver_1.resolveImmutableSeasonRevision)({ revisionPath: "revision", lifecyclePath: "lifecycle", documentReader, objectReader })).rejects.toThrow("season_revision_object_metadata_invalid");
    });
});
//# sourceMappingURL=season_revision_resolver.test.js.map