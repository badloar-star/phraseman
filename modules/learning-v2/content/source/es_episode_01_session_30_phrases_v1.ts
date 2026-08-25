import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_30_LOCALIZED_DETAILS } from './es_episode_01_session_30_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 30 "Все пять форм подряд" / kind: 'recall', builtOn: [1, 9, 17, 25, 27],
// recalls: [1, 9, 17, 25, 27]): recall-сессия НЕ переиспользует чужой пул фраз
// одной строкой, как voice/checkpoint — она заново авторит 15 СВЕЖИХ фраз,
// которые пробегают все пять форм связки ser подряд в одной сессии: soy
// (с.1), eres (с.9), es (с.17), somos (с.25), son (с.27). Архитектура взята
// из английского курса-прецедента (episode_01_session_31_v1.ts →
// episode_01_sessions_25_32_support_v1.ts, PHRASES[31]): там 6 английских
// лиц (I/you/he/she/it/we/they) дают 7 утвердительных + 7 отрицательных +
// 1 вопрос = 15. У испанского пять лиц связки ser (soy/eres/es/somos/son),
// поэтому распределение: 5 утвердительных (по одному на каждое лицо) + 5
// отрицательных (recall no soy/no eres/no es/no somos/no son — точные формы
// отрицания из сессий 1/19/2/29) + 5 диалоговых/вопросительных фраз,
// смешивающих разные лица в одной карточке для настоящего recall-контраста.
//
// зачем именно rápido/rápida/rápidos/rápidas как сквозной признак: это
// единственное прилагательное, дословно встречавшееся во ВСЕХ пяти опорных
// сессиях (1, 9, 17, 25, 27) — полное согласование по роду и числу уже
// отработано, поэтому здесь оно не создаёт новой нагрузки, а высвечивает
// именно смену ЛИЦА связки, что и есть предмет recall-сессии.
//
// зачем формы согласования смешаны (rápido/rápida/rápidos/rápidas): чтобы
// каждая фраза требовала не механического повтора одной формы, а активного
// выбора и связки, и признака одновременно — это и есть полный recall.
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
// та же экономия, что и в сессиях 10/14/17/25/26/27/28/29.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s30-soy-rapido',
      english: 'Soy rápido',
      russian: 'Я быстрый',
      explanation:
        'Связка первого лица единственного числа — только о себе одном, без собеседника и без группы. Recall из первой сессии курса, где soy впервые появилась.',
      words: [
        {
          correct: 'Soy',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — обращение к собеседнику. Про себя одного — Soy.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Soy', why: 'Es — о ком-то третьем. Про себя одного — Soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию для говорящего мужского рода нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'rápidos', reasonCode: 'number_mismatch:rápido', why: 'Rápidos — форма множественного числа. Про себя одного нужна форма единственного числа: rápido.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'gender_agreement_basic'],
    },
    {
      id: 'es-e01-s30-eres-rapida',
      english: 'Eres rápida',
      russian: 'Ты быстрая',
      explanation:
        'Связка второго лица единственного числа — обращение к одной собеседнице. Recall из девятой сессии, где eres впервые появилась.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя одного. Обращение к собеседнице — Eres.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — о ком-то третьем. Прямое обращение к собеседнице — Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápido', reasonCode: 'gender_mismatch:rápida', why: 'Rápido — форма мужского рода. Для собеседницы нужна форма на -a: rápida.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'number_mismatch:rápida', why: 'Rápidas — форма множественного числа. Про одну собеседницу нужна форма единственного числа: rápida.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_basic'],
    },
    {
      id: 'es-e01-s30-es-rapido',
      english: 'Es rápido',
      russian: 'Он/оно быстрый',
      explanation:
        'Связка третьего лица единственного числа — о ком-то или о чём-то одном, без говорящего и без собеседника. Recall из семнадцатой сессии, где es впервые стала главным предметом.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'number_mismatch:Es', why: 'Son — форма для нескольких людей или вещей. Про одного нужна другая форма: Es.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — прямое обращение к собеседнику. О третьем лице — Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'rápidos', reasonCode: 'number_mismatch:rápido', why: 'Rápidos — форма множественного числа. Про одного нужна форма единственного числа: rápido.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_basic'],
    },
    {
      id: 'es-e01-s30-somos-rapidas',
      english: 'Somos rápidas',
      russian: 'Мы быстрые (о группе женского рода)',
      explanation:
        'Связка первого лица множественного числа — про группу женского рода, включающую говорящую. Recall из двадцать пятой сессии, где somos впервые стала главным предметом.',
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
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s30-son-rapidos',
      english: 'Son rápidos',
      russian: 'Они быстрые',
      explanation:
        'Связка третьего лица множественного числа — про группу без говорящего внутри. Recall из двадцать седьмой сессии, где son впервые стала главным предметом.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Про несколько человек — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s30-no-soy-rapido',
      english: 'No soy rápido',
      russian: 'Я не быстрый',
      explanation:
        'Отрицание первого лица единственного числа. No встаёт перед soy, признак не меняется от отрицания. Recall отрицательной формы из первой сессии.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'soy',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:soy', why: 'Eres — обращение к собеседнику. Про себя одного — soy.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:soy', why: 'Es — о ком-то третьем. Про себя одного — soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'rápidos', reasonCode: 'number_mismatch:rápido', why: 'Rápidos — форма множественного числа. Про себя одного нужна форма единственного числа: rápido.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'gender_agreement_basic', 'negation'],
    },
    {
      id: 'es-e01-s30-no-eres-rapida',
      english: 'No eres rápida',
      russian: 'Ты не быстрая',
      explanation:
        'Отрицание второго лица единственного числа. No встаёт перед eres, признак не меняется от отрицания. Recall отрицательной формы, впервые звучавшей мимоходом в сессии про es.',
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
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя одного. Обращение к собеседнице — eres.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — о ком-то третьем. Прямое обращение к собеседнице — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápido', reasonCode: 'gender_mismatch:rápida', why: 'Rápido — форма мужского рода. Для собеседницы нужна форма на -a: rápida.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'number_mismatch:rápida', why: 'Rápidas — форма множественного числа. Про одну собеседницу нужна форма единственного числа: rápida.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_basic', 'negation'],
    },
    {
      id: 'es-e01-s30-no-es-rapido',
      english: 'No es rápido',
      russian: 'Он/оно не быстрый',
      explanation:
        'Отрицание третьего лица единственного числа. No встаёт перед es, признак не меняется от отрицания. Recall отрицательной формы из второй и девятнадцатой сессий.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'number_mismatch:es', why: 'Son — форма для нескольких людей или вещей. Про одного нужна другая форма: es.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — прямое обращение к собеседнику. О третьем лице — es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'rápidos', reasonCode: 'number_mismatch:rápido', why: 'Rápidos — форма множественного числа. Про одного нужна форма единственного числа: rápido.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_basic', 'negation'],
    },
    {
      id: 'es-e01-s30-no-somos-rapidas',
      english: 'No somos rápidas',
      russian: 'Мы не быстрые (о группе женского рода)',
      explanation:
        'Отрицание первого лица множественного числа. No встаёт перед somos, признак не меняется от отрицания. Recall отрицательной формы из двадцать девятой сессии.',
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
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящей в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одной. Про группу, включая говорящую, — somos.', trapType: 'grammar' },
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
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s30-no-son-rapidos',
      english: 'No son rápidos',
      russian: 'Они не быстрые',
      explanation:
        'Отрицание третьего лица множественного числа. No встаёт перед son, признак не меняется от отрицания. Recall отрицательной формы из двадцать девятой сессии.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s30-soy-rapido-eres-rapida-tambien',
      english: 'Soy rápido; eres rápida también',
      russian: 'Я быстрый; ты тоже быстрая',
      explanation:
        'Диалог из утверждения о себе первым лицом и подтверждения тем же признаком вторым лицом. Recall связки soy, ответ — связка eres с recall también.',
      words: [
        {
          correct: 'Soy',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — обращение к собеседнику. Про себя одного — Soy.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Soy', why: 'Es — о ком-то третьем. Про себя одного — Soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'rápidos', reasonCode: 'number_mismatch:rápido', why: 'Rápidos — форма множественного числа. Про себя одного нужна форма единственного числа: rápido.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя одного. Ответ собеседнице — eres.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — о ком-то третьем. Прямой ответ собеседнице — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápido', reasonCode: 'gender_mismatch:rápida', why: 'Rápido — форма мужского рода. Для собеседницы нужна форма на -a: rápida.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'number_mismatch:rápida', why: 'Rápidas — форма множественного числа. Про одну собеседницу нужна форма единственного числа: rápida.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'también',
          category: 'connector',
          distractors: [
            { value: 'tambien', reasonCode: 'accent_missing:también', why: 'Tambien без тильды над é звучал бы и писался бы иначе. Нужна форма с тильдой: también.', trapType: 'orthographic' },
            { value: 'verdad', reasonCode: 'wrong_word:también', why: 'Verdad — «правда», отдельное подтверждение факта, а не присоединение к чужому признаку. Нужно también.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'second_person_singular', 'gender_agreement_basic'],
    },
    {
      id: 'es-e01-s30-es-rapido-somos-rapidos-tambien',
      english: 'Es rápido; somos rápidos también',
      russian: 'Он быстрый; мы тоже быстрые',
      explanation:
        'Диалог из утверждения о третьем лице и подтверждения тем же признаком собственной группой. Recall связки es, ответ — связка somos с recall también.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'number_mismatch:Es', why: 'Son — форма для нескольких людей или вещей. Про одного нужна другая форма: Es.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Es', why: 'Somos включает говорящего в группу. О третьем лице отдельно — Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'rápidos', reasonCode: 'number_mismatch:rápido', why: 'Rápidos — форма множественного числа. Про одного нужна форма единственного числа: rápido.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:somos', why: 'Es — только об одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'también',
          category: 'connector',
          distractors: [
            { value: 'tambien', reasonCode: 'accent_missing:también', why: 'Tambien без тильды над é звучал бы и писался бы иначе. Нужна форма с тильдой: también.', trapType: 'orthographic' },
            { value: 'verdad', reasonCode: 'wrong_word:también', why: 'Verdad — «правда», отдельное подтверждение факта, а не присоединение к чужому признаку. Нужно también.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'first_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s30-son-rapidos-no-soy-rapido-q',
      english: '¿Son rápidos?; no, no soy rápido',
      russian: 'Они быстрые? Нет, я не быстрый',
      explanation:
        'Вопрос о третьих лицах множественного числа и отрицательный ответ о себе одном. Recall связки son в вопросе, ответ — no soy, полный переход через два разных лица подряд.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Про нескольких «они» — Son.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящего в группу. Вопрос про «них» без говорящего — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'no',
          category: 'negation-reaction',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Короткая реакция отказа — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nunca', reasonCode: 'negation_word_mismatch:no', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'soy',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:soy', why: 'Eres — обращение к собеседнику. Ответ про себя одного — soy.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:soy', why: 'Es — о ком-то третьем. Ответ про себя одного — soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'rápidos', reasonCode: 'number_mismatch:rápido', why: 'Rápidos — форма множественного числа. Про себя одного нужна форма единственного числа: rápido.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'first_person_singular', 'plural_agreement', 'gender_agreement_full', 'negation', 'question_marks'],
    },
    {
      id: 'es-e01-s30-eres-rapida-no-es-rapido-q',
      english: '¿Eres rápida?; no es rápido',
      russian: 'Ты быстрая? Он не быстрый',
      explanation:
        'Вопрос ко второму лицу и отрицательный ответ о третьем лице другим родом. Recall связки eres в вопросе, ответ — no es, смена лица И рода в одной карточке.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя одного. Вопрос собеседнице — Eres.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — о ком-то третьем. Прямой вопрос собеседнице — Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápido', reasonCode: 'gender_mismatch:rápida', why: 'Rápido — форма мужского рода. Для собеседницы нужна форма на -a: rápida.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'number_mismatch:rápida', why: 'Rápidas — форма множественного числа. Про одну собеседницу нужна форма единственного числа: rápida.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'number_mismatch:es', why: 'Son — про несколько. Ответ про одного — es.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — прямое обращение к собеседнику. Ответ о третьем лице — es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'rápidos', reasonCode: 'number_mismatch:rápido', why: 'Rápidos — форма множественного числа. Про одного нужна форма единственного числа: rápido.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'third_person_singular', 'gender_agreement_basic', 'negation', 'question_marks'],
    },
    {
      id: 'es-e01-s30-somos-rapidas-son-rapidos-tambien',
      english: 'Somos rápidas; son rápidos también',
      russian: 'Мы быстрые (о группе женского рода); они тоже быстрые',
      explanation:
        'Диалог из утверждения о своей группе женского рода первым лицом множественного числа и подтверждения тем же признаком другой группой без говорящего внутри. Recall связки somos, ответ — связка son с recall también, оба лица множественного числа подряд.',
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
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящую в группу. Про другую группу без говорящей внутри — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'también',
          category: 'connector',
          distractors: [
            { value: 'tambien', reasonCode: 'accent_missing:también', why: 'Tambien без тильды над é звучал бы и писался бы иначе. Нужна форма с тильдой: también.', trapType: 'orthographic' },
            { value: 'verdad', reasonCode: 'wrong_word:también', why: 'Verdad — «правда», отдельное подтверждение факта, а не присоединение к чужому признаку. Нужно también.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
  ]);

export const ES_EPISODE_01_SESSION_30_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_30_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
