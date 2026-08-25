import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_20_LOCALIZED_DETAILS } from './es_episode_01_session_20_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 20 "Верно ли это?" / builtOn: [14, 17], recalls: [14, 17]): 15 фраз
// применения синтезируют две прежние темы — формулу согласия de acuerdo
// (сессия 14 «Согласен или нет») и безличную связку es для предметов и
// ситуаций (сессия 17 «Это так»). Разница с сессией 14: там de acuerdo
// звучала как прямой диалог "Ты согласен?"/"Согласен". Здесь фокус —
// оценка ВЫСКАЗЫВАНИЯ, факта или заявления как верного: ¿Es verdad?
// (верно ли это?), ¿Es igual? (какая разница?) плюс de acuerdo как реакция
// согласия с чужим утверждением о предмете/ситуации, а не с собеседником
// напрямую. Новых слов нет — de acuerdo введена НЕ через newVocabulary
// (word-first это поддерживает только ОДНОСЛОВНЫЕ target — см. комментарий
// в es_episode_01_session_14_v1.ts), а как обычные позиционные токены
// De/de + acuerdo, точно как в сессии 14.
//
// kind: phrases по карте (не words_then_phrases) — 15 фраз обязательны.
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s20-es-verdad-q',
      english: '¿Es verdad?',
      russian: 'Это правда?',
      explanation:
        'Прямой вопрос: соответствует ли заявление действительности. Es здесь безличное — речь о самом факте, а не о том, кто его произнёс.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Вопрос о факте — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Вопрос о факте — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не вопрос об истинности. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с мнением, а не про проверку факта. Нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'question_marks', 'fact_check'],
    },
    {
      id: 'es-e01-s20-si-es-verdad',
      english: 'Sí, es verdad',
      russian: 'Да, это правда',
      explanation:
        'Прямое подтверждение факта в ответ на вопрос ¿Es verdad? Sí стоит первым словом реплики, es verdad не меняется.',
      words: [
        { correct: 'Sí', category: 'affirmation', distractors: [
          { value: 'No', reasonCode: 'polarity_mismatch:Sí', why: 'No отрицает, а тут подтверждают факт. Нужно Sí, а не No.', trapType: 'semantic_neighbor' },
          { value: 'Nada', reasonCode: 'wrong_word:Sí', why: 'Nada означает «ничего», отдельное слово-предмет, не ответ на вопрос. Нужно Sí.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'es', category: 'ser', distractors: [
          { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Подтверждение факта — только es.', trapType: 'grammar' },
          { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Подтверждение факта — только es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с мнением, а не про факт. Нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'affirmation', 'fact_check'],
    },
    {
      id: 'es-e01-s20-no-es-verdad',
      english: 'No es verdad',
      russian: 'Это неправда',
      explanation:
        'Прямое опровержение заявления как ложного. No встаёт перед связкой es, признак verdad не меняется — та же схема отрицания, что и в предыдущих сессиях.',
      words: [
        { correct: 'No', category: 'negation', distractors: [
          { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание факта — No.', trapType: 'semantic_neighbor' },
          { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
        ]},
        { correct: 'es', category: 'ser', distractors: [
          { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Опровержение факта — только es.', trapType: 'grammar' },
          { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Опровержение факта — только es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не опровержение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с мнением, а не про сам факт. Нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'negation', 'fact_check'],
    },
    {
      id: 'es-e01-s20-es-igual-q',
      english: '¿Es igual?',
      russian: 'Разве это не всё равно?',
      explanation:
        'Вопрос о том, меняет ли заявление положение дел. Не спутать с ¿Es verdad? — здесь спрашивают про безразличие, а не про истинность.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Вопрос о ситуации — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Вопрос о ситуации — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'igual', category: 'invariable-adjective', distractors: [
          { value: 'verdad', reasonCode: 'wrong_word:igual', why: 'Verdad — про истинность факта, а не про безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
          { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'question_marks', 'invariable_adjective'],
    },
    {
      id: 'es-e01-s20-de-acuerdo',
      english: 'De acuerdo',
      russian: 'Согласен',
      explanation:
        'Самостоятельная реплика согласия с чужим мнением о заявлении. Форма не меняется ни по роду, ни по числу — застывшая формула, как и в предыдущей сессии.',
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
      id: 'es-e01-s20-es-verdad-de-acuerdo',
      english: 'Es verdad, de acuerdo',
      russian: 'Это правда, согласен',
      explanation:
        'Диалог из двух реплик: подтверждение факта и отдельное согласие с выводом из него. Es verdad оценивает сам факт, de acuerdo — реакция согласия, это разные вещи, произнесённые подряд.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Оценка факта — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка факта — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo уже используется дальше как отдельная реплика согласия. Здесь нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad уже была использована для оценки факта в начале фразы. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'agreement_phrase', 'fact_check'],
    },
    {
      id: 'es-e01-s20-eres-de-acuerdo-es-verdad-q',
      english: '¿Eres de acuerdo?; es verdad',
      russian: 'Ты согласен? Это правда',
      explanation:
        'Вопрос собеседнику напрямую (Eres) и отдельное заявление о факте (Es verdad) — контраст двух связок внутри одной пары реплик. Так учит эта тема: одна форма для человека, другая для факта, о котором идёт речь.',
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
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad уже используется дальше для факта. Здесь нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres уже стояло в начале про собеседника. Оценка факта — Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка факта — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo уже стояло выше как часть вопроса. Здесь нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'agreement_phrase', 'question_marks', 'second_person_singular', 'fact_check'],
    },
    {
      id: 'es-e01-s20-no-es-verdad-de-acuerdo',
      english: 'No es verdad, no de acuerdo',
      russian: 'Это неправда, не согласен',
      explanation:
        'Двойное отрицание в двух отдельных репликах: сначала опровергают сам факт, потом отдельно отказывают в согласии с выводом. No встаёт перед каждой частью независимо.',
      words: [
        { correct: 'No', category: 'negation', distractors: [
          { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание факта — No.', trapType: 'semantic_neighbor' },
          { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
        ]},
        { correct: 'es', category: 'ser', distractors: [
          { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Опровержение факта — только es.', trapType: 'grammar' },
          { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Опровержение факта — только es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не опровержение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo используется дальше отдельно для согласия. Здесь нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'no', category: 'negation', distractors: [
          { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего». Отрицание согласия — no.', trapType: 'semantic_neighbor' },
          { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. Отрицание пишется no.', trapType: 'orthographic' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad уже использована выше для факта. Здесь нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'negation', 'agreement_phrase', 'fact_check'],
    },
    {
      id: 'es-e01-s20-es-facil-es-verdad-q',
      english: '¿Es fácil?; es verdad',
      russian: 'Это легко? Это правда',
      explanation:
        'Вопрос об одном признаке (сложность) и подтверждение другого (истинность) внутри одной пары реплик. Оба используют одну и ту же связку es, потому что оба про безличную ситуацию, а не про говорящего или собеседника.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Оценка задачи — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка задачи — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', category: 'quality-adjective', distractors: [
          { value: 'difícil', reasonCode: 'antonym_confusion:fácil', why: 'Difícil значит противоположное — «трудно». Нужно fácil.', trapType: 'semantic_neighbor' },
          { value: 'importante', reasonCode: 'wrong_word:fácil', why: 'Importante означает «важно» — другой признак, не про сложность. Нужно fácil.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Подтверждение факта — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Подтверждение факта — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'fácil', reasonCode: 'wrong_word:verdad', why: 'Fácil уже стояло выше про сложность. Здесь нужно verdad — про истинность.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'question_marks', 'fact_check'],
    },
    {
      id: 'es-e01-s20-somos-de-acuerdo-es-verdad',
      english: 'Somos de acuerdo, es verdad',
      russian: 'Мы согласны, это правда',
      explanation:
        'Согласие нескольких людей (somos) с заявлением, за которым следует отдельное подтверждение самого факта. De acuerdo не меняется по числу, es verdad не меняется вовсе.',
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
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad используется дальше отдельно для факта. Здесь нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'es', category: 'ser', distractors: [
          { value: 'somos', reasonCode: 'agreement_person_mismatch:es', why: 'Somos уже стояло в начале про нас вместе. Оценка факта — es.', trapType: 'grammar' },
          { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Оценка факта — только es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo уже использована выше как отдельная реплика согласия. Здесь нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'first_person_plural', 'agreement_phrase', 'fact_check'],
    },
    {
      id: 'es-e01-s20-es-importante-de-acuerdo-q',
      english: '¿Es importante?; de acuerdo',
      russian: 'Это важно? Согласен',
      explanation:
        'Вопрос о значимости заявления и отдельная реплика согласия с этим выводом. Es importante оценивает саму ситуацию, de acuerdo — реакция на неё, не спутать одно с другим.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Оценка значимости — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка значимости — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'importante', category: 'quality-adjective', distractors: [
          { value: 'difícil', reasonCode: 'wrong_word:importante', why: 'Difícil означает «трудно» — про сложность, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          { value: 'caro', reasonCode: 'wrong_word:importante', why: 'Caro означает «дорого» — про цену, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'importante', reasonCode: 'wrong_word:acuerdo', why: 'Importante уже стояло выше про значимость. Здесь нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'question_marks', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s20-es-caro-no-es-igual',
      english: 'Es caro, no es igual',
      russian: 'Это дорого, это не всё равно',
      explanation:
        'Заявление о цене и отдельное возражение против безразличия к ней — цена имеет значение, а не «всё равно». No встаёт перед второй связкой es.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Оценка цены предмета — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка цены предмета — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'caro', category: 'quality-adjective-gendered', distractors: [
          { value: 'cara', reasonCode: 'gender_mismatch:caro', why: 'Cara — форма женского рода. По умолчанию, без названного предмета, используется форма на -o: caro.', trapType: 'grammar' },
          { value: 'fácil', reasonCode: 'wrong_word:caro', why: 'Fácil означает «легко» — совсем другой признак, не про цену. Нужно caro.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'no', category: 'negation', distractors: [
          { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего». Отрицание безразличия — no.', trapType: 'semantic_neighbor' },
          { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. Отрицание пишется no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', category: 'ser', distractors: [
          { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Возражение про безразличие — только es.', trapType: 'grammar' },
          { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Возражение про безразличие — только es.', trapType: 'grammar' },
        ]},
        { correct: 'igual', category: 'invariable-adjective', distractors: [
          { value: 'verdad', reasonCode: 'wrong_word:igual', why: 'Verdad — про истинность факта, а не про безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
          { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'negation', 'gender_agreement_full', 'price_context'],
    },
    {
      id: 'es-e01-s20-eres-verdadero-es-verdad-q',
      english: '¿Eres verdadero?; es verdad',
      russian: 'Ты настоящий? Это правда',
      explanation:
        'Вопрос об искренности собеседника напрямую (Eres) и отдельное подтверждение факта о ситуации (Es verdad). Снова контраст двух форм связки внутри одной пары реплик: одна про человека, другая про то, что обсуждается.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', category: 'quality-adjective-gendered', distractors: [
          { value: 'verdadera', reasonCode: 'gender_mismatch:verdadero', why: 'Verdadera — форма женского рода. О собеседнике мужского рода нужна форма verdadero.', trapType: 'grammar' },
          { value: 'único', reasonCode: 'wrong_word:verdadero', why: 'Único — это «единственный», совсем другой признак. Нужно verdadero.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres уже стояло в начале про собеседника. Подтверждение факта — Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Подтверждение факта — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'verdadero', reasonCode: 'wrong_word:verdad', why: 'Verdadero уже стояло выше как признак собеседника. Здесь нужно существительное verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'truth_adjective', 'question_marks', 'second_person_singular', 'fact_check'],
    },
    {
      id: 'es-e01-s20-eres-unico-no-de-acuerdo',
      english: 'Eres único, no de acuerdo',
      russian: 'Ты единственный такой, не согласен',
      explanation:
        'Утверждение о неповторимости собеседника мужского рода и отдельная реплика несогласия с этим выводом. No встаёт перед формулой de acuerdo целиком.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Утверждение собеседнику напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Утверждение собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'único', category: 'quality-adjective-gendered', distractors: [
          { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única — форма женского рода. О собеседнике мужского рода нужна форма único.', trapType: 'grammar' },
          { value: 'unico', reasonCode: 'accent_missing:único', why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.', trapType: 'orthographic' },
        ]},
        { correct: 'no', category: 'negation', distractors: [
          { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего». Отрицание согласия — no.', trapType: 'semantic_neighbor' },
          { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. Отрицание пишется no.', trapType: 'orthographic' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'único', reasonCode: 'wrong_word:acuerdo', why: 'Único уже стояло выше как признак собеседника. Здесь нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'written_accent', 'negation', 'agreement_phrase', 'second_person_singular'],
    },
    {
      id: 'es-e01-s20-es-bonita-es-verdad-q',
      english: '¿Es bonita?; es verdad',
      russian: 'Она красивая? Это правда',
      explanation:
        'Вопрос о внешности предмета женского рода и отдельное подтверждение факта о нём. Обе части используют одну и ту же безличную связку es, потому что подлежащего-человека нет ни в одной из них.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнице напрямую. Оценка предмета — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка предмета — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', category: 'quality-adjective-gendered', distractors: [
          { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito — форма мужского рода. О предмете женского рода нужна форма bonita.', trapType: 'grammar' },
          { value: 'segura', reasonCode: 'wrong_word:bonita', why: 'Segura означает «уверенная» — совсем другой признак, не про внешность. Нужно bonita.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседницу напрямую. Подтверждение факта — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Подтверждение факта — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'quality-noun', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          { value: 'bonita', reasonCode: 'wrong_word:verdad', why: 'Bonita уже стояло выше как признак предмета. Здесь нужно существительное verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'question_marks', 'fact_check'],
    },
  ]);

export const ES_EPISODE_01_SESSION_20_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_20_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
