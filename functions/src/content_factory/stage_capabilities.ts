import { type GenerationStageKind } from './stage_contracts';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type DependencyScopePolicy = 'same_scope' | 'same_scope_or_lesson_phrases';

export interface StageCapability {
  readonly kind: GenerationStageKind;
  readonly cefr: readonly CefrLevel[];
  readonly count: Readonly<{ min: number; max: number; fixed?: number }>;
  readonly prerequisiteKinds: readonly GenerationStageKind[];
  readonly prerequisiteCardinality: Readonly<{ min: number; max: number }>;
  readonly dependencyScopePolicy: DependencyScopePolicy;
  readonly scopeType: 'lesson' | 'topic' | 'pack';
  readonly editableFields: readonly string[];
  readonly publicationPolicy: 'standard' | 'draft_only_no_consumer' | 'draft_only_rich_fields_not_supported_by_community_consumer';
  readonly runtimeConsumer: boolean;
}

const ALL_LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const);
const SUPPORTED_TARGETS = new Set(['en', 'fr', 'de', 'es', 'it', 'pt']);
const SUPPORTED_SOURCES = new Set(['ru', 'en']);
export const stageLanguagePolicy = Object.freeze({ studyTargets: Object.freeze([...SUPPORTED_TARGETS]), sourceLocales: Object.freeze([...SUPPORTED_SOURCES]), sameLanguageAllowed: false });
const fixed = (value: number) => Object.freeze({ min: value, max: value, fixed: value });
const range = (min: number, max: number) => Object.freeze({ min, max });

function capability(kind: GenerationStageKind, input: Omit<StageCapability, 'kind' | 'cefr' | 'prerequisiteCardinality' | 'dependencyScopePolicy' | 'publicationPolicy' | 'runtimeConsumer'> & Partial<Pick<StageCapability, 'cefr' | 'dependencyScopePolicy' | 'publicationPolicy' | 'runtimeConsumer'>>): StageCapability {
  return Object.freeze({
    kind,
    cefr: input.cefr ?? ALL_LEVELS,
    count: input.count,
    prerequisiteKinds: Object.freeze([...input.prerequisiteKinds]),
    prerequisiteCardinality: Object.freeze({ min: input.prerequisiteKinds.length, max: input.prerequisiteKinds.length }),
    dependencyScopePolicy: input.dependencyScopePolicy ?? 'same_scope',
    scopeType: input.scopeType,
    editableFields: Object.freeze([...input.editableFields]),
    publicationPolicy: input.publicationPolicy ?? 'standard',
    runtimeConsumer: input.runtimeConsumer ?? true,
  });
}

export const generationStageCapabilities: Readonly<Record<GenerationStageKind, StageCapability>> = Object.freeze({
  lesson_outline: capability('lesson_outline', { count: fixed(1), prerequisiteKinds: [], scopeType: 'lesson', editableFields: ['title', 'goal', 'coverage'] }),
  lesson_phrases: capability('lesson_phrases', { count: fixed(50), prerequisiteKinds: ['lesson_outline'], scopeType: 'lesson', editableFields: ['items'] }),
  lesson_vocabulary: capability('lesson_vocabulary', { count: range(1, 1000), prerequisiteKinds: ['lesson_phrases'], scopeType: 'lesson', editableFields: ['items'] }),
  lesson_irregular_verbs: capability('lesson_irregular_verbs', { count: range(1, 1000), prerequisiteKinds: ['lesson_phrases'], scopeType: 'lesson', editableFields: ['items'] }),
  lesson_prepositions: capability('lesson_prepositions', { count: range(1, 1000), prerequisiteKinds: ['lesson_phrases'], scopeType: 'lesson', editableFields: ['items'] }),
  lesson_theory: capability('lesson_theory', { count: range(1, 1000), prerequisiteKinds: ['lesson_phrases'], scopeType: 'lesson', editableFields: ['rules', 'examples', 'commonMistakes', 'miniCheck'] }),
  challenge_topic: capability('challenge_topic', { count: fixed(1), prerequisiteKinds: [], scopeType: 'topic', editableFields: ['title', 'idea', 'constraints'], publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false }),
  challenge_questions: capability('challenge_questions', { count: fixed(10), prerequisiteKinds: ['challenge_topic'], scopeType: 'topic', editableFields: ['items'], publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false }),
  challenge_question_replacement: capability('challenge_question_replacement', { count: fixed(1), prerequisiteKinds: ['challenge_questions'], scopeType: 'topic', editableFields: ['item'], publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false }),
  flashcard_pack_idea: capability('flashcard_pack_idea', { count: fixed(1), prerequisiteKinds: [], scopeType: 'pack', editableFields: ['title', 'idea', 'constraints'], publicationPolicy: 'draft_only_no_consumer', runtimeConsumer: false }),
  flashcard_items: capability('flashcard_items', { count: range(1, 20), prerequisiteKinds: ['flashcard_pack_idea'], dependencyScopePolicy: 'same_scope_or_lesson_phrases', scopeType: 'pack', editableFields: ['items'], publicationPolicy: 'standard', runtimeConsumer: true }),
  flashcard_item_replacement: capability('flashcard_item_replacement', { count: fixed(1), prerequisiteKinds: ['flashcard_items'], scopeType: 'pack', editableFields: ['item'], publicationPolicy: 'standard', runtimeConsumer: true }),
});

export function stageCapability(kind: GenerationStageKind): StageCapability {
  const result = generationStageCapabilities[kind];
  if (!result) throw new Error('stage_capability_kind_unsupported');
  return result;
}

export function allowedDependencyKinds(kind: GenerationStageKind): readonly GenerationStageKind[] {
  const result = stageCapability(kind);
  return result.dependencyScopePolicy === 'same_scope_or_lesson_phrases'
    ? Object.freeze([...result.prerequisiteKinds, 'lesson_phrases' as const])
    : result.prerequisiteKinds;
}

export function assertStageCapabilityRequest(input: { kind: GenerationStageKind; count: number; cefr: string; studyTarget: string; sourceLocale: string; prerequisiteKinds: readonly GenerationStageKind[] }): StageCapability {
  const result = stageCapability(input.kind);
  if (!result.cefr.includes(input.cefr as CefrLevel)) throw new Error('stage_capability_cefr_unsupported');
  if (!SUPPORTED_TARGETS.has(input.studyTarget) || !SUPPORTED_SOURCES.has(input.sourceLocale) || input.studyTarget === input.sourceLocale) throw new Error('stage_capability_locale_pair_unsupported');
  if (!Number.isSafeInteger(input.count) || input.count < result.count.min || input.count > result.count.max || (result.count.fixed !== undefined && input.count !== result.count.fixed)) throw new Error('stage_capability_count_unsupported');
  if (input.prerequisiteKinds.length !== result.prerequisiteKinds.length || result.prerequisiteKinds.some((kind, index) => input.prerequisiteKinds[index] !== kind)) throw new Error('stage_capability_prerequisites_invalid');
  return result;
}
