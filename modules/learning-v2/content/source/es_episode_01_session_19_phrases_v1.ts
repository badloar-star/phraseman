import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_19_LOCALIZED_DETAILS } from './es_episode_01_session_19_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 19 "Это не так" / builtOn: [2, 17], recalls: [2, 11]): 15 фраз
// применения комбинируют отрицание no (сессия 2) с третьим лицом es —
// связкой для предметов и ситуаций, введённой в сессии 17 «Это так». В
// отличие от сессии 11 «Ты не» (которая мешала soy/eres/es), здесь ВСЕ
// 15 фраз держат только es: это завершает парадигму отрицания по лицам —
// no soy (с.2), no eres (с.11), а теперь предметно no es. Признаки — уже
// word-first-одобренная лексика (fácil/difícil/verdad/así/igual/importante/
// caro/verdadero из сессии 1, bonito/bonita из сессии 3, rápido/rápida из
// сессии 5, único/única из сессии 6). Новых слов нет.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s19-no-es-facil',
      english: 'No es fácil',
      russian: 'Это нелегко',
      explanation:
        'Прямое возражение на чужую оценку задачи как простой. No встаёт перед es, признак не меняется — та же формула, что и во второй сессии, только теперь про предмет или ситуацию, а не про говорящего.',
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
            { value: 'caro', reasonCode: 'wrong_word:fácil', why: 'Caro означает «дорого» — про цену, а не про сложность. Нужно fácil.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-caro',
      english: 'No es caro',
      russian: 'Это не дорого',
      explanation:
        'Возражение на оценку цены товара как высокой — например, в магазине, когда собеседник сомневается перед покупкой. Признак согласуется с родом предмета по умолчанию — форма на -o.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Оценка цены предмета — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка цены предмета — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'cara', reasonCode: 'gender_mismatch:caro', why: 'Cara — форма женского рода, с -a. По умолчанию, без названного предмета, используется форма на -o: caro.', trapType: 'grammar' },
            { value: 'difícil', reasonCode: 'wrong_word:caro', why: 'Difícil означает «трудно» — совсем другой признак, не про цену. Нужно caro.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'price_context', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-cara',
      english: 'No es cara',
      russian: 'Она не дорогая',
      explanation:
        'Тот же ответ о цене, но про вещь женского рода — например, camiseta (футболка), которую собеседник посчитал дорогой. Меняется только концовка признака, no и es остаются теми же.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Оценка цены предмета — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка цены предмета — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'cara',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'caro', reasonCode: 'gender_mismatch:cara', why: 'Caro — форма мужского рода, с -o. Для предмета женского рода нужна форма на -a: cara.', trapType: 'grammar' },
            { value: 'única', reasonCode: 'wrong_word:cara', why: 'Única означает «единственная» — совсем другой признак, не про цену. Нужно cara.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'price_context', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-verdad',
      english: 'No es verdad',
      russian: 'Это неправда',
      explanation:
        'Прямое опровержение слуха или чужого утверждения о ситуации. No встаёт перед es, verdad не меняется — устойчивая реакция, знакомая из второй сессии, здесь применённая к безличной ситуации.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Опровержение слуха о ситуации — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Опровержение слуха о ситуации — только es.', trapType: 'grammar' },
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
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'fixed_reaction', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-verdadero',
      english: 'No es verdadero',
      russian: 'Это не истинно',
      explanation:
        'Более сильное опровержение факта, чем No es verdad, — например, разоблачение подделки или фальшивой новости. Es не спутать с eres: verdadero описывает вещь, а не характер собеседника.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Опровержение факта о предмете — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Опровержение факта о предмете — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdadero',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'verdadera', reasonCode: 'gender_mismatch:verdadero', why: 'Verdadera — форма женского рода, с -a. По умолчанию, без названного предмета, используется форма на -o: verdadero.', trapType: 'grammar' },
            { value: 'único', reasonCode: 'wrong_word:verdadero', why: 'Único означает «единственный» — совсем другой признак, не про истинность. Нужно verdadero.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-asi',
      english: 'No es así',
      russian: 'Это не так',
      explanation:
        'Прямое возражение на описание того, как обстоят дела, — заголовок этой темы. No встаёт перед es, así не меняется в отрицании: это описание образа действия, а не признак с родом.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Про то, как обстоит дело, — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Про то, как обстоит дело, — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не образ действия. Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «именно таким образом». Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-igual',
      english: 'No es igual',
      russian: 'Это не всё равно',
      explanation:
        'Возражение на чужое безразличие — говорящий настаивает, что разница есть. No перед es, igual не меняется: это реакция на ситуацию, а не на собеседника.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Реакция на ситуацию — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Реакция на ситуацию — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'quality-adjective',
          distractors: [
            { value: 'así', reasonCode: 'wrong_word:igual', why: 'Así означает «так» — описание образа действия, не безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
            { value: 'importante', reasonCode: 'wrong_word:igual', why: 'Importante означает «важно» — другой оттенок, не безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-importante',
      english: 'No es importante',
      russian: 'Это не важно',
      explanation:
        'Так снижают значимость темы или дела, вопреки чужому мнению, что стоит беспокоиться. No встаёт перед es, importante не меняется — признак без рода.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Оценка значимости ситуации — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка значимости ситуации — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:importante', why: 'Verdad — существительное «правда», подтверждение факта, а не оценка значимости. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:importante', why: 'Así означает «так» — описание образа действия, а не значимости. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-dificil',
      english: 'No es difícil',
      russian: 'Это не трудно',
      explanation:
        'Ободряющий ответ на чужие сомнения перед задачей — противоположность No es fácil по смыслу, но с той же формулой отрицания. Форма es не различает род вовсе.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседника напрямую. Оценка сложности задачи — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка сложности задачи — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'difícil',
          category: 'quality-adjective',
          distractors: [
            { value: 'fácil', reasonCode: 'antonym_confusion:difícil', why: 'Fácil значит противоположное — «легко». Отрицание сложности — difícil.', trapType: 'semantic_neighbor' },
            { value: 'caro', reasonCode: 'wrong_word:difícil', why: 'Caro означает «дорого» — про цену, а не про сложность. Нужно difícil.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-unico',
      english: 'No es único',
      russian: 'Это не единственное такое',
      explanation:
        'Безличное отрицание неповторимости предмета — например, серийного изделия, которое ошибочно приняли за редкое. Тильда над ú остаётся на месте и в отрицании.',
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
            { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única — форма женского рода. О предмете мужского рода или по умолчанию нужна форма único.', trapType: 'grammar' },
            { value: 'unico', reasonCode: 'accent_missing:único', why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'written_accent', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-unica',
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
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'written_accent', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-bonito',
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
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-bonita',
      english: 'No es bonita',
      russian: 'Она не красивая',
      explanation:
        'Тот же ответ о внешнем виде, но про вещь женского рода — например, casa (дом), которую собеседник счёл красивой. Меняется только концовка признака.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседницу напрямую. Безличная оценка предмета — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Безличная оценка предмета — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonita',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito — форма мужского рода, с -o. Для предмета женского рода нужна форма на -a: bonita.', trapType: 'grammar' },
            { value: 'única', reasonCode: 'wrong_word:bonita', why: 'Única означает «единственная» — совсем другой признак, не про внешний вид. Нужно bonita.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-rapido',
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
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'pace_adjective', 'negation'],
    },
    {
      id: 'es-e01-s19-no-es-rapida',
      english: 'No es rápida',
      russian: 'Она не быстрая',
      explanation:
        'Та же оценка темпа, но про ситуацию или вещь женского рода — например, conexión (соединение). Признак меняет концовку на -a, связка es остаётся той же.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — про собеседницу напрямую. Безличная оценка предмета — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Безличная оценка предмета — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápido', reasonCode: 'gender_mismatch:rápida', why: 'Rápido — форма мужского рода, с -o. Для предмета женского рода нужна форма на -a: rápida.', trapType: 'grammar' },
            { value: 'verdadera', reasonCode: 'wrong_word:rápida', why: 'Verdadera означает «истинная» — совсем другой признак, не про скорость. Нужно rápida.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'pace_adjective', 'negation'],
    },
  ]);

export const ES_EPISODE_01_SESSION_19_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_19_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
