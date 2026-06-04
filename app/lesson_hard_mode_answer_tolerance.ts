import type { LessonPhrase } from './lesson_data_types';
import type { StudyTargetLang } from './study_target_lang_dev';
import { phraseCanonicalAnswer } from './phrase_target_utils';
import { isCorrectAnswer } from '../constants/contractions';

const HARD_MODE_TYPED_ALTERNATIVES: Record<string, Partial<Record<StudyTargetLang, string[]>>> = {
  lesson8_phrase_26: {
    en: ['We have class on Tuesday'],
  },
};

export function lessonHardModeTypedAnswerAlternatives(
  phrase: LessonPhrase | null | undefined,
  studyTarget: StudyTargetLang,
): string[] {
  if (!phrase) return [];
  return HARD_MODE_TYPED_ALTERNATIVES[String(phrase.id)]?.[studyTarget] ?? [];
}

export function isCorrectLessonHardModeTypedAnswer(
  phrase: LessonPhrase | null | undefined,
  studyTarget: StudyTargetLang,
  userAnswer: string,
): boolean {
  const alternatives = lessonHardModeTypedAnswerAlternatives(phrase, studyTarget);
  if (!phrase || alternatives.length === 0) return false;
  return isCorrectAnswer(userAnswer, phraseCanonicalAnswer(phrase, studyTarget), alternatives);
}
