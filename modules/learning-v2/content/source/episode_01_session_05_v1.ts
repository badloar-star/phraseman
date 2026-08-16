// зачем: сессия 5 голосовая. По карте она ничего нового не вводит, кроме самого
// говорения: человек произносит вслух то, что четыре сессии собирал глазами.
// Фразы намеренно повторяют сессии 1–3 — это активное припоминание.
import { EPISODE_01_SESSION_05_PHRASES } from './episode_01_session_05_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_05_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 5,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Скажи вслух: знакомство',
    uk: 'Скажи вголос: знайомство',
    es: 'Dilo en voz alta: presentarse',
  },
  summary: {
    ru: 'Вы уже собираете фразы глазами. Теперь произнесёте их вслух — новых слов не будет, только знакомые. Разберём три звука, на которых спотыкаются почти все.',
    uk: 'Ви вже складаєте фрази очима. Тепер вимовите їх уголос — нових слів не буде. Розберемо три звуки, на яких спотикаються майже всі.',
    es: 'Ya armas frases con la vista. Ahora las dirás en voz alta, sin palabras nuevas. Veremos tres sonidos donde casi todos tropiezan.',
  },
  learningGoal: {
    ru: 'После сессии вы произнесёте вслух десять знакомых фраз, не глядя в текст.',
    uk: 'Після сесії ви вимовите вголос десять знайомих фраз, не дивлячись у текст.',
    es: 'Al terminar dirás en voz alta diez frases conocidas sin mirar el texto.',
  },
  introPages: [
    {
      kind: 'concept',
      title: {
        ru: 'Звук th: язык между зубами',
        uk: 'Звук th: язик між зубами',
        es: 'El sonido th: la lengua entre los dientes',
      },
      body: {
        ru: 'В слове Thank этого звука нет ни в русском, ни в украинском, поэтому его подменяют на «с» или «ф». Получается sank («утонул») или несуществующее fank. Сделайте так: кончик языка слегка между зубами, выдохните — язык должно быть видно в зеркале. Звук получается шепелявый, и это правильно.',
        uk: 'У слові Thank цього звука немає в українській, тому його підміняють на «с» або «ф». Кінчик язика злегка між зубами, видихніть — язик має бути видно.',
        es: 'En Thank hay un sonido que el español apenas usa. Pon la punta de la lengua entre los dientes y sopla: debe verse la lengua.',
      },
      question: {
        prompt: {
          ru: 'Куда девать язык в звуке th?',
          uk: 'Куди дівати язик у звуці th?',
          es: '¿Dónde va la lengua en el sonido th?',
        },
        choices: [
          { ru: 'Между зубами', uk: 'Між зубами', es: 'Entre los dientes' },
          { ru: 'За верхние зубы', uk: 'За верхні зуби', es: 'Detrás de los dientes' },
          { ru: 'Никуда, это просто «с»', uk: 'Нікуди, це просто «с»', es: 'En ningún sitio, es una s' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Между зубами. Если язык спрятан, выйдет sank вместо thank — другое слово.',
          uk: 'Між зубами. Якщо язик сховано, вийде sank замість thank.',
          es: 'Entre los dientes. Si la escondes, dirás sank en vez de thank.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Английское r не такое, как русское',
        uk: 'Англійське r не таке, як українське',
        es: 'La r inglesa no es la r española',
      },
      body: {
        ru: 'В словах ready и tired язык НЕ касается нёба и не дрожит. Он поднят и отведён назад, кончик свободен — звук получается глухой, будто вы собрались зарычать и передумали. Раскатистое русское «р» сразу выдаёт акцент, а мягкое «рь» делает слово неузнаваемым.',
        uk: 'У словах ready і tired язик НЕ торкається піднебіння і не дрижить. Він піднятий і відведений назад, кінчик вільний.',
        es: 'En ready y tired la lengua NO toca el paladar ni vibra. Va levantada y retraída, con la punta suelta.',
      },
      question: {
        prompt: {
          ru: 'Как звучит английское r?',
          uk: 'Як звучить англійське r?',
          es: '¿Cómo suena la r inglesa?',
        },
        choices: [
          { ru: 'Язык не дрожит', uk: 'Язик не дрижить', es: 'La lengua no vibra' },
          { ru: 'Раскатисто, как «ррр»', uk: 'Розкотисто, як «ррр»', es: 'Vibrante, como «rr»' },
          { ru: 'Мягко, как «рь»', uk: 'М’яко, як «рь»', es: 'Suave, palatalizada' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Язык не дрожит и не касается нёба — этим английское r и отличается.',
          uk: 'Язик не дрижить і не торкається піднебіння.',
          es: 'La lengua ni vibra ni toca el paladar: ahí está la diferencia.',
        },
      },
    },
    {
      kind: 'tip',
      title: {
        ru: 'Слова слипаются — так и надо',
        uk: 'Слова злипаються — так і треба',
        es: 'Las palabras se pegan, y está bien',
      },
      body: {
        ru: 'Носители не проговаривают каждое слово отдельно. Meet you звучит примерно как «миччу», see you — как «сию», good morning сливается в одно движение. Если произносить по словам, речь звучит роботом. Говорите фразу целиком, на одном выдохе — так понятнее, а не наоборот.',
        uk: 'Носії не вимовляють кожне слово окремо. Meet you звучить приблизно як «мічу», see you — як «сію». Говоріть фразу цілком, на одному видиху.',
        es: 'Los nativos no separan cada palabra. Meet you suena casi «michu», see you casi «siyu». Di la frase entera de un tirón.',
      },
      question: {
        prompt: {
          ru: 'Как лучше произносить фразу?',
          uk: 'Як краще вимовляти фразу?',
          es: '¿Cómo conviene decir la frase?',
        },
        choices: [
          { ru: 'Целиком, слитно', uk: 'Цілком, злитно', es: 'Entera, de un tirón' },
          { ru: 'По одному слову', uk: 'По одному слову', es: 'Palabra por palabra' },
          { ru: 'С паузой после каждого', uk: 'З паузою після кожного', es: 'Con pausa tras cada una' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Целиком. Разделённые слова звучат как у робота, слитная речь понятнее.',
          uk: 'Цілком. Розділені слова звучать як у робота.',
          es: 'Entera. Palabra por palabra suena robótico y se entiende peor.',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_05_PHRASES,
} satisfies SessionSource;
