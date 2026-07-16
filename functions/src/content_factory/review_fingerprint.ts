import { createHash } from 'node:crypto';

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

export function reviewFingerprint(evidence: Readonly<Record<string, unknown>>): string {
  return createHash('sha256').update(`content-stage-review-v1\n${canonical(evidence)}`).digest('hex');
}

export function contentStageReviewFingerprint(stageId: string, stage: Readonly<Record<string, unknown>>): string {
  return reviewFingerprint({
    stageId, kind: stage.kind ?? null, revision: stage.revision ?? null, artifactId: stage.artifactId ?? null,
    objectPath: stage.objectPath ?? null, objectGeneration: stage.objectGeneration ?? null, contentHash: stage.contentHash ?? null,
    groundingReceipt: stage.groundingReceipt ?? null, qaReceipt: stage.qaReceipt ?? null,
    promptVersion: stage.promptVersion ?? null, schemaVersion: stage.schemaVersion ?? null,
    promptHash: stage.promptHash ?? null, schemaHash: stage.schemaHash ?? null, contextHash: stage.contextHash ?? null,
    baseRevisionIdentity: stage.baseRevisionIdentity ?? null,
    judgeReceipt: stage.judgeReceipt ?? null,
  });
}
