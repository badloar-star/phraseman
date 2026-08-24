import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, word-first перепись): копирует
// структуру episode_01_session_01_intro_word_first_v1.ts (английский курс,
// первый готовый образец паттерна) — три страницы concept/formula/trap,
// каждая объясняет одно слово из ES_EPISODE_01_SESSION_01_VOCABULARY_V1
// (es, soy, fácil), четвёртое слово (verdad) получает разбор только через
// word-first контакты, без отдельной интро-страницы — так же, как в
// английском эталоне интро не покрывает 'ready'.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_TITLE = L({
  ru: 'Это легко',
  uk: 'Це легко',
  es: 'It is easy',
  'pt-BR': 'It is easy',
  vi: 'It is easy',
  id: 'It is easy',
  tr: 'It is easy',
  pl: 'It is easy',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_SUMMARY = L({
  ru: 'Три коротких испанских слова сначала становятся понятными по отдельности, а затем соединяются в оценку.',
  uk: 'Три коротких іспанських слова спершу стають зрозумілими окремо, а потім з’єднуються в оцінку.',
  es: 'Three short Spanish words become clear separately before joining into a verdict.',
  'pt-BR': 'Three short Spanish words become clear separately before joining into a verdict.',
  vi: 'Three short Spanish words become clear separately before joining into a verdict.',
  id: 'Three short Spanish words become clear separately before joining into a verdict.',
  tr: 'Three short Spanish words become clear separately before joining into a verdict.',
  pl: 'Three short Spanish words become clear separately before joining into a verdict.',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать es, soy и fácil, а затем правильно соединить их.',
  uk: 'Упізнати на слух, зрозуміти й точно написати es, soy та fácil, а потім правильно їх поєднати.',
  es: 'Recognize, understand, and write es, soy, and fácil before combining them correctly.',
  'pt-BR': 'Recognize, understand, and write es, soy, and fácil before combining them correctly.',
  vi: 'Recognize, understand, and write es, soy, and fácil before combining them correctly.',
  id: 'Recognize, understand, and write es, soy, and fácil before combining them correctly.',
  tr: 'Recognize, understand, and write es, soy, and fácil before combining them correctly.',
  pl: 'Recognize, understand, and write es, soy, and fácil before combining them correctly.',
});

const CONCEPT_BODY = L({
  ru: 'Когда что-то оценивают — легко это, дорого или правда, — испанский показывает связь отдельным словом es. Оно значит «есть, является». По-русски мы обходимся без такого слова: «это легко». По-испански без es фраза рассыпается на голое fácil, обрывок без смысла. Надёжный ориентир прост: любая безличная оценка держится на es.',
  uk: 'Коли щось оцінюють — легко це, дорого чи правда, — іспанська показує зв’язок окремим словом es. Воно означає «є». Українською ми обходимось без такого слова: «це легко». Іспанською без es фраза розсипається на голе fácil, уламок без сенсу. Надійний орієнтир простий: будь-яка безособова оцінка тримається на es.',
  es: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: es carries every verdict, whether about ease, price, or truth. Without es, a phrase collapses into a bare adjective with no verdict left. The safe anchor is simple: any impersonal verdict rests on es.',
  'pt-BR': 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: es carries every verdict, whether about ease, price, or truth. Without es, a phrase collapses into a bare adjective with no verdict left. The safe anchor is simple: any impersonal verdict rests on es.',
  vi: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: es carries every verdict, whether about ease, price, or truth. Without es, a phrase collapses into a bare adjective with no verdict left. The safe anchor is simple: any impersonal verdict rests on es.',
  id: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: es carries every verdict, whether about ease, price, or truth. Without es, a phrase collapses into a bare adjective with no verdict left. The safe anchor is simple: any impersonal verdict rests on es.',
  tr: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: es carries every verdict, whether about ease, price, or truth. Without es, a phrase collapses into a bare adjective with no verdict left. The safe anchor is simple: any impersonal verdict rests on es.',
  pl: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: es carries every verdict, whether about ease, price, or truth. Without es, a phrase collapses into a bare adjective with no verdict left. The safe anchor is simple: any impersonal verdict rests on es.',
});

