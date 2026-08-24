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

/** Одна строка во всех активных языках интерфейса. */
export type LocalizedText = { ru: string; uk: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string };

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
      'pt-BR': 'Pergunta com palavra interrogativa',
      vi: 'Câu hỏi với từ để hỏi',
      id: 'Pertanyaan dengan kata tanya',
      tr: 'Soru kelimesiyle soru',
      pl: 'Pytanie ze słowem pytającym',
    },
    why: (en) => ({
      ru: `«${en}» начинается с вопросительного слова, а дальше идёт глагол. Это обычный порядок для вопросов: сначала «что/где/как», потом действие.`,
      uk: `«${en}» починається з питального слова, а далі йде дієслово. Це звичайний порядок для питань: спершу «що/де/як», потім дія.`,
      es: `«${en}» empieza con una palabra interrogativa y luego viene el verbo. Es el orden normal de las preguntas: primero «qué/dónde/cómo», después la acción.`,
      'pt-BR': `«${en}» começa com uma palavra interrogativa e depois vem o verbo. É a ordem normal das perguntas: primeiro «o quê/onde/como», depois a ação.`,
      vi: `«${en}» bắt đầu bằng từ để hỏi, rồi đến động từ. Đây là thứ tự bình thường của câu hỏi: trước là “cái gì/ở đâu/như thế nào”, sau đó là hành động.`,
      id: `«${en}» dimulai dengan kata tanya, lalu diikuti kata kerja. Ini urutan normal pertanyaan: pertama “apa/di mana/bagaimana”, lalu tindakan.`,
      tr: `«${en}» bir soru kelimesiyle başlar, ardından fiil gelir. Sorularda normal sıra budur: önce “ne/nerede/nasıl”, sonra eylem.`,
      pl: `«${en}» zaczyna się od słowa pytającego, a potem idzie czasownik. To normalny szyk pytań: najpierw „co/gdzie/jak”, potem działanie.`,
    }),
  },
  {
    // Yes/no questions starting with can/could/do/does/is/are/will/should
    match: (lower) => /^(can|could|do|does|did|is|are|am|will|would|should|may|have|has)\b/.test(lower) && lower.includes('?'),
    title: {
      ru: 'Да/нет вопрос',
      uk: 'Так/ні питання',
      es: 'Pregunta de sí o no',
      'pt-BR': 'Pergunta de sim/não',
      vi: 'Câu hỏi có/không',
      id: 'Pertanyaan ya/tidak',
      tr: 'Evet/hayır sorusu',
      pl: 'Pytanie tak/nie',
    },
    why: (en) => ({
      ru: `«${en}» — вопрос, где вспомогательный глагол стоит первым. Поэтому фраза начинается не с «я», а со слова вроде can/do/is.`,
      uk: `«${en}» — питання, де допоміжне дієслово стоїть першим. Тому фраза починається не з «я», а зі слова на кшталт can/do/is.`,
      es: `«${en}» es una pregunta donde el verbo auxiliar va primero. Por eso la frase no empieza con «yo», sino con una palabra como can/do/is.`,
      'pt-BR': `«${en}» é uma pergunta em que o verbo auxiliar vem primeiro. Por isso a frase não começa com “eu”, mas com uma palavra como can/do/is.`,
      vi: `«${en}» là câu hỏi mà trợ động từ đứng trước. Vì vậy câu không bắt đầu bằng “tôi”, mà bằng một từ như can/do/is.`,
      id: `«${en}» adalah pertanyaan yang menaruh auxiliary verb di depan. Jadi frasa tidak dimulai dengan “saya”, melainkan kata seperti can/do/is.`,
      tr: `«${en}» yardımcı fiilin başta olduğu bir sorudur. Bu yüzden cümle “ben” ile değil, can/do/is gibi bir kelimeyle başlar.`,
      pl: `«${en}» to pytanie, w którym czasownik pomocniczy stoi pierwszy. Dlatego fraza nie zaczyna się od „ja”, tylko od słowa typu can/do/is.`,
    }),
  },
  {
    // Negation
    match: (lower) => /\b(not|n't|no)\b/.test(lower) || /n't/.test(lower),
    title: {
      ru: 'Отрицание',
      uk: 'Заперечення',
      es: 'Negación',
      'pt-BR': 'Negação',
      vi: 'Phủ định',
      id: 'Negasi',
      tr: 'Olumsuzluk',
      pl: 'Przeczenie',
    },
    why: (en) => ({
      ru: `«${en}» содержит отрицание (not / don't). Частица отрицания ставится после вспомогательного глагола, а не в конец фразы.`,
      uk: `«${en}» містить заперечення (not / don't). Частка заперечення ставиться після допоміжного дієслова, а не в кінець фрази.`,
      es: `«${en}» contiene una negación (not / don't). La negación va después del verbo auxiliar, no al final de la frase.`,
      'pt-BR': `«${en}» contém negação (not / don't). A partícula negativa vem depois do verbo auxiliar, não no fim da frase.`,
      vi: `«${en}» có phủ định (not / don't). Phần phủ định đứng sau trợ động từ, không đặt ở cuối câu.`,
      id: `«${en}» mengandung negasi (not / don't). Kata negatif diletakkan setelah auxiliary verb, bukan di akhir frasa.`,
      tr: `«${en}» olumsuzluk içerir (not / don't). Olumsuzluk eki/kelimesi yardımcı fiilden sonra gelir, cümlenin sonuna gitmez.`,
      pl: `«${en}» zawiera przeczenie (not / don't). Przeczenie stoi po czasowniku pomocniczym, nie na końcu frazy.`,
    }),
  },
  {
    // Modal-driven (need / can / will / should / have to)
    match: (lower) => /^(i|we|you|they|he|she)\s+(need|can|will|should|must|have to|want)\b/.test(lower),
    title: {
      ru: 'Намерение или необходимость',
      uk: 'Намір або необхідність',
      es: 'Intención o necesidad',
      'pt-BR': 'Intenção ou necessidade',
      vi: 'Ý định hoặc nhu cầu',
      id: 'Niat atau kebutuhan',
      tr: 'Niyet veya gereklilik',
      pl: 'Zamiar albo potrzeba',
    },
    why: (en) => ({
      ru: `«${en}» строится по схеме «кто + need/can/will + действие». Сначала кто, потом модальное слово, потом что сделать.`,
      uk: `«${en}» будується за схемою «хто + need/can/will + дія». Спершу хто, потім модальне слово, потім що зробити.`,
      es: `«${en}» sigue el esquema «quién + need/can/will + acción». Primero quién, luego la palabra modal y después qué hacer.`,
      'pt-BR': `«${en}» segue o esquema “quem + need/can/will + ação”. Primeiro vem quem faz, depois a palavra modal, depois o que fazer.`,
      vi: `«${en}» đi theo mẫu “ai + need/can/will + hành động”. Trước tiên là người làm, rồi từ modal, rồi việc cần làm.`,
      id: `«${en}» mengikuti pola “siapa + need/can/will + tindakan”. Pertama subjeknya, lalu kata modal, lalu apa yang dilakukan.`,
      tr: `«${en}» “kim + need/can/will + eylem” düzeniyle kurulur. Önce kim, sonra modal kelime, sonra yapılacak şey gelir.`,
      pl: `«${en}» ma schemat „kto + need/can/will + działanie”. Najpierw kto, potem słowo modalne, potem co zrobić.`,
    }),
  },
  {
    // "There is / there are"
    match: (lower) => /^there\s+(is|are|was|were)\b/.test(lower),
    title: {
      ru: 'Есть / имеется',
      uk: 'Є / наявне',
      es: 'Hay / existe',
      'pt-BR': 'Há / existe',
      vi: 'Có / tồn tại',
      id: 'Ada / terdapat',
      tr: 'Var / mevcut',
      pl: 'Jest / znajduje się',
    },
    why: (en) => ({
      ru: `«${en}» использует оборот there is/are — так по-английски говорят «есть / имеется». Он всегда стоит в начале.`,
      uk: `«${en}» використовує зворот there is/are — так англійською кажуть «є / наявне». Він завжди стоїть на початку.`,
      es: `«${en}» usa la construcción there is/are — así se dice «hay / existe» en inglés. Siempre va al principio.`,
      'pt-BR': `«${en}» usa a construção there is/are — é assim que o inglês diz “há / existe”. Ela sempre fica no começo.`,
      vi: `«${en}» dùng cấu trúc there is/are — tiếng Anh dùng nó để nói “có / tồn tại”. Cấu trúc này luôn đứng ở đầu câu.`,
      id: `«${en}» memakai konstruksi there is/are — begini cara bahasa Inggris mengatakan “ada / terdapat”. Konstruksi ini selalu di awal.`,
      tr: `«${en}» there is/are yapısını kullanır — İngilizcede “var / mevcut” böyle söylenir. Bu yapı her zaman başta durur.`,
      pl: `«${en}» używa konstrukcji there is/are — tak po angielsku mówi się „jest / znajduje się”. Ona zawsze stoi na początku.`,
    }),
  },
];

