import type { DiagnosisTraining } from './diagnosis_training_types';
import { ARTICLE_A_AN_TRAINING } from './diagnosis_training_article_a_an';
import { ARTICLE_THE_SPECIFIC_TRAINING } from './diagnosis_training_article_the_specific';
import { ARTICLE_ZERO_TRAINING } from './diagnosis_training_article_zero';
import { PREPOSITION_TIME_IN_ON_AT_TRAINING } from './diagnosis_training_preposition_time_in_on_at';
import { PREPOSITION_PLACE_IN_ON_AT_TRAINING } from './diagnosis_training_preposition_place_in_on_at';
import { PREPOSITION_TIME_PLACE_TRAINING } from './diagnosis_training_preposition_time_place';
import { PREPOSITION_DURATION_FOR_SINCE_TRAINING } from './diagnosis_training_preposition_duration_for_since';
import { PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING } from './diagnosis_training_preposition_direction_to_into_from';
import { PREPOSITION_DIRECTION_TRAINING } from './diagnosis_training_preposition_direction';
import { PREPOSITION_COMMON_VERB_PATTERNS_TRAINING } from './diagnosis_training_preposition_common_verb_patterns';
import { OBJECT_ORDER_GIVE_ME_IT_TRAINING } from './diagnosis_training_object_order_give_me_it';
import { WORD_ORDER_BASIC_STATEMENT_TRAINING } from './diagnosis_training_word_order_basic_statement';
import { WORD_ORDER_BASIC_QUESTION_TRAINING } from './diagnosis_training_word_order_basic_question';
import { IMPERATIVE_BASIC_TRAINING } from './diagnosis_training_imperative_basic';
import { CONDITION_ZERO_FIRST_TRAINING } from './diagnosis_training_condition_zero_first';
import { CONDITION_SECOND_BASIC_TRAINING } from './diagnosis_training_condition_second_basic';
import { RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING } from './diagnosis_training_relative_clauses_who_which_that';
import { REPORTED_SPEECH_BASIC_TRAINING } from './diagnosis_training_reported_speech_basic';
import { VERB_PRESENT_SIMPLE_NEGATIVE_QUESTION_TRAINING } from './diagnosis_training_verb_present_simple_negative_question';
import { VERB_PRESENT_CONTINUOUS_BASIC_TRAINING } from './diagnosis_training_verb_present_continuous_basic';
import { VERB_PRESENT_SIMPLE_VS_CONTINUOUS_TRAINING } from './diagnosis_training_verb_present_simple_vs_continuous';
import { VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING } from './diagnosis_training_verb_past_simple_regular_irregular';
import { VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING } from './diagnosis_training_verb_past_simple_negative_question';
import { VERB_PRESENT_PERFECT_BASIC_TRAINING } from './diagnosis_training_verb_present_perfect_basic';
import { PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING } from './diagnosis_training_present_perfect_vs_past_simple';
import { PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING } from './diagnosis_training_present_perfect_questions_negatives';
import { PRESENT_PERFECT_FOR_SINCE_TRAINING } from './diagnosis_training_present_perfect_for_since';
import { PAST_CONTINUOUS_BASIC_TRAINING } from './diagnosis_training_past_continuous_basic';
import { PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING } from './diagnosis_training_past_simple_vs_past_continuous';
import { USED_TO_BASIC_TRAINING } from './diagnosis_training_used_to_basic';
import { FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING } from './diagnosis_training_future_present_continuous_arrangements';
import { VERB_WAS_WERE_TRAINING } from './diagnosis_training_verb_was_were';
import { FUTURE_WILL_GOING_TO_TRAINING } from './diagnosis_training_future_will_going_to';
import { INFINITIVE_VS_GERUND_BASIC_TRAINING } from './diagnosis_training_infinitive_vs_gerund_basic';
import { TOO_ENOUGH_TRAINING } from './diagnosis_training_too_enough';
import { MODIFIER_VERY_REALLY_QUITE_TRAINING } from './diagnosis_training_modifier_very_really_quite';
import { VERB_PRESENT_SIMPLE_STATEMENT_TRAINING } from './diagnosis_training_verb_present_simple_statement';
import { VERB_THIRD_PERSON_TRAINING } from './diagnosis_training_verb_third_person';
import { TO_BE_PRESENT_AGREEMENT_TRAINING } from './diagnosis_training_to_be_present_agreement';
import { MODAL_BASE_FORM_TRAINING } from './diagnosis_training_modal_base_form';
import { MODAL_SHOULD_MUST_HAVE_TO_TRAINING } from './diagnosis_training_modal_should_must_have_to';
import { MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING } from './diagnosis_training_modal_can_could_ability_request';
import { MODAL_MAY_MIGHT_PROBABILITY_TRAINING } from './diagnosis_training_modal_may_might_probability';
import { MODAL_FORCE_TRAINING } from './diagnosis_training_modal_force';
import { PRONOUN_CASE_TRAINING } from './diagnosis_training_pronoun_case';
import { PRONOUN_POSSESSIVE_TRAINING } from './diagnosis_training_pronoun_possessive';
import { ADJECTIVE_COMPARISON_TRAINING } from './diagnosis_training_adjective_comparison';
import { ADJECTIVE_VS_ADVERB_TRAINING } from './diagnosis_training_adjective_vs_adverb';
import { ADVERB_FREQUENCY_POSITION_TRAINING } from './diagnosis_training_adverb_frequency_position';
import { CONJUNCTION_LOGIC_TRAINING } from './diagnosis_training_conjunction_logic';
import { PHRASAL_PARTICLE_PAIR_TRAINING } from './diagnosis_training_phrasal_particle_pair';
import { QUANTIFIER_SOME_ANY_TRAINING } from './diagnosis_training_quantifier_some_any';
import { DETERMINER_THIS_THAT_THESE_THOSE_TRAINING } from './diagnosis_training_determiner_this_that_these_those';
import { THERE_IS_ARE_TRAINING } from './diagnosis_training_there_is_are';
import { NOUN_SINGULAR_PLURAL_BASIC_TRAINING } from './diagnosis_training_noun_singular_plural_basic';
import { NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING } from './diagnosis_training_noun_possessive_apostrophe_s';

