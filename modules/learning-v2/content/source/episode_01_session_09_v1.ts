// зачем: сессия 9 открывает главу 2 «Люди вокруг меня». Тип words_then_phrases:
// слова родства и his / her идут карточками, дальше фразы из них. Опирается на
// сессию 6 (he / she / it) — человек уже говорит о третьем лице, теперь учится
// называть, кто это.
import { EPISODE_01_SESSION_09_PHRASES } from './episode_01_session_09_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_09_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 9,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Моя семья',
    uk: 'Моя сім’я',
    es: 'Mi familia',
  },
  summary: {
    ru: 'Вы умеете говорить «он» и «она». Теперь научитесь называть, кто это: сестра, брат, мама — и говорить, чьи они.',
    uk: 'Ви вмієте казати «він» і «вона». Тепер навчитеся називати, хто це: сестра, брат, мама — і чиї вони.',
    es: 'Ya sabes decir «él» y «ella». Ahora aprenderás a nombrarlos: hermana, hermano, madre, y de quién son.',
  },
  learningGoal: {
    ru: 'После сессии вы представите свою семью и назовёте имя любого человека.',
    uk: 'Після сесії ви представите свою сім’ю та назвете ім’я будь-якої людини.',
    es: 'Al terminar presentarás a tu familia y dirás el nombre de cualquier persona.',
  },
  introPages: [
    {
      kind: 'concept',
      title: {
        ru: 'His и her — чей это человек',
        uk: 'His і her — чия це людина',
        es: 'His y her: de quién es',
      },
      body: {
        ru: 'Вы знаете my («мой») и your («твой»). Добавляются ещё два: his — принадлежность мужчине, her — женщине. Ставятся так же, перед предметом: his sister, her name. Важно: слово выбирается по ХОЗЯИНУ, а не по предмету. His sister — «его сестра»: сестра женщина, но принадлежит мужчине, поэтому his.',
        uk: 'Ви знаєте my і your. Додаються ще два: his — належність чоловікові, her — жінці. Слово обирається за ВЛАСНИКОМ, а не за предметом: his sister — «його сестра».',
        es: 'Ya conoces my y your. Se añaden dos: his para un hombre, her para una mujer. Se elige por el DUEÑO, no por el objeto: his sister — «su hermana» (de él).',
      },
      question: {
        prompt: {
          ru: 'Как сказать «его сестра»?',
          uk: 'Як сказати «його сестра»?',
          es: '¿Cómo se dice «su hermana» (de él)?',
        },
        choices: [
          { ru: 'his sister', uk: 'his sister', es: 'his sister' },
          { ru: 'her sister', uk: 'her sister', es: 'her sister' },
          { ru: 'he sister', uk: 'he sister', es: 'he sister' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'His sister. Сестра женщина, но хозяин мужчина — значит his.',
          uk: 'His sister. Сестра жінка, але власник чоловік — отже his.',
          es: 'His sister. La hermana es mujer, pero el dueño es él: his.',
        },
      },
    },
    {
      kind: 'formula',
      title: {
        ru: 'Как назвать имя человека',
        uk: 'Як назвати ім’я людини',
        es: 'Cómo decir el nombre de alguien',
      },
      body: {
        ru: 'По-русски мы говорим «её зовут Анна» — глаголом. В английском имя это предмет, у которого есть хозяин: Her name is Anna, дословно «её имя есть Анна». Схема одна на всех: his name is, her name is, my name is. Меняется только первое слово.',
        uk: 'Українською кажемо «її звати Анна» — дієсловом. В англійській ім’я це предмет із власником: Her name is Anna, дослівно «її ім’я є Анна».',
        es: 'En español decimos «se llama Ana», con verbo. En inglés el nombre es un objeto con dueño: Her name is Anna, literalmente «su nombre es Ana».',
      },
      question: {
        prompt: {
          ru: 'Как сказать «его зовут Том»?',
          uk: 'Як сказати «його звати Том»?',
          es: '¿Cómo se dice «se llama Tom»?',
        },
        choices: [
          { ru: 'His name is Tom', uk: 'His name is Tom', es: 'His name is Tom' },
          { ru: 'He name is Tom', uk: 'He name is Tom', es: 'He name is Tom' },
          { ru: 'His is name Tom', uk: 'His is name Tom', es: 'His is name Tom' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'His name is Tom. Перед предметом стоит his, потом связка.',
          uk: 'His name is Tom. Перед предметом стоїть his, потім зв’язка.',
          es: 'His name is Tom. Antes del objeto va his, luego la cópula.',
        },
      },
    },
    {
      kind: 'tip',
      title: {
        ru: 'Показать пальцем или продолжить разговор',
        uk: 'Показати пальцем чи продовжити розмову',
        es: 'Señalar o seguir hablando',
      },
      body: {
        ru: 'Представляя человека, который стоит рядом, говорят This is my sister — «это моя сестра». Если о нём уже речь шла, берут he или she: He is my brother. Разница простая: this показывает пальцем, he и she продолжают разговор. И ещё: перед словом о принадлежности артикль не ставят — my sister, а не a my sister.',
        uk: 'Представляючи людину поруч, кажуть This is my sister. Якщо про неї вже йшлося — he або she. This показує пальцем, he і she продовжують розмову.',
        es: 'Al presentar a alguien que está al lado: This is my sister. Si ya se habló de esa persona: he o she. This señala; he y she continúan.',
      },
      question: {
        prompt: {
          ru: 'Как представить сестру, показывая на неё?',
          uk: 'Як представити сестру, показуючи на неї?',
          es: '¿Cómo presentas a tu hermana señalándola?',
        },
        choices: [
          { ru: 'This is my sister', uk: 'This is my sister', es: 'This is my sister' },
          { ru: 'She is my sister', uk: 'She is my sister', es: 'She is my sister' },
          { ru: 'This is a my sister', uk: 'This is a my sister', es: 'This is a my sister' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'This is my sister. Показываете — значит this, и артикль перед my не нужен.',
          uk: 'This is my sister. Показуєте — отже this, артикль перед my не потрібен.',
          es: 'This is my sister. Si señalas, va this, y no hace falta artículo.',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_09_PHRASES,
} satisfies SessionSource;
