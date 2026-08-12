import type { GenerationStageKind } from './stage_contracts';

export const LEARNING_V2_GENERATION_STAGE_KINDS = Object.freeze([
  'learning_v2_research',
  'learning_v2_curriculum',
  'learning_v2_lesson_outline',
  'learning_v2_localized_course',
  'learning_v2_audio',
  'learning_v2_quality_assurance',
  'learning_v2_release',
] as const satisfies readonly GenerationStageKind[]);

export type LearningV2GenerationStageKind = (typeof LEARNING_V2_GENERATION_STAGE_KINDS)[number];

export const LEARNING_V2_GENERATION_INTERFACE_LOCALES = Object.freeze([
  'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
] as const);

export const LEARNING_V2_GENERATION_REQUIRED_CONTENT_KINDS = Object.freeze([
  'course_map', 'section_intro', 'lesson_intro', 'explanation', 'model',
  'supported_practice', 'guided_practice', 'retrieval_practice', 'near_transfer',
  'independent_check', 'delayed_review', 'sector_exam', 'hint',
  'error_explanation', 'accessibility_copy', 'audio_script',
] as const);
const REQUIRED_CONTENT_KINDS = LEARNING_V2_GENERATION_REQUIRED_CONTENT_KINDS;
const LEARNING_CYCLE = Object.freeze([
  'explain', 'model', 'supported_practice', 'guided_practice', 'retrieval',
  'near_transfer', 'independent_check', 'delayed_review', 'exam',
] as const);
const VOICES = Object.freeze(['ash', 'onyx', 'nova', 'coral'] as const);
const APPROVAL_STAGE = Object.freeze({
  learning_v2_research: 'research',
  learning_v2_curriculum: 'curriculum',
  learning_v2_lesson_outline: 'lesson_outline',
  learning_v2_localized_course: 'localized_content',
  learning_v2_audio: 'audio',
  learning_v2_quality_assurance: 'quality_assurance',
  learning_v2_release: 'owner_release',
} as const);
const HASH_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_LOCALIZED_VALUE_BYTES = 128 * 1024;
const OUTLINE_EPISODE_KEYS = Object.freeze([
  'ordinal', 'episodeId', 'sectorOrdinal', 'cefrBand', 'canDoOutcomeId',
  'title', 'sessions', 'sectorExamAfter',
] as const);
const OUTLINE_SESSION_KEYS = Object.freeze([
  'ordinal', 'sessionTemplateId', 'canDoOutcomeId', 'focusConceptIds',
  'prerequisiteConceptIds', 'teachingBrief', 'practiceBrief', 'assessmentBrief',
] as const);
const CEFR_BANDS = Object.freeze(['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const);

const STAGE_FIELDS: Readonly<Record<LearningV2GenerationStageKind, readonly string[]>> = Object.freeze({
  learning_v2_research: ['packageId', 'targetLanguage', 'approvalStage', 'interfaceLocales', 'localizedContent', 'evidence'],
  learning_v2_curriculum: ['packageId', 'targetLanguage', 'approvalStage', 'interfaceLocales', 'localizedContent', 'entryBand', 'exitBand', 'learningCycle', 'objectives'],
  learning_v2_lesson_outline: ['packageId', 'targetLanguage', 'approvalStage', 'interfaceLocales', 'localizedContent', 'sectors', 'episodes', 'exams'],
  learning_v2_localized_course: ['packageId', 'targetLanguage', 'approvalStage', 'interfaceLocales', 'localizedContent', 'requiredContentKinds', 'artifacts'],
  learning_v2_audio: ['packageId', 'targetLanguage', 'approvalStage', 'interfaceLocales', 'localizedContent', 'voices', 'provider', 'endpoint', 'variantsPerItem', 'audioManifest'],
  learning_v2_quality_assurance: ['packageId', 'targetLanguage', 'approvalStage', 'interfaceLocales', 'localizedContent', 'auditedPackageFingerprint', 'qaReceipts'],
  learning_v2_release: ['packageId', 'targetLanguage', 'approvalStage', 'interfaceLocales', 'localizedContent', 'releaseCandidateFingerprint', 'approvalReceipts'],
});

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactArray(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index]);
}

function validateLocalizedEnvelope(value: unknown): boolean {
  if (!record(value) || !exactArray(Object.keys(value), LEARNING_V2_GENERATION_INTERFACE_LOCALES)) return false;
  return LEARNING_V2_GENERATION_INTERFACE_LOCALES.every((locale) => {
    const localized = value[locale];
    if (localized == null || (typeof localized === 'string' && !localized.trim())) return false;
    try {
      const encoded = JSON.stringify(localized);
      return Boolean(encoded) && encoded.length <= MAX_LOCALIZED_VALUE_BYTES && Buffer.byteLength(encoded, 'utf8') <= MAX_LOCALIZED_VALUE_BYTES;
    } catch {
      return false;
    }
  });
}