export const DIAGNOSIS_TRAININGS: Partial<Record<string, DiagnosisTraining>> = {};

export function getDiagnosisTraining(id?: string | null): DiagnosisTraining | null {
  if (!id) return null;
  if (id === 'article_a_an') return ARTICLE_A_AN_TRAINING;
  if (id === 'article_the_specific') return ARTICLE_THE_SPECIFIC_TRAINING;
  if (id === 'article_zero') return ARTICLE_ZERO_TRAINING;
  if (id === 'preposition_time_in_on_at') return PREPOSITION_TIME_IN_ON_AT_TRAINING;
  if (id === 'preposition_place_in_on_at') return PREPOSITION_PLACE_IN_ON_AT_TRAINING;
  if (id === 'preposition_time_place') return PREPOSITION_TIME_PLACE_TRAINING;
  if (id === 'preposition_duration_for_since') return PREPOSITION_DURATION_FOR_SINCE_TRAINING;
  if (id === 'preposition_direction_to_into_from') return PREPOSITION_DIRECTION_TO_INTO_FROM_TRAINING;
  if (id === 'preposition_direction') return PREPOSITION_DIRECTION_TRAINING;
  if (id === 'preposition_common_verb_patterns') return PREPOSITION_COMMON_VERB_PATTERNS_TRAINING;
  if (id === 'object_order_give_me_it') return OBJECT_ORDER_GIVE_ME_IT_TRAINING;
  if (id === 'word_order_basic_statement') return WORD_ORDER_BASIC_STATEMENT_TRAINING;
  if (id === 'word_order_basic_question') return WORD_ORDER_BASIC_QUESTION_TRAINING;
  if (id === 'imperative_basic') return IMPERATIVE_BASIC_TRAINING;
  if (id === 'condition_zero_first') return CONDITION_ZERO_FIRST_TRAINING;
  if (id === 'condition_second_basic') return CONDITION_SECOND_BASIC_TRAINING;
  if (id === 'relative_clauses_who_which_that') return RELATIVE_CLAUSES_WHO_WHICH_THAT_TRAINING;
  if (id === 'reported_speech_basic') return REPORTED_SPEECH_BASIC_TRAINING;
  if (id === 'verb_present_simple_negative_question') return VERB_PRESENT_SIMPLE_NEGATIVE_QUESTION_TRAINING;
  if (id === 'verb_present_continuous_basic') return VERB_PRESENT_CONTINUOUS_BASIC_TRAINING;
  if (id === 'verb_present_simple_vs_continuous') return VERB_PRESENT_SIMPLE_VS_CONTINUOUS_TRAINING;
  if (id === 'verb_past_simple_regular_irregular') return VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING;
  if (id === 'verb_past_simple_negative_question') return VERB_PAST_SIMPLE_NEGATIVE_QUESTION_TRAINING;
  if (id === 'verb_present_perfect_basic') return VERB_PRESENT_PERFECT_BASIC_TRAINING;
  if (id === 'present_perfect_vs_past_simple') return PRESENT_PERFECT_VS_PAST_SIMPLE_TRAINING;
  if (id === 'present_perfect_questions_negatives') return PRESENT_PERFECT_QUESTIONS_NEGATIVES_TRAINING;
  if (id === 'present_perfect_for_since') return PRESENT_PERFECT_FOR_SINCE_TRAINING;
  if (id === 'past_continuous_basic') return PAST_CONTINUOUS_BASIC_TRAINING;
  if (id === 'past_simple_vs_past_continuous') return PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING;
  if (id === 'used_to_basic') return USED_TO_BASIC_TRAINING;
  if (id === 'future_present_continuous_arrangements') return FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING;
  if (id === 'verb_was_were') return VERB_WAS_WERE_TRAINING;
  if (id === 'future_will_going_to') return FUTURE_WILL_GOING_TO_TRAINING;
  if (id === 'infinitive_vs_gerund_basic') return INFINITIVE_VS_GERUND_BASIC_TRAINING;
  if (id === 'too_enough') return TOO_ENOUGH_TRAINING;
  if (id === 'modifier_very_really_quite') return MODIFIER_VERY_REALLY_QUITE_TRAINING;
  if (id === 'verb_present_simple_statement') return VERB_PRESENT_SIMPLE_STATEMENT_TRAINING;
  if (id === 'verb_third_person') return VERB_THIRD_PERSON_TRAINING;
  if (id === 'to_be_present_agreement') return TO_BE_PRESENT_AGREEMENT_TRAINING;
  if (id === 'modal_may_might_probability') return MODAL_MAY_MIGHT_PROBABILITY_TRAINING;
  if (id === 'modal_can_could_ability_request') return MODAL_CAN_COULD_ABILITY_REQUEST_TRAINING;
  if (id === 'modal_should_must_have_to') return MODAL_SHOULD_MUST_HAVE_TO_TRAINING;
  if (id === 'modal_base_form') return MODAL_BASE_FORM_TRAINING;
  if (id === 'modal_force') return MODAL_FORCE_TRAINING;
  if (id === 'pronoun_case') return PRONOUN_CASE_TRAINING;
  if (id === 'pronoun_possessive') return PRONOUN_POSSESSIVE_TRAINING;
  if (id === 'adjective_comparison') return ADJECTIVE_COMPARISON_TRAINING;
  if (id === 'adjective_vs_adverb') return ADJECTIVE_VS_ADVERB_TRAINING;
  if (id === 'adverb_frequency_position') return ADVERB_FREQUENCY_POSITION_TRAINING;
  if (id === 'conjunction_logic') return CONJUNCTION_LOGIC_TRAINING;
  if (id === 'phrasal_particle_pair') return PHRASAL_PARTICLE_PAIR_TRAINING;
  if (id === 'quantifier_some_any') return QUANTIFIER_SOME_ANY_TRAINING;
  if (id === 'determiner_this_that_these_those') return DETERMINER_THIS_THAT_THESE_THOSE_TRAINING;
  if (id === 'there_is_are') return THERE_IS_ARE_TRAINING;
  if (id === 'noun_singular_plural_basic') return NOUN_SINGULAR_PLURAL_BASIC_TRAINING;
  if (id === 'noun_possessive_apostrophe_s') return NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING;
  return null;
}

