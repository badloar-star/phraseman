import type { EpisodeSourcePhrase } from './episode_01_source_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 1 «Это легко».
 *
 * Границы урока взяты из docs/v2/SPANISH_CURRICULUM_GRID.ru.md (урок 1 =
 * ser + признак, оценка и реакция), утверждено владельцем 2026-08-23.
 * Карта сессии — es_episode_01_session_map_v1.ts, сессия 1: soy, первое
 * лицо, отрицание, качественные прилагательные, базовое согласование рода.
 *
 * зачем ТОЛЬКО soy: сессия 1 держит одну мысль — «ser + признак меняется по
 * лицу». Второе и третье лицо, вопрос, множественное число уходят в сессии
 * 9, 17, 25 со своим интро (правило «одна понятная мысль на странице»,
 * СТАРТ В2 раздел 6).
 *
 * зачем НЕ «представиться»: владелец запретил анкетные формулы (Me llamo,
 * Soy de México, Soy profesor, Mucho gusto) — тот же класс, что «My name is
 * Anna» в английском курсе (docs/v2/LESSON_DESIGN_RULES правило 5, классы
 * «мёртвый учебниковый язык» и «чужое имя»). Урок даёт ser там, где он
 * звучит в жизни ежедневно — в оценке и реакции.
 *
 * зачем estar здесь НЕТ вообще: estar — отдельный глагол, урок 8 (место) и
 * урок 13 (состояние). Контраст ser/estar — урок 14, после того как обе
 * связки прожили по несколько уроков (VanPatten 1985/2010, ресерч в
 * SPANISH_CURRICULUM_RESEARCH.ru.md).
 *
 * Язык курса: латиноамериканский нейтральный, без vosotros.
 * Поле `english` — историческое имя поля «целевая фраза», языконезависимое
 * (locale берётся из source.targetLanguage). Здесь в нём испанский.
 */