const FORMULA_BODY = L({
  ru: 'Слово soy не описывает признак само по себе. Это короткая связка для случая, когда говорящий называет себя. Испанец не говорит «yo soy rápido» в обычной речи — он говорит просто Soy rápido, и хвост soy уже сказал «я». Держите роли раздельно: soy соединяет говорящего с признаком; es делает то же самое, но для «оно/он/она». На слух soy звучит с дифтонгом /oi/, а es — с одним коротким гласным /e/.',
  uk: 'Слово soy саме по собі не описує ознаку. Це коротка зв’язка для випадку, коли мовець називає себе. Іспанець не каже «yo soy rápido» у звичайній мові — він каже просто Soy rápido, і хвіст soy вже сказав «я». Тримайте ролі окремо: soy з’єднує мовця з ознакою; es робить те саме, але для «воно/він/вона». На слух soy звучить з дифтонгом /oi/, а es — з одним коротким голосним /e/.',
  es: 'Soy does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of soy already says "I". Keep the two roles apart: soy links the speaker to a quality; es does the same job, but for "it/he/she". By ear, soy has the diphthong /oi/, while es has one short vowel /e/.',
  'pt-BR': 'Soy does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of soy already says "I". Keep the two roles apart: soy links the speaker to a quality; es does the same job, but for "it/he/she". By ear, soy has the diphthong /oi/, while es has one short vowel /e/.',
  vi: 'Soy does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of soy already says "I". Keep the two roles apart: soy links the speaker to a quality; es does the same job, but for "it/he/she". By ear, soy has the diphthong /oi/, while es has one short vowel /e/.',
  id: 'Soy does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of soy already says "I". Keep the two roles apart: soy links the speaker to a quality; es does the same job, but for "it/he/she". By ear, soy has the diphthong /oi/, while es has one short vowel /e/.',
  tr: 'Soy does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of soy already says "I". Keep the two roles apart: soy links the speaker to a quality; es does the same job, but for "it/he/she". By ear, soy has the diphthong /oi/, while es has one short vowel /e/.',
  pl: 'Soy does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of soy already says "I". Keep the two roles apart: soy links the speaker to a quality; es does the same job, but for "it/he/she". By ear, soy has the diphthong /oi/, while es has one short vowel /e/.',
});

