// зачем: агент-новичок после двух сессий сказал прямо — «умею говорить о себе
// монологом, но не умею спросить и ответить». Сессия 3 закрывает именно это:
// you are, перестановка в вопросе и короткие ответы. Она же завершает can-do
// эпизода 1 из docs/v2/03 («завершить знакомство», фраза And you?).
import { EPISODE_01_SESSION_03_PHRASES } from './episode_01_session_03_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_03_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 3,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Спросить и ответить',
    uk: 'Запитати й відповісти',
    es: 'Preguntar y responder',
  },
  summary: {
    ru: 'До сих пор вы говорили о себе. Теперь научитесь обращаться к собеседнику и задавать вопрос — с этого начинается настоящий разговор, а не монолог.',
    uk: 'Досі ви говорили про себе. Тепер навчитеся звертатися до співрозмовника й ставити запитання — саме з цього починається справжня розмова.',
    es: 'Hasta ahora hablabas de ti. Ahora aprenderás a dirigirte al otro y a preguntar — ahí empieza la conversación de verdad.',
  },
  learningGoal: {
    ru: 'После сессии вы зададите вопрос и коротко ответите на такой же вопрос сами.',
    uk: 'Після сесії ви поставите запитання й коротко відповісте на таке саме запитання.',
    es: 'Al terminar podrás hacer una pregunta y responder brevemente a la misma pregunta.',
  },
  introPages: [
    {
      kind: 'concept',
      title: {
        ru: 'К собеседнику связка меняется на are',
        uk: 'До співрозмовника зв’язка змінюється на are',
        es: 'Con la otra persona la cópula pasa a are',
      },
      body: {
        ru: 'Вы уже твёрдо знаете: рядом с I стоит am. Когда говорите о собеседнике, вместо I берётся you, а связка меняется на are: You are ready. Больше ничего не меняется — само слово-признак остаётся прежним, как и порядок слов. Отрицание тоже работает по-старому: not встаёт сразу после связки, You are not late.',
        uk: 'Ви вже твердо знаєте: поруч з I стоїть am. Коли говорите про співрозмовника, замість I береться you, а зв’язка змінюється на are: You are ready. Заперечення так само: You are not late.',
        es: 'Ya sabes que junto a I va am. Al hablar de la otra persona se usa you, y la cópula pasa a are: You are ready. La negación funciona igual: You are not late.',
      },
      question: {
        prompt: {
          ru: 'Что поставить: You ___ ready?',
          uk: 'Що поставити: You ___ ready?',
          es: '¿Qué va aquí: You ___ ready?',
        },
        choices: [
          { ru: 'are', uk: 'are', es: 'are' },
          { ru: 'am', uk: 'am', es: 'am' },
          { ru: 'is', uk: 'is', es: 'is' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'You are ready. Am остаётся только при I, а is пригодится позже для «он, она, оно».',
          uk: 'You are ready. Am лишається тільки при I, а is знадобиться пізніше.',
          es: 'You are ready. Am solo va con I, e is te servirá más adelante.',
        },
      },
    },
    {
      kind: 'formula',
      title: {
        ru: 'Вопрос — это те же слова наоборот',
        uk: 'Запитання — це ті самі слова навпаки',
        es: 'La pregunta son las mismas palabras al revés',
      },
      body: {
        ru: 'Чтобы спросить, ничего добавлять не нужно — достаточно поменять первые два слова местами. Было You are ready, стало Are you ready? Точно так же и о себе: I am late превращается в Am I late? Никаких лишних слов вроде do здесь не появляется: связка сама умеет быть вопросом. Это правило работает со всеми лицами без исключений.',
        uk: 'Щоб запитати, нічого додавати не треба — досить поміняти перші два слова місцями. Було You are ready, стало Are you ready? Так само й про себе: Am I late?',
        es: 'Para preguntar no hace falta añadir nada: basta con intercambiar las dos primeras palabras. De You are ready a Are you ready? Y sobre ti: Am I late?',
      },
      question: {
        prompt: {
          ru: 'Как спросить «ты устал?»',
          uk: 'Як запитати «ти втомився?»',
          es: '¿Cómo se pregunta «¿estás cansado?»',
        },
        choices: [
          { ru: 'Are you tired?', uk: 'Are you tired?', es: 'Are you tired?' },
          { ru: 'You are tired?', uk: 'You are tired?', es: 'You are tired?' },
          { ru: 'Do you tired?', uk: 'Do you tired?', es: 'Do you tired?' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Are you tired? Связка уходит вперёд, а do со связкой не ставят никогда.',
          uk: 'Are you tired? Зв’язка йде вперед, а do зі зв’язкою не ставлять.',
          es: 'Are you tired? La cópula va delante, y do nunca acompaña a la cópula.',
        },
      },
    },
    {
      kind: 'tip',
      title: {
        ru: 'Отвечают коротко и возвращают вопрос',
        uk: 'Відповідають коротко й повертають запитання',
        es: 'Se responde corto y se devuelve la pregunta',
      },
      body: {
        ru: 'На такой вопрос не отвечают целой фразой. Говорят коротко: Yes, I am или No, I am not — связку повторяют, а признак нет. Просто «Yes» звучит суховато, поэтому носители почти всегда добавляют «I am». А чтобы разговор не оборвался, сразу возвращают вопрос собеседнику двумя словами: And you? Это и есть самый простой способ поддержать беседу. И одно новое слово на этот урок: alone значит «один», без компании. Не путайте его с числом one — это разные слова.',
        uk: 'На таке запитання відповідають коротко: Yes, I am або No, I am not — зв’язку повторюють, а ознаку ні. А щоб розмова не обірвалася, повертають запитання: And you?',
        es: 'A esa pregunta se responde corto: Yes, I am o No, I am not — se repite la cópula, no el adjetivo. Y para que la charla siga, devuelves la pregunta: And you?',
      },
      question: {
        prompt: {
          ru: 'Вас спросили «Are you ready?». Как ответить «да»?',
          uk: 'Вас запитали «Are you ready?». Як відповісти «так»?',
          es: 'Te preguntan «Are you ready?». ¿Cómo dices que sí?',
        },
        choices: [
          { ru: 'Yes, I am', uk: 'Yes, I am', es: 'Yes, I am' },
          { ru: 'Yes, I are', uk: 'Yes, I are', es: 'Yes, I are' },
          { ru: 'Yes, I do', uk: 'Yes, I do', es: 'Yes, I do' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Yes, I am. Отвечая о себе, вы возвращаете связку am, а do здесь ни при чём.',
          uk: 'Yes, I am. Відповідаючи про себе, ви повертаєте зв’язку am.',
          es: 'Yes, I am. Al hablar de ti vuelves a am; do no pinta nada aquí.',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_03_PHRASES,
} satisfies SessionSource;
