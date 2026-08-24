import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_11_LOCALIZED_DETAILS } from './es_episode_01_session_11_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25): фразы применения для сессии 11 —
// «Ты не» (builtOn: [2, 9], recalls: [2, 9]). Никаких новых слов: no
// (сессия 2) отрицает eres (сессия 9) перед уже известными признаками
// (bonito/bonita, rápido/rápida, único/única из сессий 3/5/6). Формула та
// же, что и в No es fácil (сессия 2): no встаёт перед связкой, признак не
// меняется.
//
// distractorAuthorship: 'manual' (см. es_episode_01_session_11_v1.ts) —
// снижает минимум дистракторов с 3 до 2, тот же приём, что в сессиях 7/8/10.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s11-no-eres-bonito',
      english: 'No eres bonito',
      russian: 'Ты не красивый',
      explanation:
        'Прямое возражение на комплимент или самооценку собеседника мужского рода. No встаёт перед eres, признак не меняется — та же формула, что и No es fácil.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Отрицание к собеседнику напрямую — eres.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя. Отрицание к собеседнику — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonito',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonita', reasonCode: 'gender_mismatch:bonito', why: 'Bonita — форма женского рода. О собеседнике мужского рода нужна форма bonito.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'wrong_word:bonito', why: 'Rápido — это «быстрый», признак темпа, а не внешности. Нужно bonito.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'second_person_singular'],
    },
    {
      id: 'es-e01-s11-no-eres-bonita',
      english: 'No eres bonita',
      russian: 'Ты не красивая',
      explanation:
        'Тот же ответ, но собеседница женского рода. Меняется только концовка признака — no и eres остаются теми же.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Отрицание к собеседнице напрямую — eres.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя. Отрицание к собеседнице — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonita',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito — форма мужского рода. О собеседнице женского рода нужна форма bonita.', trapType: 'grammar' },
            { value: 'única', reasonCode: 'wrong_word:bonita', why: 'Única — это «единственная», совсем другой признак. Нужно bonita.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'second_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s11-no-eres-rapido',
      english: 'No eres rápido',
      russian: 'Ты не быстрый',
      explanation:
        'Отрицание темпа собеседника мужского рода — например, при разборе результата забега. No перед eres, признак не меняется.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Отрицание к собеседнику про его темп — eres.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя. Отрицание к собеседнику — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. О собеседнике мужского рода нужна форма rápido.', trapType: 'grammar' },
            { value: 'verdadero', reasonCode: 'wrong_word:rápido', why: 'Verdadero — это «истинный», совсем другой признак. Нужно rápido.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'second_person_singular', 'pace_adjective'],
    },
    {
      id: 'es-e01-s11-no-eres-rapida',
      english: 'No eres rápida',
      russian: 'Ты не быстрая',
      explanation:
        'Тот же ответ о темпе, но собеседница женского рода. Меняется только концовка признака, no и eres остаются теми же.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Отрицание к собеседнице про её темп — eres.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя. Отрицание к собеседнице — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápido', reasonCode: 'gender_mismatch:rápida', why: 'Rápido — форма мужского рода. О собеседнице женского рода нужна форма rápida.', trapType: 'grammar' },
            { value: 'verdadera', reasonCode: 'wrong_word:rápida', why: 'Verdadera — это «истинная», совсем другой признак. Нужно rápida.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'second_person_singular', 'gender_agreement_full', 'pace_adjective'],
    },
    {
      id: 'es-e01-s11-no-eres-unico',
      english: 'No eres único',
      russian: 'Ты не единственный такой',
      explanation:
        'Отрицание неповторимости собеседника мужского рода — например, в споре о том, кто особенный. Тильда над ú остаётся на месте и в отрицании.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Отрицание к собеседнику напрямую — eres.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя. Отрицание к собеседнику — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'único',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única — форма женского рода. О собеседнике мужского рода нужна форма único.', trapType: 'grammar' },
            { value: 'unico', reasonCode: 'accent_missing:único', why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'negation', 'second_person_singular', 'written_accent'],
    },
    {
      id: 'es-e01-s11-no-eres-unica',
      english: 'No eres única',
      russian: 'Ты не единственная такая',
      explanation:
        'Тот же ответ о неповторимости, но собеседница женского рода. Тильда над ú остаётся на месте в обеих формах.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'eres',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Отрицание к собеседнице напрямую — eres.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя. Отрицание к собеседнице — eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'única',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'único', reasonCode: 'gender_mismatch:única', why: 'Único — форма мужского рода. О собеседнице женского рода нужна форма única.', trapType: 'grammar' },
            { value: 'unica', reasonCode: 'accent_missing:única', why: 'Unica без тильды над ú звучала бы и писалась бы иначе. Нужна форма única с тильдой.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'negation', 'second_person_singular', 'gender_agreement_full', 'written_accent'],
    },
    {
      id: 'es-e01-s11-no-es-bonito',
      english: 'No es bonito',
      russian: 'Это некрасиво',
      explanation:
        'Безличное отрицание внешнего вида предмета или ситуации — например, неаккуратного результата работы. Es здесь не про собеседника, а про то, что перед глазами.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Безличная оценка предмета — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonito',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonita', reasonCode: 'gender_mismatch:bonito', why: 'Bonita согласуется с существительным женского рода. Безличная оценка «это» — по умолчанию bonito.', trapType: 'grammar' },
            { value: 'fácil', reasonCode: 'wrong_word:bonito', why: 'Fácil — это «лёгкий», признак сложности, а не внешнего вида. Нужно bonito.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation'],
    },
    {
      id: 'es-e01-s11-no-es-facil',
      english: 'No es fácil',
      russian: 'Это не легко',
      explanation:
        'Прямое возражение на оценку кого-то другого — уже знакомая фраза из второй сессии, здесь встречается как recall внутри новой темы. Формула та же: no перед связкой, признак не меняется.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Безличная оценка задачи — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Безличная оценка задачи — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'fácil',
          category: 'quality-adjective',
          distractors: [
            { value: 'difícil', reasonCode: 'antonym_confusion:fácil', why: 'Difícil значит противоположное — «трудно». Отрицание лёгкости — fácil.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:fácil', why: 'Verdad — это существительное «правда», а не признак сложности. Нужно fácil.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'quality'],
    },
    {
      id: 'es-e01-s11-no-es-verdad',
      english: 'No es verdad',
      russian: 'Это неправда',
      explanation:
        'Прямое опровержение чужих слов — та же формула, что и No es fácil, здесь как recall из второй сессии внутри новой темы отрицания. No встаёт перед es, verdad не меняется.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Оценка чужих слов — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка чужих слов — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdad',
          category: 'truth-noun',
          distractors: [
            { value: 'verdadero', reasonCode: 'adjective_for_fixed_phrase:verdad', why: 'Verdadero — признак предмета, «истинный». Устойчивая реакция — именно verdad, существительное.', trapType: 'grammar' },
            { value: 'mentira', reasonCode: 'antonym_as_wrong_construction:verdad', why: 'Mentira значит «ложь» само по себе — сказали бы Es mentira. Здесь отрицание готовой фразы Es verdad.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'fixed_reaction'],
    },
    {
      id: 'es-e01-s11-no-es-unica',
      english: 'No es única',
      russian: 'Это не единственная такая',
      explanation:
        'Тот же ответ о неповторимости, но про предмет женского рода — например, серию открыток. Тильда над ú остаётся на месте в обеих формах.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Безличная оценка предмета — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'única',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'único', reasonCode: 'gender_mismatch:única', why: 'Único — форма мужского рода. О предмете женского рода нужна форма única.', trapType: 'grammar' },
            { value: 'unica', reasonCode: 'accent_missing:única', why: 'Unica без тильды над ú звучала бы и писалась бы иначе. Нужна форма única с тильдой.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'negation', 'gender_agreement_full', 'written_accent'],
    },
    {
      id: 'es-e01-s11-no-es-rapido',
      english: 'No es rápido',
      russian: 'Это не быстро',
      explanation:
        'Безличное отрицание темпа процесса или транспорта — например, медленного интернета. Es про сам предмет, не про собеседника.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Безличная оценка предмета — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida согласуется с существительным женского рода. Безличная оценка «это» — по умолчанию rápido.', trapType: 'grammar' },
            { value: 'único', reasonCode: 'wrong_word:rápido', why: 'Único — это «единственный», признак неповторимости, а не темпа. Нужно rápido.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'pace_adjective'],
    },
    {
      id: 'es-e01-s11-no-es-unico',
      english: 'No es único',
      russian: 'Это не единственное такое',
      explanation:
        'Безличное отрицание неповторимости предмета — например, серийного изделия. Тильда над ú остаётся на месте и в отрицании, она не зависит от no.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Безличная оценка предмета — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'único',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única согласуется с существительным женского рода. Безличная оценка «это» — по умолчанию único.', trapType: 'grammar' },
            { value: 'unico', reasonCode: 'accent_missing:único', why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'negation', 'written_accent'],
    },
    {
      id: 'es-e01-s11-no-soy-rapido',
      english: 'No soy rápido',
      russian: 'Я не быстрый',
      explanation:
        'Отрицание собственного качества из первой сессии — уже знакомая фраза, здесь встречается как recall внутри темы отрицания связки. No встаёт перед soy, признак не меняется.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание качества — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'soy',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:soy', why: 'Eres — про тебя. Говорящий про себя — soy.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:soy', why: 'Es — про предмет или третье лицо. Говорящий про себя — soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida говорит о себе женщина. Здесь говорит мужчина — нужна форма rápido.', trapType: 'grammar' },
            { value: 'bonito', reasonCode: 'wrong_word:rápido', why: 'Bonito — это «красивый», признак внешности, а не темпа. Нужно rápido.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'first_person_singular'],
    },
    {
      id: 'es-e01-s11-no-soy-bonita',
      english: 'No soy bonita',
      russian: 'Я не красивая',
      explanation:
        'Отрицание собственной внешности — женщина возражает на комплимент. No перед soy, признак не меняется.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'soy',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:soy', why: 'Eres — про тебя. Говорящая про себя — soy.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:soy', why: 'Es — про предмет или третье лицо. Говорящая про себя — soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonita',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito говорит о себе мужчина. Здесь говорит женщина — нужна форма bonita.', trapType: 'grammar' },
            { value: 'rápida', reasonCode: 'wrong_word:bonita', why: 'Rápida — это «быстрая», признак темпа, а не внешности. Нужно bonita.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'first_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s11-no-soy-verdadero',
      english: 'No soy verdadero',
      russian: 'Я не настоящий',
      explanation:
        'Философское отрицание собственной искренности. Verdadero здесь согласуется с говорящим мужского рода, no встаёт перед soy.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'soy',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:soy', why: 'Eres — про тебя. Говорящий про себя — soy.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'agreement_person_mismatch:soy', why: 'Es — про предмет или третье лицо. Говорящий про себя — soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdadero',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'verdadera', reasonCode: 'gender_mismatch:verdadero', why: 'Verdadera — форма женского рода. Здесь говорит мужчина — нужна форма verdadero.', trapType: 'grammar' },
            { value: 'único', reasonCode: 'wrong_word:verdadero', why: 'Único — это «единственный», признак неповторимости, а не искренности. Нужно verdadero.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'negation', 'first_person_singular', 'gender_agreement_full', 'truth_adjective'],
    },
  ]);

export const ES_EPISODE_01_SESSION_11_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_11_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