function validateArtifacts(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < REQUIRED_CONTENT_KINDS.length || value.length > 10_000) return false;
  const seenKinds = new Set<string>();
  const seenIds = new Set<string>();
  const introduced = new Set<string>();
  for (const [index, artifact] of value.entries()) {
    if (!record(artifact) || Object.keys(artifact).some((key) => !['artifactId', 'kind', 'sequenceOrdinal', 'contentByLocale', 'introducesConceptIds', 'usesConceptIds', 'dependsOnArtifactIds'].includes(key)) ||
      typeof artifact.artifactId !== 'string' || !TOKEN_RE.test(artifact.artifactId) || seenIds.has(artifact.artifactId) ||
      !REQUIRED_CONTENT_KINDS.includes(artifact.kind as typeof REQUIRED_CONTENT_KINDS[number]) || artifact.sequenceOrdinal !== index + 1 ||
      !validateLocalizedEnvelope(artifact.contentByLocale) || !Array.isArray(artifact.introducesConceptIds) || !Array.isArray(artifact.usesConceptIds) || !Array.isArray(artifact.dependsOnArtifactIds)) return false;
    const introduces = artifact.introducesConceptIds.map(String);
    const uses = artifact.usesConceptIds.map(String);
    const dependencies = artifact.dependsOnArtifactIds.map(String);
    if ([...introduces, ...uses, ...dependencies].some((token) => !TOKEN_RE.test(token)) || new Set(introduces).size !== introduces.length || new Set(uses).size !== uses.length || new Set(dependencies).size !== dependencies.length ||
      dependencies.some((id) => !seenIds.has(id)) || uses.some((id) => !introduced.has(id) && !introduces.includes(id)) || introduces.some((id) => introduced.has(id))) return false;
    introduces.forEach((id) => introduced.add(id));
    seenKinds.add(String(artifact.kind));
    seenIds.add(artifact.artifactId);
  }
  return REQUIRED_CONTENT_KINDS.every((kind) => seenKinds.has(kind));
}

function exactRecordKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function validUniqueTokens(value: unknown, min: number, max: number): value is readonly string[] {
  return Array.isArray(value) && value.length >= min && value.length <= max &&
    value.every((item) => typeof item === 'string' && TOKEN_RE.test(item)) && new Set(value).size === value.length;
}

function validBrief(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 10 && value.length <= 1_000;
}

export type LearningV2ApprovedSessionOutlineSegment = Readonly<{
  ordinal: number;
  sessionTemplateId: string;
  canDoOutcomeId: string;
  focusConceptIds: readonly string[];
  prerequisiteConceptIds: readonly string[];
  teachingBrief: string;
  practiceBrief: string;
  assessmentBrief: string;
}>;

function validateOutlineSession(value: unknown, episodeOrdinal: number, sessionOrdinal: number): value is LearningV2ApprovedSessionOutlineSegment {
  if (!record(value) || !exactRecordKeys(value, OUTLINE_SESSION_KEYS)) return false;
  const expectedTemplateId = `episode-${String(episodeOrdinal).padStart(2, '0')}:session-${String(sessionOrdinal).padStart(2, '0')}`;
  return value.ordinal === sessionOrdinal && value.sessionTemplateId === expectedTemplateId &&
    typeof value.canDoOutcomeId === 'string' && TOKEN_RE.test(value.canDoOutcomeId) &&
    validUniqueTokens(value.focusConceptIds, 1, 12) && validUniqueTokens(value.prerequisiteConceptIds, 0, 64) &&
    validBrief(value.teachingBrief) && validBrief(value.practiceBrief) && validBrief(value.assessmentBrief);
}

function validateLearningV2OutlineStructure(result: Record<string, unknown>): boolean {
  if (!Array.isArray(result.sectors) || result.sectors.length !== 4 || result.sectors.some((sector, index) => !record(sector) || sector.ordinal !== index + 1) ||
      !Array.isArray(result.exams) || result.exams.length !== 4 || result.exams.some((exam, index) => !record(exam) || exam.afterEpisodeOrdinal !== (index + 1) * 8) ||
      !Array.isArray(result.episodes) || result.episodes.length !== 32) return false;
  return result.episodes.every((episode, index) => {
    if (!record(episode) || !exactRecordKeys(episode, OUTLINE_EPISODE_KEYS)) return false;
    const ordinal = index + 1;
    const expectedExam = ordinal % 8 === 0;
    return episode.ordinal === ordinal && episode.episodeId === `episode-${String(ordinal).padStart(2, '0')}` &&
      episode.sectorOrdinal === Math.ceil(ordinal / 8) && CEFR_BANDS.includes(episode.cefrBand as typeof CEFR_BANDS[number]) &&
      typeof episode.canDoOutcomeId === 'string' && TOKEN_RE.test(episode.canDoOutcomeId) && validBrief(episode.title) &&
      episode.sectorExamAfter === expectedExam && Array.isArray(episode.sessions) && episode.sessions.length === 12 &&
      episode.sessions.every((session, sessionIndex) => validateOutlineSession(session, ordinal, sessionIndex + 1));
  });
}

