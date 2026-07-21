"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEpisodeDraftRepository = void 0;
const episode_draft_1 = require("../../../modules/learning-v2/authoring/episode_draft");
class InMemoryEpisodeDraftRepository {
    constructor() {
        this.drafts = new Map();
    }
    create(input) {
        if (this.drafts.has(input.draftId))
            throw new Error("authoring_draft_id_duplicate");
        const draft = (0, episode_draft_1.createEpisodeDraft)(input);
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
        const issues = (0, episode_draft_1.validateEpisodeDraft)(current);
        if (issues.length)
            throw new Error(`episode_authoring_invalid:${issues[0]}`);
        const next = (0, episode_draft_1.mutateEpisodeDraft)(stored, input.expectedRevision, input.expectedFingerprint, () => current.body);
        this.drafts.set(next.body.draftId, next);
        return next;
    }
}
exports.InMemoryEpisodeDraftRepository = InMemoryEpisodeDraftRepository;
//# sourceMappingURL=episode_draft_repository.js.map