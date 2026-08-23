import type { EpisodeSourcePhrase } from './episode_01_source_v1';

/**
 * Испанский курс, эпизод 1 «¿Cómo estás?», сессия 1.
 *
 * Границы урока взяты из docs/v2/SPANISH_CURRICULUM_GRID.ru.md (урок 1 =
 * ТОЛЬКО estar, состояние и место), а не придуманы — правило №2
 * docs/v2/LESSON_DESIGN_RULES.ru.md запрещает придумывать границы на ходу.
 *
 * зачем ТОЛЬКО estoy/estás: сессия 1 держит одну мысль — «estar меняется по
 * лицу». Третье лицо (está), места и вопросы уходят в сессии 2-3 со своим
 * интро. Английская сессия 1 уже наступала на эти грабли: интро объясняло
 * связку, а карточки требовали приветствий и артикля, которых никто не
 * объяснял (см. комментарий в episode_01_source_v1.ts).
 *
 * зачем ser здесь НЕТ вообще: ser — отдельный глагол, урок 2. Контраст
 * ser/estar — урок 3. Давать обе связки до того, как усвоена каждая,
 * порождает угадывание вместо понимания (СТАРТ В2, раздел 6: одна понятная
 * мысль на страницу).
 *
 * Язык курса: латиноамериканский нейтральный, без vosotros.
 * Поле `english` — историческое имя поля «целевая фраза», языконезависимое
 * (locale берётся из source.targetLanguage). Здесь в нём испанский.
 */
