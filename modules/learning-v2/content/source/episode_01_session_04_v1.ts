// зачем: сессия 4 закрывает последний пробел, который агент-новичок назвал сам
// после трёх сессий: «не умею спросить, как тебя зовут». Даём What / Where / How
// и слово your — теперь знакомство можно вести в обе стороны.
import { EPISODE_01_SESSION_04_PHRASES } from './episode_01_session_04_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_04_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 4,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Вопросы со словами «что», «где», «как»',
    uk: 'Запитання зі словами «що», «де», «як»',
    es: 'Preguntas con qué, dónde y cómo',
  },
  summary: {
    ru: 'До сих пор вы задавали только вопросы, на которые отвечают «да» или «нет». Теперь научитесь спрашивать имя, место и состояние — то, без чего знакомство не получается.',
    uk: 'Досі ви ставили лише запитання, на які відповідають «так» або «ні». Тепер навчитеся питати ім’я, місце й стан.',
    es: 'Hasta ahora solo hacías preguntas de sí o no. Ahora aprenderás a preguntar el nombre, el lugar y el estado.',
  },
  learningGoal: {
    ru: 'После сессии вы спросите имя собеседника, откуда он и как у него дела.',
    uk: 'Після сесії ви запитаєте ім’я співрозмовника, звідки він і як його справи.',
    es: 'Al terminar podrás preguntar el nombre, de dónde es y cómo está.',
  },
  introPages: [
    {
      kind: 'concept',
      title: {
        ru: 'Вопросительное слово встаёт впереди всего',
        uk: 'Питальне слово стає попереду всього',
        es: 'La palabra de pregunta va delante de todo',
      },
      body: {
        ru: 'Вы уже умеете переставлять слова: Are you ready? Теперь добавьте впереди одно слово-вопрос, и получится вопрос о сути. What — «что», Where — «где», How — «как». Порядок такой: сначала слово-вопрос, потом связка, потом остальное. Where are you? — «ты где?». Ничего нового переставлять не нужно, только добавить слово в начало.',
        uk: 'Ви вже вмієте переставляти слова: Are you ready? Тепер додайте попереду слово-запитання. What — «що», Where — «де», How — «як». Порядок: слово-запитання, зв’язка, решта.',
        es: 'Ya sabes invertir: Are you ready? Ahora añade delante una palabra de pregunta. What — «qué», Where — «dónde», How — «cómo». El orden: palabra de pregunta, cópula, resto.',
      },
      question: {
        prompt: {
          ru: 'Как спросить «ты где?»',
          uk: 'Як запитати «ти де?»',
          es: '¿Cómo se pregunta «¿dónde estás?»',
        },
        choices: [
          { ru: 'Where are you?', uk: 'Where are you?', es: 'Where are you?' },
          { ru: 'Where you are?', uk: 'Where you are?', es: 'Where you are?' },
          { ru: 'You are where?', uk: 'You are where?', es: 'You are where?' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Where are you? Сначала слово-вопрос, потом связка, потом человек.',
          uk: 'Where are you? Спочатку слово-запитання, потім зв’язка, потім людина.',
          es: 'Where are you? Primero la palabra de pregunta, luego la cópula.',
        },
      },
    },
    {
      kind: 'tip',
      title: {
        ru: 'Про чужое — связка is',
        uk: 'Про чуже — зв’язка is',
        es: 'Para las cosas, la cópula is',
      },
      body: {
        ru: 'Когда речь не о людях, а о предмете — имя, сумка, день, цена — берётся третья форма связки: is. Вы её уже видели в списке, теперь она пригодилась. What is your name? Where is my bag? И ещё одно слово: your значит «твой». Перед предметом ставят именно your, а не you. Точно так же my — «мой»: my bag. Артикль при этом не нужен, два таких слова подряд не ставят.',
        uk: 'Коли мова не про людей, а про предмет — ім’я, сумка, день — береться третя форма зв’язки: is. What is your name? І ще: your означає «твій», ставиться перед предметом. Так само my — «мій».',
        es: 'Cuando hablas de una cosa —el nombre, la bolsa, el día— se usa la tercera forma: is. What is your name? Y your significa «tu», va antes del objeto. Igual my — «mi».',
      },
      question: {
        prompt: {
          ru: 'Как спросить «как тебя зовут?»',
          uk: 'Як запитати «як тебе звати?»',
          es: '¿Cómo se pregunta «¿cómo te llamas?»',
        },
        choices: [
          {
            ru: 'What is your name?',
            uk: 'What is your name?',
            es: 'What is your name?',
          },
          {
            ru: 'How is your name?',
            uk: 'How is your name?',
            es: 'How is your name?',
          },
          {
            ru: 'What is you name?',
            uk: 'What is you name?',
            es: 'What is you name?',
          },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'What is your name? Англичане спрашивают через «что», а перед предметом ставят your.',
          uk: 'What is your name? Англійці питають через «що», а перед предметом — your.',
          es: 'What is your name? En inglés se pregunta con «qué», y antes del objeto va your.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Не переводите «как» дословно',
        uk: 'Не перекладайте «як» дослівно',
        es: 'No traduzcas «cómo» literalmente',
      },
      body: {
        ru: 'Главная ловушка урока: по-русски мы говорим «как тебя зовут», и рука тянется написать How. Но англичане спрашивают «какое твоё имя» — только What. How используют для состояния: How are you? — «как дела». Запомните разницу: имя, номер, работа — это What. Самочувствие и качество — это How. И ещё одно новое слово: the. Оно значит «тот самый, известный»: Where is the exit? — вы ищете конкретный выход, а не любой.',
        uk: 'Головна пастка: українською «як тебе звати», і рука тягнеться до How. Але англійці питають «яке твоє ім’я» — тільки What. How — для стану: How are you? І нове слово the — «той самий»: Where is the exit?',
        es: 'La trampa: en español decimos «cómo te llamas» y la mano va a How. Pero en inglés es What. How es para el estado: How are you? Y una palabra nueva, the — «ese concreto»: Where is the exit?',
      },
      question: {
        prompt: {
          ru: 'Что спросить, чтобы узнать имя?',
          uk: 'Що запитати, щоб дізнатися ім’я?',
          es: '¿Qué preguntas para saber el nombre?',
        },
        choices: [
          { ru: 'What', uk: 'What', es: 'What' },
          { ru: 'How', uk: 'How', es: 'How' },
          { ru: 'Where', uk: 'Where', es: 'Where' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'What. How спрашивает о состоянии, а имя — это What is your name?',
          uk: 'What. How питає про стан, а ім’я — це What is your name?',
          es: 'What. How pregunta por el estado; el nombre es What is your name?',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_04_PHRASES,
} satisfies SessionSource;
