// quiz_data.ts
// CLEARED: Waiting for new quiz data to be added
//
// Пулы фраз СТАТИЧЕСКИЕ — вручную выбраны по тегу уровня из lesson_data_all.ts.
// Уроки НЕ ТРОНУТЫ. Фразы не перемещаются между уроками.
//
// Дистракторы генерируются из правильного ответа (мутации):
//   D1: заменить вспомогательный/модальный глагол (was→were, will→would итд)
//   D2: добавить/убрать "not"
//   D3: заменить местоимение (I→He, She→They итд)
//   D4: заменить последнее слово на похожее
//   D5: поменять форму глагола

import { PhraseLevel } from './lesson_data_all';

export interface QuizPhrase {
  ru: string;
  uk: string;
  choices: string[];
  correct: number;
  answer: string;
  lessonNum: number;
  level: PhraseLevel;
}

type QuizPoolEntry = {
  ru: string;
  uk: string;
  english: string;
  lessonNum: number;
  level: PhraseLevel;
};

// ============================================
// QUIZ POOLS - EMPTY, AWAITING NEW DATA
// ============================================

const EASY_POOL: QuizPoolEntry[] = [];
const MEDIUM_POOL: QuizPoolEntry[] = [];
const HARD_POOL: QuizPoolEntry[] = [];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

const makeMutations = (answer: string): string[] => {
  return [];
};

export const getQuizPhrases = (
  difficulty: 'easy' | 'medium' | 'hard',
  count: number = 10,
  lang: 'ru' | 'uk' = 'ru'
): QuizPhrase[] => {
  const pool = difficulty === 'easy' ? EASY_POOL : difficulty === 'medium' ? MEDIUM_POOL : HARD_POOL;

  if (pool.length === 0) {
    return [];
  }

  const selected: QuizPoolEntry[] = [];
  const usedAnswers = new Set<string>();

  const shuffled = shuffle(pool);

  for (const item of shuffled) {
    if (selected.length >= count) break;
    if (!usedAnswers.has(item.english)) {
      selected.push(item);
      usedAnswers.add(item.english);
    }
  }

  return selected.map(entry => {
    const answer = entry.english;
    const prompt = lang === 'uk' ? entry.uk : entry.ru;

    const mutations = makeMutations(answer);
    const distractors: string[] = [];
    for (const m of mutations) {
      if (distractors.length >= 3) break;
      if (m !== answer && !distractors.includes(m)) distractors.push(m);
    }

    const fallbacks = [
      'No, ' + answer.charAt(0).toLowerCase() + answer.slice(1),
      answer + ', right?',
      'Please ' + answer.charAt(0).toLowerCase() + answer.slice(1),
      'Yes, ' + answer.charAt(0).toLowerCase() + answer.slice(1),
    ].filter(m => m !== answer && !distractors.includes(m));

    while (distractors.length < 3 && fallbacks.length > 0) {
      distractors.push(fallbacks.shift()!);
    }
    let safeIdx = 1;
    while (distractors.length < 3) distractors.push(answer + ' (' + safeIdx++ + ')');

    const allChoices = shuffle([...distractors.slice(0, 3), answer]);
    const correct = allChoices.indexOf(answer);

    return {
      ru:      entry.ru,
      uk:      entry.uk,
      choices: allChoices,
      correct: correct === -1 ? 3 : correct,
      answer,
      lessonNum: entry.lessonNum,
      level:   entry.level as PhraseLevel,
    };
  });
};

export default { getQuizPhrases };
