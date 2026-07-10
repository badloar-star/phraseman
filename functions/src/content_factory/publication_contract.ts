import type { ActivationStatus, PackManifest, ReviewStatus } from './contracts';

export type SourceEvidenceKind = 'official_curriculum' | 'reference_grammar' | 'lexical_authority' | 'human_review';

export interface SourceEvidence {
  readonly evidenceId: string;
  readonly kind: SourceEvidenceKind;
  readonly authority: string;
  readonly url: string;
  readonly retrievedAt: string;
  readonly claim: string;
}

export interface PackRevision {
  readonly packId: string;
  readonly revision: number;
  readonly manifest: PackManifest;
  readonly sourceEvidence: readonly SourceEvidence[];
  readonly qaResultId: string;
  readonly reviewStatus: ReviewStatus;
  readonly activationStatus: ActivationStatus;
}

export interface ActivePackPointer {
  readonly studyTarget: string;
  readonly packId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly activatedAt: string;
  readonly activatedBy: string;
}

export type PublicationAction = 'submit_review' | 'approve' | 'reject' | 'activate' | 'rollback';

const transitions: Readonly<Record<PublicationAction, Readonly<{ from: readonly ReviewStatus[]; to: ReviewStatus; activation: ActivationStatus }>>> = {
  submit_review: { from: ['rejected'], to: 'needs_review', activation: 'draft' },
  approve: { from: ['needs_review'], to: 'approved', activation: 'staged' },
  reject: { from: ['needs_review'], to: 'rejected', activation: 'draft' },
  activate: { from: ['approved'], to: 'approved', activation: 'published' },
  rollback: { from: ['approved'], to: 'approved', activation: 'rolled_back' },
};

export function applyPublicationAction(input: {
  action: PublicationAction;
  reviewStatus: ReviewStatus;
  activationStatus: ActivationStatus;
  hasQa: boolean;
  hasEvidence: boolean;
}): { reviewStatus: ReviewStatus; activationStatus: ActivationStatus } {
  const transition = transitions[input.action];
  if (!transition.from.includes(input.reviewStatus)) {
    throw new Error('invalid_transition');
  }
  if ((input.action === 'submit_review' || input.action === 'activate') && (!input.hasQa || !input.hasEvidence)) {
    throw new Error('evidence_required');
  }
  return { reviewStatus: transition.to, activationStatus: transition.activation };
}

export function createActivePackPointer(input: {
  manifest: PackManifest;
  revision: number;
  activatedBy: string;
  activatedAt: string;
}): ActivePackPointer {
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
    packId: input.manifest.packId,
    revision: input.revision,
    contentHash: input.manifest.contentHash,
    activatedAt: input.activatedAt,
    activatedBy: input.activatedBy,
  });
}
