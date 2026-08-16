// зачем: сессия 1 эпизода 1 — самая первая, ученик не знает вообще ничего.
// Модал из трёх страниц объясняет ровно одну вещь: в английском между «я» и
// остальным всегда стоит связка. Владелец требует, чтобы модал заранее говорил,
// что человек поймёт и выучит, — это titleByLocale/summary/learningGoal.
import { EPISODE_01_SESSION_01_PHRASES } from './episode_01_source_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_01_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 1,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  // Пересчитывается генератором; здесь фиксированный отпечаток источника.
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Первые слова о себе',
    uk: 'Перші слова про себе',
    es: 'Primeras palabras sobre ti',
  },
  summary: {
    ru: 'Вы научитесь говорить о себе простыми фразами: как вы себя чувствуете, готовы ли вы, кто вы. И поймёте главное правило английского, из-за которого чаще всего ошибаются.',
    uk: 'Ви навчитеся говорити про себе простими фразами: як почуваєтеся, чи готові, хто ви. І зрозумієте головне правило англійської, через яке найчастіше помиляються.',
    es: 'Aprenderás a hablar de ti con frases simples: cómo te sientes, si estás listo, quién eres. Y entenderás la regla clave del inglés donde casi todos fallan.',
  },
  learningGoal: {
    ru: 'После сессии вы сможете сказать о себе девять живых фраз и не потеряете слово am.',
    uk: 'Після сесії ви зможете сказати про себе дев’ять живих фраз і не загубите слово am.',
    es: 'Al terminar podrás decir nueve frases reales sobre ti sin perder la palabra am.',
  },
  introPages: [
    {
      kind: 'concept',
      title: {
        ru: 'В английском нельзя молчать посередине',
        uk: 'В англійській не можна мовчати посередині',
        es: 'En inglés no puedes callar en el medio',
      },
      body: {
        ru: 'По-русски мы говорим «я здесь» — два слова, и всё понятно. В английском между «я» и остальным обязательно стоит связка am. Без неё фраза звучит как набор слов: I here — так не говорят. Правильно: I am here. Эта связка есть почти в каждой фразе о себе, поэтому мы начинаем именно с неё.',
        uk: 'Українською ми кажемо «я тут» — два слова, і все зрозуміло. В англійській між «я» та рештою обов’язково стоїть зв’язка am. Без неї фраза звучить як набір слів: I here — так не кажуть. Правильно: I am here.',
        es: 'En español decimos «estoy aquí» y el verbo ya lo dice todo. En inglés hace falta el sujeto y la cópula: I am here. Sin am la frase suena rota: I here no existe.',
      },
      question: {
        prompt: {
          ru: 'Какая фраза правильная?',
          uk: 'Яка фраза правильна?',
          es: '¿Qué frase es correcta?',
        },
        choices: [
          { ru: 'I am here', uk: 'I am here', es: 'I am here' },
          { ru: 'I here', uk: 'I here', es: 'I here' },
          { ru: 'Am I here', uk: 'Am I here', es: 'Am I here' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'I am here. Без am фраза разваливается, а «Am I here?» — это уже вопрос «я здесь?».',
          uk: 'I am here. Без am фраза розпадається, а «Am I here?» — це вже питання.',
          es: 'I am here. Sin am la frase se rompe, y «Am I here?» ya es una pregunta.',
        },
      },
    },
    {
      kind: 'formula',
      title: {
        ru: 'К слову «я» подходит только am',
        uk: 'До слова «я» пасує лише am',
        es: 'Con «yo» solo va am',
      },
      body: {
        ru: 'У связки три формы: am, is, are. Запоминать всю таблицу сейчас не нужно — достаточно одного: рядом с I всегда am. Is идёт к «он, она, оно», are — к «ты, мы, они». Если рядом с I оказалось is или are, это ошибка, и слышно её сразу.',
        uk: 'У зв’язки три форми: am, is, are. Зараз досить одного: поруч з I завжди am. Is — до «він, вона, воно», are — до «ти, ми, вони».',
        es: 'La cópula tiene tres formas: am, is, are. Por ahora basta una: junto a I siempre am. Is va con he, she, it; are con you, we, they.',
      },
      question: {
        prompt: {
          ru: 'Что поставить: I ___ ready?',
          uk: 'Що поставити: I ___ ready?',
          es: '¿Qué va aquí: I ___ ready?',
        },
        choices: [
          { ru: 'am', uk: 'am', es: 'am' },
          { ru: 'is', uk: 'is', es: 'is' },
          { ru: 'are', uk: 'are', es: 'are' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'I am ready. Is — для «он/она/оно», are — для «ты/мы/они».',
          uk: 'I am ready. Is — для «він/вона/воно», are — для «ти/ми/вони».',
          es: 'I am ready. Is es para he/she/it, are para you/we/they.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Отрицание: not сразу после am',
        uk: 'Заперечення: not одразу після am',
        es: 'La negación: not justo después de am',
      },
      body: {
        ru: 'Чтобы сказать «не», добавьте not сразу после am: I am not sure. Частицу do здесь ставить нельзя — «I don’t sure» звучит как грубая ошибка, потому что sure это признак, а не действие. И ещё одно, важное: по-русски мы часто говорим без «я» — «мне холодно», «мне скучно». В английском так нельзя, там всегда есть тот, кто. Получается «я холодный»: I am cold. Итоговая формула урока простая: I am + слово, а с «не» — I am not + слово. Подставьте любое известное вам слово-признак, и фраза будет правильной.',
        uk: 'Щоб сказати «не», додайте not одразу після am: I am not sure. Частку do тут ставити не можна. І ще важливе: українською ми кажемо «мені холодно», без «я». В англійській завжди є той, хто: I am cold. Формула уроку: I am + слово, із запереченням — I am not + слово.',
        es: 'Para negar, pon not justo después de am: I am not sure. No uses do: «I don’t sure» es un error claro. Y algo importante: en español decimos «tengo frío», con otro verbo. En inglés siempre eres tú: I am cold. La fórmula del curso: I am + palabra, y en negativo I am not + palabra.',
      },
      question: {
        prompt: {
          ru: 'Как сказать «я не уверен»?',
          uk: 'Як сказати «я не впевнений»?',
          es: '¿Cómo se dice «no estoy seguro»?',
        },
        choices: [
          { ru: 'I am not sure', uk: 'I am not sure', es: 'I am not sure' },
          { ru: 'I don’t sure', uk: 'I don’t sure', es: 'I don’t sure' },
          { ru: 'I not am sure', uk: 'I not am sure', es: 'I not am sure' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'I am not sure. Not всегда идёт после am, а do с признаками не используют.',
          uk: 'I am not sure. Not завжди після am, а do з ознаками не вживають.',
          es: 'I am not sure. Not va después de am, y do no se usa con adjetivos.',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_01_PHRASES,
} satisfies SessionSource;
