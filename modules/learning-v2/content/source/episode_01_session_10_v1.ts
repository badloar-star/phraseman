// зачем: сессия 10 типа phrases — новых слов нет, всё строится на лексике
// сессии 9. Тема одна: принадлежность. Вопрос Whose, апостроф у хозяина
// (sister’s) и самостоятельные формы mine / yours / hers для ответа.
import { EPISODE_01_SESSION_10_PHRASES } from './episode_01_session_10_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_10_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 10,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Чей это',
    uk: 'Чиє це',
    es: 'De quién es',
  },
  summary: {
    ru: 'Вы умеете сказать «моя сестра». Теперь научитесь спрашивать, чья вещь, и отвечать — своя она или чужая.',
    uk: 'Ви вмієте сказати «моя сестра». Тепер навчитеся питати, чия річ, і відповідати.',
    es: 'Ya sabes decir «mi hermana». Ahora aprenderás a preguntar de quién es algo y a responder.',
  },
  learningGoal: {
    ru: 'После сессии вы спросите, чья вещь, и ответите — своя или чужая.',
    uk: 'Після сесії ви запитаєте, чия річ, і відповісте — своя чи чужа.',
    es: 'Al terminar preguntarás de quién es algo y responderás si es tuyo o no.',
  },
  introPages: [
    {
      kind: 'concept',
      title: {
        ru: 'Whose — «чей»',
        uk: 'Whose — «чий»',
        es: 'Whose: «de quién»',
      },
      body: {
        ru: 'Новое вопросительное слово к тем трём, что вы знаете. Whose спрашивает о хозяине: Whose bag is this? — «чья это сумка». Порядок обычный: слово-вопрос, предмет, связка, указание. Ловушка на письме: whose звучит точно как who’s, но who’s это «кто есть», совсем другое.',
        uk: 'Нове питальне слово: whose питає про власника. Whose bag is this? Пастка на письмі: звучить як who’s, але who’s це «хто є».',
        es: 'Una palabra de pregunta más: whose pregunta por el dueño. Whose bag is this? Ojo al escribir: suena igual que who’s, pero who’s es «quién es».',
      },
      question: {
        prompt: {
          ru: 'Как спросить «чья это сумка?»',
          uk: 'Як запитати «чия це сумка?»',
          es: '¿Cómo se pregunta «¿de quién es esta bolsa?»',
        },
        choices: [
          { ru: 'Whose bag is this?', uk: 'Whose bag is this?', es: 'Whose bag is this?' },
          { ru: 'Who’s bag is this?', uk: 'Who’s bag is this?', es: 'Who’s bag is this?' },
          { ru: 'Who bag is this?', uk: 'Who bag is this?', es: 'Who bag is this?' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Whose bag is this? Who’s значит «кто есть», а who спрашивает о человеке.',
          uk: 'Whose bag is this? Who’s означає «хто є».',
          es: 'Whose bag is this? Who’s significa «quién es».',
        },
      },
    },
    {
      kind: 'formula',
      title: {
        ru: 'Апостроф: хозяин впереди вещи',
        uk: 'Апостроф: власник попереду речі',
        es: 'El apóstrofo: el dueño va primero',
      },
      body: {
        ru: 'Чтобы сказать «сумка сестры», к хозяину добавляют апостроф и s: my sister’s bag. Порядок обратный русскому — сначала хозяин, потом вещь. Работает с любым человеком: brother’s, Anna’s, mother’s. Без апострофа смысл рассыпается: sisters bag читается как «сёстры сумка».',
        uk: 'Щоб сказати «сумка сестри», до власника додають апостроф і s: my sister’s bag. Порядок зворотний українському — спочатку власник.',
        es: 'Para decir «la bolsa de mi hermana» se añade apóstrofo y s al dueño: my sister’s bag. El orden es inverso al español: primero el dueño.',
      },
      question: {
        prompt: {
          ru: 'Как сказать «телефон брата»?',
          uk: 'Як сказати «телефон брата»?',
          es: '¿Cómo se dice «el teléfono del hermano»?',
        },
        choices: [
          { ru: 'brother’s phone', uk: 'brother’s phone', es: 'brother’s phone' },
          { ru: 'phone brother’s', uk: 'phone brother’s', es: 'phone brother’s' },
          { ru: 'brothers phone', uk: 'brothers phone', es: 'brothers phone' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Brother’s phone. Хозяин впереди, апостроф обязателен.',
          uk: 'Brother’s phone. Власник попереду, апостроф обов’язковий.',
          es: 'Brother’s phone. El dueño delante y con apóstrofo.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Mine и my — не одно и то же',
        uk: 'Mine і my — не те саме',
        es: 'Mine y my no son lo mismo',
      },
      body: {
        ru: 'My всегда требует предмета после себя: my bag. Если предмет уже назван и повторять его не нужно, берут mine: It is mine. Так же работают yours и hers. И запомните: у этих слов апострофа НЕТ никогда — hers, а не her’s. Апостроф ставят только к имени или названию человека.',
        uk: 'My завжди вимагає предмета: my bag. Якщо предмет уже названо — mine: It is mine. Так само yours і hers. Апострофа в них НЕМАЄ.',
        es: 'My siempre necesita un objeto: my bag. Si ya se nombró, se usa mine: It is mine. Igual yours y hers, y NUNCA llevan apóstrofo.',
      },
      question: {
        prompt: {
          ru: 'Как сказать «это моё»?',
          uk: 'Як сказати «це моє»?',
          es: '¿Cómo se dice «es mío»?',
        },
        choices: [
          { ru: 'It is mine', uk: 'It is mine', es: 'It is mine' },
          { ru: 'It is my', uk: 'It is my', es: 'It is my' },
          { ru: 'It is mine’s', uk: 'It is mine’s', es: 'It is mine’s' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'It is mine. My требует предмета, а апостроф этим словам не нужен.',
          uk: 'It is mine. My вимагає предмета, апостроф не потрібен.',
          es: 'It is mine. My necesita objeto, y no lleva apóstrofo.',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_10_PHRASES,
} satisfies SessionSource;
