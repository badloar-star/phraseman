"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const season_draft_1 = require("../../../modules/learning-v2/authoring/season_draft");
const ref = {
    draftId: "episode-draft-1",
    episodeId: "episode-1",
    revision: 1,
    revisionFingerprint: "a".repeat(64),
    contentHash: "b".repeat(64),
    ordinal: 1,
    chapterId: "chapter-01",
    approvalStatus: "approved",
};
function validPin() {
    const draft = (0, season_draft_1.createSeasonDraft)({
        draftId: "season-draft-1",
        seasonId: "season-1",
        scope: "vertical_slice",
        decisionRegistryRef: {
            id: "phraseman-v2-product-decisions",
            version: 1,
            contentHash: "c".repeat(64),
        },
    });
    const pinned = (0, season_draft_1.pinApprovedEpisodeRevisions)(draft, [ref], {
        version: "v2-gates-1",
    });
    return {
        body: pinned.body,
        record: { ...pinned.record, status: "approved" },
    };
}
describe("strict immutable Season pin validator", () => {
    it("accepts a canonical approved body/record pair", () => {
        expect((0, season_draft_1.validateSeasonImmutablePin)(validPin())).toBe(true);
    });
    it.each([
        ["body hash", (pin) => ({ ...pin, record: { ...pin.record, contentHash: "d".repeat(64) } })],
        ["fingerprint", (pin) => ({ ...pin, record: { ...pin.record, fingerprint: "e".repeat(64) } })],
        ["status", (pin) => ({ ...pin, record: { ...pin.record, status: "draft" } })],
        ["record extra field", (pin) => ({ ...pin, record: { ...pin.record, unexpected: true } })],
        ["body extra field", (pin) => ({ ...pin, body: { ...pin.body, unexpected: true } })],
    ])("rejects a tampered %s", (_label, mutate) => {
        expect((0, season_draft_1.validateSeasonImmutablePin)(mutate(validPin()))).toBe(false);
    });
});
//# sourceMappingURL=season_immutable_pin.test.js.map