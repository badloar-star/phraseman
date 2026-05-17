import type { PosMicroDiagnosisId } from './pos_micro_diagnosis';

export type PersonalTrainingStatus = 'active' | 'qa_pending';
export type JessePersonalTrainingStatus = 'reworked' | 'legacy_needs_rework';
export type PersonalTrainingCefrLevel = 'A1' | 'A2' | 'A2+' | 'B1' | 'B1+';
export type PersonalTrainingPlacementRisk = 'low' | 'medium' | 'high';

export const JESSE_REWORKED_MARKER = 'JESSE_REWORKED_PERSONAL_TRAINING';

export interface PersonalTrainingTaxonomyEntry {
  id: PosMicroDiagnosisId;
  status: PersonalTrainingStatus;
  appPath: string;
  sourceDraft: string;
  qaReport: string;
  qaStatus: 'PASS' | 'PENDING';
  jesseStatus: JessePersonalTrainingStatus;
  jesseMarker: typeof JESSE_REWORKED_MARKER;
  cefrLevel: PersonalTrainingCefrLevel;
  prerequisites: PosMicroDiagnosisId[];
  placementRisk: PersonalTrainingPlacementRisk;
}

type PersonalTrainingCefrMetadata = Pick<
  PersonalTrainingTaxonomyEntry,
  'cefrLevel' | 'prerequisites' | 'placementRisk'
>;

