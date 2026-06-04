import type { LessonTeachingNote } from './lesson_data_types';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';
import { validatePlanPronunciationClaim } from './personal_plan_pronunciation_attempt';

export type PersonalPlanPronunciationRepeatItem = {
  id: string;
  promptRu: string;
  promptUk: string;
  targetText: string;
  completionLabel: string;
  scoringAvailable: false;
  grammarTags: string[];
  vocabularyTags: string[];
  explanation: LessonTeachingNote;
};

export type GetPersonalPlanPronunciationRepeatItemsInput = {
  lessonId: string;
  contentUnitIds: string[];
};

export type PersonalPlanPronunciationRepeatQualityIssueCode =
  | 'missing_prompt_ru'
  | 'missing_target_text'
  | 'missing_completion_label'
  | 'missing_explanation_copy'
  | 'fake_score_claim'
  | 'mojibake_copy';

export type PersonalPlanPronunciationRepeatQualityIssue = {
  code: PersonalPlanPronunciationRepeatQualityIssueCode;
  itemId: string;
  detail: string;
};

const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/u;

function fallbackExplanation(targetText: string): LessonTeachingNote {
  return {
    id: `pronunciation_repeat_${targetText.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    titleRu: 'Произнеси спокойно',
    correctRu: `Фраза записана: ${targetText}. Сейчас важен спокойный ритм: коротко, разборчиво, без гонки.`,
    wrongRu: 'Скажи фразу ещё раз медленнее: маленькая пауза между словами помогает не проглатывать короткие куски речи.',
  };
}

function explanationForPhrase(targetText: string, note?: LessonTeachingNote): LessonTeachingNote {
  if (!note) return fallbackExplanation(targetText);
  return {
    ...note,
    titleRu: 'Произнеси спокойно',
    correctRu: `Фраза записана: ${targetText}. Держи коротко и ровно: сначала смысл, потом скорость.`,
    wrongRu: 'Повтори фразу медленнее и проверь, что короткие слова прозвучали отдельно, а не слиплись в один комок.',
  };
}

function qualityIssue(
  code: PersonalPlanPronunciationRepeatQualityIssueCode,
  item: PersonalPlanPronunciationRepeatItem,
  detail: string,
): PersonalPlanPronunciationRepeatQualityIssue {
  return { code, itemId: item.id, detail };
}

export function validatePersonalPlanPronunciationRepeatItem(
  item: PersonalPlanPronunciationRepeatItem,
): PersonalPlanPronunciationRepeatQualityIssue[] {
  const issues: PersonalPlanPronunciationRepeatQualityIssue[] = [];
  const visibleCopy = [
    item.promptRu,
    item.promptUk,
    item.targetText,
    item.completionLabel,
    item.explanation.titleRu,
    item.explanation.correctRu,
    item.explanation.wrongRu,
  ].join('\n');

  if (!item.promptRu.trim()) {
    issues.push(qualityIssue('missing_prompt_ru', item, 'Pronunciation item needs a Russian prompt.'));
  }
  if (!item.targetText.trim()) {
    issues.push(qualityIssue('missing_target_text', item, 'Pronunciation item needs a target phrase.'));
  }
  if (!item.completionLabel.trim()) {
    issues.push(qualityIssue('missing_completion_label', item, 'Pronunciation item needs a completion button label.'));
  }
  if (!item.explanation.correctRu.trim() || !item.explanation.wrongRu.trim()) {
    issues.push(qualityIssue('missing_explanation_copy', item, 'Pronunciation item needs both success and retry explanations.'));
  }
  if (MOJIBAKE_RE.test(visibleCopy)) {
    issues.push(qualityIssue('mojibake_copy', item, 'Pronunciation item contains mojibake copy.'));
  }

  const claimChecks = [
    validatePlanPronunciationClaim({
      id: `${item.id}:title`,
      text: item.explanation.titleRu ?? '',
      requiresScoring: item.scoringAvailable,
    }, { scoringAvailable: item.scoringAvailable }),
    validatePlanPronunciationClaim({
      id: `${item.id}:correct`,
      text: item.explanation.correctRu,
      requiresScoring: item.scoringAvailable,
    }, { scoringAvailable: item.scoringAvailable }),
    validatePlanPronunciationClaim({
      id: `${item.id}:wrong`,
      text: item.explanation.wrongRu,
      requiresScoring: item.scoringAvailable,
    }, { scoringAvailable: item.scoringAvailable }),
  ];

  if (claimChecks.some((result) => result.issues.some((issue) => issue.code === 'fake_exact_scoring_claim'))) {
    issues.push(qualityIssue('fake_score_claim', item, 'Pronunciation item promises scoring before a scorer is available.'));
  }

  return issues;
}

export function getPersonalPlanPronunciationRepeatItems(
  input: GetPersonalPlanPronunciationRepeatItemsInput,
): PersonalPlanPronunciationRepeatItem[] {
  const lesson = getPersonalPlanPhraseLesson(input.lessonId);
  if (!lesson) return [];

  const requestedIds = new Set(input.contentUnitIds);
  return lesson.phrases
    .filter((phrase) => requestedIds.has(String(phrase.id)))
    .map((phrase) => {
      const meaningNote = [...phrase.words].reverse().find((word) => word.teachingNote)?.teachingNote;

      return {
        id: String(phrase.id),
        promptRu: phrase.russian,
        promptUk: phrase.ukrainian,
        targetText: phrase.english,
        completionLabel: 'Повторил',
        scoringAvailable: false,
        grammarTags: phrase.words.map((word) => word.category).filter(Boolean) as string[],
        vocabularyTags: [],
        explanation: explanationForPhrase(phrase.english, meaningNote),
      };
    });
}