export const ES_EPISODE_01_SESSION_01_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'es-e01-s01-estoy-bien',
      english: 'Estoy bien',
      russian: 'Я в порядке',
      explanation:
        'Ответ, который испаноязычный человек слышит и говорит каждый день. В русском мы обходимся без глагола — «я хорошо». В испанском состояние без глагола не выражают: estoy обязательно.',
      words: [
        {
          correct: 'Estoy',
          category: 'estar',
          distractors: [
            {
              value: 'Estás',
              reasonCode: 'agreement_person_mismatch',
              why: 'Estás — это «ты». Про себя говорят estoy.',
            },
            {
              value: 'Está',
              reasonCode: 'agreement_person_mismatch',
              why: 'Está — про него, её или вас вежливо. Про себя — estoy.',
            },
            {
              value: 'Estar',
              reasonCode: 'infinitive_not_finite',
              why: 'Estar — начальная форма, как «быть». В готовой фразе нужна личная: estoy.',
            },
            {
              value: 'Soy',
              reasonCode: 'ser_estar_confusion',
              why: 'Soy — от другого глагола, ser. Он про то, какой человек вообще, а не про состояние сейчас.',
            },
          ],
        },
        {
          correct: 'bien',
          category: 'state-adverb',
          distractors: [
            {
              value: 'bueno',
              reasonCode: 'adjective_for_adverb',
              why: 'Bueno — «хороший», признак предмета. О самочувствии говорят bien.',
            },
            {
              value: 'buena',
              reasonCode: 'adjective_for_adverb',
              why: 'Buena — «хорошая». Это тоже признак предмета, а не состояние.',
            },
            {
              value: 'biene',
              reasonCode: 'orthographic_invalid',
              why: 'Такого слова нет. Правильно bien, без лишней буквы.',
            },
          ],
        },
      ],
      features: ['estar', 'first-person-singular', 'state'],
    },
    {
      id: 'es-e01-s01-estoy-cansado',
      english: 'Estoy cansado',
      russian: 'Я устал',
      explanation:
        'Так говорят про себя в конце дня. Мужчина скажет cansado, женщина — cansada: признак подстраивается под того, кто говорит. Для русского это привычно — «устал» и «устала».',
      words: [
        {
          correct: 'cansado',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'cansada',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Cansada говорит о себе женщина. Здесь говорит мужчина.',
            },
            {
              value: 'cansados',
              reasonCode: 'number_agreement_mismatch',
              why: 'Cansados — про нескольких. Здесь один человек про себя.',
            },
            {
              value: 'cansar',
              reasonCode: 'infinitive_not_adjective',
              why: 'Cansar — «утомлять», действие. Состояние — cansado.',
            },
          ],
        },
      ],
      features: ['estar', 'gender-agreement', 'state'],
    },
    {
      id: 'es-e01-s01-estoy-en-casa',
      english: 'Estoy en casa',
      russian: 'Я дома',
      explanation:
        'Тот же глагол estar отвечает и на вопрос «где». Испанцу естественно сказать en casa — без артикля, это устойчивое сочетание про свой дом.',
      words: [
        {
          correct: 'en',
          category: 'preposition-place',
          distractors: [
            {
              value: 'a',
              reasonCode: 'preposition_direction_for_place',
              why: 'A — про направление, куда идёшь. Здесь ты уже находишься там.',
            },
            {
              value: 'de',
              reasonCode: 'preposition_origin_for_place',
              why: 'De — «из», откуда ты. Место, где находишься, — en.',
            },
            {
              value: 'con',
              reasonCode: 'preposition_semantic_mismatch',
              why: 'Con — «с кем-то». К месту не относится.',
            },
          ],
        },
      ],
      features: ['estar', 'place', 'preposition-en'],
    },
    {
      id: 'es-e01-s01-como-estas',
      english: '¿Cómo estás?',
      russian: 'Как дела?',
      explanation:
        'Главный вопрос при встрече. Estás — форма для «ты», поэтому местоимение не нужно: окончание уже говорит, к кому обращаются. Вопрос в испанском обрамляется двумя знаками — перевёрнутым в начале и обычным в конце.',
      words: [
        {
          correct: 'estás',
          category: 'estar',
          distractors: [
            {
              value: 'estoy',
              reasonCode: 'agreement_person_mismatch',
              why: 'Estoy — про себя. Спрашивают про собеседника: estás.',
            },
            {
              value: 'está',
              reasonCode: 'agreement_person_mismatch',
              why: 'Está — про него или её. К «ты» идёт estás.',
            },
            {
              value: 'estas',
              reasonCode: 'accent_missing',
              why: 'Без ударения estas — «эти». Глагол пишется estás.',
            },
            {
              value: 'eres',
              reasonCode: 'ser_estar_confusion',
              why: 'Eres — от ser, про постоянное. Про состояние спрашивают через estar.',
            },
          ],
        },
      ],
      features: ['estar', 'second-person-singular', 'question'],
    },
    {
      id: 'es-e01-s01-estoy-ocupado',
      english: 'Estoy ocupado',
      russian: 'Я занят',
      explanation:
        'Вежливый способ сказать, что сейчас не до разговора. Женщина скажет ocupada — тот же принцип, что с cansado.',
      words: [
        {
          correct: 'ocupado',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'ocupada',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Ocupada — про себя говорит женщина.',
            },
            {
              value: 'ocupar',
              reasonCode: 'infinitive_not_adjective',
              why: 'Ocupar — «занимать», действие. Состояние — ocupado.',
            },
            {
              value: 'ocupados',
              reasonCode: 'number_agreement_mismatch',
              why: 'Ocupados — про нескольких людей.',
            },
          ],
        },
      ],
      features: ['estar', 'gender-agreement', 'state'],
    },
    {
      id: 'es-e01-s01-estoy-listo',
      english: 'Estoy listo',
      russian: 'Я готов',
      explanation:
        'Говорят перед выходом или началом дела. Женщина — lista. Обратите внимание: то же слово с ser значило бы «умный», но ser мы пока не трогаем.',
      words: [
        {
          correct: 'listo',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'lista',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Lista — про себя говорит женщина.',
            },
            {
              value: 'listos',
              reasonCode: 'number_agreement_mismatch',
              why: 'Listos — про нескольких.',
            },
            {
              value: 'listo?',
              reasonCode: 'orthographic_invalid',
              why: 'Знак вопроса здесь не нужен: это утверждение, а не вопрос.',
            },
          ],
        },
      ],
      features: ['estar', 'gender-agreement', 'state'],
    },
    {
      id: 'es-e01-s01-no-estoy-seguro',
      english: 'No estoy seguro',
      russian: 'Я не уверен',
      explanation:
        'Отрицание в испанском простое: no ставится прямо перед глаголом. Ничего больше менять не нужно.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            {
              value: 'Nada',
              reasonCode: 'negation_word_mismatch',
              why: 'Nada — «ничего», отдельное слово. Глагол отрицают через no.',
            },
            {
              value: 'Ni',
              reasonCode: 'negation_word_mismatch',
              why: 'Ni — «ни», для перечисления. Простое отрицание — no.',
            },
            {
              value: 'Non',
              reasonCode: 'orthographic_invalid',
              why: 'Non — не испанское слово. В испанском no.',
            },
          ],
        },
      ],
      features: ['estar', 'negation', 'state'],
    },
    {
      id: 'es-e01-s01-estoy-aqui',
      english: 'Estoy aquí',
      russian: 'Я здесь',
      explanation:
        'Короткий ответ, когда тебя ищут или зовут. Aquí пишется с ударением на последнюю букву — оно слышно в речи.',
      words: [
        {
          correct: 'aquí',
          category: 'place-adverb',
          distractors: [
            {
              value: 'aqui',
              reasonCode: 'accent_missing',
              why: 'Без ударения слово читается неверно. Пишется aquí.',
            },
            {
              value: 'allí',
              reasonCode: 'semantic_neighbor_deixis',
              why: 'Allí — «там», далеко от говорящего. Про себя — aquí.',
            },
            {
              value: 'aquel',
              reasonCode: 'demonstrative_for_adverb',
              why: 'Aquel — «тот», указывает на предмет, а не на место.',
            },
          ],
        },
      ],
      features: ['estar', 'place', 'first-person-singular'],
    },
    {
      id: 'es-e01-s01-estoy-en-el-trabajo',
      english: 'Estoy en el trabajo',
      russian: 'Я на работе',
      explanation:
        'Частый ответ днём. Здесь артикль el нужен — в отличие от en casa, где его нет. Это устойчивая пара, её проще запомнить целиком.',
      words: [
        {
          correct: 'el',
          category: 'article',
          distractors: [
            {
              value: 'la',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Trabajo — слово мужского рода, к нему идёт el.',
            },
            {
              value: 'un',
              reasonCode: 'article_definiteness_mismatch',
              why: 'Un — «какая-то работа». Здесь речь про свою, конкретную.',
            },
            {
              value: 'los',
              reasonCode: 'number_agreement_mismatch',
              why: 'Los — для множественного. Работа здесь одна.',
            },
          ],
        },
      ],
      features: ['estar', 'place', 'article'],
    },
    {
      id: 'es-e01-s01-estoy-enfermo',
      english: 'Estoy enfermo',
      russian: 'Я болею',
      explanation:
        'Так предупреждают, что сегодня не придут. Женщина — enferma. Состояние временное, поэтому именно estar.',
      words: [
        {
          correct: 'enfermo',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'enferma',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Enferma — про себя говорит женщина.',
            },
            {
              value: 'enfermedad',
              reasonCode: 'noun_for_adjective',
              why: 'Enfermedad — «болезнь», предмет. Состояние человека — enfermo.',
            },
            {
              value: 'enfermos',
              reasonCode: 'number_agreement_mismatch',
              why: 'Enfermos — про нескольких.',
            },
          ],
        },
      ],
      features: ['estar', 'gender-agreement', 'state'],
    },
    {
      id: 'es-e01-s01-estas-cansada',
      english: '¿Estás cansada?',
      russian: 'Ты устала?',
      explanation:
        'Вопрос женщине. Здесь видно сразу два правила: estás — потому что «ты», cansada — потому что спрашивают женщину.',
      words: [
        {
          correct: 'cansada',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'cansado',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Cansado — если спрашивают мужчину. Здесь женщина.',
            },
            {
              value: 'cansadas',
              reasonCode: 'number_agreement_mismatch',
              why: 'Cansadas — если спрашивают нескольких женщин.',
            },
            {
              value: 'cansancio',
              reasonCode: 'noun_for_adjective',
              why: 'Cansancio — «усталость», предмет. Про человека — cansada.',
            },
          ],
        },
      ],
      features: ['estar', 'second-person-singular', 'gender-agreement', 'question'],
    },
    {
      id: 'es-e01-s01-no-estoy-en-casa',
      english: 'No estoy en casa',
      russian: 'Меня нет дома',
      explanation:
        'Отрицание и место вместе. По-русски мы говорим «меня нет», по-испански — «я не нахожусь»: глагол остаётся тот же, меняется только no перед ним.',
      words: [
        {
          correct: 'estoy',
          category: 'estar',
          distractors: [
            {
              value: 'estás',
              reasonCode: 'agreement_person_mismatch',
              why: 'Estás — про тебя. Говорящий про себя — estoy.',
            },
            {
              value: 'está',
              reasonCode: 'agreement_person_mismatch',
              why: 'Está — про третьего человека.',
            },
            {
              value: 'soy',
              reasonCode: 'ser_estar_confusion',
              why: 'Soy — от ser. Место, где находишься, выражают через estar.',
            },
          ],
        },
      ],
      features: ['estar', 'negation', 'place'],
    },
    {
      id: 'es-e01-s01-estoy-nervioso',
      english: 'Estoy nervioso',
      russian: 'Я нервничаю',
      explanation:
        'Про волнение перед важным делом. Женщина — nerviosa. По-русски это глагол, по-испански — состояние с estar.',
      words: [
        {
          correct: 'nervioso',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'nerviosa',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Nerviosa — про себя говорит женщина.',
            },
            {
              value: 'nervios',
              reasonCode: 'noun_for_adjective',
              why: 'Nervios — «нервы», предмет. Состояние — nervioso.',
            },
            {
              value: 'nerviosos',
              reasonCode: 'number_agreement_mismatch',
              why: 'Nerviosos — про нескольких.',
            },
          ],
        },
      ],
      features: ['estar', 'gender-agreement', 'state'],
    },
    {
      id: 'es-e01-s01-donde-estas',
      english: '¿Dónde estás?',
      russian: 'Ты где?',
      explanation:
        'Самый частый вопрос в переписке. Dónde в вопросе пишется с ударением — это отличает его от dónde без вопроса.',
      words: [
        {
          correct: 'Dónde',
          category: 'question-word',
          distractors: [
            {
              value: 'Donde',
              reasonCode: 'accent_missing',
              why: 'В вопросе слово получает ударение: dónde.',
            },
            {
              value: 'Cómo',
              reasonCode: 'question_word_mismatch',
              why: 'Cómo — «как», спрашивает о состоянии. О месте спрашивают dónde.',
            },
            {
              value: 'Cuándo',
              reasonCode: 'question_word_mismatch',
              why: 'Cuándo — «когда», про время, а не про место.',
            },
          ],
        },
      ],
      features: ['estar', 'second-person-singular', 'question', 'place'],
    },
    {
      id: 'es-e01-s01-estoy-contento',
      english: 'Estoy contento',
      russian: 'Я доволен',
      explanation:
        'Про радость от чего-то конкретного — хорошей новости, удачного дня. Женщина — contenta.',
      words: [
        {
          correct: 'contento',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'contenta',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Contenta — про себя говорит женщина.',
            },
            {
              value: 'contentos',
              reasonCode: 'number_agreement_mismatch',
              why: 'Contentos — про нескольких.',
            },
            {
              value: 'contentar',
              reasonCode: 'infinitive_not_adjective',
              why: 'Contentar — «радовать», действие. Состояние — contento.',
            },
          ],
        },
      ],
      features: ['estar', 'gender-agreement', 'state'],
    },
  ]);
