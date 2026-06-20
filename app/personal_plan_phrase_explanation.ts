/**
 * Builds meaningful, phrase-specific learner explanations for generated plan
 * phrases — replacing the previous generic "короткая готовая фраза" stub.
 *
 * For each phrase we explain THREE things the learner needs:
 *   1. what to assemble  (russian meaning -> english target)
 *   2. why it's built that way (grammar pattern of THIS phrase)
 *   3. a build hint (word-order / first-word cue)
 *
 * Pure functions, fully testable, no side effects.
 */

import { findIdiomExplanation } from './personal_plan_idiom_dictionary';

/** Одна строка во всех активных языках интерфейса (RU / UK / ES). */
export type LocalizedText = { ru: string; uk: string; es: string };

export type PhraseExplanation = {
  /** Short title shown above the explanation. */
  title: LocalizedText;
  /** What the learner should assemble + why (shown on correct/intro). */
  correct: LocalizedText;
  /** Gentle recovery hint (shown on a wrong attempt). */
  wrong: LocalizedText;
};

// Small RU<->EN literal gloss table to estimate how literal a translation is.
// Only common words that appear in plan phrases — enough to flag big divergence.
const LITERAL_GLOSS: Record<string, string[]> = {
  i: ['я'], we: ['мы'], you: ['ты', 'вы'], he: ['он'], she: ['она'], they: ['они'], it: ['это', 'оно'],
  need: ['нужно', 'нужен', 'нужна', 'нужны', 'надо'],
  want: ['хочу', 'хотим', 'хочешь'],
  can: ['могу', 'можем', 'можешь', 'можно'],
  will: ['буду', 'будем'],
  have: ['есть', 'имею'],
  not: ['не', 'нет'],
  now: ['сейчас'], today: ['сегодня'], tomorrow: ['завтра'], later: ['позже', 'потом'],
  help: ['помощь', 'помоги', 'помочь', 'помогите'],
  time: ['время', 'времени'],
  more: ['больше', 'ещё'],
  please: ['пожалуйста'],
  yes: ['да'], no: ['нет'],
  where: ['где', 'куда'], what: ['что'], when: ['когда'], how: ['как'], which: ['какой', 'какие', 'какую'],
  document: ['документ', 'документа'], form: ['форма', 'форму', 'форме'],
  send: ['отправлю', 'отправить', 'пришлю'],
  bring: ['принесу', 'принести'],
  clear: ['понятно', 'ясно'],
  deadline: ['срок', 'дедлайн'],
};

function literalCoverage(englishWords: string[], russianLower: string): number {
  if (englishWords.length === 0) return 1;
  let matched = 0;
  for (const w of englishWords) {
    const glosses = LITERAL_GLOSS[w.toLowerCase()];
    if (!glosses) {
      matched += 1; // unknown word: don't penalise (we can't judge it)
      continue;
    }
    if (glosses.some((g) => russianLower.includes(g))) matched += 1;
  }
  return matched / englishWords.length;
}

type GrammarPattern = {
  match: (englishLower: string, words: string[]) => boolean;
  title: LocalizedText;
  why: (english: string) => LocalizedText;
};

