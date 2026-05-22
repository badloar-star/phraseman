import fs from 'node:fs';
import path from 'node:path';
import { getDiagnosisTraining } from '../app/diagnosis_trainings';

const ROOT = path.resolve(__dirname, '..');
const PLANNED_LANGS = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

const BATCH = [
  {
    id: 'article_a_an',
    file: 'app/diagnosis_training_article_a_an.ts',
    recovery: 'diagnosis_training_recovery',
  },
  {
    id: 'article_the_specific',
    file: 'app/diagnosis_training_article_the_specific.ts',
    recovery: 'diagnosis_training_article_the_specific_recovery',
  },
  {
    id: 'article_zero',
    file: 'app/diagnosis_training_article_zero.ts',
    recovery: 'diagnosis_training_article_zero_recovery',
  },
  {
    id: 'conjunction_logic',
    file: 'app/diagnosis_training_conjunction_logic.ts',
    recovery: 'diagnosis_training_conjunction_logic_recovery',
  },
  {
    id: 'determiner_this_that_these_those',
    file: 'app/diagnosis_training_determiner_this_that_these_those.ts',
    recovery: 'diagnosis_training_determiner_demonstrative_recovery',
  },
  {
    id: 'modal_base_form',
    file: 'app/diagnosis_training_modal_base_form.ts',
    recovery: 'diagnosis_training_modal_base_form_recovery',
  },
  {
    id: 'modal_force',
    file: 'app/diagnosis_training_modal_force.ts',
    recovery: 'diagnosis_training_modal_force_recovery',
  },
  {
    id: 'noun_singular_plural_basic',
    file: 'app/diagnosis_training_noun_singular_plural_basic.ts',
    recovery: 'diagnosis_training_noun_singular_plural_basic_recovery',
  },
  {
    id: 'phrasal_particle_pair',
    file: 'app/diagnosis_training_phrasal_particle_pair.ts',
    recovery: 'diagnosis_training_phrasal_particle_pair_recovery',
  },
  {
    id: 'preposition_duration_for_since',
    file: 'app/diagnosis_training_preposition_duration_for_since.ts',
    recovery: 'diagnosis_training_preposition_duration_for_since_recovery',
  },
  {
    id: 'preposition_place_in_on_at',
    file: 'app/diagnosis_training_preposition_place_in_on_at.ts',
    recovery: 'diagnosis_training_preposition_place_in_on_at_recovery',
  },
  {
    id: 'preposition_time_in_on_at',
    file: 'app/diagnosis_training_preposition_time_in_on_at.ts',
    recovery: 'diagnosis_training_preposition_time_in_on_at_recovery',
  },
  {
    id: 'preposition_time_place',
    file: 'app/diagnosis_training_preposition_time_place.ts',
    recovery: 'diagnosis_training_preposition_time_place_recovery',
  },
  {
    id: 'pronoun_case',
    file: 'app/diagnosis_training_pronoun_case.ts',
    recovery: 'diagnosis_training_pronoun_case_recovery',
  },
  {
    id: 'pronoun_possessive',
    file: 'app/diagnosis_training_pronoun_possessive.ts',
    recovery: 'diagnosis_training_pronoun_possessive_recovery',
  },
  {
    id: 'quantifier_some_any',
    file: 'app/diagnosis_training_quantifier_some_any.ts',
    recovery: 'diagnosis_training_quantifier_some_any_recovery',
  },
  {
    id: 'there_is_are',
    file: 'app/diagnosis_training_there_is_are.ts',
    recovery: 'diagnosis_training_there_is_are_recovery',
  },
  {
    id: 'to_be_present_agreement',
    file: 'app/diagnosis_training_to_be_present_agreement.ts',
    recovery: 'diagnosis_training_to_be_present_agreement_recovery',
  },
  {
    id: 'verb_present_continuous_basic',
    file: 'app/diagnosis_training_verb_present_continuous_basic.ts',
    recovery: 'diagnosis_training_verb_present_continuous_basic_recovery',
  },
  {
    id: 'verb_present_simple_negative_question',
    file: 'app/diagnosis_training_verb_present_simple_negative_question.ts',
    recovery: 'diagnosis_training_verb_present_simple_negative_question_recovery',
  },
  {
    id: 'verb_present_simple_statement',
    file: 'app/diagnosis_training_verb_present_simple_statement.ts',
    recovery: 'diagnosis_training_verb_present_simple_statement_recovery',
  },
  {
    id: 'verb_present_simple_vs_continuous',
    file: 'app/diagnosis_training_verb_present_simple_vs_continuous.ts',
    recovery: 'diagnosis_training_verb_present_simple_vs_continuous_recovery',
  },
  {
    id: 'verb_third_person',
    file: 'app/diagnosis_training_verb_third_person.ts',
    recovery: 'diagnosis_training_verb_third_person_recovery',
  },
] as const;

