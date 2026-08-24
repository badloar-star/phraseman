"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ES_EPISODE_01_SESSION_01_PHRASES = void 0;
const es_episode_01_session_01_localized_details_v1_1 = require("./es_episode_01_session_01_localized_details_v1");
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
const RAW_PHRASES = Object.freeze([
    {
        id: 'es-e01-s01-es-facil',
        english: 'Es fácil',
        russian: 'Это легко',
        explanation: 'Самая частая оценка чего угодно — задачи, языка, решения. По-русски мы обходимся без глагола: «это легко». По-испански связка обязательна: без es фраза рассыпется на голое fácil.',
        words: [
            {
                correct: 'Es',
                category: 'ser',
                distractors: [
                    {
                        value: 'Eres',
                        reasonCode: 'agreement_person_mismatch:Es',
                        why: 'Eres — это «ты». Про «это» (безличную оценку) — только es.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Soy',
                        reasonCode: 'agreement_person_mismatch:Es',
                        why: 'Soy — про себя. Оценка ситуации не о говорящем — es.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Ser',
                        reasonCode: 'infinitive_not_finite:Es',
                        why: 'Ser — начальная форма, как «быть». В готовой фразе нужна личная: es.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Está',
                        reasonCode: 'ser_estar_confusion:Es',
                        why: 'Está — от другого глагола, estar. Он про место и временное состояние, а не про постоянное свойство.',
                        trapType: 'grammar',
                    },
                ],
            },
            {
                correct: 'fácil',
                category: 'quality-adjective',
                distractors: [
                    {
                        value: 'fácilmente',
                        reasonCode: 'adverb_for_adjective:fácil',
                        why: 'Fácilmente — «легко» как наречие при действии («сделал легко»). Признак самой вещи — fácil.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'facilidad',
                        reasonCode: 'noun_for_adjective:fácil',
                        why: 'Facilidad — «лёгкость», предмет. Признак — fácil.',
                        trapType: 'grammar',
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
        explanation: 'Так говорят о своём качестве — не о моменте, а вообще, всегда. Мужчина скажет rápido, женщина — rápida: признак подстраивается под того, кто говорит.',
        words: [
            {
                correct: 'Soy',
                category: 'ser',
                distractors: [
                    {
                        value: 'Eres',
                        reasonCode: 'agreement_person_mismatch:Soy',
                        why: 'Eres — это «ты». Про себя — soy.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Es',
                        reasonCode: 'agreement_person_mismatch:Soy',
                        why: 'Es — про него, её или вежливое «вы». Про себя — soy.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Estoy',
                        reasonCode: 'ser_estar_confusion:Soy',
                        why: 'Estoy — от estar, про временное состояние или место. Постоянное качество — soy.',
                        trapType: 'grammar',
                    },
                ],
            },
            {
                correct: 'rápido',
                category: 'adjective-gender',
                distractors: [
                    {
                        value: 'rápida',
                        reasonCode: 'gender_agreement_mismatch:rápido',
                        why: 'Rápida говорит о себе женщина. Здесь говорит мужчина.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'rápidos',
                        reasonCode: 'number_agreement_mismatch:rápido',
                        why: 'Rápidos — про нескольких. Здесь один человек про себя.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'rapidez',
                        reasonCode: 'noun_for_adjective:rápido',
                        why: 'Rapidez — «скорость», предмет. Признак человека — rápido.',
                        trapType: 'grammar',
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
        explanation: 'Отрицание в испанском простое: no ставится прямо перед глаголом, больше ничего менять не нужно. Difícil — противоположность fácil из первой фразы.',
        words: [
            {
                correct: 'No',
                category: 'negation',
                distractors: [
                    {
                        value: 'Nada',
                        reasonCode: 'negation_word_mismatch:No',
                        why: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Non',
                        reasonCode: 'orthographic_invalid:No',
                        why: 'Non — не испанское слово. В испанском отрицание пишется no.',
                        trapType: 'orthographic',
                    },
                ],
            },
            {
                correct: 'difícil',
                category: 'quality-adjective',
                distractors: [
                    {
                        value: 'fácil',
                        reasonCode: 'antonym_confusion:difícil',
                        why: 'Fácil значит противоположное — «легко». Здесь нужно «трудно».',
                        trapType: 'semantic_neighbor',
                    },
                    {
                        value: 'dificultad',
                        reasonCode: 'noun_for_adjective:difícil',
                        why: 'Dificultad — «трудность», предмет. Признак — difícil.',
                        trapType: 'grammar',
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
        explanation: 'Так подтверждают чужие слова в разговоре. Verdad — существительное, но с ser оно работает как оценка утверждения: «это есть правда».',
        words: [
            {
                correct: 'Es',
                category: 'ser',
                distractors: [
                    {
                        value: 'Eres',
                        reasonCode: 'agreement_person_mismatch:Es',
                        why: 'Eres — это «ты». Про «это» (безличную оценку) — только es.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Soy',
                        reasonCode: 'agreement_person_mismatch:Es',
                        why: 'Soy — про себя. Оценка ситуации не о говорящем — es.',
                        trapType: 'grammar',
                    },
                ],
            },
            {
                correct: 'verdad',
                category: 'truth-noun',
                distractors: [
                    {
                        value: 'verdadero',
                        reasonCode: 'adjective_for_fixed_phrase:verdad',
                        why: 'Verdadero — «истинный» как признак предмета (un hecho verdadero). Устойчивая реакция «это правда» — именно es verdad, с существительным, а не прилагательным.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'verdadera',
                        reasonCode: 'adjective_for_fixed_phrase:verdad',
                        why: 'То же самое в женском роде — здесь не подходит форма прилагательного verdadera, нужно существительное verdad.',
                        trapType: 'grammar',
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
        explanation: 'Вежливое возражение, когда не согласен. Así — «так», указывает на способ, а не на предмет.',
        words: [
            {
                correct: 'así',
                category: 'manner-adverb',
                distractors: [
                    {
                        value: 'esto',
                        reasonCode: 'demonstrative_for_manner:así',
                        why: 'Esto — «это» как предмет. Способ, «так» — así.',
                        trapType: 'semantic_neighbor',
                    },
                    {
                        value: 'aquí',
                        reasonCode: 'semantic_neighbor_deixis:así',
                        why: 'Aquí — «здесь», про место. Здесь нужно «так», способ — así.',
                        trapType: 'semantic_neighbor',
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
        explanation: 'Так говорят, когда выбор не важен — оба варианта одинаковы. Igual не меняется по роду: одна форма для всех.',
        words: [
            {
                correct: 'igual',
                category: 'invariable-adjective',
                distractors: [
                    {
                        value: 'iguala',
                        reasonCode: 'invariable_adjective_wrongly_inflected:igual',
                        why: 'Igual не меняется по роду — формы iguala не существует.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'igualmente',
                        reasonCode: 'adverb_for_adjective:igual',
                        why: 'Igualmente — «равным образом» при действии. Признак ситуации — igual.',
                        trapType: 'grammar',
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
        explanation: 'Вопрос про собеседника-мужчину. Eres — форма для «ты», поэтому местоимение не нужно: окончание уже показывает, к кому обращаются.',
        words: [
            {
                correct: 'Eres',
                category: 'ser',
                distractors: [
                    {
                        value: 'Soy',
                        reasonCode: 'agreement_person_mismatch:Eres',
                        why: 'Soy — про себя. Спрашивают про собеседника — eres.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Es',
                        reasonCode: 'agreement_person_mismatch:Eres',
                        why: 'Es — про третье лицо. Про «ты» — eres.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Estás',
                        reasonCode: 'ser_estar_confusion:Eres',
                        why: 'Estás — от estar, про самочувствие или место сейчас. Постоянное качество — eres.',
                        trapType: 'grammar',
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
        explanation: 'Отрицание своего же качества из второй фразы. No встаёт перед soy, форма самого глагола не меняется.',
        words: [
            {
                correct: 'No',
                category: 'negation',
                distractors: [
                    {
                        value: 'Nunca',
                        reasonCode: 'negation_word_mismatch:No',
                        why: 'Nunca — «никогда», про частоту во времени. Простое отрицание качества — no.',
                        trapType: 'grammar',
                    },
                ],
            },
            {
                correct: 'soy',
                category: 'ser',
                distractors: [
                    {
                        value: 'eres',
                        reasonCode: 'agreement_person_mismatch:soy',
                        why: 'Eres — про тебя. Говорящий про себя — soy.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'estoy',
                        reasonCode: 'ser_estar_confusion:soy',
                        why: 'Estoy — от estar. Постоянное качество, а не временное состояние — soy.',
                        trapType: 'grammar',
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
        explanation: 'Так отвечают на вопрос о количестве человек — например, в ресторане. По-русски «нас», по-испански — форма «мы» от ser.',
        words: [
            {
                correct: 'Somos',
                category: 'ser',
                distractors: [
                    {
                        value: 'Son',
                        reasonCode: 'agreement_person_mismatch:Somos',
                        why: 'Son — «они» или вежливое «вы» много человек. Про себя вместе с кем-то — somos.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'Estamos',
                        reasonCode: 'ser_estar_confusion:Somos',
                        why: 'Estamos — от estar, про место или состояние. Количество людей — somos.',
                        trapType: 'grammar',
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
        explanation: 'Одна из самых частых оценок при обсуждении дел. Importante не меняется по роду — та же форма для мужского и женского.',
        words: [
            {
                correct: 'importante',
                category: 'invariable-adjective',
                distractors: [
                    {
                        value: 'importanta',
                        reasonCode: 'invariable_adjective_wrongly_inflected:importante',
                        why: 'Importante не меняется по роду — формы importanta не существует.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'importancia',
                        reasonCode: 'noun_for_adjective:importante',
                        why: 'Importancia — «важность», предмет. Признак — importante.',
                        trapType: 'grammar',
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
        explanation: 'Комплимент женщине. Здесь видно сразу два правила: eres — потому что «ты», simpática — потому что речь о женщине.',
        words: [
            {
                correct: 'simpática',
                category: 'adjective-gender',
                distractors: [
                    {
                        value: 'simpático',
                        reasonCode: 'gender_agreement_mismatch:simpática',
                        why: 'Simpático — если говорят мужчине. Здесь про женщину.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'simpáticas',
                        reasonCode: 'number_agreement_mismatch:simpática',
                        why: 'Simpáticas — если говорят нескольким женщинам.',
                        trapType: 'grammar',
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
        explanation: 'Прямое опровержение чужих слов. No встаёт перед es, verdad остаётся без изменений.',
        words: [
            {
                correct: 'verdad',
                category: 'truth-noun',
                distractors: [
                    {
                        value: 'mentira',
                        reasonCode: 'antonym_as_wrong_construction:verdad',
                        why: 'Mentira значит «ложь» само по себе — это сказали бы Es mentira, без no. Здесь строим отрицание готовой фразы Es verdad.',
                        trapType: 'semantic_neighbor',
                    },
                    {
                        value: 'verdadero',
                        reasonCode: 'adjective_for_fixed_phrase:verdad',
                        why: 'Verdadero — «истинный» как признак предмета. Устойчивая реакция — именно (no) es verdad, с существительным, а не прилагательным.',
                        trapType: 'grammar',
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
        explanation: 'Вопрос о характере, не о моменте — поэтому ser, а не estar. Женский род tranquila согласуется с тем, к кому обращаются.',
        words: [
            {
                correct: 'tranquila',
                category: 'adjective-gender',
                distractors: [
                    {
                        value: 'tranquilo',
                        reasonCode: 'gender_agreement_mismatch:tranquila',
                        why: 'Tranquilo — если спрашивают мужчину. Здесь женщина.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'tranquilamente',
                        reasonCode: 'adverb_for_adjective:tranquila',
                        why: 'Tranquilamente — «спокойно» при действии. Признак характера — tranquila.',
                        trapType: 'grammar',
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
        explanation: 'Множественное число прилагательного igual — здесь оно всё-таки меняется, но только по числу, не по роду: iguales для всех родов.',
        words: [
            {
                correct: 'iguales',
                category: 'invariable-adjective-plural',
                distractors: [
                    {
                        value: 'igual',
                        reasonCode: 'number_agreement_mismatch:iguales',
                        why: 'Igual — единственное число. Речь о нескольких (somos) — нужно iguales.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'igualas',
                        reasonCode: 'invariable_adjective_wrongly_inflected:iguales',
                        why: 'У igual нет родовых форм — только number меняется: igual/iguales, без -a.',
                        trapType: 'grammar',
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
        explanation: 'Оценка цены — одна из самых частых в поездке или магазине. Barato («дёшево») — противоположность, с той же конструкцией es + признак.',
        words: [
            {
                correct: 'caro',
                category: 'quality-adjective',
                distractors: [
                    {
                        value: 'cara',
                        reasonCode: 'gender_agreement_mismatch:caro',
                        why: 'Cara согласуется с существительным женского рода (la casa es cara). Здесь безличная оценка «это» — по умолчанию мужской род: caro.',
                        trapType: 'grammar',
                    },
                    {
                        value: 'caramente',
                        reasonCode: 'adverb_for_adjective:caro',
                        why: 'Caramente — «дорогой ценой» при действии. Признак предмета — caro.',
                        trapType: 'grammar',
                    },
                ],
            },
        ],
        features: ['ser', 'quality'],
    },
]);
/**
 * зачем сборка через .map(), а не ручная вставка в каждый из 15 объектов
 * выше: id — единственный надёжный ключ связи между RAW_PHRASES и
 * ES_SESSION_01_LOCALIZED_DETAILS. Ручная вставка в 15 местах рисковала бы
 * рассинхроном (не тот id получил не тот перевод), сборка по ключу это
 * структурно исключает — при отсутствии перевода для id тип это не поймает
 * молча, а конвейер вернёт [[NEEDS_TRANSLATION]] на этапе сборки шарда.
 */
exports.ES_EPISODE_01_SESSION_01_PHRASES = Object.freeze(RAW_PHRASES.map((phrase) => Object.freeze({
    ...phrase,
    localizedDetails: es_episode_01_session_01_localized_details_v1_1.ES_SESSION_01_LOCALIZED_DETAILS[phrase.id],
})));
//# sourceMappingURL=es_episode_01_session_01_phrases_v1.js.map