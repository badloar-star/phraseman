import type { LessonPhrase, LessonTeachingNote, LessonWord } from './lesson_data_types';
import type { PersonalPlanId } from './personal_plan_catalog';
import {
  buildGavanWeek1CanonicalPlan,
  type GavanCanonicalDay,
  type GavanCanonicalPhrase,
} from './personal_plan_gavan_week1_canonical_plan';

export type PersonalPlanPhraseLesson = {
  id: string;
  planId: PersonalPlanId;
  title: string;
  subtitle: string;
  afterLessonId: number;
  rationale: string;
  phrases: LessonPhrase[];
};

function note(id: string, titleRu: string, correctRu: string, wrongRu: string) {
  return {
    id,
    titleRu,
    correctRu,
    correctUk: correctRu,
    correctEs: correctRu,
    wrongRu,
    wrongUk: wrongRu,
    wrongEs: wrongRu,
  };
}

const toBeNote = note(
  'gavan_d1_to_be_short',
  'Коротко и спокойно',
  'В английском в такой фразе нужен маленький глагол-связка: I am, You are, It is. В живой речи это часто сжимается до I’m, You’re, It’s.',
  'Если убрать am / are / is, английская фраза звучит как недособранная. По-русски можно сказать короче, а в английском связку лучше оставить.',
);

const clearNote = note(
  'gavan_d1_clear',
  'Clear = понятно',
  'Clear здесь значит “понятно / ясно”. It’s not clear — мягкий способ сказать, что мысль пока не разобралась.',
  'Clear не про чистоту стола. В разговоре это часто про ясность: понятно человеку или нет.',
);

const hereNote = note(
  'gavan_d1_here',
  'Here = здесь',
  'Here помогает коротко обозначить присутствие: I’m here. Без объяснений на три этажа.',
  'Here легко спутать с hear на слух. В этой фразе нужен here — место, где ты находишься.',
);

