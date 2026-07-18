export type GenerationStageKind =
  | 'lesson_outline'
  | 'lesson_phrases'
  | 'lesson_vocabulary'
  | 'lesson_irregular_verbs'
  | 'lesson_prepositions'
  | 'lesson_theory'
  | 'challenge_topic'
  | 'challenge_questions'
  | 'challenge_question_replacement'
  | 'flashcard_pack_idea'
  | 'flashcard_items'
  | 'flashcard_item_replacement';

export type GenerationStageState = 'queued' | 'running' | 'paused' | 'needs_review' | 'approved' | 'rejected' | 'failed' | 'cancelled' | 'superseded';

export interface GenerationStageUnit {
  readonly stageId: string;
  readonly artifactId: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly kind: GenerationStageKind;
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly scopeId: string;
  readonly schemaVersion: number;
  readonly promptVersion: string;
  readonly count: number;
  readonly prerequisiteArtifactIds: readonly string[];
  readonly qaPolicy: string;
  readonly revision: number;
  readonly state: GenerationStageState;
}

const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
export const GENERATION_STAGE_KINDS: readonly GenerationStageKind[] = Object.freeze([
  'lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory',
  'challenge_topic', 'challenge_questions', 'challenge_question_replacement', 'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement',
]);

export function createGenerationStageUnit(input: Omit<GenerationStageUnit, 'stageId' | 'artifactId' | 'idempotencyKey' | 'state'>): GenerationStageUnit {
  if (!TOKEN_RE.test(input.requestId) || !GENERATION_STAGE_KINDS.includes(input.kind) || !LOCALE_RE.test(input.studyTarget) || !LOCALE_RE.test(input.sourceLocale) || !TOKEN_RE.test(input.scopeId) || !Number.isSafeInteger(input.schemaVersion) || input.schemaVersion < 1 || !TOKEN_RE.test(input.promptVersion) || !Number.isSafeInteger(input.count) || input.count < 1 || input.count > 1000 || !TOKEN_RE.test(input.qaPolicy) || !Number.isSafeInteger(input.revision) || input.revision < 1 || input.prerequisiteArtifactIds.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new Error('generation_stage_invalid');
  }
  const stageId = `${input.requestId}:${input.kind}:${input.scopeId}:r${input.revision}`;
  if (!/^[A-Za-z0-9._:-]{1,500}$/.test(stageId)) throw new Error('generation_stage_id_invalid');
  return Object.freeze({
    ...input,
    prerequisiteArtifactIds: Object.freeze([...new Set(input.prerequisiteArtifactIds)]),
    stageId,
    artifactId: `artifact:${stageId}`,
    idempotencyKey: stageId,
    state: 'queued' as const,
  });
}
