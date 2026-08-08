"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPublicationAction = applyPublicationAction;
exports.createActivePackPointer = createActivePackPointer;
const transitions = {
    submit_review: { from: ['rejected'], to: 'needs_review', activation: 'draft' },
    approve: { from: ['needs_review'], to: 'approved', activation: 'staged' },
    reject: { from: ['needs_review'], to: 'rejected', activation: 'draft' },
    activate: { from: ['approved'], to: 'approved', activation: 'published' },
    rollback: { from: ['approved'], to: 'approved', activation: 'rolled_back' },
};
function applyPublicationAction(input) {
    const transition = transitions[input.action];
    if (!transition.from.includes(input.reviewStatus)) {
        throw new Error('invalid_transition');
    }
    if (input.action === 'activate' && input.activationStatus !== 'staged') {
        throw new Error('pack_must_be_staged');
    }
    if (input.action === 'rollback' && input.activationStatus !== 'published') {
        throw new Error('pack_not_published');
    }
    const receipts = input.receipts;
    const receiptsComplete = Boolean(input.hasQa && input.hasEvidence && receipts?.qaResultId && receipts.evidenceCount && receipts.reviewerId && receipts.blueprintHash && receipts.contentHash);
    if (input.action === 'approve' || input.action === 'activate') {
        if (!receiptsComplete)
            throw new Error('evidence_required');
    }
    if (input.action === 'submit_review' && (!input.hasQa || !input.hasEvidence)) {
        throw new Error('evidence_required');
    }
    return { reviewStatus: transition.to, activationStatus: transition.activation };
}
function createActivePackPointer(input) {
    if (input.manifest.reviewStatus !== 'approved' || input.manifest.activationStatus !== 'published') {
        throw new Error('pack_must_be_approved_and_active');
    }
    if (!input.manifest.studyTarget.trim() || !input.manifest.packId.trim() || !input.manifest.contentHash.trim()) {
        throw new Error('validation_failed');
    }
    if (!Number.isInteger(input.revision) || input.revision < 1 || !input.activatedBy.trim() || !input.activatedAt.trim()) {
        throw new Error('validation_failed');
    }
    return Object.freeze({
        studyTarget: input.manifest.studyTarget,
        sourceLocale: input.manifest.sourceLocale,
        packId: input.manifest.packId,
        revision: input.revision,
        contentHash: input.manifest.contentHash,
        activatedAt: input.activatedAt,
        activatedBy: input.activatedBy,
    });
}
//# sourceMappingURL=publication_contract.js.map