export type FactorySurface =
  | 'lessons'
  | 'vocabulary'
  | 'drills'
  | 'quizzes'
  | 'cards'
  | 'arena_questions';

export type ReviewStatus = 'needs_review' | 'approved' | 'rejected';
export type ActivationStatus = 'draft' | 'staged' | 'published' | 'rolled_back';

export interface PackManifest {
  readonly packId: string;
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly surface: FactorySurface;
  readonly schemaVersion: number;
  readonly contentVersion: number;
  readonly sourceBlueprintVersion: string;
  readonly contentHash: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly reviewStatus: ReviewStatus;
  readonly activationStatus: ActivationStatus;
}

export type GenerationJobState = 'queued' | 'running' | 'partial' | 'failed' | 'needs_review' | 'approved' | 'published' | 'rolled_back';

export interface GenerationJob {
  readonly projectId: string;
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly lessonIds: readonly number[];
  readonly surfaces: readonly FactorySurface[];
  readonly idempotencyKey: string;
  readonly requestedBy: string;
  readonly blueprintVersion: string;
  readonly state: GenerationJobState;
  readonly progress: Readonly<{ total: number; completed: number; failed: number }>;
  readonly createdAt: string;
}

export interface LessonPhraseArtifact {
  readonly id: string;
  readonly sourceText: string;
  readonly targetText: string;
}

export interface LessonVocabularyArtifact {
  readonly lemma: string;
  readonly partOfSpeech: string;
  readonly targetText: string;
}

export interface LessonDrillArtifact {
  readonly kind: 'irregular_verbs' | 'prepositions' | 'part_of_speech';
  readonly applicable: boolean;
  readonly itemCount: number;
}

export interface LessonArtifact {
  readonly lessonId: number;
  readonly phrases: readonly LessonPhraseArtifact[];
  readonly vocabulary: readonly LessonVocabularyArtifact[];
  readonly drills: readonly LessonDrillArtifact[];
}

export interface LessonQaResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export function validateLessonArtifact(lesson: LessonArtifact): LessonQaResult {
  const errors: string[] = [];
  if (!Number.isInteger(lesson.lessonId) || lesson.lessonId < 1) errors.push('lessonId_invalid');
  if (lesson.phrases.length !== 50) errors.push('phrase_count_expected_50');

  const seenTargets = new Set<string>();
  for (const phrase of lesson.phrases) {
    if (!phrase.sourceText.trim() || !phrase.targetText.trim()) errors.push('phrase_text_required');
    const normalized = phrase.targetText.trim().toLocaleLowerCase();
    if (seenTargets.has(normalized)) errors.push('phrase_duplicate');
    seenTargets.add(normalized);
  }

  if (lesson.vocabulary.length === 0) errors.push('vocabulary_required');
  lesson.vocabulary.forEach(item => {
    if (!item.lemma.trim() || !item.partOfSpeech.trim() || !item.targetText.trim()) {
      errors.push('vocabulary_field_required');
    }
  });

  lesson.drills.forEach(drill => {
    if (!drill.applicable && drill.itemCount > 0) errors.push('non_applicable_drill_has_items');
    if (drill.applicable && drill.itemCount < 1) errors.push('applicable_drill_empty');
  });

  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function validatePackManifest(manifest: PackManifest): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!manifest.packId.trim()) errors.push('packId_required');
  if (!manifest.studyTarget.trim()) errors.push('studyTarget_required');
  if (!manifest.sourceLocale.trim()) errors.push('sourceLocale_required');
  if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1) errors.push('schemaVersion_invalid');
  if (!Number.isInteger(manifest.contentVersion) || manifest.contentVersion < 1) errors.push('contentVersion_invalid');
  if (!manifest.sourceBlueprintVersion.trim()) errors.push('sourceBlueprintVersion_required');
  if (!manifest.contentHash.trim()) errors.push('contentHash_required');
  if (!manifest.createdAt.trim()) errors.push('createdAt_required');
  if (!manifest.createdBy.trim()) errors.push('createdBy_required');
  if (manifest.reviewStatus !== 'approved' && manifest.activationStatus !== 'draft') errors.push('review_required');
  if (manifest.activationStatus === 'published' && manifest.reviewStatus !== 'approved') errors.push('published_requires_review');
  return { ok: errors.length === 0, errors };
}

export function createGenerationJob(input: {
  projectId: string;
  studyTarget: string;
  sourceLocale: string;
  lessonIds: readonly number[];
  surfaces: readonly FactorySurface[];
  idempotencyKey: string;
  requestedBy: string;
  blueprintVersion: string;
  now?: string;
}): GenerationJob {
  if (
    !input.projectId.trim()
    || !input.studyTarget.trim()
    || !input.sourceLocale.trim()
    || input.lessonIds.length === 0
    || input.lessonIds.some(id => !Number.isInteger(id) || id < 1)
    || input.surfaces.length === 0
    || !input.idempotencyKey.trim()
    || !input.requestedBy.trim()
    || !input.blueprintVersion.trim()
  ) {
    throw new Error('validation_failed');
  }

  const total = input.lessonIds.length * input.surfaces.length;
  return Object.freeze({
    projectId: input.projectId.trim(),
    studyTarget: input.studyTarget.trim(),
    sourceLocale: input.sourceLocale.trim(),
    lessonIds: Object.freeze([...input.lessonIds]),
    surfaces: Object.freeze([...input.surfaces]),
    idempotencyKey: input.idempotencyKey.trim(),
    requestedBy: input.requestedBy.trim(),
    blueprintVersion: input.blueprintVersion.trim(),
    state: 'queued' as const,
    progress: Object.freeze({ total, completed: 0, failed: 0 }),
    createdAt: input.now ?? new Date().toISOString(),
  });
}
