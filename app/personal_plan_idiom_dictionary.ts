/**
 * Dictionary of fixed/idiomatic English constructions whose Russian translation
 * is NOT word-for-word. When a plan phrase contains one of these, the learner
 * must be told WHY the translation differs from a literal reading — otherwise
 * assembling the phrase word-by-word feels "wrong".
 *
 * Each entry returns a ready explanation. Pure data + pure matchers, testable.
 */

export type IdiomExplanation = {
  /** Stable id of the matched construction (for analytics / dedup). */
  id: string;
  /** Short title shown above the explanation. */
  titleRu: string;
  /** Why the translation is not literal (the teaching point). */
  explanationRu: string;
};

type IdiomEntry = {
  id: string;
  /** Lowercase regex that detects the construction inside the english phrase. */
  pattern: RegExp;
  titleRu: string;
  explanationRu: string;
};

/**
 * Order matters: more specific multi-word constructions first so they win over
 * single-word entries.
 */
const IDIOM_ENTRIES: IdiomEntry[] = [
  // ─── Phrasal verbs ──────────────────────────────────────────────────────
  {
    id: 'follow_up',
    pattern: /\bfollow up\b/,
    titleRu: 'Фразовый глагол: follow up',
    explanationRu:
      '«follow up» — это не «следовать вверх». Это устойчивый глагол со значением «вернуться к вопросу позже / написать или напомнить после». Поэтому в переводе он звучит как «вернусь с ответом / напишу позже».',
  },
  {
    id: 'check_in',
    pattern: /\bcheck in\b/,
    titleRu: 'Фразовый глагол: check in',
    explanationRu:
      '«check in» — устойчивый глагол: «зарегистрироваться / отметиться / выйти на связь». Перевод по смыслу, не по отдельным словам check и in.',
  },
  {
    id: 'sort_out',
    pattern: /\bsort out\b/,
    titleRu: 'Фразовый глагол: sort out',
    explanationRu:
      '«sort out» значит «разобраться / уладить», а не «сортировать наружу». Это цельная конструкция.',
  },
  {
    id: 'figure_out',
    pattern: /\bfigure out\b/,
    titleRu: 'Фразовый глагол: figure out',
    explanationRu:
      '«figure out» = «разобраться / понять / вычислить». Слово figure тут не «фигура» — это часть устойчивого глагола.',
  },
  {
    id: 'run_out',
    pattern: /\brun out\b/,
    titleRu: 'Фразовый глагол: run out',
    explanationRu:
      '«run out» значит «закончиться / иссякнуть» (о времени, деньгах, запасе), а не «выбежать». Цельная конструкция.',
  },
  {
    id: 'get_back',
    pattern: /\bget back\b/,
    titleRu: 'Фразовый глагол: get back',
    explanationRu:
      '«get back (to you)» = «вернуться с ответом / ответить позже», а не «получить назад». Перевод по смыслу.',
  },
  {
    id: 'come_up',
    pattern: /\bcome up\b/,
    titleRu: 'Фразовый глагол: come up',
    explanationRu:
      '«come up» = «возникнуть / появиться» (о вопросе, проблеме), а не «подойти вверх».',
  },
  {
    id: 'look_for',
    pattern: /\blook for\b/,
    titleRu: 'Фразовый глагол: look for',
    explanationRu:
      '«look for» = «искать». Это устойчивая пара look + for; по отдельности это «смотреть» и «для».',
  },
  {
    id: 'look_forward',
    pattern: /\blook forward\b/,
    titleRu: 'Устойчивое: look forward to',
    explanationRu:
      '«look forward to» = «с нетерпением ждать». Целая конструкция, переводится по смыслу.',
  },
  {
    id: 'pick_up',
    pattern: /\bpick up\b/,
    titleRu: 'Фразовый глагол: pick up',
    explanationRu:
      '«pick up» = «забрать / поднять / подхватить» в зависимости от контекста, а не «выбрать вверх».',
  },
  {
    id: 'set_up',
    pattern: /\bset up\b/,
    titleRu: 'Фразовый глагол: set up',
    explanationRu:
      '«set up» = «настроить / организовать / назначить». Цельный глагол, не «ставить вверх».',
  },
  {
    id: 'hold_on',
    pattern: /\bhold on\b/,
    titleRu: 'Устойчивое: hold on',
    explanationRu:
      '«hold on» = «подожди / секунду», а не «держать на». Разговорная устойчивая фраза.',
  },

  // ─── Non-literal word choices ───────────────────────────────────────────
  {
    id: 'owner',
    pattern: /\bowner\b/,
    titleRu: 'Слово owner в рабочем контексте',
    explanationRu:
      'Здесь «owner» = «ответственный» (тот, на ком задача), а не «владелец». В рабочем английском owner — это человек, который отвечает за задачу или результат.',
  },
  {
    id: 'there_is_are',
    pattern: /\bthere (is|are|was|were)\b/,
    titleRu: 'Оборот there is / there are',
    explanationRu:
      '«there is / there are» переводится как «есть / имеется», а слово there тут НЕ значит «там». Это служебный оборот для сообщения о наличии чего-то.',
  },
  {
    id: 'it_takes',
    pattern: /\bit takes\b/,
    titleRu: 'Оборот it takes',
    explanationRu:
      '«it takes (time)» = «требуется / нужно (время)». Слово takes тут не «берёт» — это устойчивый оборот о затратах времени/усилий.',
  },
  {
    id: 'make_sure',
    pattern: /\bmake sure\b/,
    titleRu: 'Устойчивое: make sure',
    explanationRu:
      '«make sure» = «убедиться / проследить, чтобы». Не «сделать уверенным» — это цельная конструкция.',
  },
  {
    id: 'keep_in_mind',
    pattern: /\bkeep in mind\b/,
    titleRu: 'Устойчивое: keep in mind',
    explanationRu:
      '«keep in mind» = «иметь в виду / помнить». Переводится по смыслу, не по словам keep/in/mind.',
  },
  {
    id: 'on_my_way',
    pattern: /\bon my way\b/,
    titleRu: 'Устойчивое: on my way',
    explanationRu:
      '«on my way» = «уже еду / иду», а не «на моём пути». Разговорная устойчивая фраза.',
  },
  {
    id: 'in_charge',
    pattern: /\bin charge\b/,
    titleRu: 'Устойчивое: in charge',
    explanationRu:
      '«in charge (of)» = «ответственный / главный (за что-то)». Не «в заряде» — это идиома о руководстве.',
  },
];

/**
 * Returns the first matching idiom explanation for the phrase, or null.
 */
export function findIdiomExplanation(english: string): IdiomExplanation | null {
  const lower = english.toLowerCase();
  for (const entry of IDIOM_ENTRIES) {
    if (entry.pattern.test(lower)) {
      return {
        id: entry.id,
        titleRu: entry.titleRu,
        explanationRu: entry.explanationRu,
      };
    }
  }
  return null;
}

/** Exposed for tests / coverage reporting. */
export function idiomEntryCount(): number {
  return IDIOM_ENTRIES.length;
}
