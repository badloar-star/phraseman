"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const publication_contract_1 = require("./publication_contract");
describe('content publication contract', () => {
    it('requires QA and source evidence before review/activation', () => {
        expect(() => (0, publication_contract_1.applyPublicationAction)({ action: 'submit_review', reviewStatus: 'rejected', activationStatus: 'draft', hasQa: false, hasEvidence: true })).toThrow('evidence_required');
        const receipts = { qaResultId: 'qa-1', evidenceCount: 2, reviewerId: 'reviewer-1', blueprintHash: 'blueprint-hash', contentHash: 'content-hash' };
        expect((0, publication_contract_1.applyPublicationAction)({ action: 'approve', reviewStatus: 'needs_review', activationStatus: 'draft', hasQa: true, hasEvidence: true, receipts })).toEqual({ reviewStatus: 'approved', activationStatus: 'staged' });
        expect(() => (0, publication_contract_1.applyPublicationAction)({ action: 'approve', reviewStatus: 'needs_review', activationStatus: 'draft', hasQa: true, hasEvidence: true })).toThrow('evidence_required');
        expect(() => (0, publication_contract_1.applyPublicationAction)({ action: 'activate', reviewStatus: 'approved', activationStatus: 'draft', hasQa: true, hasEvidence: true, receipts })).toThrow('pack_must_be_staged');
    });
    it('prevents activation of an unapproved pack and creates an isolated pointer', () => {
        const manifest = { packId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'en', surface: 'lessons', schemaVersion: 1, contentVersion: 1, sourceBlueprintVersion: 'en-v1', contentHash: 'hash', createdAt: '2026-07-10T00:00:00.000Z', createdBy: 'u1', reviewStatus: 'approved', activationStatus: 'published' };
        expect((0, publication_contract_1.createActivePackPointer)({ manifest, revision: 2, activatedBy: 'u1', activatedAt: manifest.createdAt })).toMatchObject({ studyTarget: 'fr', packId: 'fr-a1', revision: 2 });
        expect(() => (0, publication_contract_1.createActivePackPointer)({ ...{ manifest: { ...manifest, reviewStatus: 'needs_review' }, revision: 2, activatedBy: 'u1', activatedAt: manifest.createdAt } })).toThrow('pack_must_be_approved_and_active');
    });
});
//# sourceMappingURL=publication_contract.test.js.map