const DEFAULT_PATTERN: GrammarPattern = {
  match: () => true,
  title: {
    ru: 'Утвердительная фраза',
    uk: 'Стверджувальна фраза',
    es: 'Frase afirmativa',
    'pt-BR': 'Frase afirmativa',
    vi: 'Câu khẳng định',
    id: 'Kalimat afirmatif',
    tr: 'Olumlu cümle',
    pl: 'Zdanie twierdzące',
  },
  why: (en) => ({
    ru: `«${en}» построена по базовой схеме «кто → действие → остальное». Держи этот порядок слов, когда собираешь фразу.`,
    uk: `«${en}» побудована за базовою схемою «хто → дія → решта». Тримай цей порядок слів, коли збираєш фразу.`,
    es: `«${en}» se construye con el esquema básico «quién → acción → lo demás». Mantén ese orden de palabras al armar la frase.`,
    'pt-BR': `«${en}» segue o esquema básico “quem → ação → o resto”. Mantenha essa ordem das palavras ao montar a frase.`,
    vi: `«${en}» được xây theo mẫu cơ bản “ai → hành động → phần còn lại”. Hãy giữ thứ tự này khi ghép câu.`,
    id: `«${en}» dibangun dengan pola dasar “siapa → tindakan → sisanya”. Pertahankan urutan kata ini saat menyusun frasa.`,
    tr: `«${en}» temel “kim → eylem → kalan kısım” düzeniyle kurulur. Cümleyi kurarken bu kelime sırasını koru.`,
    pl: `«${en}» ma podstawowy schemat „kto → działanie → reszta”. Trzymaj ten szyk słów, gdy składasz frazę.`,
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

// «Что собрать»: одна и та же подводка к фразе во всех языках интерфейса.
function assembleLine(english: string, russian: string): LocalizedText {
  return {
    ru: `Нужно собрать: «${russian}» → «${english}».`,
    uk: `Треба зібрати: «${russian}» → «${english}».`,
    es: `Hay que armar: «${russian}» → «${english}».`,
    'pt-BR': `É preciso montar: «${russian}» → «${english}».`,
    vi: `Cần ghép: «${russian}» → «${english}».`,
    id: `Yang perlu disusun: «${russian}» → «${english}».`,
    tr: `Kurman gereken: «${russian}» → «${english}».`,
    pl: `Trzeba ułożyć: „${russian}” → „${english}”.`,
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
    'pt-BR': [
      `Vamos montar de novo com calma. Sentido: «${russian}».`,
      wordCount > 1
        ? `Comece pela palavra «${first}» e mantenha a ordem das palavras como na frase em inglês.`
        : 'Escolha a palavra que transmite melhor o sentido.',
    ].join(' '),
    vi: [
      `Hãy ghép lại thật bình tĩnh. Nghĩa: «${russian}».`,
      wordCount > 1
        ? `Bắt đầu bằng từ «${first}» và giữ thứ tự từ như trong câu tiếng Anh.`
        : 'Chọn từ truyền đạt nghĩa chính xác nhất.',
    ].join(' '),
    id: [
      `Susun ulang dengan tenang. Makna: «${russian}».`,
      wordCount > 1
        ? `Mulai dari kata «${first}» dan pertahankan urutan kata seperti dalam frasa Inggris.`
        : 'Pilih kata yang paling tepat menyampaikan maknanya.',
    ].join(' '),
    tr: [
      `Sakin şekilde yeniden kuralım. Anlam: «${russian}».`,
      wordCount > 1
        ? `«${first}» kelimesiyle başla ve İngilizce cümledeki kelime sırasını koru.`
        : 'Anlamı en doğru veren kelimeyi seç.',
    ].join(' '),
    pl: [
      `Ułóżmy to jeszcze raz spokojnie. Sens: „${russian}”.`,
      wordCount > 1
        ? `Zacznij od słowa „${first}” i trzymaj szyk słów jak w angielskiej frazie.`
        : 'Wybierz słowo, które najdokładniej oddaje sens.',
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
        'pt-BR': [assemble['pt-BR'], 'É uma expressão fixa: memorize como um bloco inteiro, não palavra por palavra.'].join(' '),
        vi: [assemble.vi, 'Đây là cụm cố định — hãy nhớ cả cụm, không tách từng từ.'].join(' '),
        id: [assemble.id, 'Ini ungkapan tetap — hafalkan sebagai satu kesatuan, bukan kata per kata.'].join(' '),
        tr: [assemble.tr, 'Bu kalıp bir ifadedir — tek tek kelimelerle değil, bütün olarak ezberle.'].join(' '),
        pl: [assemble.pl, 'To stałe wyrażenie — zapamiętaj je jako całość, nie słowo po słowie.'].join(' '),
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
        'pt-BR': 'Tradução pelo sentido',
        vi: 'Dịch theo nghĩa',
        id: 'Terjemahan berdasarkan makna',
        tr: 'Anlama göre çeviri',
        pl: 'Tłumaczenie według sensu',
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
        'pt-BR': [
          assemble['pt-BR'],
          'Aqui a tradução é pelo sentido, não palavra por palavra: as frases dizem a mesma coisa, mas são construídas de formas diferentes. Guie-se pelo sentido da frase inteira, não por palavras soltas.',
        ].join(' '),
        vi: [
          assemble.vi,
          'Ở đây dịch theo nghĩa, không dịch từng từ: hai câu truyền đạt cùng một ý, nhưng được xây khác nhau. Hãy bám vào nghĩa của cả câu, không phải từng từ riêng lẻ.',
        ].join(' '),
        id: [
          assemble.id,
          'Di sini terjemahannya berdasarkan makna, bukan kata per kata: kedua frasa menyampaikan hal yang sama, tetapi dibangun dengan cara berbeda. Ikuti makna seluruh frasa, bukan kata-kata terpisah.',
        ].join(' '),
        tr: [
          assemble.tr,
          'Burada çeviri kelime kelime değil, anlama göredir: iki cümle aynı şeyi söyler ama farklı kurulur. Tek tek kelimelere değil, tüm cümlenin anlamına odaklan.',
        ].join(' '),
        pl: [
          assemble.pl,
          'Tutaj tłumaczenie idzie według sensu, nie słowo w słowo: frazy mówią to samo, ale są zbudowane inaczej. Kieruj się sensem całej frazy, nie pojedynczymi słowami.',
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
      'pt-BR': [assemble['pt-BR'], why['pt-BR']].join(' '),
      vi: [assemble.vi, why.vi].join(' '),
      id: [assemble.id, why.id].join(' '),
      tr: [assemble.tr, why.tr].join(' '),
      pl: [assemble.pl, why.pl].join(' '),
    },
    wrong,
  };
}