const ADDITIONAL_RECOVERY_FILES = [
  'app/diagnosis_training_condition_second_basic.ts',
  'app/diagnosis_training_condition_zero_first.ts',
  'app/diagnosis_training_future_present_continuous_arrangements.ts',
  'app/diagnosis_training_future_will_going_to.ts',
  'app/diagnosis_training_imperative_basic.ts',
  'app/diagnosis_training_infinitive_vs_gerund_basic.ts',
  'app/diagnosis_training_modal_can_could_ability_request.ts',
  'app/diagnosis_training_modal_may_might_probability.ts',
  'app/diagnosis_training_modal_should_must_have_to.ts',
  'app/diagnosis_training_modifier_very_really_quite.ts',
  'app/diagnosis_training_noun_possessive_apostrophe_s.ts',
  'app/diagnosis_training_object_order_give_me_it.ts',
  'app/diagnosis_training_past_continuous_basic.ts',
  'app/diagnosis_training_past_simple_vs_past_continuous.ts',
  'app/diagnosis_training_preposition_common_verb_patterns.ts',
  'app/diagnosis_training_preposition_direction.ts',
  'app/diagnosis_training_preposition_direction_to_into_from.ts',
  'app/diagnosis_training_present_perfect_for_since.ts',
  'app/diagnosis_training_present_perfect_questions_negatives.ts',
  'app/diagnosis_training_present_perfect_vs_past_simple.ts',
  'app/diagnosis_training_relative_clauses_who_which_that.ts',
  'app/diagnosis_training_reported_speech_basic.ts',
  'app/diagnosis_training_too_enough.ts',
  'app/diagnosis_training_used_to_basic.ts',
  'app/diagnosis_training_verb_past_simple_negative_question.ts',
  'app/diagnosis_training_verb_past_simple_regular_irregular.ts',
  'app/diagnosis_training_verb_present_perfect_basic.ts',
  'app/diagnosis_training_verb_was_were.ts',
  'app/diagnosis_training_word_order_basic_question.ts',
  'app/diagnosis_training_word_order_basic_statement.ts',
] as const;

function recoveryCaseFromSource(file: string) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const id = path.basename(file, '.ts').replace(/^diagnosis_training_/, '');
  const recovery = source.match(/\brecovery:\s*'([^']+)'/)?.[1];
  if (!id || !recovery) throw new Error(`Missing id or recovery in ${file}`);
  return { id, file, recovery, source };
}

describe('diagnosis training telemetry recovery batch locale runtime', () => {
  it('moves selected trainings from legacy telemetry fallback to recovery', () => {
    for (const item of BATCH) {
      const training = getDiagnosisTraining(item.id as any);
      expect(training).toBeTruthy();
      expect(training!.analyticsEvents.recovery).toBe(item.recovery);

      const source = fs.readFileSync(path.join(ROOT, item.file), 'utf8');
      const legacyKey = `${['fall', 'back'].join('')}:`;
      const legacyEventSuffix = `_${['fall', 'back'].join('')}'`;
      expect(source).not.toContain(legacyKey);
      expect(source).not.toContain(legacyEventSuffix);
    }
  });

  it('moves the remaining diagnosis trainings from legacy telemetry fallback to recovery', () => {
    for (const item of ADDITIONAL_RECOVERY_FILES.map(recoveryCaseFromSource)) {
      const training = getDiagnosisTraining(item.id as any);
      expect(training).toBeTruthy();
      expect(training!.analyticsEvents.recovery).toBe(item.recovery);

      const legacyKey = `${['fall', 'back'].join('')}:`;
      const legacyEventSuffix = `_${['fall', 'back'].join('')}'`;
      expect(item.source).not.toContain(legacyKey);
      expect(item.source).not.toContain(legacyEventSuffix);
    }
  });

  it('keeps the shared analytics event type free of an explicit legacy fallback field', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'diagnosis_training_types.ts'), 'utf8');
    const legacyField = `${['fall', 'back'].join('')}?: string`;

    expect(source).not.toContain(legacyField);
    expect(source).toContain('recovery?: string');
    expect(source).toContain('[key: string]: unknown');
  });

  it('keeps planned fallback explanations explicit for selected trainings', () => {
    for (const item of BATCH) {
      const training = getDiagnosisTraining(item.id as any)!;
      for (const step of training.steps) {
        for (const lang of PLANNED_LANGS) {
          expect(step.fallbackExplanation[lang]).toEqual(expect.any(String));
          expect(step.fallbackExplanation[lang]).not.toMatch(/^needs-review:/u);
        }
      }
    }
  });

  it('does not alter fallback explanation review status in the telemetry-only batch', () => {
    for (const item of ADDITIONAL_RECOVERY_FILES.map(recoveryCaseFromSource)) {
      const training = getDiagnosisTraining(item.id as any)!;
      for (const step of training.steps) {
        for (const lang of PLANNED_LANGS) {
          expect(step.fallbackExplanation[lang]).toEqual(expect.any(String));
        }
      }
    }
  });
});