export const PERSONAL_PLAN_PHRASE_LESSONS: Record<string, PersonalPlanPhraseLesson> = {
  gavan_day1_short_replies: {
    id: 'gavan_day1_short_replies',
    planId: 'gavan',
    title: 'Короткие ответы',
    subtitle: 'Фразы, которые помогают ответить спокойно и не раздувать разговор.',
    afterLessonId: 1,
    rationale: 'Сначала урок 1 дает I am / You are / It is. Здесь те же конструкции работают в обычных коротких ответах.',
    phrases: [
      {
        id: 'gavan_d1_phrase_1',
        english: "I'm here.",
        russian: 'Я здесь.',
        ukrainian: 'Я тут.',
        spanish: 'Я здесь.',
        words: [
          { text: "I'm", correct: "I'm", distractors: ["You're", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'here', correct: 'here', distractors: ['hear', 'there', 'her', 'where'], category: 'place', teachingNote: hereNote },
        ],
      },
      {
        id: 'gavan_d1_phrase_2',
        english: "I'm okay.",
        russian: 'Я в порядке.',
        ukrainian: 'Я в порядку.',
        spanish: 'Я в порядке.',
        words: [
          { text: "I'm", correct: "I'm", distractors: ["You're", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'okay', correct: 'okay', distractors: ['ready', 'right', 'busy', 'safe'], category: 'adjective', teachingNote: note('gavan_d1_okay', 'Okay = нормально', 'Okay — простой способ сказать, что все нормально. Не торжественно, не сухо, просто понятно.', 'Okay не значит “идеально”. Это спокойное “нормально / все в порядке”.') },
        ],
      },
      {
        id: 'gavan_d1_phrase_3',
        english: "It's okay.",
        russian: 'Все нормально.',
        ukrainian: 'Все нормально.',
        spanish: 'Все нормально.',
        words: [
          { text: "It's", correct: "It's", distractors: ["I'm", "You're", "We're", "He's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'okay', correct: 'okay', distractors: ['ready', 'right', 'busy', 'safe'], category: 'adjective', teachingNote: note('gavan_d1_it_okay', 'It’s okay', 'It’s okay — короткое “все нормально”. Подходит, когда не хочется звучать драматично.', 'It’s здесь не “это” в тяжелом смысле. Это обычная связка для короткой оценки ситуации.') },
        ],
      },
      {
        id: 'gavan_d1_phrase_4',
        english: "It's not clear.",
        russian: 'Пока непонятно.',
        ukrainian: 'Поки незрозуміло.',
        spanish: 'Пока непонятно.',
        words: [
          { text: "It's", correct: "It's", distractors: ["I'm", "You're", "We're", "He's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'not', correct: 'not', distractors: ['now', 'no', 'note', 'none'], category: 'negative', teachingNote: note('gavan_d1_not', 'Not = не', 'Not ставит спокойное отрицание: it’s clear — понятно, it’s not clear — непонятно.', 'Not нельзя заменить на no внутри такой фразы. No обычно отдельный ответ, а not работает внутри предложения.') },
          { text: 'clear', correct: 'clear', distractors: ['clean', 'close', 'cheap', 'calm'], category: 'adjective', teachingNote: clearNote },
        ],
      },
      {
        id: 'gavan_d1_phrase_5',
        english: "You're right.",
        russian: 'Вы правы.',
        ukrainian: 'Ви праві.',
        spanish: 'Вы правы.',
        words: [
          { text: "You're", correct: "You're", distractors: ["I'm", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'right', correct: 'right', distractors: ['write', 'ready', 'wrong', 'bright'], category: 'adjective', teachingNote: note('gavan_d1_right', 'Right = правы', 'You’re right — короткое согласие без лишней церемонии. Хорошая фраза, когда человек объяснил верно.', 'Right здесь не “право” и не направление. В этой фразе это “прав / права / правы”.') },
        ],
      },
    ],
  },
};

const GAVAN_WEEK1_CANONICAL_MEDIA_LESSON_RE = /^gavan_week1_day([1-7])_canonical_media$/;

function compactUnique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, '');
}

function targetWordsForPhrase(phrase: GavanCanonicalPhrase): string[] {
  return phrase.english
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function canonicalWordCategory(phrase: GavanCanonicalPhrase, word: string): string {
  const norm = normalized(word);
  if (phrase.firstSeenConstructions.some((item) => normalized(item).split(/\s+/).includes(norm))) {
    return 'grammar';
  }
  if (phrase.newWords.some((item) => normalized(item).split(/\s+/).includes(norm))) {
    return 'vocabulary';
  }
  return 'phrase';
}

function canonicalWordDistractors(day: GavanCanonicalDay, word: string): string[] {
  const norm = normalized(word);
  const dayWords = day.phrases
    .flatMap(targetWordsForPhrase)
    .filter((candidate) => normalized(candidate) !== norm);
  const defaults = ['please', 'now', 'again', 'here', 'that', 'okay', 'right', 'check']
    .filter((candidate) => normalized(candidate) !== norm);

  return compactUnique([...dayWords, ...defaults]).slice(0, 5);
}

function canonicalTeachingNote(phrase: GavanCanonicalPhrase): LessonTeachingNote {
  const card = phrase.explanationCards[0];
  const fallback = `${phrase.english} работает как короткая готовая фраза. Сначала держим общий смысл, потом уже отдельные слова.`;

  return {
    id: card?.id ?? `${phrase.id}:canonical-note`,
    titleRu: card?.covers?.[0] ? `Фраза: ${card.covers[0]}` : 'Слушаем фразу целиком',
    correctRu: card?.correctRu ?? fallback,
    correctUk: card?.correctRu ?? fallback,
    correctEs: card?.correctRu ?? fallback,
    wrongRu: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
    wrongUk: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
    wrongEs: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
  };
}

function canonicalWordsForPhrase(day: GavanCanonicalDay, phrase: GavanCanonicalPhrase): LessonWord[] {
  const words = targetWordsForPhrase(phrase);
  const note = canonicalTeachingNote(phrase);

  return words.map((word, index) => ({
    text: word,
    correct: word,
    distractors: canonicalWordDistractors(day, word),
    category: canonicalWordCategory(phrase, word),
    ...(index === words.length - 1 ? { teachingNote: note } : {}),
  }));
}

function buildGavanCanonicalMediaPhraseLesson(day: GavanCanonicalDay): PersonalPlanPhraseLesson {
  const afterLessonId = day.exerciseBlocks
    .flatMap((block) => block.prerequisiteLessonIds)
    .find((lessonId) => Number.isFinite(lessonId)) ?? 1;

  return {
    id: `gavan_week1_day${day.dayIndex}_canonical_media`,
    planId: 'gavan',
    title: day.titleRu,
    subtitle: day.goalRu,
    afterLessonId,
    rationale: day.prerequisiteSummaryRu,
    phrases: day.phrases.map((phrase) => ({
      id: phrase.id,
      english: phrase.english,
      russian: phrase.ru,
      ukrainian: phrase.ru,
      spanish: phrase.ru,
      words: canonicalWordsForPhrase(day, phrase),
    })),
  };
}

export function getGavanCanonicalMediaPhraseLesson(id: string): PersonalPlanPhraseLesson | null {
  const match = GAVAN_WEEK1_CANONICAL_MEDIA_LESSON_RE.exec(id);
  if (!match) return null;

  const dayIndex = Number(match[1]);
  const day = buildGavanWeek1CanonicalPlan().days.find((item) => item.dayIndex === dayIndex);
  return day ? buildGavanCanonicalMediaPhraseLesson(day) : null;
}

function cleanPlanUserName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, 32) : 'Phraseman';
}

export function personalizePlanPhraseLesson(
  lesson: PersonalPlanPhraseLesson,
  userName: string | null | undefined,
): PersonalPlanPhraseLesson {
  const name = cleanPlanUserName(userName);
  const fill = (text: string | undefined): string | undefined => text?.replace(/\{\{name\}\}/g, name);
  return {
    ...lesson,
    title: fill(lesson.title) ?? lesson.title,
    subtitle: fill(lesson.subtitle) ?? lesson.subtitle,
    rationale: fill(lesson.rationale) ?? lesson.rationale,
    phrases: lesson.phrases.map((phrase) => ({
      ...phrase,
      english: fill(phrase.english) ?? phrase.english,
      spanish: fill(phrase.spanish),
      russian: fill(phrase.russian) ?? phrase.russian,
      ukrainian: fill(phrase.ukrainian) ?? phrase.ukrainian,
      words: phrase.words?.map((word) => ({
        ...word,
        text: fill(word.text) ?? word.text,
        correct: fill(word.correct) ?? word.correct,
        distractors: word.distractors.map((item) => fill(item) ?? item),
      })),
    })),
  };
}

export function getPersonalPlanPhraseLesson(id: string | string[] | undefined): PersonalPlanPhraseLesson | null {
  const lessonId = Array.isArray(id) ? id[0] : id;
  if (!lessonId) return null;
  return PERSONAL_PLAN_PHRASE_LESSONS[lessonId] ?? getGavanCanonicalMediaPhraseLesson(lessonId);
}
