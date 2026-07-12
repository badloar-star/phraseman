import { createHash } from 'node:crypto';
import { validateLessonArtifact, type LessonArtifact } from './contracts';
import type { SourceEvidence } from './publication_contract';

export interface QaReceipt {
  readonly qaResultId: string;
  readonly artifactHash: string;
  readonly blueprintHash: string;
  readonly sourceEvidenceIds: readonly string[];
  readonly reviewerId: string | null;
  readonly status: 'passed' | 'failed';
  readonly errors: readonly string[];
  readonly createdAt: string;
}

function canonicalArtifact(artifact: LessonArtifact): string {
  return JSON.stringify({ lessonId: artifact.lessonId, phrases: artifact.phrases, vocabulary: artifact.vocabulary, drills: artifact.drills });
}

export function runLessonQa(input: {
  artifact: LessonArtifact;
  blueprintHash: string;
  sourceEvidence: readonly SourceEvidence[];
  now?: string;
}): QaReceipt {
  const errors = [...validateLessonArtifact(input.artifact).errors];
  if (!input.blueprintHash.trim()) errors.push('blueprint_hash_required');
  if (input.sourceEvidence.length === 0) errors.push('source_evidence_required');
  input.sourceEvidence.forEach((evidence) => {
    if (!evidence.evidenceId.trim() || !evidence.authority.trim() || !/^https:\/\//.test(evidence.url) || !evidence.claim.trim()) errors.push('source_evidence_invalid');
  });
  const artifactHash = createHash('sha256').update(canonicalArtifact(input.artifact)).digest('hex');
  const uniqueErrors = [...new Set(errors)];
  const qaResultId = `qa_${input.artifact.lessonId}_${artifactHash.slice(0, 16)}`;
  return Object.freeze({
    qaResultId,
    artifactHash,
    blueprintHash: input.blueprintHash,
    sourceEvidenceIds: Object.freeze(input.sourceEvidence.map((evidence) => evidence.evidenceId)),
    reviewerId: null,
    status: uniqueErrors.length === 0 ? 'passed' : 'failed',
    errors: Object.freeze(uniqueErrors),
    createdAt: input.now ?? new Date().toISOString(),
  });
}
