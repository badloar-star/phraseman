import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_33_LOCALIZED_DETAILS } from './es_episode_01_session_33_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 33 "Хорошо или плохо" / quality_extended_adjective, builtOn: [1, 4],
// recalls: [1, 4], открывает Главу 5 "Больше признаков"): word-first bueno
// (общая оценка «хороший») применяется во всех уже известных грамматических
// контекстах курса — все пять лиц связки ser, отрицание, полное согласование
// по роду и числу. Ничего нового по механике: вся конструкция уже отработана
// на caro/rápido/fácil (сессии 1/17/18/26), здесь расширяется только
// СЛОВАРЬ. Признак malo (антипод, «плохой») используется как дистрактор в
// нескольких позициях, но НЕ вводится как собственное слово этой сессии —
// это уже отработано в словарной карточке es_episode_01_session_33_vocabulary_v1.ts.
//
// зачем фразы построены с сэмплированием всех пяти лиц (soy/eres/es/somos/
// son): чтобы recall builtOn [1, 4] (первая и четвёртая сессии, обе о
// связке ser и признаке-прилагательном) был содержательным, а не формальным —
// bueno должно прозвучать во всех уже пройденных грамматических позициях
// курса, а не только в одной.
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
// та же экономия, что и в сессиях 10/14/17/25/26/27/28/29/30.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s33-soy-bueno',
      english: 'Soy bueno',
      russian: 'Я хороший',
      explanation:
        'Оценка себя одного, мужской род или по умолчанию. Bueno сохраняет ту же формулу -o/-a, что и caro или rápido — новый словарь, старая грамматика.',
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
          correct: 'bueno',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'buena', reasonCode: 'gender_mismatch:bueno', why: 'Buena — форма женского рода. По умолчанию нужна форма на -o: bueno.', trapType: 'grammar' },
            { value: 'malo', reasonCode: 'wrong_word:bueno', why: 'Malo означает «плохой» — противоположная оценка. Нужно bueno.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'gender_agreement_basic', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-eres-buena',
      english: 'Eres buena',
      russian: 'Ты хорошая',
      explanation:
        'Обращение к одной собеседнице, женский род. Recall связки eres из девятой сессии, признак согласуется формой на -a.',
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
          correct: 'buena',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bueno', reasonCode: 'gender_mismatch:buena', why: 'Bueno — форма мужского рода. Для собеседницы нужна форма на -a: buena.', trapType: 'grammar' },
            { value: 'mala', reasonCode: 'wrong_word:buena', why: 'Mala означает «плохая» — противоположная оценка. Нужно buena.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_basic', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-es-bueno',
      english: 'Es bueno',
      russian: 'Он/оно хороший',
      explanation:
        'Оценка кого-то или чего-то третьего, мужской род или по умолчанию. Recall связки es из семнадцатой сессии.',
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
          correct: 'bueno',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'buena', reasonCode: 'gender_mismatch:bueno', why: 'Buena — форма женского рода. По умолчанию нужна форма на -o: bueno.', trapType: 'grammar' },
            { value: 'buenos', reasonCode: 'number_mismatch:bueno', why: 'Buenos — форма множественного числа. Про одного нужна форма единственного числа: bueno.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_basic', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-somos-buenas',
      english: 'Somos buenas',
      russian: 'Мы хорошие (о группе женского рода)',
      explanation:
        'Оценка своей группы женского рода, включающей говорящую. Recall связки somos из двадцать пятой сессии, полное согласование по роду и числу.',
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
          correct: 'buenas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'buenos', reasonCode: 'gender_mismatch:buenas', why: 'Buenos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: buenas.', trapType: 'grammar' },
            { value: 'buena', reasonCode: 'number_mismatch:buenas', why: 'Buena — форма единственного числа. Про группу нужна форма множественного числа: buenas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-son-buenos',
      english: 'Son buenos',
      russian: 'Они хорошие',
      explanation:
        'Оценка группы без говорящего внутри, мужской род или по умолчанию. Recall связки son из двадцать седьмой сессии.',
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
          correct: 'buenos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'buenas', reasonCode: 'gender_mismatch:buenos', why: 'Buenas — форма женского рода множественного числа. По умолчанию нужна форма на -os: buenos.', trapType: 'grammar' },
            { value: 'bueno', reasonCode: 'number_mismatch:buenos', why: 'Bueno — форма единственного числа. Про группу нужна форма множественного числа: buenos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-no-soy-bueno',
      english: 'No soy bueno',
      russian: 'Я не хороший',
      explanation:
        'Отрицание оценки себя одного. No встаёт перед soy, признак не меняется от отрицания. Recall отрицательной формы из первой сессии.',
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
          correct: 'bueno',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'buena', reasonCode: 'gender_mismatch:bueno', why: 'Buena — форма женского рода. По умолчанию нужна форма на -o: bueno.', trapType: 'grammar' },
            { value: 'malo', reasonCode: 'wrong_word:bueno', why: 'Malo означает «плохой» — противоположная оценка. Нужно bueno.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'gender_agreement_basic', 'negation', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-no-es-buena',
      english: 'No es buena',
      russian: 'Она не хорошая',
      explanation:
        'Отрицание оценки третьего лица женского рода. No встаёт перед es, признак не меняется от отрицания. Recall отрицательной формы из второй и девятнадцатой сессий.',
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
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'number_mismatch:es', why: 'Son — форма для нескольких людей или вещей. Про одну нужна другая форма: es.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — прямое обращение к собеседнице. О третьем лице — es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'buena',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bueno', reasonCode: 'gender_mismatch:buena', why: 'Bueno — форма мужского рода. Для неё нужна форма на -a: buena.', trapType: 'grammar' },
            { value: 'mala', reasonCode: 'wrong_word:buena', why: 'Mala означает «плохая» — противоположная оценка. Нужно buena.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_basic', 'negation', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-no-somos-buenos',
      english: 'No somos buenos',
      russian: 'Мы не хорошие',
      explanation:
        'Отрицание оценки своей группы мужского рода или смешанной по умолчанию. No встаёт перед somos, признак сохраняет окончание -os.',
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
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'buenos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'buenas', reasonCode: 'gender_mismatch:buenos', why: 'Buenas — форма женского рода множественного числа. По умолчанию нужна форма на -os: buenos.', trapType: 'grammar' },
            { value: 'bueno', reasonCode: 'number_mismatch:buenos', why: 'Bueno — форма единственного числа. Про группу нужна форма множественного числа: buenos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-no-son-malos',
      english: 'No son malos',
      russian: 'Они не плохие',
      explanation:
        'Так отвечают, когда отрицают плохую оценку чужой группы мужского рода. Malo — антипод bueno, и он подчиняется той же самой формуле -o/-a/-os/-as, что и любой другой признак на -o.',
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
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'malos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'malas', reasonCode: 'gender_mismatch:malos', why: 'Malas — форма женского рода множественного числа. По умолчанию нужна форма на -os: malos.', trapType: 'grammar' },
            { value: 'buenos', reasonCode: 'wrong_word:malos', why: 'Buenos означает «хорошие» — противоположная оценка. Нужно malos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-soy-bueno-eres-buena-tambien',
      english: 'Soy bueno; eres buena también',
      russian: 'Я хороший; ты тоже хорошая',
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
          correct: 'bueno',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'buena', reasonCode: 'gender_mismatch:bueno', why: 'Buena — форма женского рода. По умолчанию нужна форма на -o: bueno.', trapType: 'grammar' },
            { value: 'malo', reasonCode: 'wrong_word:bueno', why: 'Malo означает «плохой» — противоположная оценка. Нужно bueno.', trapType: 'semantic_neighbor' },
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
          correct: 'buena',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bueno', reasonCode: 'gender_mismatch:buena', why: 'Bueno — форма мужского рода. Для собеседницы нужна форма на -a: buena.', trapType: 'grammar' },
            { value: 'mala', reasonCode: 'wrong_word:buena', why: 'Mala означает «плохая» — противоположная оценка. Нужно buena.', trapType: 'semantic_neighbor' },
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
      features: ['ser', 'first_person_singular', 'second_person_singular', 'gender_agreement_basic', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-es-bueno-somos-buenos-tambien',
      english: 'Es bueno; somos buenos también',
      russian: 'Он хороший; мы тоже хорошие',
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
          correct: 'bueno',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'buena', reasonCode: 'gender_mismatch:bueno', why: 'Buena — форма женского рода. По умолчанию нужна форма на -o: bueno.', trapType: 'grammar' },
            { value: 'malo', reasonCode: 'wrong_word:bueno', why: 'Malo означает «плохой» — противоположная оценка. Нужно bueno.', trapType: 'semantic_neighbor' },
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
          correct: 'buenos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'buenas', reasonCode: 'gender_mismatch:buenos', why: 'Buenas — форма женского рода множественного числа. По умолчанию нужна форма на -os: buenos.', trapType: 'grammar' },
            { value: 'bueno', reasonCode: 'number_mismatch:buenos', why: 'Bueno — форма единственного числа. Про группу нужна форма множественного числа: buenos.', trapType: 'grammar' },
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
      features: ['ser', 'third_person_singular', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-son-buenos-no-soy-bueno-q',
      english: '¿Son buenos?; no, no soy bueno',
      russian: 'Они хорошие? Нет, я не хороший',
      explanation:
        'Вопрос о третьих лицах множественного числа и отрицательный ответ о себе одном. Recall связки son в вопросе, ответ — no soy.',
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
          correct: 'buenos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'buenas', reasonCode: 'gender_mismatch:buenos', why: 'Buenas — форма женского рода множественного числа. По умолчанию нужна форма на -os: buenos.', trapType: 'grammar' },
            { value: 'bueno', reasonCode: 'number_mismatch:buenos', why: 'Bueno — форма единственного числа. Про группу нужна форма множественного числа: buenos.', trapType: 'grammar' },
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
          correct: 'bueno',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'buena', reasonCode: 'gender_mismatch:bueno', why: 'Buena — форма женского рода. По умолчанию нужна форма на -o: bueno.', trapType: 'grammar' },
            { value: 'malo', reasonCode: 'wrong_word:bueno', why: 'Malo означает «плохой» — противоположная оценка. Нужно bueno.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'first_person_singular', 'plural_agreement', 'gender_agreement_full', 'negation', 'question_marks', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-eres-buena-no-es-mala-q',
      english: '¿Eres buena?; no es mala',
      russian: 'Ты хорошая? Она не плохая',
      explanation:
        'Вопрос ко второму лицу и отрицательный ответ через антоним о третьем лице. Recall связки eres в вопросе, ответ — no es mala, оба признака согласованы по женскому роду.',
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
          correct: 'buena',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bueno', reasonCode: 'gender_mismatch:buena', why: 'Bueno — форма мужского рода. Для собеседницы нужна форма на -a: buena.', trapType: 'grammar' },
            { value: 'mala', reasonCode: 'wrong_word:buena', why: 'Mala означает «плохая» — противоположная оценка. Нужно buena.', trapType: 'semantic_neighbor' },
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
            { value: 'son', reasonCode: 'number_mismatch:es', why: 'Son — про несколько. Ответ про одну — es.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — прямое обращение к собеседнице. Ответ о третьем лице — es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'mala',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'malo', reasonCode: 'gender_mismatch:mala', why: 'Malo — форма мужского рода. Для неё нужна форма на -a: mala.', trapType: 'grammar' },
            { value: 'buena', reasonCode: 'wrong_word:mala', why: 'Buena означает «хорошая» — противоположная оценка. Нужно mala.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'third_person_singular', 'gender_agreement_basic', 'negation', 'question_marks', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-somos-buenas-son-malas-q',
      english: '¿Somos buenas?; no, son malas',
      russian: 'Мы хорошие? Нет, они плохие',
      explanation:
        'Вопрос о своей группе женского рода и отрицательный ответ через антоним о другой группе. Recall связки somos в вопросе, ответ — son malas, оба признака согласованы по женскому роду множественного числа.',
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
          correct: 'buenas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'buenos', reasonCode: 'gender_mismatch:buenas', why: 'Buenos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: buenas.', trapType: 'grammar' },
            { value: 'malas', reasonCode: 'wrong_word:buenas', why: 'Malas означает «плохие» — противоположная оценка. Нужно buenas.', trapType: 'semantic_neighbor' },
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
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящую в группу. Про другую группу без говорящей — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одной. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'malas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'malos', reasonCode: 'gender_mismatch:malas', why: 'Malos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: malas.', trapType: 'grammar' },
            { value: 'buenas', reasonCode: 'wrong_word:malas', why: 'Buenas означает «хорошие» — противоположная оценка. Нужно malas.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation', 'question_marks', 'quality_extended_adjective'],
    },
    {
      id: 'es-e01-s33-no-eres-malo',
      english: 'No eres malo',
      russian: 'Ты не плохой',
      explanation:
        'Отрицание оценки собеседника мужского рода через антоним malo. No встаёт перед eres, признак не меняется от отрицания — единственная непокрытая ранее комбинация лица и отрицания в этой сессии.',
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
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя одного. Обращение к собеседнику — eres.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — о ком-то третьем. Прямое обращение к собеседнику — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'malo',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'mala', reasonCode: 'gender_mismatch:malo', why: 'Mala — форма женского рода. Для собеседника мужского рода нужна форма на -o: malo.', trapType: 'grammar' },
            { value: 'bueno', reasonCode: 'wrong_word:malo', why: 'Bueno означает «хороший» — противоположная оценка. Нужно malo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_basic', 'negation', 'quality_extended_adjective'],
    },
  ]);

export const ES_EPISODE_01_SESSION_33_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_33_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
