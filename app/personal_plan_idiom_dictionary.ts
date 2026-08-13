/**
 * Dictionary of fixed/idiomatic English constructions whose Russian translation
 * is NOT word-for-word. When a plan phrase contains one of these, the learner
 * must be told WHY the translation differs from a literal reading — otherwise
 * assembling the phrase word-by-word feels "wrong".
 *
 * Each entry returns a ready explanation. Pure data + pure matchers, testable.
 */

/** Одна строка во всех активных языках интерфейса. */
export type LocalizedText = { ru: string; uk: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string };

export type IdiomExplanation = {
  /** Stable id of the matched construction (for analytics / dedup). */
  id: string;
  /** Short title shown above the explanation (RU / UK / ES). */
  title: LocalizedText;
  /** Why the translation is not literal (the teaching point). */
  explanationRu: string;
  explanationEs: string;
};

type IdiomEntry = {
  id: string;
  /** Lowercase regex that detects the construction inside the english phrase. */
  pattern: RegExp;
  titleRu: string;
  explanationRu: string;
  explanationEs: string;
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
    explanationEs:
      '«follow up» no es «seguir hacia arriba». Es un verbo compuesto con el sentido de volver a un asunto más tarde, escribir después o recordarlo. Por eso se traduce por sentido: «volveré con una respuesta / escribiré más tarde».',
  },
  {
    id: 'check_in',
    pattern: /\bcheck in\b/,
    titleRu: 'Фразовый глагол: check in',
    explanationRu:
      '«check in» — устойчивый глагол: «зарегистрироваться / отметиться / выйти на связь». Перевод по смыслу, не по отдельным словам check и in.',
    explanationEs:
      '«check in» es un verbo compuesto: registrarse, avisar que llegaste o ponerse en contacto. Se traduce por sentido, no por separado como check + in.',
  },
  {
    id: 'sort_out',
    pattern: /\bsort out\b/,
    titleRu: 'Фразовый глагол: sort out',
    explanationRu:
      '«sort out» значит «разобраться / уладить», а не «сортировать наружу». Это цельная конструкция.',
    explanationEs:
      '«sort out» significa resolver, aclarar o arreglar algo. No se traduce palabra por palabra como sort + out: funciona como una unidad.',
  },
  {
    id: 'figure_out',
    pattern: /\bfigure out\b/,
    titleRu: 'Фразовый глагол: figure out',
    explanationRu:
      '«figure out» = «разобраться / понять / вычислить». Слово figure тут не «фигура» — это часть устойчивого глагола.',
    explanationEs:
      '«figure out» significa entender, averiguar o resolver. Figure aquí no es «figura»: forma parte de un verbo compuesto.',
  },
  {
    id: 'run_out',
    pattern: /\brun out\b/,
    titleRu: 'Фразовый глагол: run out',
    explanationRu:
      '«run out» значит «закончиться / иссякнуть» (о времени, деньгах, запасе), а не «выбежать». Цельная конструкция.',
    explanationEs:
      '«run out» significa acabarse o quedarse sin algo, por ejemplo tiempo, dinero o reservas. No es «salir corriendo»: es una construcción fija.',
  },
  {
    id: 'get_back',
    pattern: /\bget back\b/,
    titleRu: 'Фразовый глагол: get back',
    explanationRu:
      '«get back (to you)» = «вернуться с ответом / ответить позже», а не «получить назад». Перевод по смыслу.',
    explanationEs:
      '«get back (to you)» significa volver con una respuesta o contestar más tarde. No es «recibir de vuelta» en este contexto: se traduce por sentido.',
  },
  {
    id: 'come_up',
    pattern: /\bcome up\b/,
    titleRu: 'Фразовый глагол: come up',
    explanationRu:
      '«come up» = «возникнуть / появиться» (о вопросе, проблеме), а не «подойти вверх».',
    explanationEs:
      '«come up» significa surgir o aparecer, por ejemplo una pregunta o un problema. No se entiende literalmente como «venir hacia arriba».',
  },
  {
    id: 'look_for',
    pattern: /\blook for\b/,
    titleRu: 'Фразовый глагол: look for',
    explanationRu:
      '«look for» = «искать». Это устойчивая пара look + for; по отдельности это «смотреть» и «для».',
    explanationEs:
      '«look for» significa buscar. Es una combinación fija de look + for; por separado las palabras no dan el sentido correcto.',
  },
  {
    id: 'look_forward',
    pattern: /\blook forward\b/,
    titleRu: 'Устойчивое: look forward to',
    explanationRu:
      '«look forward to» = «с нетерпением ждать». Целая конструкция, переводится по смыслу.',
    explanationEs:
      '«look forward to» significa esperar algo con ilusión. Es una construcción completa y se traduce por sentido.',
  },
  {
    id: 'pick_up',
    pattern: /\bpick up\b/,
    titleRu: 'Фразовый глагол: pick up',
    explanationRu:
      '«pick up» = «забрать / поднять / подхватить» в зависимости от контекста, а не «выбрать вверх».',
    explanationEs:
      '«pick up» puede significar recoger, levantar o pasar a buscar, según el contexto. No es «elegir arriba»: se lee como verbo compuesto.',
  },
  {
    id: 'set_up',
    pattern: /\bset up\b/,
    titleRu: 'Фразовый глагол: set up',
    explanationRu:
      '«set up» = «настроить / организовать / назначить». Цельный глагол, не «ставить вверх».',
    explanationEs:
      '«set up» significa configurar, organizar o programar algo. Es un verbo compuesto completo, no «poner arriba».',
  },
  {
    id: 'hold_on',
    pattern: /\bhold on\b/,
    titleRu: 'Устойчивое: hold on',
    explanationRu:
      '«hold on» = «подожди / секунду», а не «держать на». Разговорная устойчивая фраза.',
    explanationEs:
      '«hold on» significa espera o un segundo. Es una expresión conversacional fija, no «sujetar sobre».',
  },

  // ─── Non-literal word choices ───────────────────────────────────────────
  {
    id: 'owner',
    pattern: /\bowner\b/,
    titleRu: 'Слово owner в рабочем контексте',
    explanationRu:
      'Здесь «owner» = «ответственный» (тот, на ком задача), а не «владелец». В рабочем английском owner — это человек, который отвечает за задачу или результат.',
    explanationEs:
      'Aquí «owner» significa la persona responsable de una tarea, no necesariamente el propietario. En inglés laboral es quien se hace cargo del resultado.',
  },
  {
    id: 'there_is_are',
    pattern: /\bthere (is|are|was|were)\b/,
    titleRu: 'Оборот there is / there are',
    explanationRu:
      '«there is / there are» переводится как «есть / имеется», а слово there тут НЕ значит «там». Это служебный оборот для сообщения о наличии чего-то.',
    explanationEs:
      '«there is / there are» se usa para decir que algo existe o está disponible. There aquí no significa «allí»: es una construcción gramatical.',
  },
  {
    id: 'it_takes',
    pattern: /\bit takes\b/,
    titleRu: 'Оборот it takes',
    explanationRu:
      '«it takes (time)» = «требуется / нужно (время)». Слово takes тут не «берёт» — это устойчивый оборот о затратах времени/усилий.',
    explanationEs:
      '«it takes (time)» significa que algo requiere tiempo o esfuerzo. Takes aquí no es «toma» literalmente: es una construcción fija.',
  },
  {
    id: 'make_sure',
    pattern: /\bmake sure\b/,
    titleRu: 'Устойчивое: make sure',
    explanationRu:
      '«make sure» = «убедиться / проследить, чтобы». Не «сделать уверенным» — это цельная конструкция.',
    explanationEs:
      '«make sure» significa asegurarse de algo o comprobar que ocurra. No es «hacer seguro» palabra por palabra.',
  },
  {
    id: 'keep_in_mind',
    pattern: /\bkeep in mind\b/,
    titleRu: 'Устойчивое: keep in mind',
    explanationRu:
      '«keep in mind» = «иметь в виду / помнить». Переводится по смыслу, не по словам keep/in/mind.',
    explanationEs:
      '«keep in mind» significa tener en cuenta o recordar. Se traduce por sentido, no palabra por palabra.',
  },
  {
    id: 'on_my_way',
    pattern: /\bon my way\b/,
    titleRu: 'Устойчивое: on my way',
    explanationRu:
      '«on my way» = «уже еду / иду», а не «на моём пути». Разговорная устойчивая фраза.',
    explanationEs:
      '«on my way» significa que ya vas de camino. No se traduce literalmente como «en mi camino».',
  },
  {
    id: 'in_charge',
    pattern: /\bin charge\b/,
    titleRu: 'Устойчивое: in charge',
    explanationRu:
      '«in charge (of)» = «ответственный / главный (за что-то)». Не «в заряде» — это идиома о руководстве.',
    explanationEs:
      '«in charge (of)» significa responsable o a cargo de algo. No tiene que ver con una carga eléctrica: es una expresión de responsabilidad.',
  },
];

