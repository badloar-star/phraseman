"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const season_pin_index_repository_1 = require("./season_pin_index_repository");
const ref = { draftId: "d", episodeId: "e1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "c1", approvalStatus: "approved" };
describe("server-owned Season pin index projection", () => {
    it("projects approved Season refs to exact Episode-keyed entries", () => {
        expect((0, season_pin_index_repository_1.buildApprovedSeasonPinIndexEntries)({ seasonRevisionId: "season-1__r1", seasonRevisionFingerprint: "c".repeat(64), status: "approved", episodeRevisionRefs: [ref] })).toEqual([expect.objectContaining({ seasonRevisionId: "season-1__r1", episodeId: "e1", revision: 1, contentHash: ref.contentHash, status: "approved" })]);
    });
    it("does not project non-approved Season revisions", () => {
        expect((0, season_pin_index_repository_1.buildApprovedSeasonPinIndexEntries)({ seasonRevisionId: "season-1__r1", seasonRevisionFingerprint: "c".repeat(64), status: "changes_requested", episodeRevisionRefs: [ref] })).toEqual([]);
    });
    it("validates exact index identity and replaces stale paths transactionally", () => {
        const entries = (0, season_pin_index_repository_1.buildApprovedSeasonPinIndexEntries)({ seasonRevisionId: "season-1__r1", seasonRevisionFingerprint: "c".repeat(64), status: "approved", episodeRevisionRefs: [ref] });
        expect((0, season_pin_index_repository_1.validateSeasonPinIndexEntry)(entries[0], ref)).toBe(true);
        expect((0, season_pin_index_repository_1.validateSeasonPinIndexEntry)({ ...entries[0], episodeId: "other" }, ref)).toBe(false);
        const operations = [];
        (0, season_pin_index_repository_1.applySeasonPinIndexProjection)({ transaction: { set: (path) => operations.push(`set:${path}`), delete: (path) => operations.push(`delete:${path}`) }, previousDocumentPaths: ["old-index"], nextEntries: entries });
        expect(operations).toEqual(["delete:old-index", `set:${entries[0].documentPath}`]);
    });
    it("rejects missing Season identity", () => {
        expect(() => (0, season_pin_index_repository_1.buildApprovedSeasonPinIndexEntries)({ seasonRevisionId: "", seasonRevisionFingerprint: "c".repeat(64), status: "approved", episodeRevisionRefs: [ref] })).toThrow("season_pin_index_identity_invalid");
    });
    it("rejects a non-canonical Season fingerprint", () => {
        expect(() => (0, season_pin_index_repository_1.buildApprovedSeasonPinIndexEntries)({ seasonRevisionId: "season-1", seasonRevisionFingerprint: "not-a-hash", status: "approved", episodeRevisionRefs: [ref] })).toThrow("season_pin_index_identity_invalid");
    });
});
//# sourceMappingURL=season_pin_index_repository.test.js.map