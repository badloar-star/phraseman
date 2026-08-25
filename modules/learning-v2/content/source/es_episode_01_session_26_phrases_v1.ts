import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_26_LOCALIZED_DETAILS } from './es_episode_01_session_26_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 26 "Много: и признак меняется" / plural_agreement, builtOn: [3, 25],
// recalls: [3, 25]): word-first rápidos (см. es_episode_01_session_26_vocabulary_v1.ts)
// вводится рядом с somos (сессия 25) — впервые признак согласуется сразу по
// ДВУМ осям: роду (-o/-a, сессия 3) и числу (-s/-es, тема этой сессии).
// Признаки: rápido/rápida/rápidos/rápidas (сессия 5+26), bonito/bonita/
// bonitos/bonitas (сессия 3), único/única/únicos/únicas (сессия 6),
// fácil/difícil/fáciles/difíciles (сессия 1, согласные окончания — другая
// схема плюрализации, -es а не -s). Somos остаётся связкой (recall 25), Es
// — для третьего лица единственного числа (recall 17), контраст на позиции
// связки держит обе оси видимыми одновременно.
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s26-somos-rapidos',
      english: 'Somos rápidos',
      russian: 'Мы быстрые',
      explanation:
        'Так говорят о темпе группы мужского рода или смешанной по умолчанию. Признак получает окончание множественного числа -s точно так же, как и сама связка меняется на somos.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — Somos.', trapType: 'grammar' },
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа, об одном человеке. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа, с -as. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s26-somos-rapidas',
      english: 'Somos rápidas',
      russian: 'Мы быстрые (о группе женского рода)',
      explanation:
        'Тот же темп, но про группу женского рода — например, подруги вместе. Меняется концовка признака: -os становится -as, связка somos остаётся без изменений.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящей в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одной. Про группу, включая говорящую, — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidos', reasonCode: 'gender_mismatch:rápidas', why: 'Rápidos — форма мужского рода множественного числа, с -os. Для группы женского рода нужна форма на -as: rápidas.', trapType: 'grammar' },
            { value: 'rápida', reasonCode: 'number_mismatch:rápidas', why: 'Rápida — форма единственного числа, об одной. Про группу нужна форма множественного числа: rápidas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s26-somos-bonitos',
      english: 'Somos bonitos',
      russian: 'Мы красивые',
      explanation:
        'Оценка внешности группы мужского рода или смешанной по умолчанию. Bonito из сессии про род переходит на ту же схему множественного числа, что и rápido: -o становится -os.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Somos', why: 'Es — про предмет или третье лицо в единственном числе. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitas', reasonCode: 'gender_mismatch:bonitos', why: 'Bonitas — форма женского рода множественного числа, с -as. По умолчанию нужна форма на -os: bonitos.', trapType: 'grammar' },
            { value: 'bonito', reasonCode: 'number_mismatch:bonitos', why: 'Bonito — форма единственного числа, об одном. Про группу нужна форма множественного числа: bonitos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s26-somos-bonitas',
      english: 'Somos bonitas',
      russian: 'Мы красивые (о группе женского рода)',
      explanation:
        'Та же оценка внешности, но про группу женского рода. Признак согласуется сразу по двум признакам: женский род (-a) и множественное число (-s) вместе дают -as.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящей в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Somos', why: 'Eres — обращение к одной собеседнице. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitos', reasonCode: 'gender_mismatch:bonitas', why: 'Bonitos — форма мужского рода множественного числа, с -os. Для группы женского рода нужна форма на -as: bonitas.', trapType: 'grammar' },
            { value: 'bonita', reasonCode: 'number_mismatch:bonitas', why: 'Bonita — форма единственного числа, об одной. Про группу нужна форма множественного числа: bonitas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s26-somos-unicos',
      english: 'Somos únicos',
      russian: 'Мы единственные в своём роде',
      explanation:
        'Так говорят о неповторимости целой группы мужского рода или смешанной. Тильда над ú остаётся на месте и во множественном числе, окончание меняется так же, как у rápido.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicas', reasonCode: 'gender_mismatch:únicos', why: 'Únicas — форма женского рода множественного числа, с -as. По умолчанию нужна форма на -os: únicos.', trapType: 'grammar' },
            { value: 'unicos', reasonCode: 'accent_missing:únicos', why: 'Unicos без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой: únicos.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'written_accent'],
    },
    {
      id: 'es-e01-s26-somos-unicas',
      english: 'Somos únicas',
      russian: 'Мы единственные в своём роде (о группе женского рода)',
      explanation:
        'Та же неповторимость, но про группу женского рода. Único переходит сразу в обе формы согласования: единственное → множественное и мужской → женский род.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящей в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Somos', why: 'Es — про предмет или третье лицо в единственном числе. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicos', reasonCode: 'gender_mismatch:únicas', why: 'Únicos — форма мужского рода множественного числа, с -os. Для группы женского рода нужна форма на -as: únicas.', trapType: 'grammar' },
            { value: 'única', reasonCode: 'number_mismatch:únicas', why: 'Única — форма единственного числа, об одной. Про группу нужна форма множественного числа: únicas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'written_accent'],
    },
    {
      id: 'es-e01-s26-somos-faciles',
      english: 'Somos fáciles',
      russian: 'Мы простые (в общении)',
      explanation:
        'Fácil заканчивается на согласную -l, поэтому во множественном числе получает не -s, а -es: fáciles. Признак не различается по роду — как и в единственном числе, форма одна.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'fáciles',
          category: 'quality-adjective-plural',
          distractors: [
            { value: 'fácil', reasonCode: 'number_mismatch:fáciles', why: 'Fácil — форма единственного числа, об одном. Про группу нужна форма множественного числа: fáciles.', trapType: 'grammar' },
            { value: 'facils', reasonCode: 'wrong_plural_ending:fáciles', why: 'Признаки на согласную получают -es, а не просто -s: fáciles, не facils.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement'],
    },
    {
      id: 'es-e01-s26-no-somos-dificiles',
      english: 'No somos difíciles',
      russian: 'Мы не сложные (в общении)',
      explanation:
        'Отрицание той же формулы: no встаёт перед связкой, признак остаётся на -es. Difícil — противоположность fácil, тоже согласная концовка и та же схема множественного числа.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'difíciles',
          category: 'quality-adjective-plural',
          distractors: [
            { value: 'fáciles', reasonCode: 'wrong_word:difíciles', why: 'Fáciles означает противоположное — «простые». Нужно difíciles.', trapType: 'semantic_neighbor' },
            { value: 'difícil', reasonCode: 'number_mismatch:difíciles', why: 'Difícil — форма единственного числа, об одном. Про группу нужна форма множественного числа: difíciles.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'negation'],
    },
    {
      id: 'es-e01-s26-es-rapido-somos-rapidos-q',
      english: '¿Es rápido?; somos rápidos',
      russian: 'Он быстрый? Мы быстрые',
      explanation:
        'Диалог из вопроса о третьем лице и ответа-утверждения о группе, включающей говорящего. Одна и та же основа rápido получает разные окончания: -o для одного предмета, -os для группы.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Es', why: 'Somos — про группу с говорящим внутри. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'lento', reasonCode: 'wrong_word:rápido', why: 'Lento означает противоположное — «медленный». Нужно rápido.', trapType: 'semantic_neighbor' },
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Ответ о себе вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Somos', why: 'Es — про третье лицо в единственном числе, а не про говорящего с группой. Нужно Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа, об одном. Ответ про группу — форма множественного числа: rápidos.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'question_marks'],
    },
    {
      id: 'es-e01-s26-somos-unicos-de-acuerdo',
      english: 'Somos únicos, de acuerdo',
      russian: 'Мы единственные в своём роде, согласен',
      explanation:
        'Диалог из утверждения о группе и реакции согласия. De acuerdo не меняется никогда — ни по роду, ни по числу, — в отличие от único, который здесь согласуется сразу по обеим осям.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicas', reasonCode: 'gender_mismatch:únicos', why: 'Únicas — форма женского рода множественного числа. По умолчанию нужна форма на -os: únicos.', trapType: 'grammar' },
            { value: 'único', reasonCode: 'number_mismatch:únicos', why: 'Único — форма единственного числа. Про группу нужна форма множественного числа: únicos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'de',
          category: 'agreement-phrase-part',
          distractors: [
            { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
            { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'acuerdo',
          category: 'agreement-phrase-part',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s26-somos-bonitos-verdad-q',
      english: '¿Somos bonitos?; es verdad',
      russian: 'Мы красивые? Это правда',
      explanation:
        'Вопрос о группе, включающей говорящего, и подтверждение факта. Somos не меняется в вопросе — только знаки ¿...? и интонация отличают его от утверждения.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Вопрос про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Somos', why: 'Eres — обращение к одному собеседнику. Вопрос про группу с говорящим — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitas', reasonCode: 'gender_mismatch:bonitos', why: 'Bonitas — форма женского рода множественного числа. По умолчанию нужна форма на -os: bonitos.', trapType: 'grammar' },
            { value: 'bonito', reasonCode: 'number_mismatch:bonitos', why: 'Bonito — форма единственного числа. Про группу нужна форма множественного числа: bonitos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Es', why: 'Somos — про группу с говорящим внутри. Подтверждение факта как такового — Es.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Подтверждение факта — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdad',
          category: 'truth-noun',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
            { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с мнением, а не про подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'question_marks'],
    },
    {
      id: 'es-e01-s26-somos-rapidas-verdadero',
      english: 'Somos rápidas, es verdadero',
      russian: 'Мы быстрые, это правдиво',
      explanation:
        'Диалог из утверждения о группе женского рода и оценки его правдивости. Verdadero остаётся в единственном числе мужского рода — он оценивает высказывание в целом, а не саму группу.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящей в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одной. Про группу, включая говорящую, — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidos', reasonCode: 'gender_mismatch:rápidas', why: 'Rápidos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: rápidas.', trapType: 'grammar' },
            { value: 'rápida', reasonCode: 'number_mismatch:rápidas', why: 'Rápida — форма единственного числа. Про группу нужна форма множественного числа: rápidas.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:es', why: 'Somos — про группу с говорящей внутри. Оценка самого высказывания — es.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:es', why: 'Son — «они». Оценка высказывания как факта — es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdadero',
          category: 'quality-adjective',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:verdadero', why: 'Verdad — существительное «правда», а не признак «правдивый». Нужно verdadero.', trapType: 'semantic_neighbor' },
            { value: 'único', reasonCode: 'wrong_word:verdadero', why: 'Único означает «единственный» — совсем другой признак. Нужно verdadero.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'truth_adjective'],
    },
    {
      id: 'es-e01-s26-no-somos-faciles-de-acuerdo',
      english: 'No somos fáciles, de acuerdo',
      russian: 'Мы не простые (в общении), согласен',
      explanation:
        'Отрицание согласной формы множественного числа плюс реакция согласия. No встаёт перед somos, fáciles сохраняет окончание -es, de acuerdo не меняется вовсе.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'fáciles',
          category: 'quality-adjective-plural',
          distractors: [
            { value: 'facil', reasonCode: 'accent_missing:fáciles', why: 'Facil без ударения над a читалось бы иначе. Нужна форма множественного числа с ударением: fáciles.', trapType: 'orthographic' },
            { value: 'difíciles', reasonCode: 'wrong_word:fáciles', why: 'Difíciles означает противоположное — «сложные». Нужно fáciles.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'de',
          category: 'agreement-phrase-part',
          distractors: [
            { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
            { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'acuerdo',
          category: 'agreement-phrase-part',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'negation', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s26-somos-unicas-caro-q',
      english: '¿Somos únicas?; es caro',
      russian: 'Мы единственные в своём роде? Это дорого',
      explanation:
        'Диалог из вопроса про группу женского рода и ответа про цену — тема не связана напрямую, но структура вопроса и ответа знакомая. Único и caro независимо согласуются каждый по своим правилам.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящей в составе группы. Вопрос про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Somos', why: 'Es — про предмет или третье лицо. Вопрос про группу с говорящей — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicos', reasonCode: 'gender_mismatch:únicas', why: 'Únicos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: únicas.', trapType: 'grammar' },
            { value: 'única', reasonCode: 'number_mismatch:únicas', why: 'Única — форма единственного числа. Про группу нужна форма множественного числа: únicas.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Es', why: 'Somos — про группу с говорящей внутри. Оценка цены предмета — только Es.', trapType: 'grammar' },
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Es', why: 'Son — «они». Оценка цены одного предмета — Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'cara', reasonCode: 'gender_mismatch:caro', why: 'Cara — форма женского рода. По умолчанию нужна форма на -o: caro.', trapType: 'grammar' },
            { value: 'barato', reasonCode: 'wrong_word:caro', why: 'Barato означает «дёшево» — прямая противоположность. Нужно caro.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_singular', 'plural_agreement', 'gender_agreement_full', 'question_marks', 'price_adjective'],
    },
    {
      id: 'es-e01-s26-somos-dificiles-igual-q',
      english: '¿Somos difíciles?; es igual',
      russian: 'Мы сложные (в общении)? Всё равно',
      explanation:
        'Вопрос про группу с согласной концовкой признака и безразличный ответ. Difíciles сохраняет -es во множественном числе, es igual не меняется — обычная безличная реакция.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Вопрос про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одном. Вопрос про группу, включая говорящего, — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'difíciles',
          category: 'quality-adjective-plural',
          distractors: [
            { value: 'fáciles', reasonCode: 'wrong_word:difíciles', why: 'Fáciles означает противоположное — «простые». Нужно difíciles.', trapType: 'semantic_neighbor' },
            { value: 'difícil', reasonCode: 'number_mismatch:difíciles', why: 'Difícil — форма единственного числа. Вопрос про группу — форма множественного числа: difíciles.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Es', why: 'Somos — про группу с говорящим внутри. Безличная реакция — только Es.', trapType: 'grammar' },
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Es', why: 'Son — «они». Безличная реакция — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'acuerdo', reasonCode: 'wrong_word:igual', why: 'Acuerdo — про согласие с мнением, а не про безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
            { value: 'iguales', reasonCode: 'number_mismatch:igual', why: 'Iguales — форма множественного числа, а безличная реакция всегда в единственном числе. Нужно igual.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_singular', 'plural_agreement', 'question_marks'],
    },
  ]);

export const ES_EPISODE_01_SESSION_26_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_26_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