const TRAP_BODY = L({
  ru: 'Слово fácil означает «лёгкий» и не меняется по роду: и про задачу, и про язык, и про решение говорят одинаково fácil. Оно ударено на первом слоге — FÁ-cil, с заметным á. Рядом по звучанию оказывается difícil: похожая форма, но ударение падает на другой слог и значение прямо противоположное — «трудный». Facilidad тоже похоже, но это существительное «лёгкость», предмет, а не признак вещи. Поэтому одного знакомого звучания недостаточно: для «лёгкий» нужна точная форма fácil.',
  uk: 'Слово fácil означає «легкий» і не змінюється за родом: і про завдання, і про мову, і про рішення кажуть однаково fácil. Воно наголошене на першому складі — FÁ-cil, з помітним á. Поруч за звучанням опиняється difícil: схожа форма, але наголос падає на інший склад, а значення пряме протилежне — «важкий». Facilidad теж схоже, але це іменник «легкість», предмет, а не ознака речі. Тому знайомого звучання недостатньо: для «легкий» потрібна точна форма fácil.',
  es: 'Fácil means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, fácil. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is difícil: a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". Facilidad also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form fácil.',
  'pt-BR': 'Fácil means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, fácil. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is difícil: a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". Facilidad also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form fácil.',
  vi: 'Fácil means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, fácil. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is difícil: a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". Facilidad also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form fácil.',
  id: 'Fácil means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, fácil. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is difícil: a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". Facilidad also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form fácil.',
  tr: 'Fácil means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, fácil. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is difícil: a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". Facilidad also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form fácil.',
  pl: 'Fácil means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, fácil. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is difícil: a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". Facilidad also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form fácil.',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Es открывает любую оценку',
      uk: 'Es відкриває будь-яку оцінку',
      es: 'Es opens every verdict',
      'pt-BR': 'Es opens every verdict',
      vi: 'Es opens every verdict',
      id: 'Es opens every verdict',
      tr: 'Es opens every verdict',
      pl: 'Es opens every verdict',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Когда что-то оценивают — легко это, дорого или правда, — испанский показывает связь отдельным словом ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '. Оно значит «есть, является». По-русски мы обходимся без такого слова: «это легко». По-испански без ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' фраза рассыпается на голое ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', обрывок без смысла. Надёжный ориентир прост: любая безличная оценка держится на ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Коли щось оцінюють — легко це, дорого чи правда, — іспанська показує зв’язок окремим словом ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '. Воно означає «є». Українською ми обходимось без такого слова: «це легко». Іспанською без ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' фраза розсипається на голе ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', уламок без сенсу. Надійний орієнтир простий: будь-яка безособова оцінка тримається на ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' carries every verdict, whether about ease, price, or truth. Without ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', a phrase collapses into a bare ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' with no verdict left. The safe anchor is simple: any impersonal verdict rests on ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' carries every verdict, whether about ease, price, or truth. Without ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', a phrase collapses into a bare ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' with no verdict left. The safe anchor is simple: any impersonal verdict rests on ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' carries every verdict, whether about ease, price, or truth. Without ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', a phrase collapses into a bare ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' with no verdict left. The safe anchor is simple: any impersonal verdict rests on ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' carries every verdict, whether about ease, price, or truth. Without ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', a phrase collapses into a bare ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' with no verdict left. The safe anchor is simple: any impersonal verdict rests on ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' carries every verdict, whether about ease, price, or truth. Without ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', a phrase collapses into a bare ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' with no verdict left. The safe anchor is simple: any impersonal verdict rests on ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' carries every verdict, whether about ease, price, or truth. Without ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', a phrase collapses into a bare ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' with no verdict left. The safe anchor is simple: any impersonal verdict rests on ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({ ru: 'Как по-испански сказать «есть, является» в оценке?', uk: 'Як іспанською сказати «є» в оцінці?', es: 'How do you say "is" in a Spanish verdict?', 'pt-BR': 'How do you say "is" in a Spanish verdict?', vi: 'How do you say "is" in a Spanish verdict?', id: 'How do you say "is" in a Spanish verdict?', tr: 'How do you say "is" in a Spanish verdict?', pl: 'How do you say "is" in a Spanish verdict?' }),
      choices: [
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'ser', uk: 'ser', es: 'ser', 'pt-BR': 'ser', vi: 'ser', id: 'ser', tr: 'ser', pl: 'ser' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es открывает безличную оценку. Soy — про себя, а ser — начальная форма, в готовой фразе не стоит.',
        uk: 'Es відкриває безособову оцінку. Soy — про себе, а ser — початкова форма, у готовій фразі не стоїть.',
        es: 'Es opens an impersonal verdict. Soy is about yourself, and ser is the base form, which never stands alone in a finished sentence.',
        'pt-BR': 'Es opens an impersonal verdict. Soy is about yourself, and ser is the base form, which never stands alone in a finished sentence.',
        vi: 'Es opens an impersonal verdict. Soy is about yourself, and ser is the base form, which never stands alone in a finished sentence.',
        id: 'Es opens an impersonal verdict. Soy is about yourself, and ser is the base form, which never stands alone in a finished sentence.',
        tr: 'Es opens an impersonal verdict. Soy is about yourself, and ser is the base form, which never stands alone in a finished sentence.',
        pl: 'Es opens an impersonal verdict. Soy is about yourself, and ser is the base form, which never stands alone in a finished sentence.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Soy — связка для себя', uk: 'Soy — зв’язка для себе', es: 'Soy links the speaker', 'pt-BR': 'Soy links the speaker', vi: 'Soy links the speaker', id: 'Soy links the speaker', tr: 'Soy links the speaker', pl: 'Soy links the speaker' }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' не описывает признак само по себе. Это короткая связка для случая, когда говорящий называет себя. Испанец не говорит «yo soy rápido» в обычной речи — он говорит просто Soy rápido, и хвост ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' уже сказал «я». Держите роли раздельно: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' соединяет говорящего с признаком; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' делает то же самое, но для «оно/он/она». На слух ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' звучит с дифтонгом /oi/, а ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — с одним коротким гласным /e/.', semantic: 'explanation' }),
      uk: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' саме по собі не описує ознаку. Це коротка зв’язка для випадку, коли мовець називає себе. Іспанець не каже «yo soy rápido» у звичайній мові — він каже просто Soy rápido, і хвіст ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' вже сказав «я». Тримайте ролі окремо: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' з’єднує мовця з ознакою; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' робить те саме, але для «воно/він/вона». На слух ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' звучить з дифтонгом /oi/, а ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — з одним коротким голосним /e/.', semantic: 'explanation' }),
      es: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' already says "I". Keep the two roles apart: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' links the speaker to a quality; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' does the same job, but for "it/he/she". By ear, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' has the diphthong /oi/, while ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' has one short vowel /e/.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' already says "I". Keep the two roles apart: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' links the speaker to a quality; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' does the same job, but for "it/he/she". By ear, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' has the diphthong /oi/, while ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' has one short vowel /e/.', semantic: 'explanation' }),
      vi: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' already says "I". Keep the two roles apart: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' links the speaker to a quality; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' does the same job, but for "it/he/she". By ear, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' has the diphthong /oi/, while ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' has one short vowel /e/.', semantic: 'explanation' }),
      id: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' already says "I". Keep the two roles apart: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' links the speaker to a quality; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' does the same job, but for "it/he/she". By ear, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' has the diphthong /oi/, while ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' has one short vowel /e/.', semantic: 'explanation' }),
      tr: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' already says "I". Keep the two roles apart: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' links the speaker to a quality; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' does the same job, but for "it/he/she". By ear, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' has the diphthong /oi/, while ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' has one short vowel /e/.', semantic: 'explanation' }),
      pl: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' already says "I". Keep the two roles apart: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' links the speaker to a quality; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' does the same job, but for "it/he/she". By ear, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' has the diphthong /oi/, while ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' has one short vowel /e/.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({ ru: 'Говорящий называет признак самого себя. Какое слово нужно?', uk: 'Мовець називає ознаку самого себе. Яке слово потрібне?', es: 'The speaker names a quality about themselves. Which word is needed?', 'pt-BR': 'The speaker names a quality about themselves. Which word is needed?', vi: 'The speaker names a quality about themselves. Which word is needed?', id: 'The speaker names a quality about themselves. Which word is needed?', tr: 'The speaker names a quality about themselves. Which word is needed?', pl: 'The speaker names a quality about themselves. Which word is needed?' }),
      choices: [
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'son', uk: 'son', es: 'son', 'pt-BR': 'son', vi: 'son', id: 'son', tr: 'son', pl: 'son' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Soy — связка для говорящего. Es говорит про «оно/он/она», а son — про «они».',
        uk: 'Soy — зв’язка для мовця. Es говорить про «воно/він/вона», а son — про «вони».',
        es: 'Soy is the linking word for the speaker. Es talks about "it/he/she", and son talks about "they".',
        'pt-BR': 'Soy is the linking word for the speaker. Es talks about "it/he/she", and son talks about "they".',
        vi: 'Soy is the linking word for the speaker. Es talks about "it/he/she", and son talks about "they".',
        id: 'Soy is the linking word for the speaker. Es talks about "it/he/she", and son talks about "they".',
        tr: 'Soy is the linking word for the speaker. Es talks about "it/he/she", and son talks about "they".',
        pl: 'Soy is the linking word for the speaker. Es talks about "it/he/she", and son talks about "they".',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Fácil не меняется по роду', uk: 'Fácil не змінюється за родом', es: 'Fácil never changes for gender', 'pt-BR': 'Fácil never changes for gender', vi: 'Fácil never changes for gender', id: 'Fácil never changes for gender', tr: 'Fácil never changes for gender', pl: 'Fácil never changes for gender' }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' означает «лёгкий» и не меняется по роду: и про задачу, и про язык, и про решение говорят одинаково ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. Оно ударено на первом слоге — FÁ-cil, с заметным á. Рядом по звучанию оказывается ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': похожая форма, но ударение падает на другой слог и значение прямо противоположное — «трудный». ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' тоже похоже, но это существительное «лёгкость», предмет, а не признак вещи. Поэтому одного знакомого звучания недостаточно: для «лёгкий» нужна точная форма ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' означає «легкий» і не змінюється за родом: і про завдання, і про мову, і про рішення кажуть однаково ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. Воно наголошене на першому складі — FÁ-cil, з помітним á. Поруч за звучанням опиняється ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': схожа форма, але наголос падає на інший склад, а значення пряме протилежне — «важкий». ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' теж схоже, але це іменник «легкість», предмет, а не ознака речі. Тому знайомого звучання недостатньо: для «легкий» потрібна точна форма ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({ ru: 'Какое слово означает «лёгкий» и не меняется по роду?', uk: 'Яке слово означає «легкий» і не змінюється за родом?', es: 'Which word means "easy" and never changes for gender?', 'pt-BR': 'Which word means "easy" and never changes for gender?', vi: 'Which word means "easy" and never changes for gender?', id: 'Which word means "easy" and never changes for gender?', tr: 'Which word means "easy" and never changes for gender?', pl: 'Which word means "easy" and never changes for gender?' }),
      choices: [
        L({ ru: 'fácil', uk: 'fácil', es: 'fácil', 'pt-BR': 'fácil', vi: 'fácil', id: 'fácil', tr: 'fácil', pl: 'fácil' }),
        L({ ru: 'difícil', uk: 'difícil', es: 'difícil', 'pt-BR': 'difícil', vi: 'difícil', id: 'difícil', tr: 'difícil', pl: 'difícil' }),
        L({ ru: 'facilidad', uk: 'facilidad', es: 'facilidad', 'pt-BR': 'facilidad', vi: 'facilidad', id: 'facilidad', tr: 'facilidad', pl: 'facilidad' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Fácil означает «лёгкий». Difícil — противоположность, «трудный». Facilidad — существительное «лёгкость».',
        uk: 'Fácil означає «легкий». Difícil — протилежність, «важкий». Facilidad — іменник «легкість».',
        es: 'Fácil means "easy". Difícil is the opposite, "hard". Facilidad is the noun "ease".',
        'pt-BR': 'Fácil means "easy". Difícil is the opposite, "hard". Facilidad is the noun "ease".',
        vi: 'Fácil means "easy". Difícil is the opposite, "hard". Facilidad is the noun "ease".',
        id: 'Fácil means "easy". Difícil is the opposite, "hard". Facilidad is the noun "ease".',
        tr: 'Fácil means "easy". Difícil is the opposite, "hard". Facilidad is the noun "ease".',
        pl: 'Fácil means "easy". Difícil is the opposite, "hard". Facilidad is the noun "ease".',
      }),
    },
  },
];