export const ES_EPISODE_01_SESSION_01_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'es-e01-s01-es-facil',
      english: 'Es fácil',
      russian: 'Это легко',
      explanation:
        'Самая частая оценка чего угодно — задачи, языка, решения. По-русски мы обходимся без глагола: «это легко». По-испански связка обязательна: без es фраза рассыпется на голое fácil.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch',
              why: 'Eres — это «ты». Про «это» (безличную оценку) — только es.',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch',
              why: 'Soy — про себя. Оценка ситуации не о говорящем — es.',
            },
            {
              value: 'Ser',
              reasonCode: 'infinitive_not_finite',
              why: 'Ser — начальная форма, как «быть». В готовой фразе нужна личная: es.',
            },
            {
              value: 'Está',
              reasonCode: 'ser_estar_confusion',
              why: 'Está — от другого глагола, estar. Он про место и временное состояние, а не про постоянное свойство.',
            },
          ],
        },
        {
          correct: 'fácil',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'fácilmente',
              reasonCode: 'adverb_for_adjective',
              why: 'Fácilmente — «легко» как наречие при действии («сделал легко»). Признак самой вещи — fácil.',
            },
            {
              value: 'facilidad',
              reasonCode: 'noun_for_adjective',
              why: 'Facilidad — «лёгкость», предмет. Признак — fácil.',
            },
          ],
        },
      ],
      features: ['ser', 'first-person-implicit', 'quality'],
    },
    {
      id: 'es-e01-s01-soy-rapido',
      english: 'Soy rápido',
      russian: 'Я быстрый',
      explanation:
        'Так говорят о своём качестве — не о моменте, а вообще, всегда. Мужчина скажет rápido, женщина — rápida: признак подстраивается под того, кто говорит.',
      words: [
        {
          correct: 'Soy',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch',
              why: 'Eres — это «ты». Про себя — soy.',
            },
            {
              value: 'Es',
              reasonCode: 'agreement_person_mismatch',
              why: 'Es — про него, её или вежливое «вы». Про себя — soy.',
            },
            {
              value: 'Estoy',
              reasonCode: 'ser_estar_confusion',
              why: 'Estoy — от estar, про временное состояние или место. Постоянное качество — soy.',
            },
          ],
        },
        {
          correct: 'rápido',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'rápida',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Rápida говорит о себе женщина. Здесь говорит мужчина.',
            },
            {
              value: 'rápidos',
              reasonCode: 'number_agreement_mismatch',
              why: 'Rápidos — про нескольких. Здесь один человек про себя.',
            },
            {
              value: 'rapidez',
              reasonCode: 'noun_for_adjective',
              why: 'Rapidez — «скорость», предмет. Признак человека — rápido.',
            },
          ],
        },
      ],
      features: ['ser', 'first-person-singular', 'gender-agreement', 'quality'],
    },
    {
      id: 'es-e01-s01-no-es-dificil',
      english: 'No es difícil',
      russian: 'Это не трудно',
      explanation:
        'Отрицание в испанском простое: no ставится прямо перед глаголом, больше ничего менять не нужно. Difícil — противоположность fácil из первой фразы.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            {
              value: 'Nada',
              reasonCode: 'negation_word_mismatch',
              why: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.',
            },
            {
              value: 'Non',
              reasonCode: 'orthographic_invalid',
              why: 'Non — не испанское слово. В испанском отрицание пишется no.',
            },
          ],
        },
        {
          correct: 'difícil',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'fácil',
              reasonCode: 'antonym_confusion',
              why: 'Fácil значит противоположное — «легко». Здесь нужно «трудно».',
            },
            {
              value: 'dificultad',
              reasonCode: 'noun_for_adjective',
              why: 'Dificultad — «трудность», предмет. Признак — difícil.',
            },
          ],
        },
      ],
      features: ['ser', 'negation', 'quality'],
    },
    {
      id: 'es-e01-s01-es-verdad',
      english: 'Es verdad',
      russian: 'Это правда',
      explanation:
        'Так подтверждают чужие слова в разговоре. Verdad — существительное, но с ser оно работает как оценка утверждения: «это есть правда».',
      words: [
        {
          correct: 'verdad',
          category: 'truth-noun',
          distractors: [
            {
              value: 'verdadero',
              reasonCode: 'adjective_for_fixed_phrase',
              why: 'Verdadero — «истинный» как признак предмета (un hecho verdadero). Устойчивая реакция «это правда» — именно es verdad.',
            },
            {
              value: 'verdadera',
              reasonCode: 'adjective_for_fixed_phrase',
              why: 'То же самое в женском роде — здесь не подходит форма прилагательного, нужно существительное verdad.',
            },
          ],
        },
      ],
      features: ['ser', 'fixed-reaction'],
    },
    {
      id: 'es-e01-s01-no-es-asi',
      english: 'No es así',
      russian: 'Это не так',
      explanation:
        'Вежливое возражение, когда не согласен. Así — «так», указывает на способ, а не на предмет.',
      words: [
        {
          correct: 'así',
          category: 'manner-adverb',
          distractors: [
            {
              value: 'esto',
              reasonCode: 'demonstrative_for_manner',
              why: 'Esto — «это» как предмет. Способ, «так» — así.',
            },
            {
              value: 'aquí',
              reasonCode: 'semantic_neighbor_deixis',
              why: 'Aquí — «здесь», про место. Здесь нужно «так», способ — así.',
            },
          ],
        },
      ],
      features: ['ser', 'negation', 'fixed-reaction'],
    },
    {
      id: 'es-e01-s01-es-igual',
      english: 'Es igual',
      russian: 'Это всё равно',
      explanation:
        'Так говорят, когда выбор не важен — оба варианта одинаковы. Igual не меняется по роду: одна форма для всех.',
      words: [
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            {
              value: 'iguala',
              reasonCode: 'invariable_adjective_wrongly_inflected',
              why: 'Igual не меняется по роду — формы iguala не существует.',
            },
            {
              value: 'igualmente',
              reasonCode: 'adverb_for_adjective',
              why: 'Igualmente — «равным образом» при действии. Признак ситуации — igual.',
            },
          ],
        },
      ],
      features: ['ser', 'invariable-adjective'],
    },
    {
      id: 'es-e01-s01-eres-rapido',
      english: '¿Eres rápido?',
      russian: 'Ты быстрый?',
      explanation:
        'Вопрос про собеседника-мужчину. Eres — форма для «ты», поэтому местоимение не нужно: окончание уже показывает, к кому обращаются.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch',
              why: 'Soy — про себя. Спрашивают про собеседника — eres.',
            },
            {
              value: 'Es',
              reasonCode: 'agreement_person_mismatch',
              why: 'Es — про третье лицо. Про «ты» — eres.',
            },
            {
              value: 'Estás',
              reasonCode: 'ser_estar_confusion',
              why: 'Estás — от estar, про самочувствие или место сейчас. Постоянное качество — eres.',
            },
          ],
        },
      ],
      features: ['ser', 'second-person-singular', 'question'],
    },
    {
      id: 'es-e01-s01-no-soy-rapido',
      english: 'No soy rápido',
      russian: 'Я не быстрый',
      explanation:
        'Отрицание своего же качества из второй фразы. No встаёт перед soy, форма самого глагола не меняется.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            {
              value: 'Nunca',
              reasonCode: 'negation_word_mismatch',
              why: 'Nunca — «никогда», про частоту во времени. Простое отрицание качества — no.',
            },
          ],
        },
        {
          correct: 'soy',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch',
              why: 'Eres — про тебя. Говорящий про себя — soy.',
            },
            {
              value: 'estoy',
              reasonCode: 'ser_estar_confusion',
              why: 'Estoy — от estar. Постоянное качество, а не временное состояние — soy.',
            },
          ],
        },
      ],
      features: ['ser', 'negation', 'first-person-singular'],
    },
    {
      id: 'es-e01-s01-somos-dos',
      english: 'Somos dos',
      russian: 'Нас двое',
      explanation:
        'Так отвечают на вопрос о количестве человек — например, в ресторане. По-русски «нас», по-испански — форма «мы» от ser.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            {
              value: 'Son',
              reasonCode: 'agreement_person_mismatch',
              why: 'Son — «они» или вежливое «вы» много человек. Про себя вместе с кем-то — somos.',
            },
            {
              value: 'Estamos',
              reasonCode: 'ser_estar_confusion',
              why: 'Estamos — от estar, про место или состояние. Количество людей — somos.',
            },
          ],
        },
      ],
      features: ['ser', 'first-person-plural', 'quantity'],
    },
    {
      id: 'es-e01-s01-es-importante',
      english: 'Es importante',
      russian: 'Это важно',
      explanation:
        'Одна из самых частых оценок при обсуждении дел. Importante не меняется по роду — та же форма для мужского и женского.',
      words: [
        {
          correct: 'importante',
          category: 'invariable-adjective',
          distractors: [
            {
              value: 'importanta',
              reasonCode: 'invariable_adjective_wrongly_inflected',
              why: 'Importante не меняется по роду — формы importanta не существует.',
            },
            {
              value: 'importancia',
              reasonCode: 'noun_for_adjective',
              why: 'Importancia — «важность», предмет. Признак — importante.',
            },
          ],
        },
      ],
      features: ['ser', 'invariable-adjective'],
    },
    {
      id: 'es-e01-s01-eres-simpatica',
      english: 'Eres simpática',
      russian: 'Ты приятная',
      explanation:
        'Комплимент женщине. Здесь видно сразу два правила: eres — потому что «ты», simpática — потому что речь о женщине.',
      words: [
        {
          correct: 'simpática',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'simpático',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Simpático — если говорят мужчине. Здесь про женщину.',
            },
            {
              value: 'simpáticas',
              reasonCode: 'number_agreement_mismatch',
              why: 'Simpáticas — если говорят нескольким женщинам.',
            },
          ],
        },
      ],
      features: ['ser', 'second-person-singular', 'gender-agreement', 'quality'],
    },
    {
      id: 'es-e01-s01-no-es-verdad',
      english: 'No es verdad',
      russian: 'Это неправда',
      explanation:
        'Прямое опровержение чужих слов. No встаёт перед es, verdad остаётся без изменений.',
      words: [
        {
          correct: 'verdad',
          category: 'truth-noun',
          distractors: [
            {
              value: 'mentira',
              reasonCode: 'antonym_as_wrong_construction',
              why: 'Mentira значит «ложь» само по себе — это сказали бы Es mentira, без no. Здесь строим отрицание готовой фразы Es verdad.',
            },
          ],
        },
      ],
      features: ['ser', 'negation', 'fixed-reaction'],
    },
    {
      id: 'es-e01-s01-eres-tranquila',
      english: '¿Eres tranquila?',
      russian: 'Ты спокойная?',
      explanation:
        'Вопрос о характере, не о моменте — поэтому ser, а не estar. Женский род tranquila согласуется с тем, к кому обращаются.',
      words: [
        {
          correct: 'tranquila',
          category: 'adjective-gender',
          distractors: [
            {
              value: 'tranquilo',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Tranquilo — если спрашивают мужчину. Здесь женщина.',
            },
            {
              value: 'tranquilamente',
              reasonCode: 'adverb_for_adjective',
              why: 'Tranquilamente — «спокойно» при действии. Признак характера — tranquila.',
            },
          ],
        },
      ],
      features: ['ser', 'second-person-singular', 'gender-agreement', 'quality'],
    },
    {
      id: 'es-e01-s01-no-somos-iguales',
      english: 'No somos iguales',
      russian: 'Мы не одинаковые',
      explanation:
        'Множественное число прилагательного igual — здесь оно всё-таки меняется, но только по числу, не по роду: iguales для всех родов.',
      words: [
        {
          correct: 'iguales',
          category: 'invariable-adjective-plural',
          distractors: [
            {
              value: 'igual',
              reasonCode: 'number_agreement_mismatch',
              why: 'Igual — единственное число. Речь о нескольких (somos) — нужно iguales.',
            },
            {
              value: 'igualas',
              reasonCode: 'invariable_adjective_wrongly_inflected',
              why: 'У igual нет родовых форм — только number меняется: igual/iguales, без -a.',
            },
          ],
        },
      ],
      features: ['ser', 'negation', 'first-person-plural', 'invariable-adjective'],
    },
    {
      id: 'es-e01-s01-es-caro',
      english: 'Es caro',
      russian: 'Это дорого',
      explanation:
        'Оценка цены — одна из самых частых в поездке или магазине. Barato («дёшево») — противоположность, с той же конструкцией es + признак.',
      words: [
        {
          correct: 'caro',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'cara',
              reasonCode: 'gender_agreement_mismatch',
              why: 'Cara согласуется с существительным женского рода (la casa es cara). Здесь безличная оценка «это» — по умолчанию мужской род: caro.',
            },
            {
              value: 'caramente',
              reasonCode: 'adverb_for_adjective',
              why: 'Caramente — «дорогой ценой» при действии. Признак предмета — caro.',
            },
          ],
        },
      ],
      features: ['ser', 'quality'],
    },
  ]);
