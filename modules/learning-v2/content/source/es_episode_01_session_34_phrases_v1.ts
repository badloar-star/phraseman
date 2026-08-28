import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_34_LOCALIZED_DETAILS } from './es_episode_01_session_34_localized_details_v1';

// зачем этот файл (владелец, 2026-08-28, карта сессий es_episode_01_session_map_v1.ts,
// сессия 34 "Одинаковое и разное" / comparison_basic_adjective, builtOn: [33],
// recalls: [4, 33]): word-first diferente («другой, отличающийся»,
// неизменяемое прилагательное) применяется во всех уже известных
// грамматических контекстах курса — все пять лиц связки ser, отрицание.
// Recall igual (сессия 14, «всё равно») используется как противоположность
// diferente в нескольких фразах — оба слова остаются в своих прежних
// значениях. Recall bueno/malo (сессия 33) появляется в двух фразах как
// уже известный класс -o/-a признаков, противопоставленный неизменяемому
// классу diferente/igual/fácil — это прямой recall builtOn [33].
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
// та же экономия, что и в сессиях 10/14/17/25/26/27/28/29/30/33.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s34-soy-diferente',
      english: 'Soy diferente',
      russian: 'Я другой',
      explanation:
        'Оценка себя одного через неизменяемый признак сравнения. Diferente не меняется по роду — та же формула, что у fácil и igual, новый словарь.',
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
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'igual', reasonCode: 'wrong_word:diferente', why: 'Igual означает «всё равно» — противоположная оценка. Нужно diferente.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-eres-diferente',
      english: 'Eres diferente',
      russian: 'Ты другой',
      explanation:
        'Обращение к одному собеседнику. Recall связки eres из девятой сессии, признак не меняется — та же форма diferente для любого рода.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя одного. Обращение к собеседнику — Eres.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — о ком-то третьем. Прямое обращение к собеседнику — Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'igual', reasonCode: 'wrong_word:diferente', why: 'Igual означает «всё равно» — противоположная оценка. Нужно diferente.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-es-diferente',
      english: 'Es diferente',
      russian: 'Это другое',
      explanation:
        'Безличная оценка ситуации или предмета. Recall связки es из семнадцатой сессии, неизменяемая форма diferente для среднего/безличного контекста.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'number_mismatch:Es', why: 'Son — форма для нескольких людей или вещей. Про одно нужна другая форма: Es.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — прямое обращение к собеседнику. Безличная оценка — Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'bueno', reasonCode: 'wrong_word:diferente', why: 'Bueno означает «хороший» — общая оценка, а не сравнение. Нужно diferente.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-somos-diferentes',
      english: 'Somos diferentes',
      russian: 'Мы разные',
      explanation:
        'Оценка своей группы, включающей говорящего. Recall связки somos из двадцать пятой сессии, множественное число добавляет только -s: diferentes.',
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
          correct: 'diferentes',
          category: 'comparison-adjective-invariable-plural',
          distractors: [
            { value: 'diferente', reasonCode: 'number_mismatch:diferentes', why: 'Diferente — форма единственного числа. Про группу нужна форма множественного числа: diferentes.', trapType: 'grammar' },
            { value: 'iguales', reasonCode: 'wrong_word:diferentes', why: 'Iguales означает «одинаковые, всё равно» — противоположная оценка. Нужно diferentes.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-son-diferentes',
      english: 'Son diferentes',
      russian: 'Они разные',
      explanation:
        'Так говорят про чужую группу, в которую не входит говорящий, — например, о людях в другой комнате. Recall связки son из двадцать седьмой сессии, признак diferentes добавляет только -s.',
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
          correct: 'diferentes',
          category: 'comparison-adjective-invariable-plural',
          distractors: [
            { value: 'diferente', reasonCode: 'number_mismatch:diferentes', why: 'Diferente — форма единственного числа. Про группу нужна форма множественного числа: diferentes.', trapType: 'grammar' },
            { value: 'iguales', reasonCode: 'wrong_word:diferentes', why: 'Iguales означает «одинаковые, всё равно» — противоположная оценка. Нужно diferentes.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-no-soy-diferente',
      english: 'No soy diferente',
      russian: 'Я не другой',
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
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'igual', reasonCode: 'wrong_word:diferente', why: 'Igual означает «всё равно» — противоположная оценка. Нужно diferente.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'negation', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-no-es-diferente',
      english: 'No es diferente',
      russian: 'Это не другое',
      explanation:
        'Отрицание безличной оценки. No встаёт перед es, признак не меняется от отрицания. Recall отрицательной формы из второй и девятнадцатой сессий.',
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
            { value: 'son', reasonCode: 'number_mismatch:es', why: 'Son — форма для нескольких людей или вещей. Про одно нужна другая форма: es.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — прямое обращение к собеседнику. Безличная оценка — es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'malo', reasonCode: 'wrong_word:diferente', why: 'Malo означает «плохой» — общая оценка, а не сравнение. Нужно diferente.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'negation', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-no-somos-diferentes',
      english: 'No somos diferentes',
      russian: 'Мы не разные',
      explanation:
        'Так отвечают, когда отрицают, что своя группа отличается от кого-то ещё. No встаёт перед somos, признак сохраняет окончание -es — то же самое множественное число, что и в утвердительной форме.',
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
          correct: 'diferentes',
          category: 'comparison-adjective-invariable-plural',
          distractors: [
            { value: 'diferente', reasonCode: 'number_mismatch:diferentes', why: 'Diferente — форма единственного числа. Про группу нужна форма множественного числа: diferentes.', trapType: 'grammar' },
            { value: 'iguales', reasonCode: 'wrong_word:diferentes', why: 'Iguales означает «одинаковые, всё равно» — противоположная оценка. Нужно diferentes.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'negation', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-no-son-diferentes',
      english: 'No son diferentes',
      russian: 'Они не разные',
      explanation:
        'Отрицание оценки чужой группы. No встаёт перед son, признак сохраняет окончание -es — единственная непокрытая ранее комбинация лица и отрицания в этой сессии.',
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
          correct: 'diferentes',
          category: 'comparison-adjective-invariable-plural',
          distractors: [
            { value: 'diferente', reasonCode: 'number_mismatch:diferentes', why: 'Diferente — форма единственного числа. Про группу нужна форма множественного числа: diferentes.', trapType: 'grammar' },
            { value: 'iguales', reasonCode: 'wrong_word:diferentes', why: 'Iguales означает «одинаковые, всё равно» — противоположная оценка. Нужно diferentes.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'negation', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-soy-diferente-eres-igual-tambien',
      english: 'Soy diferente; eres igual también',
      russian: 'Я другой; ты тоже безразличен',
      explanation:
        'Диалог из утверждения о себе и ответа собеседника с recall igual. Recall связки soy, ответ — связка eres с recall también.',
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
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'igual', reasonCode: 'wrong_word:diferente', why: 'Igual означает «всё равно» — противоположная оценка. Нужно diferente.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя одного. Ответ собеседнику — eres.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — о ком-то третьем. Прямой ответ собеседнику — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'diferente', reasonCode: 'wrong_word:igual', why: 'Diferente означает «другой» — противоположная оценка. Нужно igual.', trapType: 'semantic_neighbor' },
            { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
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
      features: ['ser', 'first_person_singular', 'second_person_singular', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-es-diferente-somos-diferentes-tambien',
      english: 'Es diferente; somos diferentes también',
      russian: 'Он другой; мы тоже разные',
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
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'igual', reasonCode: 'wrong_word:diferente', why: 'Igual означает «всё равно» — противоположная оценка. Нужно diferente.', trapType: 'semantic_neighbor' },
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
          correct: 'diferentes',
          category: 'comparison-adjective-invariable-plural',
          distractors: [
            { value: 'diferente', reasonCode: 'number_mismatch:diferentes', why: 'Diferente — форма единственного числа. Про группу нужна форма множественного числа: diferentes.', trapType: 'grammar' },
            { value: 'iguales', reasonCode: 'wrong_word:diferentes', why: 'Iguales означает «одинаковые, всё равно» — противоположная оценка. Нужно diferentes.', trapType: 'semantic_neighbor' },
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
      features: ['ser', 'third_person_singular', 'first_person_plural', 'plural_agreement', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-son-diferentes-no-soy-igual-q',
      english: '¿Son diferentes?; no, no soy igual',
      russian: 'Они разные? Нет, мне не всё равно',
      explanation:
        'Вопрос о третьих лицах множественного числа и отрицательный ответ о себе одном с recall igual. Recall связки son в вопросе, ответ — no soy igual.',
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
          correct: 'diferentes',
          category: 'comparison-adjective-invariable-plural',
          distractors: [
            { value: 'diferente', reasonCode: 'number_mismatch:diferentes', why: 'Diferente — форма единственного числа. Про группу нужна форма множественного числа: diferentes.', trapType: 'grammar' },
            { value: 'iguales', reasonCode: 'wrong_word:diferentes', why: 'Iguales означает «одинаковые, всё равно» — противоположная оценка. Нужно diferentes.', trapType: 'semantic_neighbor' },
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
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'diferente', reasonCode: 'wrong_word:igual', why: 'Diferente означает «другой» — противоположная оценка. Нужно igual.', trapType: 'semantic_neighbor' },
            { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'first_person_singular', 'plural_agreement', 'negation', 'question_marks', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-eres-diferente-no-es-igual-q',
      english: '¿Eres diferente?; no es igual',
      russian: 'Ты другой? Всё равно',
      explanation:
        'Вопрос ко второму лицу и отрицательный ответ безразличием о третьем лице. Recall связки eres в вопросе, ответ — no es igual.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя одного. Вопрос собеседнику — Eres.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — о ком-то третьем. Прямой вопрос собеседнику — Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'igual', reasonCode: 'wrong_word:diferente', why: 'Igual означает «всё равно» — противоположная оценка. Нужно diferente.', trapType: 'semantic_neighbor' },
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
            { value: 'son', reasonCode: 'number_mismatch:es', why: 'Son — про несколько. Ответ про одно — es.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — прямое обращение к собеседнику. Ответ безлично — es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'diferente', reasonCode: 'wrong_word:igual', why: 'Diferente означает «другой» — противоположная оценка. Нужно igual.', trapType: 'semantic_neighbor' },
            { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'third_person_singular', 'negation', 'question_marks', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-somos-diferentes-son-buenos-q',
      english: '¿Somos diferentes, son buenos?',
      russian: 'Мы разные, они хорошие?',
      explanation:
        'Так спрашивают, когда хотят сравнить сразу две группы разными признаками. Diferentes не меняется по роду, а buenos — обычный признак на -o/-a: фраза нарочно сталкивает оба класса подряд.',
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
          correct: 'diferentes',
          category: 'comparison-adjective-invariable-plural',
          distractors: [
            { value: 'diferente', reasonCode: 'number_mismatch:diferentes', why: 'Diferente — форма единственного числа. Про группу нужна форма множественного числа: diferentes.', trapType: 'grammar' },
            { value: 'buenos', reasonCode: 'wrong_word:diferentes', why: 'Buenos означает «хорошие» — общая оценка, а не сравнение. Нужно diferentes.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про другую группу без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'buenos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'buenas', reasonCode: 'gender_mismatch:buenos', why: 'Buenas — форма женского рода множественного числа. По умолчанию нужна форма на -os: buenos.', trapType: 'grammar' },
            { value: 'diferentes', reasonCode: 'wrong_word:buenos', why: 'Diferentes означает «разные» — сравнение, а не общая оценка. Нужно buenos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_plural', 'plural_agreement', 'question_marks', 'invariable_adjective', 'comparison_basic_adjective'],
    },
    {
      id: 'es-e01-s34-no-eres-diferente',
      english: 'No eres diferente',
      russian: 'Ты не другой',
      explanation:
        'Отрицают, когда возражают против сравнения с собеседником. No встаёт перед eres, а diferente сохраняет ту же неизменяемую форму, что и в утверждении.',
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
          correct: 'diferente',
          category: 'comparison-adjective-invariable',
          distractors: [
            { value: 'diferenta', reasonCode: 'invariable_adjective_wrongly_inflected:diferente', why: 'Diferente не меняется по роду — формы diferenta не существует.', trapType: 'grammar' },
            { value: 'malo', reasonCode: 'wrong_word:diferente', why: 'Malo означает «плохой» — общая оценка, а не сравнение. Нужно diferente.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'negation', 'invariable_adjective', 'comparison_basic_adjective'],
    },
  ]);

export const ES_EPISODE_01_SESSION_34_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_34_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