// Заголовки идиом в словаре написаны по-русски и следуют нескольким шаблонам
// («Фразовый глагол: X», «Устойчивое: X», «Оборот X», «Слово owner …»).
// Английский термин внутри заголовка не переводим — переводим только русскую
// обёртку-ярлык, чтобы uk/es пользователь не видел русский текст.
function localizeIdiomTitle(titleRu: string): LocalizedText {
  const phrasal = titleRu.match(/^Фразовый глагол:\s*(.+)$/);
  if (phrasal) {
    const term = phrasal[1];
    return { ru: titleRu, uk: `Фразове дієслово: ${term}`, es: `Verbo compuesto: ${term}`, 'pt-BR': `Phrasal verb: ${term}`, vi: `Cụm động từ: ${term}`, id: `Phrasal verb: ${term}`, tr: `Phrasal verb: ${term}`, pl: `Czasownik frazowy: ${term}` };
  }
  const fixed = titleRu.match(/^Устойчивое:\s*(.+)$/);
  if (fixed) {
    const term = fixed[1];
    return { ru: titleRu, uk: `Стійкий вислів: ${term}`, es: `Expresión fija: ${term}`, 'pt-BR': `Expressão fixa: ${term}`, vi: `Cụm cố định: ${term}`, id: `Ungkapan tetap: ${term}`, tr: `Kalıp ifade: ${term}`, pl: `Stałe wyrażenie: ${term}` };
  }
  const turn = titleRu.match(/^Оборот\s+(.+)$/);
  if (turn) {
    const term = turn[1];
    return { ru: titleRu, uk: `Зворот ${term}`, es: `Construcción ${term}`, 'pt-BR': `Construção ${term}`, vi: `Cấu trúc ${term}`, id: `Konstruksi ${term}`, tr: `Yapı ${term}`, pl: `Konstrukcja ${term}` };
  }
  if (titleRu === 'Слово owner в рабочем контексте') {
    return {
      ru: titleRu,
      uk: 'Слово owner у робочому контексті',
      es: 'La palabra owner en el contexto laboral',
      'pt-BR': 'A palavra owner no contexto de trabalho',
      vi: 'Từ owner trong ngữ cảnh công việc',
      id: 'Kata owner dalam konteks kerja',
      tr: 'İş bağlamında owner kelimesi',
      pl: 'Słowo owner w kontekście pracy',
    };
  }
  // Неизвестный шаблон: показываем русский заголовок во всех языках (лучше, чем
  // пустой), но это запасной путь — все текущие заголовки покрыты выше.
  return { ru: titleRu, uk: titleRu, es: titleRu, 'pt-BR': titleRu, vi: titleRu, id: titleRu, tr: titleRu, pl: titleRu };
}

/**
 * Returns the first matching idiom explanation for the phrase, or null.
 */
export function findIdiomExplanation(english: string): IdiomExplanation | null {
  const lower = english.toLowerCase();
  for (const entry of IDIOM_ENTRIES) {
    if (entry.pattern.test(lower)) {
      return {
        id: entry.id,
        title: localizeIdiomTitle(entry.titleRu),
        explanationRu: entry.explanationRu,
        explanationEs: entry.explanationEs,
      };
    }
  }
  return null;
}

/** Exposed for tests / coverage reporting. */
export function idiomEntryCount(): number {
  return IDIOM_ENTRIES.length;
}
