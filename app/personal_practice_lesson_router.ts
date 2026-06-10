// ═══════════════════════════════════════════════════════════════════════════
// personal_practice_lesson_router.ts — единый источник правды:
//   «слабая категория (часть речи) → доступный персональный микро-урок».
//
// Раньше эта логика жила приватной функцией внутри phrase_analytics_screen.tsx.
// Вынесена сюда, чтобы и экран аналитики, и сборщик еженедельного ИИ-разбора
// (weekly_review_briefing.ts) выбирали урок ОДИНАКОВО. Дубль = риск рассинхрона.
//
// Гейтинг: choosePersonalTrainingCandidate уважает CEFR-prerequisites,
// а getDiagnosisTrainingForTarget дополнительно режет French (source-gate).
// Поэтому рекомендация, прошедшая через chooseAvailableDiagnosisForCategory,
// ГАРАНТИРОВАННО доступна юзеру — ИИ не сможет посоветовать заблокированное.
// ═══════════════════════════════════════════════════════════════════════════

import { getDiagnosisTraining, getDiagnosisTrainingForTarget } from './diagnosis_trainings';
import { choosePersonalTrainingCandidate } from './personal_training_taxonomy';
import type { ResolvedPersonalTrainingsState } from './diagnosis_training_progress';
import type { WordCategory } from './pos_taxonomy';
import type { RuntimeStudyTarget } from './target_storage_keys';

/** Минимальная форма категории, нужная роутеру (берётся из WordCategoryStat). */
export interface CategoryRoutingInput {
  category: WordCategory;
  topWords: string[];
}

export function resolvedDiagnosisIdSet(resolved: ResolvedPersonalTrainingsState | null): Set<string> {
  return new Set(Object.keys(resolved?.diagnoses ?? {}));
}

/**
 * Для слабой категории и её топ-слов подбирает наиболее подходящий
 * microDiagnosisId-кандидат и пропускает его через prerequisite-гейт.
 * Возвращает id только если соответствующая тренировка реально существует.
 *
 * Это исходная логика экрана аналитики, без изменений поведения.
 */
export function chooseDiagnosisForCategory(
  stat: CategoryRoutingInput,
  resolved: ResolvedPersonalTrainingsState | null,
): string | null {
  const words = new Set(stat.topWords.map((word) => word.trim().toLowerCase()).filter(Boolean));
  const has = (...candidates: string[]) => candidates.some((word) => words.has(word));
  const hasPart = (...parts: string[]) => [...words].some((word) => parts.some((part) => word.includes(part)));

  const candidatesByCategory: Partial<Record<WordCategory, string[]>> = {
    article: has('a', 'an')
      ? ['article_a_an', 'article_zero']
      : has('the')
        ? ['article_the_specific', 'article_zero']
        : ['article_zero', 'article_a_an', 'article_the_specific'],
    preposition: has('for', 'since')
      ? ['preposition_duration_for_since']
      : has('to', 'into', 'from', 'out of', 'towards')
        ? ['preposition_direction_to_into_from', 'preposition_common_verb_patterns']
        : has('in', 'on', 'at')
          ? ['preposition_time_in_on_at', 'preposition_place_in_on_at']
          : ['preposition_common_verb_patterns', 'preposition_time_in_on_at'],
    verb: has('am', 'is', 'are', 'be', 'been')
      ? ['to_be_present_agreement', 'verb_present_continuous_basic']
      : has('was', 'were')
        ? ['verb_was_were']
        : has('do', 'does', "don't", "doesn't", 'did', "didn't")
          ? ['verb_present_simple_negative_question', 'verb_past_simple_negative_question']
          : hasPart('ing')
            ? ['verb_present_continuous_basic', 'verb_present_simple_vs_continuous']
            : has('have', 'has', 'ever', 'never', 'yet', 'already')
              ? ['verb_present_perfect_basic', 'present_perfect_vs_past_simple']
              : has('will', 'going')
                ? ['future_will_going_to', 'future_present_continuous_arrangements']
                : ['verb_present_simple_statement', 'verb_third_person'],
    'to-be': ['to_be_present_agreement', 'verb_was_were'],
    modal: has('may', 'might')
      ? ['modal_may_might_probability', 'modal_base_form']
      : has('can', 'could')
        ? ['modal_can_could_ability_request', 'modal_base_form']
        : has('should', 'must', 'have to', 'has to')
          ? ['modal_should_must_have_to', 'modal_base_form']
          : ['modal_base_form'],
    pronoun: has('my', 'mine', 'your', 'yours', 'his', 'her', 'hers', 'our', 'ours', 'their', 'theirs')
      ? ['pronoun_possessive', 'pronoun_case']
      : ['pronoun_case', 'pronoun_possessive'],
    adjective: ['adjective_comparison', 'adjective_vs_adverb'],
    adverb: ['adverb_frequency_position', 'adjective_vs_adverb'],
    modifier: has('very', 'really', 'quite') ? ['modifier_very_really_quite', 'too_enough'] : ['too_enough', 'modifier_very_really_quite'],
    syntax: ['word_order_basic_statement', 'word_order_basic_question', 'object_order_give_me_it'],
    conjunction: ['conjunction_logic'],
    determiner: has('this', 'that', 'these', 'those')
      ? ['determiner_this_that_these_those', 'quantifier_some_any']
      : ['quantifier_some_any', 'determiner_this_that_these_those'],
    existential: ['there_is_are'],
    noun: hasPart("'s") ? ['noun_possessive_apostrophe_s', 'noun_singular_plural_basic'] : ['noun_singular_plural_basic', 'noun_possessive_apostrophe_s'],
  };

  const candidates = candidatesByCategory[stat.category] ?? [];
  const routedId = choosePersonalTrainingCandidate(candidates, resolvedDiagnosisIdSet(resolved));
  return routedId && getDiagnosisTraining(routedId) ? routedId : null;
}

/**
 * Как chooseDiagnosisForCategory, но дополнительно проверяет study-target gate:
 * для French возвращает null (персональные тренировки на source-gate).
 * Используется сборщиком еженедельного разбора — гарантия, что в брифинг
 * попадут только реально доступные уроки.
 */
export function chooseAvailableDiagnosisForCategory(
  stat: CategoryRoutingInput,
  resolved: ResolvedPersonalTrainingsState | null,
  studyTarget?: RuntimeStudyTarget,
): string | null {
  const id = chooseDiagnosisForCategory(stat, resolved);
  if (!id) return null;
  return getDiagnosisTrainingForTarget(id, studyTarget) ? id : null;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
