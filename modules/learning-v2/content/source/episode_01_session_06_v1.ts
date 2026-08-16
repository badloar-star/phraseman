// зачем: сессия 6 — первая типа words_then_phrases. Слова he / she / it и связка
// is вводятся карточками 1–4, дальше идут фразы из этих же слов. Так человек не
// встречает незнакомое слово внутри задания на сборку.
import { EPISODE_01_SESSION_06_PHRASES } from './episode_01_session_06_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_06_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 6,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Он, она, оно',
    uk: 'Він, вона, воно',
    es: 'Él, ella, ello',
  },
  summary: {
    ru: 'До сих пор вы говорили о себе и собеседнике. Теперь научитесь говорить о третьем человеке и о предметах — и закроете последнюю форму связки.',
    uk: 'Досі ви говорили про себе й співрозмовника. Тепер навчитеся говорити про третю особу та про предмети.',
    es: 'Hasta ahora hablabas de ti y del otro. Ahora aprenderás a hablar de una tercera persona y de las cosas.',
  },
  learningGoal: {
    ru: 'После сессии вы расскажете о другом человеке и скажете, какая погода.',
    uk: 'Після сесії ви розкажете про іншу людину й скажете, яка погода.',
    es: 'Al terminar hablarás de otra persona y dirás qué tiempo hace.',
  },
  introPages: [
    {
      kind: 'formula',
      title: {
        ru: 'Третья форма связки: is',
        uk: 'Третя форма зв’язки: is',
        es: 'La tercera forma: is',
      },
      body: {
        ru: 'Вы знаете am для «я» и are для «ты». Осталась последняя форма — is. Она идёт к he (он), she (она) и it (оно). Больше форм у связки нет: три штуки, и таблица закончилась навсегда. He is here. She is busy.',
        uk: 'Ви знаєте am для «я» та are для «ти». Лишилася остання форма — is. Вона йде до he, she, it. Більше форм немає.',
        es: 'Ya sabes am para «yo» y are para «tú». Queda la última: is, para he, she, it. No hay más formas.',
      },
      question: {
        prompt: {
          ru: 'Что поставить: She ___ busy?',
          uk: 'Що поставити: She ___ busy?',
          es: '¿Qué va aquí: She ___ busy?',
        },
        choices: [
          { ru: 'is', uk: 'is', es: 'is' },
          { ru: 'am', uk: 'am', es: 'am' },
          { ru: 'are', uk: 'are', es: 'are' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'She is busy. Is идёт к he, she, it — теперь вы знаете все три формы.',
          uk: 'She is busy. Is іде до he, she, it.',
          es: 'She is busy. Is va con he, she, it.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Для всех предметов одно слово: it',
        uk: 'Для всіх предметів одне слово: it',
        es: 'Para las cosas, una sola palabra: it',
      },
      body: {
        ru: 'По-русски у каждого предмета есть род: стол «он», сумка «она», окно «оно». В английском рода у предметов нет вообще — всё неживое это it. Стол, сумка, погода, город, книга: одно слово на всё. He и she оставляют только для людей. И запомните: о погоде говорят It is cold — без it фраза не существует, хотя по-русски мы обходимся одним словом «холодно».',
        uk: 'Українською у кожного предмета є рід. В англійській роду в предметів немає — усе неживе це it. Про погоду кажуть It is cold.',
        es: 'En español las cosas tienen género. En inglés no: todo lo inanimado es it. Del tiempo se dice It is cold.',
      },
      question: {
        prompt: {
          ru: 'Как сказать «холодно» (о погоде)?',
          uk: 'Як сказати «холодно» (про погоду)?',
          es: '¿Cómo se dice «hace frío»?',
        },
        choices: [
          { ru: 'It is cold', uk: 'It is cold', es: 'It is cold' },
          { ru: 'Is cold', uk: 'Is cold', es: 'Is cold' },
          { ru: 'He is cold', uk: 'He is cold', es: 'He is cold' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'It is cold. Без it фразы нет, а he — только про человека.',
          uk: 'It is cold. Без it фрази немає, а he — лише про людину.',
          es: 'It is cold. Sin it no hay frase, y he es solo para personas.',
        },
      },
    },
    {
      kind: 'tip',
      title: {
        ru: 'Всё остальное работает как раньше',
        uk: 'Усе інше працює як раніше',
        es: 'Todo lo demás funciona igual',
      },
      body: {
        ru: 'Ничего нового учить не нужно. Отрицание: not после связки — He is not here. Вопрос: перестановка — Is she ready? Артикль перед профессией остаётся — She is a teacher. Слово-признак не меняется по родам: busy одинаково для мужчины и женщины. Меняется только местоимение и форма связки.',
        uk: 'Нічого нового вчити не треба. Заперечення: not після зв’язки. Питання: перестановка. Артикль перед професією лишається.',
        es: 'No hay nada nuevo que aprender. Negación: not tras la cópula. Pregunta: inversión. El artículo antes del oficio se queda.',
      },
      question: {
        prompt: {
          ru: 'Как спросить «она готова?»',
          uk: 'Як запитати «вона готова?»',
          es: '¿Cómo se pregunta «¿está lista?»',
        },
        choices: [
          { ru: 'Is she ready?', uk: 'Is she ready?', es: 'Is she ready?' },
          { ru: 'She is ready?', uk: 'She is ready?', es: 'She is ready?' },
          { ru: 'Does she ready?', uk: 'Does she ready?', es: 'Does she ready?' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Is she ready? Та же перестановка, что и с you, а do со связкой не ставят.',
          uk: 'Is she ready? Та сама перестановка, а do зі зв’язкою не ставлять.',
          es: 'Is she ready? La misma inversión; do no acompaña a la cópula.',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_06_PHRASES,
} satisfies SessionSource;
