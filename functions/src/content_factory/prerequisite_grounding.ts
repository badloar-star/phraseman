import { createHash } from 'node:crypto';
import { extractLessonCandidates } from './lesson_extractors';
import { dedupeLessonCandidates, type LessonLedger } from './dedupe_ledger';
import type { GenerationStageKind } from './stage_contracts';
import { validateLessonStageArtifact } from './lesson_artifacts';

export interface GroundingFileLike { getMetadata(): Promise<unknown>; download(options?: Record<string, unknown>): Promise<[Buffer]> }
export interface GroundingBucketLike { file(path: string): GroundingFileLike }
export interface ApprovedStageArtifactMetadata {
  readonly stageId: string; readonly artifactId: string; readonly kind: string; readonly state: string; readonly studyTarget: string;
  readonly cefr: string; readonly promptVersion: string; readonly groundingReceipt?: unknown; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string;
}
export interface ApprovedOutlineArtifactMetadata extends ApprovedStageArtifactMetadata { readonly groundingReceipt: unknown }
export function lessonLedgerDocumentId(requestId: string, studyTarget: string): string {
  if (!requestId || !studyTarget) throw new Error('lesson_ledger_identity_invalid');
  return createHash('sha256').update(`${requestId}\u0000${studyTarget}`).digest('hex');
}
function record(value: unknown): Record<string, unknown> | undefined { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }

export async function loadApprovedLessonGrounding(bucket: GroundingBucketLike, stage: ApprovedStageArtifactMetadata, options: { readonly allowNeedsReviewForApproval?: boolean } = {}) {
  if (stage.state !== 'approved' && !(options.allowNeedsReviewForApproval === true && stage.state === 'needs_review')) throw new Error('grounding_prerequisite_not_approved');
  if (stage.kind !== 'lesson_phrases') throw new Error('grounding_prerequisite_kind_invalid');
  if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration) throw new Error('grounding_prerequisite_receipt_invalid');
  const file = bucket.file(stage.objectPath);
  const metadataResult = await file.getMetadata();
  const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
  if (String(metadata?.generation ?? '') !== stage.objectGeneration) throw new Error('grounding_generation_mismatch');
  const [bytes] = await file.download({ validation: false });
  if (createHash('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase()) throw new Error('grounding_content_hash_mismatch');
  let parsed: unknown;
  try { parsed = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('grounding_json_invalid'); }
  const artifact = record(parsed);
  if (artifact?.stage !== 'lesson_phrases' || !Array.isArray(artifact.items)) throw new Error('grounding_phrase_artifact_invalid');
  const storedGroundingReceipt = record(stage.groundingReceipt);
  const artifactErrors = validateLessonStageArtifact(artifact, { kind: 'lesson_phrases', count: 50, cefr: stage.cefr, strictV3: stage.promptVersion === 'v3', grounding: storedGroundingReceipt ? { outline: storedGroundingReceipt.outline } : undefined });
  if (artifactErrors.length) throw new Error(`grounding_phrase_artifact_invalid:${artifactErrors.join(',')}`);
  const phrases = artifact.items.map(record);
  if (phrases.some((item) => !item || typeof item.id !== 'string' || typeof item.sourceText !== 'string' || typeof item.targetText !== 'string')) throw new Error('grounding_phrase_artifact_invalid');
  const safePhrases = phrases as Array<Record<string, unknown> & { id: string; sourceText: string; targetText: string }>;
  const extraction = extractLessonCandidates({ studyTarget: stage.studyTarget, phrases: safePhrases.map((item) => ({ id: item.id, targetText: item.targetText })) });
  const groundingHash = createHash('sha256').update(JSON.stringify({ artifactId: stage.artifactId, contentHash: stage.contentHash, extraction })).digest('hex');
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, phrases: Object.freeze(safePhrases.map((item) => Object.freeze({ ...item }))), extraction, groundingHash });
}

export async function loadApprovedOutlineGrounding(bucket: GroundingBucketLike, stage: ApprovedOutlineArtifactMetadata) {
  if (stage.state !== 'approved') throw new Error('outline_grounding_not_approved');
  if (stage.kind !== 'lesson_outline') throw new Error('outline_grounding_kind_invalid');
  if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration) throw new Error('outline_grounding_receipt_invalid');
  const groundingReceipt = record(stage.groundingReceipt);
  if (!groundingReceipt || !record(groundingReceipt.blueprintLesson)) throw new Error('outline_blueprint_receipt_required');
  const file = bucket.file(stage.objectPath);
  const metadataResult = await file.getMetadata();
  const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
  if (String(metadata?.generation ?? '') !== stage.objectGeneration) throw new Error('outline_grounding_generation_mismatch');
  const [bytes] = await file.download({ validation: false });
  if (createHash('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase()) throw new Error('outline_grounding_content_hash_mismatch');
  let artifact: unknown;
  try { artifact = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('outline_grounding_json_invalid'); }
  const errors = validateLessonStageArtifact(artifact, { kind: 'lesson_outline', count: 1, cefr: stage.cefr, grounding: groundingReceipt });
  if (errors.length) throw new Error(`outline_grounding_artifact_invalid:${errors.join(',')}`);
  const output = record(artifact);
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, outline: Object.freeze({ ...(record(output?.result) ?? {}) }), blueprintGrounding: Object.freeze({ ...groundingReceipt }) });
}

export function lessonIdFromScopeId(scopeId: string): number {
  const match = /^lesson-(\d+)$/.exec(scopeId);
  const lessonId = Number(match?.[1]);
  if (!Number.isSafeInteger(lessonId) || lessonId < 1) throw new Error('lesson_scope_id_invalid');
  return lessonId;
}

export function prepareDerivedLessonGrounding(input: {
  readonly kind: Extract<GenerationStageKind, 'lesson_vocabulary' | 'lesson_irregular_verbs' | 'lesson_prepositions'>;
  readonly lessonId: number;
  readonly phraseArtifactId: string;
  readonly loaded: Awaited<ReturnType<typeof loadApprovedLessonGrounding>>;
  readonly ledger: LessonLedger;
}) {
  if (input.loaded.extraction.state !== 'ready') throw new Error('lesson_extraction_review_required');
  const candidates = input.kind === 'lesson_vocabulary' ? input.loaded.extraction.vocabulary : input.kind === 'lesson_irregular_verbs' ? input.loaded.extraction.irregularVerbs : input.loaded.extraction.prepositions;
  const receipt = dedupeLessonCandidates(input.ledger, { lessonId: input.lessonId, phraseArtifactId: input.phraseArtifactId, candidates });
  if (receipt.state !== 'ready') throw new Error(`lesson_dedupe_review_required:${receipt.missingPreviousLessonIds.join(',')}`);
  return Object.freeze({ phraseArtifactId: input.phraseArtifactId, phraseContentHash: input.loaded.contentHash, phrases: input.loaded.phrases, extractedCandidates: receipt.extracted, acceptedCandidates: receipt.accepted, excludedPrevious: receipt.excludedPrevious, rejectedCandidates: receipt.rejected, groundingHash: input.loaded.groundingHash });
}
