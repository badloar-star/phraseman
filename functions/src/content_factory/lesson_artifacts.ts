import type { GenerationStageKind } from './stage_contracts';

type LessonStageKind = Extract<GenerationStageKind, 'lesson_outline' | 'lesson_phrases'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalized(value: unknown): string {
  return text(value).normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, ' ').trim();
}

export function validateLessonStageArtifact(
  artifact: unknown,
  expected: { readonly kind: LessonStageKind; readonly count: number; readonly cefr: string; readonly grounding?: unknown; readonly strictV3?: boolean; readonly sourceLocale?: string; readonly studyTarget?: string },
): string[] {
  if (!isRecord(artifact) || artifact.stage !== expected.kind) return ['lesson_stage_identity_mismatch'];
  const errors: string[] = [];
  if (expected.kind === 'lesson_outline') {
    const result = artifact.result;
    if (!isRecord(result)) return ['lesson_outline_result_required'];
    if (!Number.isSafeInteger(result.lessonId) || Number(result.lessonId) < 1) errors.push('lesson_outline_id_invalid');
    if (!text(result.objective)) errors.push('lesson_outline_objective_required');
    if (result.cefr !== expected.cefr) errors.push('lesson_outline_cefr_mismatch');
    if (!Array.isArray(result.coverage) || result.coverage.length === 0 || result.coverage.some((item) => !text(item))) errors.push('lesson_outline_coverage_required');
    if (!Array.isArray(result.exclusions) || result.exclusions.some((item) => !text(item))) errors.push('lesson_outline_exclusions_invalid');
    if (!isRecord(result.blueprint) || !Number.isSafeInteger(result.blueprint.lessonId) || !text(result.blueprint.registryId) || !text(result.blueprint.topic) || !Array.isArray(result.blueprint.sourceFocusUsed) || result.blueprint.sourceFocusUsed.length === 0) errors.push('lesson_outline_blueprint_required');
    const grounding = isRecord(expected.grounding) ? expected.grounding : undefined;
    const blueprintLesson = isRecord(grounding?.blueprintLesson) ? grounding?.blueprintLesson : undefined;
    if (grounding && (!blueprintLesson || !isRecord(result.blueprint) || result.blueprint.registryId !== grounding.registryId || result.blueprint.lessonId !== blueprintLesson.lessonId || result.blueprint.topic !== blueprintLesson.topic)) errors.push('lesson_outline_blueprint_identity_mismatch');
    if (blueprintLesson && isRecord(result.blueprint) && Array.isArray(result.blueprint.sourceFocusUsed)) {
      const allowed = new Set([...(Array.isArray(blueprintLesson.vocabularyFocus) ? blueprintLesson.vocabularyFocus : []), ...(Array.isArray(blueprintLesson.drills) ? blueprintLesson.drills : []), ...(Array.isArray(blueprintLesson.sourcePhrases) ? blueprintLesson.sourcePhrases : [])].map(normalized));
      if (result.blueprint.sourceFocusUsed.some((item) => !allowed.has(normalized(item)))) errors.push('lesson_outline_blueprint_focus_unapproved');
    }
    return [...new Set(errors)];
  }

  if (!Array.isArray(artifact.items) || artifact.items.length !== expected.count) errors.push(`lesson_phrase_count_expected_${expected.count}`);
  const ids = new Set<string>();
  const meanings = new Set<string>();
  const pairs = new Set<string>();
  for (const item of Array.isArray(artifact.items) ? artifact.items : []) {
    if (!isRecord(item)) { errors.push('lesson_phrase_invalid'); continue; }
    const id = text(item.id);
    const source = text(item.sourceText);
    const target = text(item.targetText);
    const meaning = normalized(item.meaningKey);
    const pair = `${normalized(source)}\u0000${normalized(target)}`;
    if (!id || !source || !target || !meaning) errors.push('lesson_phrase_field_required');
    if (id && ids.has(id)) errors.push('lesson_phrase_id_duplicate');
    if (meaning && meanings.has(meaning)) errors.push('lesson_phrase_meaning_duplicate');
    if (source && target && normalized(source) === normalized(target)) errors.push('lesson_phrase_language_direction_invalid');
    const sourceCyrillic = (source.match(/\p{Script=Cyrillic}/gu) ?? []).length;
    const sourceLatin = (source.match(/\p{Script=Latin}/gu) ?? []).length;
    const targetCyrillic = (target.match(/\p{Script=Cyrillic}/gu) ?? []).length;
    const targetLatin = (target.match(/\p{Script=Latin}/gu) ?? []).length;
    if (expected.sourceLocale === 'ru' && (sourceCyrillic < 1 || sourceCyrillic / Math.max(1, sourceCyrillic + sourceLatin) < 0.2)) errors.push('lesson_phrase_source_locale_mismatch');
    if (expected.studyTarget === 'en' && (targetLatin < 1 || targetCyrillic / Math.max(1, targetCyrillic + targetLatin) > 0.2)) errors.push('lesson_phrase_target_locale_mismatch');
    if (source && target && pairs.has(pair)) errors.push('lesson_phrase_pair_duplicate');
    if (item.cefr !== expected.cefr) errors.push('lesson_phrase_cefr_mismatch');
    if (!text(item.coverageTag)) errors.push('lesson_phrase_coverage_required');
    ids.add(id); meanings.add(meaning); pairs.add(pair);
  }
  if (expected.strictV3) {
    const grounding = isRecord(expected.grounding) ? expected.grounding : undefined;
    const outline = isRecord(grounding?.outline) ? grounding?.outline : undefined;
    if (!outline) errors.push('lesson_phrase_outline_grounding_required');
    else {
      const expectedCoverage = Array.isArray(outline.coverage) ? outline.coverage.map(normalized).filter(Boolean) : [];
      const expectedExclusions = Array.isArray(outline.exclusions) ? outline.exclusions.map(normalized).filter(Boolean) : [];
      const usedCoverage = new Set((Array.isArray(artifact.items) ? artifact.items : []).map((item) => isRecord(item) ? normalized(item.coverageTag) : '').filter(Boolean));
      if (expectedCoverage.some((tag) => !usedCoverage.has(tag)) || [...usedCoverage].some((tag) => !expectedCoverage.includes(tag))) errors.push('lesson_phrase_outline_coverage_mismatch');
      const receipt = isRecord(artifact.coverageReceipt) ? artifact.coverageReceipt : undefined;
      const receiptCoverage = Array.isArray(receipt?.coveredTags) ? receipt.coveredTags.map(normalized).sort() : [];
      const receiptExclusions = Array.isArray(receipt?.respectedExclusions) ? receipt.respectedExclusions.map(normalized).sort() : [];
      if (JSON.stringify(receiptCoverage) !== JSON.stringify([...expectedCoverage].sort()) || JSON.stringify(receiptExclusions) !== JSON.stringify([...expectedExclusions].sort())) errors.push('lesson_phrase_outline_receipt_mismatch');
      const phraseCorpus = normalized((Array.isArray(artifact.items) ? artifact.items : []).flatMap((item) => isRecord(item) ? [item.sourceText, item.targetText] : []).join(' '));
      if (expectedExclusions.some((exclusion) => exclusion.length >= 5 && phraseCorpus.includes(exclusion))) errors.push('lesson_phrase_outline_exclusion_violated');
    }
  }
  return [...new Set(errors)];
}
