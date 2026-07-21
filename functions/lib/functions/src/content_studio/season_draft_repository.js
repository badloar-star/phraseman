"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySeasonDraftRepository = void 0;
const season_draft_1 = require("../../../modules/learning-v2/authoring/season_draft");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
class InMemorySeasonDraftRepository {
    constructor() {
        this.drafts = new Map();
    }
    create(input) {
        if (this.drafts.has(input.draftId))
            throw new Error("authoring_draft_id_duplicate");
        const draft = (0, season_draft_1.createSeasonDraft)(input);
        this.drafts.set(input.draftId, draft);
        return draft;
    }
    get(draftId) {
        return this.drafts.get(draftId);
    }
    save(current, input) {
        const stored = this.drafts.get(current.body.draftId);
        if (!stored ||
            stored.record.revision !== input.expectedRevision ||
            stored.record.fingerprint !== input.expectedFingerprint)
            throw new Error("authoring_revision_stale");
        if (stored.record.status !== "draft")
            throw new Error("authoring_published_immutable");
        const next = {
            body: current.body,
            record: {
                ...current.record,
                revision: stored.record.revision + 1,
                contentHash: (0, decision_registry_1.hashCanonicalBody)(current.body),
                fingerprint: (0, decision_registry_1.hashCanonicalBody)({
                    draftId: current.body.draftId,
                    revision: stored.record.revision + 1,
                    contentHash: (0, decision_registry_1.hashCanonicalBody)(current.body),
                }),
            },
        };
        this.drafts.set(next.body.draftId, next);
        return next;
    }
}
exports.InMemorySeasonDraftRepository = InMemorySeasonDraftRepository;
//# sourceMappingURL=season_draft_repository.js.map