const CEFR_METADATA: Partial<Record<PosMicroDiagnosisId, PersonalTrainingCefrMetadata>> = {
  adjective_comparison: { cefrLevel: 'A2', prerequisites: ['article_a_an'], placementRisk: 'low' },
  adjective_vs_adverb: { cefrLevel: 'A2', prerequisites: ['word_order_basic_statement'], placementRisk: 'medium' },
  adverb_frequency_position: { cefrLevel: 'A1', prerequisites: ['verb_present_simple_statement'], placementRisk: 'low' },
  article_a_an: { cefrLevel: 'A1', prerequisites: ['noun_singular_plural_basic'], placementRisk: 'low' },
  article_the_specific: { cefrLevel: 'A2', prerequisites: ['article_a_an'], placementRisk: 'medium' },
  article_zero: { cefrLevel: 'A2', prerequisites: ['article_a_an', 'noun_singular_plural_basic'], placementRisk: 'medium' },
  condition_second_basic: {
    cefrLevel: 'B1',
    prerequisites: ['condition_zero_first', 'verb_past_simple_regular_irregular', 'modal_base_form'],
    placementRisk: 'high',
  },
  condition_zero_first: { cefrLevel: 'A2+', prerequisites: ['future_will_going_to'], placementRisk: 'medium' },
  conjunction_logic: { cefrLevel: 'A2+', prerequisites: ['word_order_basic_statement'], placementRisk: 'medium' },
  determiner_this_that_these_those: { cefrLevel: 'A1', prerequisites: ['noun_singular_plural_basic'], placementRisk: 'low' },
  future_present_continuous_arrangements: {
    cefrLevel: 'A2',
    prerequisites: ['verb_present_continuous_basic', 'preposition_time_in_on_at'],
    placementRisk: 'medium',
  },
  future_will_going_to: {
    cefrLevel: 'A2',
    prerequisites: ['verb_present_simple_statement', 'modal_base_form'],
    placementRisk: 'medium',
  },
  imperative_basic: { cefrLevel: 'A1', prerequisites: [], placementRisk: 'low' },
  infinitive_vs_gerund_basic: { cefrLevel: 'A2+', prerequisites: ['modal_base_form'], placementRisk: 'high' },
  modal_base_form: { cefrLevel: 'A2', prerequisites: ['verb_present_simple_statement'], placementRisk: 'low' },
  modal_can_could_ability_request: { cefrLevel: 'A2', prerequisites: ['modal_base_form'], placementRisk: 'medium' },
  modal_force: { cefrLevel: 'B1', prerequisites: ['modal_should_must_have_to'], placementRisk: 'high' },
  modal_may_might_probability: { cefrLevel: 'A2+', prerequisites: ['modal_base_form'], placementRisk: 'medium' },
  modal_should_must_have_to: { cefrLevel: 'A2', prerequisites: ['modal_base_form'], placementRisk: 'medium' },
  modifier_very_really_quite: { cefrLevel: 'A1', prerequisites: ['word_order_basic_statement'], placementRisk: 'low' },
  noun_possessive_apostrophe_s: { cefrLevel: 'A2', prerequisites: ['noun_singular_plural_basic'], placementRisk: 'medium' },
  noun_singular_plural_basic: { cefrLevel: 'A1', prerequisites: [], placementRisk: 'low' },
  object_order_give_me_it: { cefrLevel: 'A2', prerequisites: ['pronoun_case', 'word_order_basic_statement'], placementRisk: 'medium' },
  past_continuous_basic: { cefrLevel: 'A2+', prerequisites: ['verb_was_were'], placementRisk: 'medium' },
  past_simple_vs_past_continuous: {
    cefrLevel: 'A2+',
    prerequisites: ['verb_past_simple_regular_irregular', 'past_continuous_basic'],
    placementRisk: 'high',
  },
  phrasal_particle_pair: { cefrLevel: 'A2+', prerequisites: ['preposition_direction'], placementRisk: 'high' },
  preposition_common_verb_patterns: { cefrLevel: 'A2+', prerequisites: ['preposition_place_in_on_at'], placementRisk: 'high' },
  preposition_direction: { cefrLevel: 'A2', prerequisites: ['preposition_place_in_on_at'], placementRisk: 'medium' },
  preposition_direction_to_into_from: {
    cefrLevel: 'A2',
    prerequisites: ['preposition_direction'],
    placementRisk: 'medium',
  },
  preposition_duration_for_since: {
    cefrLevel: 'A2',
    prerequisites: ['preposition_time_in_on_at'],
    placementRisk: 'medium',
  },
  preposition_place_in_on_at: { cefrLevel: 'A1', prerequisites: ['there_is_are'], placementRisk: 'low' },
  preposition_time_in_on_at: { cefrLevel: 'A1', prerequisites: ['verb_present_simple_statement'], placementRisk: 'low' },
  preposition_time_place: {
    cefrLevel: 'A2',
    prerequisites: ['preposition_time_in_on_at', 'preposition_place_in_on_at'],
    placementRisk: 'medium',
  },
  present_perfect_for_since: {
    cefrLevel: 'A2+',
    prerequisites: ['verb_present_perfect_basic', 'preposition_duration_for_since'],
    placementRisk: 'high',
  },
  present_perfect_questions_negatives: {
    cefrLevel: 'A2+',
    prerequisites: ['verb_present_perfect_basic', 'word_order_basic_question'],
    placementRisk: 'high',
  },
  present_perfect_vs_past_simple: {
    cefrLevel: 'A2+',
    prerequisites: ['verb_present_perfect_basic', 'verb_past_simple_regular_irregular'],
    placementRisk: 'high',
  },
  pronoun_case: { cefrLevel: 'A1', prerequisites: ['word_order_basic_statement'], placementRisk: 'low' },
  pronoun_possessive: { cefrLevel: 'A1', prerequisites: ['pronoun_case'], placementRisk: 'low' },
  quantifier_some_any: { cefrLevel: 'A2', prerequisites: ['noun_singular_plural_basic'], placementRisk: 'medium' },
  relative_clauses_who_which_that: {
    cefrLevel: 'B1',
    prerequisites: ['word_order_basic_statement', 'pronoun_case'],
    placementRisk: 'high',
  },
  reported_speech_basic: {
    cefrLevel: 'B1',
    prerequisites: ['word_order_basic_statement', 'verb_past_simple_regular_irregular', 'pronoun_case'],
    placementRisk: 'high',
  },
  there_is_are: { cefrLevel: 'A1', prerequisites: ['to_be_present_agreement'], placementRisk: 'low' },
  to_be_present_agreement: { cefrLevel: 'A1', prerequisites: ['pronoun_case'], placementRisk: 'low' },
  too_enough: { cefrLevel: 'A2', prerequisites: ['adjective_comparison'], placementRisk: 'medium' },
  used_to_basic: { cefrLevel: 'A2+', prerequisites: ['verb_past_simple_regular_irregular'], placementRisk: 'medium' },
  verb_past_simple_negative_question: {
    cefrLevel: 'A2',
    prerequisites: ['verb_past_simple_regular_irregular', 'word_order_basic_question'],
    placementRisk: 'medium',
  },
  verb_past_simple_regular_irregular: {
    cefrLevel: 'A2',
    prerequisites: ['verb_present_simple_statement'],
    placementRisk: 'medium',
  },
  verb_present_continuous_basic: {
    cefrLevel: 'A2',
    prerequisites: ['to_be_present_agreement', 'verb_present_simple_statement'],
    placementRisk: 'low',
  },
  verb_present_perfect_basic: {
    cefrLevel: 'A2+',
    prerequisites: ['verb_past_simple_regular_irregular'],
    placementRisk: 'high',
  },
  verb_present_simple_negative_question: {
    cefrLevel: 'A1',
    prerequisites: ['verb_present_simple_statement', 'word_order_basic_question'],
    placementRisk: 'low',
  },
  verb_present_simple_statement: { cefrLevel: 'A1', prerequisites: ['word_order_basic_statement'], placementRisk: 'low' },
  verb_present_simple_vs_continuous: {
    cefrLevel: 'A2',
    prerequisites: ['verb_present_simple_statement', 'verb_present_continuous_basic'],
    placementRisk: 'medium',
  },
  verb_third_person: { cefrLevel: 'A1', prerequisites: ['verb_present_simple_statement'], placementRisk: 'low' },
  verb_was_were: { cefrLevel: 'A2', prerequisites: ['to_be_present_agreement'], placementRisk: 'low' },
  word_order_basic_question: { cefrLevel: 'A1', prerequisites: ['word_order_basic_statement'], placementRisk: 'low' },
  word_order_basic_statement: { cefrLevel: 'A1', prerequisites: [], placementRisk: 'low' },
};

