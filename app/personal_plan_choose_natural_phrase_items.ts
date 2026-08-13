import type { LessonTeachingNote } from './lesson_data_types';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';
import { stableShuffleAwayFromFirst } from './personal_plan_option_ordering';

export type PersonalPlanChooseNaturalPhraseItem = {
  id: string;
  promptRu: string;
  promptUk: string;
  promptEs?: string;
  correctAnswer: string;
  options: string[];
  grammarTags: string[];
  vocabularyTags: string[];
  explanation: LessonTeachingNote;
};

export type GetPersonalPlanChooseNaturalPhraseItemsInput = {
  lessonId: string;
  contentUnitIds: string[];
};

function compactUnique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function fallbackExplanation(correctAnswer: string): LessonTeachingNote {
  return {
    id: `choose_natural_${correctAnswer.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    titleRu: 'Почему этот вариант',
    titleEs: 'Por qué esta opción',
    correctRu: `${correctAnswer} подходит по смыслу и звучит как обычная короткая фраза. Здесь важно выбрать не красивость, а точное спокойное значение.`,
    correctEs: `${correctAnswer} encaja por sentido y suena como una frase corta normal. Aquí importa elegir no la opción más bonita, sino el significado exacto y tranquilo.`,
    wrongRu: 'Смотри на русский смысл целиком. Нужна фраза, которая передает именно эту мысль, а не просто похожие знакомые слова.',
    wrongEs: 'Mira el sentido completo. Necesitamos una frase que transmita justo esa idea, no solo palabras conocidas parecidas.',
  };
}

function choiceExplanationForPhrase(phraseEnglish: string, note?: LessonTeachingNote): LessonTeachingNote {
  if (!note) return fallbackExplanation(phraseEnglish);
  return {
    ...note,
    titleRu: note.titleRu ?? 'Почему этот вариант',
    titleEs: note.titleEs ?? 'Por qué esta opción',
    correctRu: note.correctRu,
    wrongRu: note.wrongRu,
  };
}

function optionDistractors(allAnswers: string[], correctAnswer: string): string[] {
  const distractors = compactUnique(allAnswers.filter((answer) => answer !== correctAnswer));
  if (distractors.length <= 7) return distractors;
  // Детерминированно отбираем 7 дистракторов равномерно по списку (без рандома).
  const last = distractors.length - 1;
  const picks = [0, 1, 2, 3, Math.floor(last / 2), last - 1, last];
  return compactUnique(picks.map((i) => distractors[i]));
}

export function getPersonalPlanChooseNaturalPhraseItems(
  input: GetPersonalPlanChooseNaturalPhraseItemsInput,
): PersonalPlanChooseNaturalPhraseItem[] {
  const lesson = getPersonalPlanPhraseLesson(input.lessonId);
  if (!lesson) return [];

  const requestedIds = new Set(input.contentUnitIds);
  const allAnswers = lesson.phrases.map((phrase) => phrase.english);

  return lesson.phrases
    .filter((phrase) => requestedIds.has(String(phrase.id)))
    .map((phrase) => {
      const meaningNote = [...phrase.words].reverse().find((word) => word.teachingNote)?.teachingNote;
      const options = stableShuffleAwayFromFirst(
        compactUnique([phrase.english, ...optionDistractors(allAnswers, phrase.english)]).slice(0, 8),
        `${lesson.id}:${phrase.id}:choose-natural`,
        (option) => option === phrase.english,
      );

      return {
        id: String(phrase.id),
        promptRu: phrase.russian,
        promptUk: phrase.ukrainian,
        ...(phrase.spanish ? { promptEs: phrase.spanish } : {}),
        correctAnswer: phrase.english,
        options,
        grammarTags: phrase.words.map((word) => word.category).filter(Boolean) as string[],
        vocabularyTags: [],
        explanation: choiceExplanationForPhrase(phrase.english, meaningNote),
      };
    });
}
