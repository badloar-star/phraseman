import { applyPublicationAction, createActivePackPointer } from './publication_contract';

describe('content publication contract', () => {
  it('requires QA and source evidence before review/activation', () => {
    expect(() => applyPublicationAction({ action: 'submit_review', reviewStatus: 'rejected', activationStatus: 'draft', hasQa: false, hasEvidence: true })).toThrow('evidence_required');
    expect(applyPublicationAction({ action: 'approve', reviewStatus: 'needs_review', activationStatus: 'draft', hasQa: true, hasEvidence: true })).toEqual({ reviewStatus: 'approved', activationStatus: 'staged' });
  });

  it('prevents activation of an unapproved pack and creates an isolated pointer', () => {
    const manifest = { packId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'en', surface: 'lessons', schemaVersion: 1, contentVersion: 1, sourceBlueprintVersion: 'en-v1', contentHash: 'hash', createdAt: '2026-07-10T00:00:00.000Z', createdBy: 'u1', reviewStatus: 'approved', activationStatus: 'published' } as const;
    expect(createActivePackPointer({ manifest, revision: 2, activatedBy: 'u1', activatedAt: manifest.createdAt })).toMatchObject({ studyTarget: 'fr', packId: 'fr-a1', revision: 2 });
    expect(() => createActivePackPointer({ ...{ manifest: { ...manifest, reviewStatus: 'needs_review' as const }, revision: 2, activatedBy: 'u1', activatedAt: manifest.createdAt } })).toThrow('pack_must_be_approved_and_active');
  });
});