export function getAllDiagnosisTrainings(): DiagnosisTraining[] {
  const ids = [
    'article_a_an',
    'article_the_specific',
    'article_zero',
    'preposition_time_in_on_at',
    'preposition_place_in_on_at',
    'preposition_time_place',
    'preposition_duration_for_since',
    'preposition_direction_to_into_from',
    'preposition_direction',
    'preposition_common_verb_patterns',
    'object_order_give_me_it',
    'word_order_basic_statement',
    'word_order_basic_question',
    'imperative_basic',
    'condition_zero_first',
    'condition_second_basic',
    'relative_clauses_who_which_that',
    'reported_speech_basic',
    'verb_present_simple_negative_question',
    'verb_present_continuous_basic',
    'verb_present_simple_vs_continuous',
    'verb_past_simple_regular_irregular',
    'verb_past_simple_negative_question',
    'verb_present_perfect_basic',
    'present_perfect_vs_past_simple',
    'present_perfect_questions_negatives',
    'present_perfect_for_since',
    'past_continuous_basic',
    'past_simple_vs_past_continuous',
    'used_to_basic',
    'future_present_continuous_arrangements',
    'verb_was_were',
    'future_will_going_to',
    'infinitive_vs_gerund_basic',
    'too_enough',
    'modifier_very_really_quite',
    'verb_present_simple_statement',
    'verb_third_person',
    'to_be_present_agreement',
    'modal_may_might_probability',
    'modal_can_could_ability_request',
    'modal_should_must_have_to',
    'modal_base_form',
    'modal_force',
    'pronoun_case',
    'pronoun_possessive',
    'adjective_comparison',
    'adjective_vs_adverb',
    'adverb_frequency_position',
    'conjunction_logic',
    'phrasal_particle_pair',
    'quantifier_some_any',
    'determiner_this_that_these_those',
    'there_is_are',
    'noun_singular_plural_basic',
    'noun_possessive_apostrophe_s',
  ];
  const trainings = ids.map((id) => getDiagnosisTraining(id)).filter((item): item is DiagnosisTraining => Boolean(item));
  return trainings;
}
