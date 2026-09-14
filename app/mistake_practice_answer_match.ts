import { isCorrectAnswer } from '../constants/contractions';
import type { StudyTargetLang } from './study_target_lang_dev';

const normalized = (value: string): string => value
  .trim()
  .toLocaleLowerCase()
  .replace(/[.,!?;:'"”“’`]/g, '')
  .replace(/\s+/g, ' ');

export function matchesMistakePracticeAnswer(
  answer: string,
  expected: string,
  studyTarget: StudyTargetLang,
): boolean {
  if (studyTarget === 'en') {
    const withoutHarmlessPunctuation = (value: string): string => value.replace(/[.,!?;:"”“]/g, '');
    return isCorrectAnswer(
      withoutHarmlessPunctuation(answer),
      withoutHarmlessPunctuation(expected),
    );
  }
  return normalized(answer) === normalized(expected);
}