const entry = (
  id: PosMicroDiagnosisId,
  status: PersonalTrainingStatus,
  qaStatus: PersonalTrainingTaxonomyEntry['qaStatus'],
): PersonalTrainingTaxonomyEntry => {
  const cefrMetadata = CEFR_METADATA[id];

  if (!cefrMetadata) {
    throw new Error(`Missing Cambridge/CEFR metadata for personal training: ${id}`);
  }

  return {
    id,
    status,
    appPath: `app/diagnosis_training_${id}.ts`,
    sourceDraft: `tools/personal_training_agent_room/drafts/${id}.draft.md`,
    qaReport: `tools/personal_training_agent_room/reports/${id}-qa.md`,
    qaStatus,
    jesseStatus: 'reworked',
    jesseMarker: JESSE_REWORKED_MARKER,
    ...cefrMetadata,
  };
};

export const PERSONAL_TRAINING_TAXONOMY: PersonalTrainingTaxonomyEntry[] = [
  entry('article_a_an', 'active', 'PASS'),
  entry('article_zero', 'active', 'PASS'),
  entry('condition_second_basic', 'active', 'PASS'),
  entry('condition_zero_first', 'active', 'PASS'),
  entry('imperative_basic', 'active', 'PASS'),
  entry('modal_force', 'active', 'PASS'),
  entry('phrasal_particle_pair', 'active', 'PASS'),
  entry('preposition_duration_for_since', 'active', 'PASS'),
  entry('preposition_place_in_on_at', 'active', 'PASS'),
  entry('pronoun_case', 'active', 'PASS'),
  entry('pronoun_possessive', 'active', 'PASS'),
  entry('adjective_comparison', 'active', 'PASS'),
  entry('adjective_vs_adverb', 'active', 'PASS'),
  entry('adverb_frequency_position', 'active', 'PASS'),
  entry('too_enough', 'active', 'PASS'),
  entry('modifier_very_really_quite', 'active', 'PASS'),
  entry('conjunction_logic', 'active', 'PASS'),
  entry('quantifier_some_any', 'active', 'PASS'),
  entry('relative_clauses_who_which_that', 'active', 'PASS'),
  entry('reported_speech_basic', 'active', 'PASS'),
  entry('determiner_this_that_these_those', 'active', 'PASS'),
  entry('there_is_are', 'active', 'PASS'),
  entry('noun_singular_plural_basic', 'active', 'PASS'),
  entry('noun_possessive_apostrophe_s', 'active', 'PASS'),
  entry('to_be_present_agreement', 'active', 'PASS'),
  entry('modal_base_form', 'active', 'PASS'),
  entry('modal_should_must_have_to', 'active', 'PASS'),
  entry('modal_can_could_ability_request', 'active', 'PASS'),
  entry('modal_may_might_probability', 'active', 'PASS'),
  entry('verb_present_simple_negative_question', 'active', 'PASS'),
  entry('verb_present_simple_statement', 'active', 'PASS'),
  entry('word_order_basic_question', 'active', 'PASS'),

  entry('article_the_specific', 'active', 'PASS'),
  entry('preposition_time_in_on_at', 'active', 'PASS'),
  entry('preposition_time_place', 'active', 'PASS'),
  entry('preposition_direction_to_into_from', 'active', 'PASS'),
  entry('preposition_direction', 'active', 'PASS'),
  entry('preposition_common_verb_patterns', 'active', 'PASS'),
  entry('object_order_give_me_it', 'active', 'PASS'),
  entry('word_order_basic_statement', 'active', 'PASS'),
  entry('verb_present_continuous_basic', 'active', 'PASS'),
  entry('verb_present_simple_vs_continuous', 'active', 'PASS'),
  entry('verb_past_simple_regular_irregular', 'active', 'PASS'),
  entry('verb_past_simple_negative_question', 'active', 'PASS'),
  entry('verb_present_perfect_basic', 'active', 'PASS'),
  entry('present_perfect_vs_past_simple', 'active', 'PASS'),
  entry('present_perfect_questions_negatives', 'active', 'PASS'),
  entry('present_perfect_for_since', 'active', 'PASS'),
  entry('past_continuous_basic', 'active', 'PASS'),
  entry('past_simple_vs_past_continuous', 'active', 'PASS'),
  entry('used_to_basic', 'active', 'PASS'),
  entry('future_present_continuous_arrangements', 'active', 'PASS'),
  entry('verb_was_were', 'active', 'PASS'),
  entry('future_will_going_to', 'active', 'PASS'),
  entry('infinitive_vs_gerund_basic', 'active', 'PASS'),
  entry('verb_third_person', 'active', 'PASS'),
];