function words(english: string): string[] {
  return english
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function isQuestion(english: string): boolean {
  return english.trim().endsWith('?');
}

const PATTERNS: GrammarPattern[] = [
  {
    // Wh-questions: Where / What / Which / When / How / Who
    match: (lower) => /^(where|what|which|when|how|who|why)\b/.test(lower) && lower.includes('?'),
    title: {
      ru: 'Вопрос со словом-вопросом',
      uk: 'Питання зі словом-питанням',
      es: 'Pregunta con palabra interrogativa',
    },
    why: (en) => ({
      ru: `«${en}» начинается с вопросительного слова, а дальше идёт глагол. Это обычный порядок для вопросов: сначала «что/где/как», потом действие.`,
      uk: `«${en}» починається з питального слова, а далі йде дієслово. Це звичайний порядок для питань: спершу «що/де/як», потім дія.`,
      es: `«${en}» empieza con una palabra interrogativa y luego viene el verbo. Es el orden normal de las preguntas: primero «qué/dónde/cómo», después la acción.`,
    }),
  },
  {
    // Yes/no questions starting with can/could/do/does/is/are/will/should
    match: (lower) => /^(can|could|do|does|did|is|are|am|will|would|should|may|have|has)\b/.test(lower) && lower.includes('?'),
    title: {
      ru: 'Да/нет вопрос',
      uk: 'Так/ні питання',
      es: 'Pregunta de sí o no',
    },
    why: (en) => ({
      ru: `«${en}» — вопрос, где вспомогательный глагол стоит первым. Поэтому фраза начинается не с «я», а со слова вроде can/do/is.`,
      uk: `«${en}» — питання, де допоміжне дієслово стоїть першим. Тому фраза починається не з «я», а зі слова на кшталт can/do/is.`,
      es: `«${en}» es una pregunta donde el verbo auxiliar va primero. Por eso la frase no empieza con «yo», sino con una palabra como can/do/is.`,
    }),
  },
  {
    // Negation
    match: (lower) => /\b(not|n't|no)\b/.test(lower) || /n't/.test(lower),
    title: {
      ru: 'Отрицание',
      uk: 'Заперечення',
      es: 'Negación',
    },
    why: (en) => ({
      ru: `«${en}» содержит отрицание (not / don't). Частица отрицания ставится после вспомогательного глагола, а не в конец фразы.`,
      uk: `«${en}» містить заперечення (not / don't). Частка заперечення ставиться після допоміжного дієслова, а не в кінець фрази.`,
      es: `«${en}» contiene una negación (not / don't). La negación va después del verbo auxiliar, no al final de la frase.`,
    }),
  },
  {
    // Modal-driven (need / can / will / should / have to)
    match: (lower) => /^(i|we|you|they|he|she)\s+(need|can|will|should|must|have to|want)\b/.test(lower),
    title: {
      ru: 'Намерение или необходимость',
      uk: 'Намір або необхідність',
      es: 'Intención o necesidad',
    },
    why: (en) => ({
      ru: `«${en}» строится по схеме «кто + need/can/will + действие». Сначала кто, потом модальное слово, потом что сделать.`,
      uk: `«${en}» будується за схемою «хто + need/can/will + дія». Спершу хто, потім модальне слово, потім що зробити.`,
      es: `«${en}» sigue el esquema «quién + need/can/will + acción». Primero quién, luego la palabra modal y después qué hacer.`,
    }),
  },
  {
    // "There is / there are"
    match: (lower) => /^there\s+(is|are|was|were)\b/.test(lower),
    title: {
      ru: 'Есть / имеется',
      uk: 'Є / наявне',
      es: 'Hay / existe',
    },
    why: (en) => ({
      ru: `«${en}» использует оборот there is/are — так по-английски говорят «есть / имеется». Он всегда стоит в начале.`,
      uk: `«${en}» використовує зворот there is/are — так англійською кажуть «є / наявне». Він завжди стоїть на початку.`,
      es: `«${en}» usa la construcción there is/are — así se dice «hay / existe» en inglés. Siempre va al principio.`,
    }),
  },
];

const DEFAULT_PATTERN: GrammarPattern = {
  match: () => true,
  title: {
    ru: 'Утвердительная фраза',
    uk: 'Стверджувальна фраза',
    es: 'Frase afirmativa',
  },
  why: (en) => ({
    ru: `«${en}» построена по базовой схеме «кто → действие → остальное». Держи этот порядок слов, когда собираешь фразу.`,
    uk: `«${en}» побудована за базовою схемою «хто → дія → решта». Тримай цей порядок слів, коли збираєш фразу.`,
    es: `«${en}» se construye con el esquema básico «quién → acción → lo demás». Mantén ese orden de palabras al armar la frase.`,
  }),
};

function firstWord(english: string): string {
  return words(english)[0] ?? '';
}

/**
 * Returns the grammar pattern best matching the phrase.
 */
export function detectPhrasePattern(english: string): GrammarPattern {
  const lower = english.toLowerCase();
  const tokens = words(lower);
  // Question patterns take priority when the phrase is a question.
  const ordered = isQuestion(english)
    ? PATTERNS
    : PATTERNS.filter((p) => p.title.ru !== 'Вопрос со словом-вопросом' && p.title.ru !== 'Да/нет вопрос');
  for (const pattern of ordered) {
    if (pattern.match(lower, tokens)) return pattern;
  }
  return DEFAULT_PATTERN;
}

/**
 * Builds a complete, phrase-specific explanation from the english target and
 * its russian meaning.
 */
// Below this literal-coverage ratio the translation is considered "by meaning"
// (non-literal) and the learner gets a heads-up even if no idiom matched.
const DIVERGENCE_THRESHOLD = 0.5;

// «Что собрать»: одна и та же подводка к фразе во всех трёх языках.
function assembleLine(english: string, russian: string): LocalizedText {
  return {
    ru: `Нужно собрать: «${russian}» → «${english}».`,
    uk: `Треба зібрати: «${russian}» → «${english}».`,
    es: `Hay que armar: «${russian}» → «${english}».`,
  };
}

export function buildPhraseExplanation(english: string, russian: string): PhraseExplanation {
  const wordCount = words(english).length;
  const first = firstWord(english);
  const assemble = assembleLine(english, russian);

  const wrong: LocalizedText = {
    ru: [
      `Соберём заново спокойно. Смысл: «${russian}».`,
      wordCount > 1
        ? `Начни со слова «${first}» и держи порядок слов как в английской фразе.`
        : 'Выбери слово, которое точнее всего передаёт смысл.',
    ].join(' '),
    uk: [
      `Зберемо заново спокійно. Сенс: «${russian}».`,
      wordCount > 1
        ? `Почни зі слова «${first}» і тримай порядок слів як в англійській фразі.`
        : 'Обери слово, яке найточніше передає сенс.',
    ].join(' '),
    es: [
      `Vamos a armarla de nuevo con calma. Significado: «${russian}».`,
      wordCount > 1
        ? `Empieza por la palabra «${first}» y mantén el orden de palabras como en la frase en inglés.`
        : 'Elige la palabra que mejor transmita el significado.',
    ].join(' '),
  };

  // 1. Highest priority: a known fixed/idiomatic construction.
  const idiom = findIdiomExplanation(english);
  if (idiom) {
    return {
      title: idiom.title,
      correct: {
        ru: [assemble.ru, idiom.explanationRu].join(' '),
        uk: [assemble.uk, 'Це стійкий вислів — запам’ятай його цілком, не по окремих словах.'].join(' '),
        es: [assemble.es, idiom.explanationEs].join(' '),
      },
      wrong,
    };
  }

  // 2. Auto-detected non-literal translation (big divergence from a word gloss).
  const coverage = literalCoverage(words(english), russian.toLowerCase());
  if (wordCount >= 3 && coverage < DIVERGENCE_THRESHOLD) {
    return {
      title: {
        ru: 'Перевод по смыслу',
        uk: 'Переклад за змістом',
        es: 'Traducción por sentido',
      },
      correct: {
        ru: [
          assemble.ru,
          'Здесь перевод по смыслу, а не слово-в-слово: русская и английская фразы передают одно и то же, но строятся по-разному. Ориентируйся на смысл всей фразы, а не на отдельные слова.',
        ].join(' '),
        uk: [
          assemble.uk,
          'Тут переклад за змістом, а не слово в слово: фрази передають те саме, але будуються по-різному. Орієнтуйся на сенс усієї фрази, а не на окремі слова.',
        ].join(' '),
        es: [
          assemble.es,
          'Aquí la traducción es por sentido, no palabra por palabra: las frases dicen lo mismo, pero se construyen de forma distinta. Guíate por el significado de toda la frase, no por las palabras sueltas.',
        ].join(' '),
      },
      wrong,
    };
  }

  // 3. Fallback: grammatical pattern of the phrase.
  const pattern = detectPhrasePattern(english);
  const why = pattern.why(english);
  return {
    title: pattern.title,
    correct: {
      ru: [assemble.ru, why.ru].join(' '),
      uk: [assemble.uk, why.uk].join(' '),
      es: [assemble.es, why.es].join(' '),
    },
    wrong,
  };
}