export function extractLearningV2ApprovedSessionOutlineSegment(
  artifact: unknown,
  expected: Readonly<{ packageId: string; targetLanguage: string; episodeOrdinal: number; sessionOrdinal: number }>,
): LearningV2ApprovedSessionOutlineSegment {
  if (!record(artifact) || artifact.stage !== 'learning_v2_lesson_outline' || !record(artifact.result) ||
      artifact.result.packageId !== expected.packageId || artifact.result.targetLanguage !== expected.targetLanguage ||
      !validateLearningV2OutlineStructure(artifact.result) || !Number.isSafeInteger(expected.episodeOrdinal) ||
      expected.episodeOrdinal < 1 || expected.episodeOrdinal > 32 || !Number.isSafeInteger(expected.sessionOrdinal) ||
      expected.sessionOrdinal < 1 || expected.sessionOrdinal > 12) {
    throw new Error('learning_v2_outline_session_segment_invalid');
  }
  const episode = (artifact.result.episodes as readonly Record<string, unknown>[])[expected.episodeOrdinal - 1];
  const session = (episode.sessions as readonly LearningV2ApprovedSessionOutlineSegment[])[expected.sessionOrdinal - 1];
  return Object.freeze({
    ordinal: session.ordinal,
    sessionTemplateId: session.sessionTemplateId,
    canDoOutcomeId: session.canDoOutcomeId,
    focusConceptIds: Object.freeze([...session.focusConceptIds]),
    prerequisiteConceptIds: Object.freeze([...session.prerequisiteConceptIds]),
    teachingBrief: session.teachingBrief,
    practiceBrief: session.practiceBrief,
    assessmentBrief: session.assessmentBrief,
  });
}

export function validateLearningV2GenerationArtifact(
  artifact: Readonly<Record<string, unknown>>,
  expected: Readonly<{ kind: LearningV2GenerationStageKind; targetLanguage: string; ownerApprovalTrail?: readonly unknown[] }>,
): readonly string[] {
  const errors: string[] = [];
  if (!LEARNING_V2_GENERATION_STAGE_KINDS.includes(expected.kind)) return Object.freeze(['learning_v2_stage_kind_invalid']);
  if (artifact.stage !== expected.kind || !record(artifact.result)) return Object.freeze(['learning_v2_stage_envelope_invalid']);
  const result = artifact.result;
  const fields = STAGE_FIELDS[expected.kind];
  const keys = Object.keys(result);
  if (keys.length !== fields.length || fields.some((field) => !keys.includes(field)) || keys.some((field) => !fields.includes(field))) errors.push('learning_v2_result_fields_invalid');
  if (typeof result.packageId !== 'string' || !TOKEN_RE.test(result.packageId) || result.targetLanguage !== expected.targetLanguage || result.approvalStage !== APPROVAL_STAGE[expected.kind]) errors.push('learning_v2_result_identity_invalid');
  if (!exactArray(result.interfaceLocales, LEARNING_V2_GENERATION_INTERFACE_LOCALES) || !validateLocalizedEnvelope(result.localizedContent)) errors.push('learning_v2_all_locales_required');
  if (expected.kind === 'learning_v2_research' && (!Array.isArray(result.evidence) || result.evidence.length < 1)) errors.push('learning_v2_research_evidence_required');
  if (expected.kind === 'learning_v2_curriculum' && (result.entryBand !== 'PRE_A1' || result.exitBand !== 'C2' || !exactArray(result.learningCycle, LEARNING_CYCLE) || !Array.isArray(result.objectives) || result.objectives.length < 1)) errors.push('learning_v2_curriculum_invalid');
  if (expected.kind === 'learning_v2_lesson_outline') {
    if (!validateLearningV2OutlineStructure(result)) errors.push('learning_v2_e1_e32_outline_invalid');
  }
  if (expected.kind === 'learning_v2_localized_course' && (!exactArray(result.requiredContentKinds, REQUIRED_CONTENT_KINDS) || !validateArtifacts(result.artifacts))) errors.push('learning_v2_localized_course_invalid');
  if (expected.kind === 'learning_v2_audio' && (!exactArray(result.voices, VOICES) || result.provider !== 'openai' || result.endpoint !== '/v1/audio/speech' || result.variantsPerItem !== 4 || !Array.isArray(result.audioManifest) || result.audioManifest.length < 1)) errors.push('learning_v2_audio_manifest_invalid');
  if (expected.kind === 'learning_v2_quality_assurance' && (!HASH_RE.test(String(result.auditedPackageFingerprint ?? '')) || !Array.isArray(result.qaReceipts) || result.qaReceipts.length < 1)) errors.push('learning_v2_quality_receipts_invalid');
  if (expected.kind === 'learning_v2_release') {
    const expectedReceipts = expected.ownerApprovalTrail ?? [];
    let receiptsMatch = Array.isArray(result.approvalReceipts) && result.approvalReceipts.length === 6 && expectedReceipts.length === 6;
    if (receiptsMatch) {
      try { receiptsMatch = JSON.stringify(result.approvalReceipts) === JSON.stringify(expectedReceipts); } catch { receiptsMatch = false; }
    }
    if (!HASH_RE.test(String(result.releaseCandidateFingerprint ?? '')) || !receiptsMatch) errors.push('learning_v2_release_receipts_invalid');
  }
  return Object.freeze([...new Set(errors)]);
}