export const ACTIVE_PERSONAL_TRAINING_IDS = PERSONAL_TRAINING_TAXONOMY
  .filter((item) => item.status === 'active')
  .map((item) => item.id);

export const PERSONAL_TRAINING_CEFR_ORDER: Record<PersonalTrainingCefrLevel, number> = {
  A1: 1,
  A2: 2,
  'A2+': 3,
  B1: 4,
  'B1+': 5,
};

export function getPersonalTrainingTaxonomyEntry(
  id: PosMicroDiagnosisId | string,
): PersonalTrainingTaxonomyEntry | null {
  return PERSONAL_TRAINING_TAXONOMY.find((item) => item.id === id) ?? null;
}

export function getPersonalTrainingStatus(id: PosMicroDiagnosisId | string): PersonalTrainingStatus | null {
  return getPersonalTrainingTaxonomyEntry(id)?.status ?? null;
}

function shouldGatePersonalTraining(entry: PersonalTrainingTaxonomyEntry): boolean {
  return entry.placementRisk === 'high' || PERSONAL_TRAINING_CEFR_ORDER[entry.cefrLevel] >= PERSONAL_TRAINING_CEFR_ORDER['A2+'];
}

export function getFirstUnmetPersonalTrainingPrerequisite(
  id: PosMicroDiagnosisId | string,
  resolvedDiagnosisIds: ReadonlySet<string>,
): PosMicroDiagnosisId | null {
  const entry = getPersonalTrainingTaxonomyEntry(id);
  if (!entry || !shouldGatePersonalTraining(entry)) {
    return null;
  }

  for (const prerequisite of entry.prerequisites) {
    if (resolvedDiagnosisIds.has(prerequisite)) {
      continue;
    }

    return getFirstUnmetPersonalTrainingPrerequisite(prerequisite, resolvedDiagnosisIds) ?? prerequisite;
  }

  return null;
}

export function choosePersonalTrainingCandidate(
  candidates: readonly string[],
  resolvedDiagnosisIds: ReadonlySet<string> = new Set(),
): PosMicroDiagnosisId | null {
  for (const candidate of candidates) {
    const entry = getPersonalTrainingTaxonomyEntry(candidate);
    if (!entry || entry.status !== 'active') {
      continue;
    }

    return getFirstUnmetPersonalTrainingPrerequisite(entry.id, resolvedDiagnosisIds) ?? entry.id;
  }

  return null;
}
