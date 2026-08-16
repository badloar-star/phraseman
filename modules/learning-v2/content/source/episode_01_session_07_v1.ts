// зачем: сессия 7 закрывает таблицу to be целиком. Человек уже знает am (я),
// is (он, она, оно) и are для «ты» — здесь are распространяется на «мы» и «они»,
// и заодно вводится множественное число существительных.
import { EPISODE_01_SESSION_07_PHRASES } from './episode_01_session_07_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_07_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 7,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Мы и они',
    uk: 'Ми і вони',
    es: 'Nosotros y ellos',
  },
  summary: {
    ru: 'Последняя пара слов о людях — и связка закончится полностью. Заодно научитесь говорить о нескольких предметах сразу.',
    uk: 'Остання пара слів про людей — і зв’язка закінчиться повністю. Заразом навчитеся говорити про кілька предметів.',
    es: 'El último par de palabras sobre personas, y la cópula queda completa. También aprenderás a hablar de varias cosas.',
  },
  learningGoal: {
    ru: 'После сессии вы расскажете о группе людей и назовёте несколько предметов сразу.',
    uk: 'Після сесії ви розкажете про групу людей і назвете кілька предметів.',
    es: 'Al terminar hablarás de un grupo de personas y nombrarás varias cosas a la vez.',
  },
  introPages: [
    {
      kind: 'formula',
      title: {
        ru: 'Таблица связки закончилась',
        uk: 'Таблиця зв’язки закінчилася',
        es: 'La tabla de la cópula está completa',
      },
      body: {
        ru: 'We (мы) и they (они) берут ту же форму are, что и you. Теперь вы знаете всё: am идёт к I, is к he, she, it, are ко всем остальным — you, we, they. Три формы, больше учить нечего. Это вся связка английского языка.',
        uk: 'We (ми) і they (вони) беруть ту саму форму are, що й you. Тепер ви знаєте все: am до I, is до he, she, it, are до решти.',
        es: 'We (nosotros) y they (ellos) usan la misma forma are que you. Ya lo sabes todo: am con I, is con he, she, it, are con el resto.',
      },
      question: {
        prompt: {
          ru: 'Что поставить: They ___ busy?',
          uk: 'Що поставити: They ___ busy?',
          es: '¿Qué va aquí: They ___ busy?',
        },
        choices: [
          { ru: 'are', uk: 'are', es: 'are' },
          { ru: 'is', uk: 'is', es: 'is' },
          { ru: 'am', uk: 'am', es: 'am' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'They are busy. Их несколько, а is — только для одного.',
          uk: 'They are busy. Їх кілька, а is — лише для одного.',
          es: 'They are busy. Son varios, e is es solo para uno.',
        },
      },
    },
    {
      kind: 'concept',
      title: {
        ru: 'Несколько предметов: добавь s',
        uk: 'Кілька предметів: додай s',
        es: 'Varias cosas: añade s',
      },
      body: {
        ru: 'Чтобы сказать «друзья» вместо «друг», к слову добавляют s: friend становится friends. Правило работает почти со всеми предметами и людьми. Никаких падежей и родов — одна буква, и слово стало множественным.',
        uk: 'Щоб сказати «друзі» замість «друг», до слова додають s: friend стає friends. Правило працює майже з усіма предметами.',
        es: 'Para decir «amigos» en vez de «amigo», se añade s: friend pasa a friends. Vale para casi todo.',
      },
      question: {
        prompt: {
          ru: 'Как сказать «друзья»?',
          uk: 'Як сказати «друзі»?',
          es: '¿Cómo se dice «amigos»?',
        },
        choices: [
          { ru: 'friends', uk: 'friends', es: 'friends' },
          { ru: 'friend', uk: 'friend', es: 'friend' },
          { ru: 'friendes', uk: 'friendes', es: 'friendes' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Friends. Просто добавили s, ничего больше менять не нужно.',
          uk: 'Friends. Просто додали s.',
          es: 'Friends. Solo se añade la s.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Признак никогда не получает s',
        uk: 'Ознака ніколи не отримує s',
        es: 'El adjetivo nunca lleva s',
      },
      body: {
        ru: 'Слова-признаки в английском не меняются по числу. «Они заняты» — They are busy, а не busies. По-русски мы говорим «занят» и «заняты», по-английски busy одинаково для одного и для сотни. И ещё: артикль a перед множественным числом не ставят никогда, потому что a значит «один». We are friends — без артикля.',
        uk: 'Слова-ознаки не змінюються за числом: They are busy, а не busies. І артикль a перед множиною не ставлять ніколи.',
        es: 'Los adjetivos no cambian de número: They are busy, nunca busies. Y a nunca va con plural, porque significa «uno».',
      },
      question: {
        prompt: {
          ru: 'Как правильно сказать «они заняты»?',
          uk: 'Як правильно сказати «вони зайняті»?',
          es: '¿Cómo se dice «están ocupados»?',
        },
        choices: [
          { ru: 'They are busy', uk: 'They are busy', es: 'They are busy' },
          { ru: 'They are busies', uk: 'They are busies', es: 'They are busies' },
          { ru: 'They is busy', uk: 'They is busy', es: 'They is busy' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'They are busy. Признак не получает s, сколько бы людей ни было.',
          uk: 'They are busy. Ознака не отримує s.',
          es: 'They are busy. El adjetivo no lleva s.',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_07_PHRASES,
} satisfies SessionSource;
