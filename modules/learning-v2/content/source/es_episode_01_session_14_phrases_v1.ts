import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_14_LOCALIZED_DETAILS } from './es_episode_01_session_14_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25): фразы применения для сессии 14 —
// «Согласен или нет». Никаких новых слов через newVocabulary: de acuerdo —
// устойчивая формула согласия из двух слов, введена прямо во фразах, не
// как word-first vocabulary item.
//
// зачем НЕ newVocabulary (найдено при первой попытке, исправлено):
// word-first vocabulary в этом курсе поддерживает только ОДНОСЛОВНЫЕ
// target — подтверждено research-агентом по трём независимым местам
// кода (task_specific_distractors_v1.ts сравнивает по последнему токену
// фразы, session_shard_from_source_v1.ts переписывает reasonCode на весь
// targetText для vocabulary-контактов, а lesson1_session_choreography_v1.ts
// в inferLesson1WordFirstVocabularyCountV1 явно требует "!/\s/u.test(target)".
// "de acuerdo" — двухсловная формула, поэтому она введена как обычный
// word-токен внутри фраз (тот же путь, что и remaining phrase-based
// sessions — reasonCode там не переписывается).
//
// kind: phrases по карте (не words_then_phrases) — 15 фраз обязательны.
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s14-de-acuerdo',
      english: 'De acuerdo',
      russian: 'Согласен',
      explanation:
        'Самостоятельная реплика согласия — говорят в ответ на чужое мнение или предложение. Форма не меняется ни по роду, ни по числу.',
      words: [
        { correct: 'De', category: 'agreement-phrase-part', distractors: [
          { value: 'Es', reasonCode: 'wrong_word:De', why: 'Es — связка «есть», а не часть формулы согласия. Формула согласия начинается с De.', trapType: 'semantic_neighbor' },
          { value: 'No', reasonCode: 'wrong_word:De', why: 'No отрицает, а тут утверждается согласие. Формула согласия начинается с De.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, «без разницы», а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['agreement_phrase', 'invariable_reaction'],
    },
    {
      id: 'es-e01-s14-no-de-acuerdo',
      english: 'No de acuerdo',
      russian: 'Не согласен',
      explanation:
        'Отрицание согласия — та же формула, что и No es fácil. No встаёт перед реакцией, сама реакция не меняется.',
      words: [
        { correct: 'No', category: 'negation', distractors: [
          { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание реакции — No.', trapType: 'semantic_neighbor' },
          { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['agreement_phrase', 'negation', 'invariable_reaction'],
    },
    {
      id: 'es-e01-s14-eres-de-acuerdo-q',
      english: '¿Eres de acuerdo?',
      russian: 'Ты согласен?',
      explanation:
        'Вопрос собеседнику напрямую, с тем же принципом, что и в сессии про вопросы. Порядок слов не меняется, только знаки ¿...? и интонация.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad — про подтверждение факта, а не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'agreement_phrase', 'question_marks', 'second_person_singular'],
    },
    {
      id: 'es-e01-s14-es-de-acuerdo-q',
      english: '¿Es de acuerdo?',
      russian: 'Он согласен?',
      explanation:
        'Вопрос о третьем лице, а не собеседнику напрямую — используется связка es. Формула acuerdo не меняется независимо от того, о ком идёт речь.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad — про подтверждение факта, а не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'agreement_phrase', 'question_marks'],
    },
    {
      id: 'es-e01-s14-es-verdad',
      english: 'Es verdad',
      russian: 'Это правда',
      explanation:
        'Прямое подтверждение чужих слов — уже знакомая фраза из первой сессии. Здесь она звучит как контраст с de acuerdo: подтверждение факта, а не согласие с мнением.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Оценка чужих слов — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка чужих слов — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'truth-noun', distractors: [
          { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с мнением, а не про подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение. Нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'fixed_reaction'],
    },
    {
      id: 'es-e01-s14-es-igual',
      english: 'Es igual',
      russian: 'Это всё равно',
      explanation:
        'Реакция безразличия — уже знакомая фраза из первой сессии. Здесь она звучит как контраст с de acuerdo: безразличие, а не активное согласие.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Безличная реакция — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная реакция — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'igual', category: 'invariable-adjective', distractors: [
          { value: 'acuerdo', reasonCode: 'wrong_word:igual', why: 'Acuerdo — про согласие с мнением, а не про безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
          { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
        ]},
      ],
      features: ['ser', 'invariable_adjective'],
    },
    {
      id: 'es-e01-s14-eres-segura-de-acuerdo',
      english: 'Eres segura, de acuerdo',
      russian: 'Ты уверенная, согласна',
      explanation:
        'Диалог из двух самостоятельных реплик: вопрос о признаке собеседницы и ответ согласия. Обе части используют уже известную лексику разных сессий.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнице напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнице — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'segura', category: 'quality-adjective-gendered', distractors: [
          { value: 'seguro', reasonCode: 'gender_mismatch:segura', why: 'Seguro — форма мужского рода. О собеседнице женского рода нужна форма segura.', trapType: 'grammar' },
          { value: 'bonita', reasonCode: 'wrong_word:segura', why: 'Bonita означает «красивая» — совсем другой признак, не про уверенность. Нужно segura.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'confidence_adjective', 'agreement_phrase', 'question_marks', 'second_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s14-eres-rapido-de-acuerdo',
      english: 'Eres rápido, de acuerdo',
      russian: 'Ты быстрый, согласен',
      explanation:
        'Ещё один диалог из вопроса и ответа согласия, теперь про темп собеседника мужского рода. De acuerdo не меняется, признак rápido согласуется по роду.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', category: 'quality-adjective-gendered', distractors: [
          { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. О собеседнике мужского рода нужна форма rápido.', trapType: 'grammar' },
          { value: 'único', reasonCode: 'wrong_word:rápido', why: 'Único — это «единственный», совсем другой признак. Нужно rápido.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'pace_adjective', 'agreement_phrase', 'question_marks', 'second_person_singular'],
    },
    {
      id: 'es-e01-s14-es-facil-de-acuerdo',
      english: 'Es fácil, de acuerdo',
      russian: 'Это легко, согласен',
      explanation:
        'Диалог с безличным вопросом об оценке сложности и ответом согласия. De acuerdo подтверждает мнение собеседника о задаче, а не сам факт.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Безличная оценка задачи — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка задачи — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', category: 'quality-adjective', distractors: [
          { value: 'difícil', reasonCode: 'antonym_confusion:fácil', why: 'Difícil значит противоположное — «трудно». Нужно fácil.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:fácil', why: 'Verdad — это существительное «правда», а не признак сложности. Нужно fácil.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'agreement_phrase', 'question_marks'],
    },
    {
      id: 'es-e01-s14-no-eres-de-acuerdo',
      english: '¿No eres de acuerdo?',
      russian: 'Разве ты не согласен?',
      explanation:
        'Отрицательный вопрос собеседнику, ожидающий подтверждения или опровержения. No встаёт перед связкой, как и в утверждении.',
      words: [
        { correct: 'No', category: 'negation', distractors: [
          { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
          { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
        ]},
        { correct: 'eres', category: 'ser', distractors: [
          { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — eres.', trapType: 'grammar' },
          { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя. Вопрос собеседнику — eres.', trapType: 'grammar' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'negation', 'agreement_phrase', 'question_marks', 'second_person_singular'],
    },
    {
      id: 'es-e01-s14-somos-de-acuerdo',
      english: 'Somos de acuerdo',
      russian: 'Мы согласны',
      explanation:
        'Согласие сразу нескольких людей — форма somos. Признак de acuerdo не меняется по числу, как и по роду.',
      words: [
        { correct: 'Somos', category: 'ser', distractors: [
          { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они» или вежливое «вы» много человек. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
          { value: 'Sois', reasonCode: 'agreement_person_mismatch:Somos', why: 'Sois — форма для vosotros, которую этот курс не использует. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'iguales', reasonCode: 'wrong_word:acuerdo', why: 'Iguales означает «одинаковые», а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'first_person_plural', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s14-no-somos-de-acuerdo',
      english: 'No somos de acuerdo',
      russian: 'Мы не согласны',
      explanation:
        'Отрицание согласия нескольких людей — no встаёт перед somos. Формула acuerdo снова не меняется, как и в утвердительной фразе.',
      words: [
        { correct: 'No', category: 'negation', distractors: [
          { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание — No.', trapType: 'semantic_neighbor' },
          { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
        ]},
        { correct: 'somos', category: 'ser', distractors: [
          { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они». Про себя вместе с кем-то — somos.', trapType: 'grammar' },
          { value: 'es', reasonCode: 'agreement_person_mismatch:somos', why: 'Es — про предмет или третье лицо в единственном числе. Про нас — somos.', trapType: 'grammar' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'iguales', reasonCode: 'wrong_word:acuerdo', why: 'Iguales означает «одинаковые», а не (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'first_person_plural', 'negation', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s14-eres-unico-de-acuerdo',
      english: 'Eres único, de acuerdo',
      russian: 'Ты единственный такой, согласен',
      explanation:
        'Диалог о неповторимости собеседника мужского рода и согласии с этим утверждением. Тильда над ú остаётся на месте, de acuerdo не меняется.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'único', category: 'quality-adjective-gendered', distractors: [
          { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única — форма женского рода. О собеседнике мужского рода нужна форма único.', trapType: 'grammar' },
          { value: 'unico', reasonCode: 'accent_missing:único', why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.', trapType: 'orthographic' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'written_accent', 'agreement_phrase', 'question_marks', 'second_person_singular'],
    },
    {
      id: 'es-e01-s14-eres-verdadero-de-acuerdo',
      english: 'Eres verdadero, de acuerdo',
      russian: 'Ты настоящий, согласен',
      explanation:
        'Философский диалог об искренности собеседника мужского рода. Recall truth_adjective из четвёртой сессии внутри новой темы согласия.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', category: 'quality-adjective-gendered', distractors: [
          { value: 'verdadera', reasonCode: 'gender_mismatch:verdadero', why: 'Verdadera — форма женского рода. О собеседнике мужского рода нужна форма verdadero.', trapType: 'grammar' },
          { value: 'único', reasonCode: 'wrong_word:verdadero', why: 'Único — это «единственный», совсем другой признак. Нужно verdadero.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'truth_adjective', 'agreement_phrase', 'question_marks', 'second_person_singular'],
    },
    {
      id: 'es-e01-s14-eres-bonita-de-acuerdo',
      english: 'Eres bonita, de acuerdo',
      russian: 'Ты красивая, согласна',
      explanation:
        'Ещё один диалог из вопроса и согласия, теперь про внешность собеседницы. Признак согласуется по роду, de acuerdo не меняется никогда.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнице напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнице — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', category: 'quality-adjective-gendered', distractors: [
          { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito — форма мужского рода. О собеседнице женского рода нужна форма bonita.', trapType: 'grammar' },
          { value: 'segura', reasonCode: 'wrong_word:bonita', why: 'Segura означает «уверенная» — совсем другой признак, не про внешность. Нужно bonita.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'gender_agreement_full', 'agreement_phrase', 'question_marks', 'second_person_singular'],
    },
  ]);

export const ES_EPISODE_01_SESSION_14_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_14_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
