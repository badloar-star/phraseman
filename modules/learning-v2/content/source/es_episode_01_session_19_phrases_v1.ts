import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

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

// ── Перенесённые переводы сессии 19 ─────────────────────────────────────
// зачем (2026-08-30): файл details удалён владельцем при чистке сессий; сами
// переводы — неотъемлемая часть ЖИВОЙ сессии 19, перенесены внутрь байт в
// байт из git-истории (80a08bbae).
// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для
// 15 фраз сессии 19 на восьми объяснительных локалях (без 'es'). Три
// позиционных токена (no/es/признак) на фразу — по прецеденту сессии 11
// (es_episode_01_session_11_localized_details_v1.ts), но здесь ВСЕ фразы
// держат связку es (третье лицо, предметы/ситуации из сессии 17), а не
// смесь soy/eres/es.
//
// зачем top-level distractors содержит ВСЕ дистракторы фразы (урок сессии
// 10): errorExplanationByLocale в session_package_from_shard_v1.ts строит
// "value — reason" маркеры из phrase.localizedDetails[locale].distractors
// (не .words[].distractors) — неполный список даёт fallback в английский
// каталог lesson1_distractor_catalog_v2.ts и крашится на испанских словах.
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;
type Details = EpisodeSourcePhraseLocalizedDetails;
type Trap = Details['distractors'][number]['trapType'];
type Reasoned = { value: string; trapType: Trap; reason: Record<LocaleWithoutEs, string> };

function d(
  meaning: Record<LocaleWithoutEs, string>,
  explanation: Record<LocaleWithoutEs, string>,
  w1correct: string, w1prompt: Record<LocaleWithoutEs, string>, w1d1: Reasoned, w1d2: Reasoned,
  w2correct: string, w2prompt: Record<LocaleWithoutEs, string>, w2d1: Reasoned, w2d2: Reasoned,
  w3correct: string, w3prompt: Record<LocaleWithoutEs, string>, w3d1: Reasoned, w3d2: Reasoned,
): Readonly<Record<LocaleWithoutEs, Details>> {
  const locales: readonly LocaleWithoutEs[] = ['ru', 'uk', 'en', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
  const out = {} as Record<LocaleWithoutEs, Details>;
  for (const l of locales) {
    out[l] = {
      meaning: meaning[l],
      explanation: explanation[l],
      distractors: [
        { value: w1d1.value, reason: w1d1.reason[l], trapType: w1d1.trapType },
        { value: w1d2.value, reason: w1d2.reason[l], trapType: w1d2.trapType },
        { value: w2d1.value, reason: w2d1.reason[l], trapType: w2d1.trapType },
        { value: w2d2.value, reason: w2d2.reason[l], trapType: w2d2.trapType },
        { value: w3d1.value, reason: w3d1.reason[l], trapType: w3d1.trapType },
        { value: w3d2.value, reason: w3d2.reason[l], trapType: w3d2.trapType },
      ],
      words: [
        { correct: w1correct, prompt: w1prompt[l], distractors: [
          { value: w1d1.value, reason: w1d1.reason[l], trapType: w1d1.trapType },
          { value: w1d2.value, reason: w1d2.reason[l], trapType: w1d2.trapType },
        ]},
        { correct: w2correct, prompt: w2prompt[l], distractors: [
          { value: w2d1.value, reason: w2d1.reason[l], trapType: w2d1.trapType },
          { value: w2d2.value, reason: w2d2.reason[l], trapType: w2d2.trapType },
        ]},
        { correct: w3correct, prompt: w3prompt[l], distractors: [
          { value: w3d1.value, reason: w3d1.reason[l], trapType: w3d1.trapType },
          { value: w3d2.value, reason: w3d2.reason[l], trapType: w3d2.trapType },
        ]},
      ],
    };
  }
  return Object.freeze(out);
}

const T = {
  noQ: { ru: 'Какое слово нужно для отрицания?', uk: 'Яке слово потрібне для заперечення?', en: 'Which word is needed for negation?', 'pt-BR': 'Qual palavra é necessária para a negação?', vi: 'Từ nào cần để phủ định?', id: 'Kata mana yang diperlukan untuk negasi?', tr: 'Olumsuzlama için hangi kelime gerekir?', pl: 'Jakie słowo jest potrzebne do przeczenia?' },
  esQ: { ru: 'Какая связка нужна для безличной оценки предмета или ситуации?', uk: 'Яка зв’язка потрібна для безособової оцінки предмета чи ситуації?', en: 'Which linking word fits an impersonal evaluation of a thing or situation?', 'pt-BR': 'Qual ligação cabe numa avaliação impessoal de uma coisa ou situação?', vi: 'Từ nối nào phù hợp cho đánh giá phi nhân xưng về một vật hay tình huống?', id: 'Kata penghubung mana yang cocok untuk penilaian impersonal atas benda atau situasi?', tr: 'Bir şeyin ya da durumun kişisiz değerlendirmesi için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do bezosobowej oceny rzeczy lub sytuacji?' },
} as const;

const noNada: Reasoned = { value: 'Nada', trapType: 'semantic_neighbor', reason: { ru: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', uk: 'Nada — «нічого», окреме слово-предмет. Заперечення зв’язки — no.', en: 'Nada means "nothing", a separate word for a thing. Negating the linking word needs no.', 'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. Negar a ligação precisa de no.', vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phủ định từ nối cần no.', id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Menegasikan kata penghubung perlu no.', tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Bağlacı olumsuzlamak no gerektirir.', pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Zaprzeczenie łącznika wymaga no.' } };
const noNunca: Reasoned = { value: 'Nunca', trapType: 'semantic_neighbor', reason: { ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.', en: 'Nunca means "never", about frequency in time. Simple negation needs no.', 'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. A negação simples precisa de no.', vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản cần no.', id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana perlu no.', tr: 'Nunca "asla" demektir, zamandaki sıklıkla ilgilidir. Basit olumsuzlama no gerektirir.', pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste przeczenie wymaga no.' } };
const noNon: Reasoned = { value: 'Non', trapType: 'orthographic', reason: { ru: 'Non — не испанское слово. В испанском отрицание пишется no.', uk: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', en: 'Non is not a Spanish word. Spanish negation is spelled no.', 'pt-BR': 'Non não é uma palavra em espanhol. A negação em espanhol se escreve no.', vi: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', id: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja no.', tr: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzlama no şeklinde yazılır.', pl: 'Non to nie hiszpańskie słowo. Hiszpańskie przeczenie pisze się no.' } };

const esVsEres: Reasoned = { value: 'eres', trapType: 'grammar', reason: { ru: 'Eres — про собеседника напрямую. Безличная оценка предмета или ситуации — только es.', uk: 'Eres — про співрозмовника напряму. Безособова оцінка предмета чи ситуації — тільки es.', en: 'Eres addresses the listener directly. An impersonal evaluation of a thing or situation needs only es.', 'pt-BR': 'Eres fala com o interlocutor diretamente. Uma avaliação impessoal de uma coisa ou situação precisa só de es.', vi: 'Eres nói trực tiếp với người nghe. Đánh giá phi nhân xưng về một vật hay tình huống chỉ cần es.', id: 'Eres berbicara langsung dengan pendengar. Penilaian impersonal atas benda atau situasi hanya perlu es.', tr: 'Eres doğrudan dinleyiciyle konuşur. Bir şeyin ya da durumun kişisiz değerlendirmesi yalnızca es gerektirir.', pl: 'Eres zwraca się bezpośrednio do słuchacza. Bezosobowa ocena rzeczy lub sytuacji wymaga tylko es.' } };
const esVsSoy: Reasoned = { value: 'soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Безличная оценка предмета или ситуации — только es.', uk: 'Soy — про себе. Безособова оцінка предмета чи ситуації — тільки es.', en: 'Soy is about the speaker. An impersonal evaluation of a thing or situation needs only es.', 'pt-BR': 'Soy é sobre quem fala. A avaliação impessoal de uma coisa ou situação precisa só de es.', vi: 'Soy nói về người nói. Đánh giá phi nhân xưng về một vật hay tình huống chỉ cần es.', id: 'Soy tentang penutur. Penilaian impersonal atas benda atau situasi hanya perlu es.', tr: 'Soy konuşan hakkındadır. Bir şeyin ya da durumun kişisiz değerlendirmesi yalnızca es gerektirir.', pl: 'Soy dotyczy mówiącego. Bezosobowa ocena rzeczy lub sytuacji wymaga tylko es.' } };

function genderPair(masc: string, fem: string, correctIsMasc: boolean): Reasoned {
  const wrong = correctIsMasc ? fem : masc;
  const correct = correctIsMasc ? masc : fem;
  const wrongEnding = correctIsMasc ? '-a' : '-o';
  const correctEnding = correctIsMasc ? '-o' : '-a';
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма на ${wrongEnding}. Нужна форма ${correct} на ${correctEnding}.`,
    uk: `${wrong} — форма на ${wrongEnding}. Потрібна форма ${correct} на ${correctEnding}.`,
    en: `${wrong} ends in ${wrongEnding}. The needed form is ${correct}, ending in ${correctEnding}.`,
    'pt-BR': `${wrong} termina em ${wrongEnding}. A forma necessária é ${correct}, terminada em ${correctEnding}.`,
    vi: `${wrong} kết thúc bằng ${wrongEnding}. Dạng cần là ${correct}, kết thúc bằng ${correctEnding}.`,
    id: `${wrong} berakhiran ${wrongEnding}. Bentuk yang diperlukan adalah ${correct}, berakhiran ${correctEnding}.`,
    tr: `${wrong}, ${wrongEnding} ile biter. Gereken biçim ${correct}, ${correctEnding} ile biter.`,
    pl: `${wrong} kończy się na ${wrongEnding}. Potrzebna jest forma ${correct}, zakończona na ${correctEnding}.`,
  }};
}

function semanticNeighbor(correct: string, wrong: string, wrongMeaning: Record<LocaleWithoutEs, string>): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} — это ${wrongMeaning.ru}, другой признак. Здесь нужно ${correct}.`,
    uk: `${wrong} — це ${wrongMeaning.uk}, інша ознака. Тут потрібно ${correct}.`,
    en: `${wrong} means ${wrongMeaning.en}, a different quality. Here you need ${correct}.`,
    'pt-BR': `${wrong} significa ${wrongMeaning['pt-BR']}, uma qualidade diferente. Aqui é preciso ${correct}.`,
    vi: `${wrong} nghĩa là ${wrongMeaning.vi}, đặc điểm khác. Ở đây cần ${correct}.`,
    id: `${wrong} berarti ${wrongMeaning.id}, sifat berbeda. Di sini perlu ${correct}.`,
    tr: `${wrong}, ${wrongMeaning.tr} demektir, farklı bir niteliktir. Burada ${correct} gerekir.`,
    pl: `${wrong} znaczy ${wrongMeaning.pl}, inna cecha. Tu potrzebne jest ${correct}.`,
  }};
}

function accentTrap(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'orthographic', reason: {
    ru: `${wrong} без тильды над ú звучал бы иначе. Нужна форма ${correct} с тильдой.`,
    uk: `${wrong} без тильди над ú звучав би інакше. Потрібна форма ${correct} з тильдою.`,
    en: `${wrong} without the tilde over ú would sound different. The needed form is ${correct}, with the tilde.`,
    'pt-BR': `${wrong} sem o til sobre ú soaria diferente. A forma necessária é ${correct}, com o til.`,
    vi: `${wrong} không có dấu ngã trên ú sẽ nghe khác. Dạng cần là ${correct}, có dấu ngã.`,
    id: `${wrong} tanpa tilde di atas ú akan terdengar berbeda. Bentuk yang diperlukan adalah ${correct}, dengan tilde.`,
    tr: `${wrong}, ú üzerinde tilde olmadan farklı duyulurdu. Gereken biçim ${correct}, tilde ile.`,
    pl: `${wrong} bez tyldy nad ú brzmiałoby inaczej. Potrzebna jest forma ${correct}, z tyldą.`,
  }};
}

const wordAndGenderPrompt = (word: string) => ({
  ru: `Какой признак нужен для ${word}?`, uk: `Яка ознака потрібна для ${word}?`, en: `Which quality fits ${word}?`, 'pt-BR': `Qual qualidade cabe a ${word}?`, vi: `Đặc điểm nào phù hợp cho ${word}?`, id: `Sifat mana yang cocok untuk ${word}?`, tr: `${word} için hangi nitelik uyar?`, pl: `Jaka cecha pasuje do ${word}?`,
});

const ES_SESSION_19_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s19-no-es-facil': d(
    { ru: 'Это нелегко', uk: 'Це нелегко', en: "It isn't easy", 'pt-BR': 'Não é fácil', vi: 'Việc đó không dễ', id: 'Itu tidak mudah', tr: 'Bu kolay değil', pl: 'To nie jest łatwe' },
    { ru: 'Прямое возражение на чужую оценку задачи как простой. No встаёт перед es, признак не меняется — та же формула, что и во второй сессии.', uk: 'Пряме заперечення на чужу оцінку завдання як простого. No стоїть перед es, ознака не змінюється — та сама формула, що й у другій сесії.', en: 'A direct objection to someone else\'s evaluation of a task as simple. No goes before es, the quality stays the same — the same formula as in the second session.', 'pt-BR': 'Uma objeção direta à avaliação de outra pessoa de uma tarefa como simples. No fica antes de es, a qualidade não muda — a mesma fórmula da segunda sessão.', vi: 'Phản đối trực tiếp đánh giá của người khác về một việc là đơn giản. No đứng trước es, đặc điểm không đổi — cùng công thức với buổi thứ hai.', id: 'Keberatan langsung terhadap penilaian orang lain atas suatu tugas sebagai mudah. No berada sebelum es, sifatnya tidak berubah — rumus yang sama dengan sesi kedua.', tr: 'Bir görevin basit olduğuna dair başkasının değerlendirmesine doğrudan bir itiraz. No, es’ten önce gelir, nitelik değişmez — ikinci oturumdakiyle aynı formül.', pl: 'Bezpośredni sprzeciw wobec czyjejś oceny zadania jako prostego. No stoi przed es, cecha się nie zmienia — ta sama formuła co w drugiej sesji.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'fácil', wordAndGenderPrompt('fácil'), semanticNeighbor('fácil', 'difícil', { ru: '«трудный»', uk: '«важкий»', en: '"hard"', 'pt-BR': '"difícil"', vi: '"khó"', id: '"sulit"', tr: '"zor"', pl: '„trudny”' }), semanticNeighbor('fácil', 'caro', { ru: '«дорогой»', uk: '«дорогий»', en: '"expensive"', 'pt-BR': '"caro"', vi: '"đắt"', id: '"mahal"', tr: '"pahalı"', pl: '„drogi”' }),
  ),
  'es-e01-s19-no-es-caro': d(
    { ru: 'Это не дорого', uk: 'Це не дорого', en: "It isn't expensive", 'pt-BR': 'Não é caro', vi: 'Cái đó không đắt', id: 'Itu tidak mahal', tr: 'Bu pahalı değil', pl: 'To nie jest drogie' },
    { ru: 'Возражение на оценку цены товара как высокой — например, в магазине. Признак согласуется с родом предмета по умолчанию — форма на -o.', uk: 'Заперечення на оцінку ціни товару як високої — наприклад, у магазині. Ознака узгоджується з родом предмета за замовчуванням — форма на -o.', en: 'An objection to a product\'s price being called high — in a shop, for example. The quality agrees with the default gender of the thing — the -o form.', 'pt-BR': 'Uma objeção ao preço de um produto ser chamado de alto — numa loja, por exemplo. A qualidade concorda com o gênero padrão da coisa — a forma em -o.', vi: 'Phản đối việc giá của một món hàng bị gọi là cao — trong cửa hàng chẳng hạn. Đặc điểm hòa hợp theo giống mặc định của vật — dạng -o.', id: 'Keberatan terhadap harga suatu barang yang disebut tinggi — di toko, misalnya. Sifatnya sesuai dengan gender default benda — bentuk -o.', tr: 'Bir ürünün fiyatının yüksek olarak nitelendirilmesine bir itiraz — bir mağazada mesela. Nitelik, şeyin varsayılan cinsiyetiyle uyumludur — -o biçimi.', pl: 'Sprzeciw wobec nazwania ceny produktu wysoką — na przykład w sklepie. Cecha zgadza się z domyślnym rodzajem rzeczy — forma na -o.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'caro', wordAndGenderPrompt('caro'), genderPair('caro', 'cara', true), semanticNeighbor('caro', 'difícil', { ru: '«трудный»', uk: '«важкий»', en: '"hard"', 'pt-BR': '"difícil"', vi: '"khó"', id: '"sulit"', tr: '"zor"', pl: '„trudny”' }),
  ),
  'es-e01-s19-no-es-cara': d(
    { ru: 'Она не дорогая', uk: 'Вона не дорога', en: "It isn't expensive (feminine)", 'pt-BR': 'Não é cara', vi: 'Cái đó không đắt (giống cái)', id: 'Itu tidak mahal (feminin)', tr: 'Bu pahalı değil (dişil)', pl: 'Ona nie jest droga' },
    { ru: 'Тот же ответ о цене, но про вещь женского рода — например, camiseta (футболка). Меняется только концовка признака.', uk: 'Та сама відповідь про ціну, але про річ жіночого роду — наприклад, camiseta (футболка). Змінюється лише закінчення ознаки.', en: 'The same reply about price, but about a feminine-gender thing — a camiseta (t-shirt), for example. Only the ending of the quality changes.', 'pt-BR': 'A mesma resposta sobre preço, mas sobre uma coisa de gênero feminino — uma camiseta, por exemplo. Só a terminação da qualidade muda.', vi: 'Cùng câu trả lời về giá, nhưng về một vật giống cái — chiếc áo phông chẳng hạn. Chỉ đuôi đặc điểm đổi.', id: 'Jawaban yang sama tentang harga, tetapi tentang benda bergender feminin — kaos, misalnya. Hanya akhiran sifat yang berubah.', tr: 'Fiyat hakkında aynı cevap, ama dişil cinsiyette bir şey hakkında — bir tişört mesela. Sadece niteliğin sonu değişir.', pl: 'Ta sama odpowiedź o cenie, ale o rzeczy rodzaju żeńskiego — na przykład koszulce. Zmienia się tylko końcówka cechy.' },
    'No', T.noQ, noNunca, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'cara', wordAndGenderPrompt('cara'), genderPair('caro', 'cara', false), semanticNeighbor('cara', 'única', { ru: '«единственная»', uk: '«єдина»', en: '"unique"', 'pt-BR': '"única"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyna”' }),
  ),
  'es-e01-s19-no-es-verdad': d(
    { ru: 'Это неправда', uk: 'Це неправда', en: "It isn't true", 'pt-BR': 'Não é verdade', vi: 'Điều đó không đúng', id: 'Itu tidak benar', tr: 'Bu doğru değil', pl: 'To nieprawda' },
    { ru: 'Прямое опровержение слуха или чужого утверждения о ситуации. No встаёт перед es, verdad не меняется — устойчивая реакция.', uk: 'Пряме спростування чутки чи чужого твердження про ситуацію. No стоїть перед es, verdad не змінюється — стала реакція.', en: 'A direct refutation of a rumor or someone else\'s claim about a situation. No goes before es, verdad stays the same — a fixed reaction.', 'pt-BR': 'Uma refutação direta de um boato ou afirmação de outra pessoa sobre uma situação. No fica antes de es, verdad não muda — uma reação fixa.', vi: 'Phản bác trực tiếp một tin đồn hay lời khẳng định của người khác về một tình huống. No đứng trước es, verdad không đổi — phản ứng cố định.', id: 'Sanggahan langsung terhadap rumor atau klaim orang lain tentang suatu situasi. No berada sebelum es, verdad tidak berubah — reaksi tetap.', tr: 'Bir söylentinin ya da başkasının bir durum hakkındaki iddiasının doğrudan çürütülmesi. No, es’ten önce gelir, verdad değişmez — sabit bir tepki.', pl: 'Bezpośrednie obalenie plotki lub czyjegoś twierdzenia o sytuacji. No stoi przed es, verdad się nie zmienia — utrwalona reakcja.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'verdad', { ru: 'Какое слово нужно для опровержения слуха?', uk: 'Яке слово потрібне для спростування чутки?', en: 'Which word refutes a rumor?', 'pt-BR': 'Qual palavra refuta um boato?', vi: 'Từ nào phản bác một tin đồn?', id: 'Kata mana yang menyanggah rumor?', tr: 'Bir söylentiyi çürüten kelime hangisidir?', pl: 'Które słowo obala plotkę?' },
    { value: 'verdadero', trapType: 'grammar', reason: { ru: 'Verdadero — признак предмета, «истинный». Устойчивая реакция — именно verdad, существительное.', uk: 'Verdadero — ознака предмета, «істинний». Стала реакція — саме verdad, іменник.', en: 'Verdadero is a quality of a thing, "true". The fixed reaction needs exactly verdad, a noun.', 'pt-BR': 'Verdadero é uma qualidade de uma coisa, "verdadeiro". A reação fixa precisa exatamente de verdad, um substantivo.', vi: 'Verdadero là đặc điểm của một vật, "chân thực". Phản ứng cố định cần chính xác verdad, danh từ.', id: 'Verdadero adalah sifat suatu benda, "sejati". Reaksi tetap memerlukan tepat verdad, kata benda.', tr: 'Verdadero bir şeyin niteliğidir, "gerçek". Sabit tepki tam olarak verdad’ı, bir ismi gerektirir.', pl: 'Verdadero to cecha rzeczy, „prawdziwy”. Utrwalona reakcja wymaga dokładnie verdad, rzeczownika.' } },
    { value: 'mentira', trapType: 'semantic_neighbor', reason: { ru: 'Mentira значит «ложь» само по себе — сказали бы Es mentira. Здесь отрицание готовой фразы Es verdad, нужно verdad.', uk: 'Mentira означає «брехня» саме по собі — сказали б Es mentira. Тут заперечення готової фрази Es verdad, потрібно verdad.', en: 'Mentira means "lie" on its own — you would say Es mentira. Here it is a negation of the ready phrase Es verdad, so verdad is needed.', 'pt-BR': 'Mentira significa "mentira" por si só — diriam Es mentira. Aqui é a negação da frase pronta Es verdad, precisa de verdad.', vi: 'Mentira nghĩa là "lời nói dối" tự nó — sẽ nói Es mentira. Ở đây là phủ định câu có sẵn Es verdad, cần verdad.', id: 'Mentira berarti "kebohongan" dengan sendirinya — akan dikatakan Es mentira. Di sini adalah negasi frasa jadi Es verdad, perlu verdad.', tr: 'Mentira kendi başına "yalan" demektir — Es mentira denirdi. Burada hazır ifade Es verdad’ın olumsuzlanmasıdır, verdad gerekir.', pl: 'Mentira samo w sobie znaczy „kłamstwo” — powiedziano by Es mentira. Tu jest to zaprzeczenie gotowej frazy Es verdad, potrzebne jest verdad.' } },
  ),
  'es-e01-s19-no-es-verdadero': d(
    { ru: 'Это не истинно', uk: 'Це не істинно', en: "It isn't true (emphatic)", 'pt-BR': 'Não é verdadeiro', vi: 'Điều đó không phải là sự thật', id: 'Itu tidak sejati', tr: 'Bu gerçek değil', pl: 'To nie jest prawdziwe' },
    { ru: 'Более сильное опровержение факта, чем No es verdad, — например, разоблачение подделки. Es не спутать с eres: verdadero описывает вещь, а не характер собеседника.', uk: 'Сильніше спростування факту, ніж No es verdad, — наприклад, викриття підробки. Es не сплутати з eres: verdadero описує річ, а не характер співрозмовника.', en: 'A stronger refutation of a fact than No es verdad — exposing a fake, for example. Es is not to be confused with eres: verdadero describes a thing, not the listener\'s character.', 'pt-BR': 'Uma refutação mais forte de um fato do que No es verdad — expondo uma falsificação, por exemplo. Es não deve ser confundido com eres: verdadero descreve uma coisa, não o caráter do interlocutor.', vi: 'Sự phản bác mạnh mẽ hơn một sự thật so với No es verdad — vạch trần một thứ giả chẳng hạn. Es không nên nhầm với eres: verdadero mô tả một vật, không phải tính cách người nghe.', id: 'Sanggahan fakta yang lebih kuat daripada No es verdad — mengungkap barang palsu, misalnya. Es tidak boleh disamakan dengan eres: verdadero menggambarkan benda, bukan karakter pendengar.', tr: 'No es verdad’dan daha güçlü bir gerçek çürütmesi — bir sahteliği ortaya çıkarmak mesela. Es, eres ile karıştırılmamalıdır: verdadero bir şeyi tanımlar, dinleyicinin karakterini değil.', pl: 'Silniejsze obalenie faktu niż No es verdad — na przykład demaskowanie podróbki. Es nie należy mylić z eres: verdadero opisuje rzecz, nie charakter słuchacza.' },
    'No', T.noQ, noNunca, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'verdadero', wordAndGenderPrompt('verdadero'), genderPair('verdadero', 'verdadera', true), semanticNeighbor('verdadero', 'único', { ru: '«единственный»', uk: '«єдиний»', en: '"unique"', 'pt-BR': '"único"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyny”' }),
  ),
  'es-e01-s19-no-es-asi': d(
    { ru: 'Это не так', uk: 'Це не так', en: "It isn't like that", 'pt-BR': 'Não é assim', vi: 'Việc đó không phải như vậy', id: 'Itu tidak begitu', tr: 'Bu böyle değil', pl: 'Tak nie jest' },
    { ru: 'Прямое возражение на описание того, как обстоят дела, — заголовок этой темы. No встаёт перед es, así не меняется в отрицании.', uk: 'Пряме заперечення на опис того, як обстоять справи, — заголовок цієї теми. No стоїть перед es, así не змінюється в запереченні.', en: 'A direct objection to a description of how things stand — the title of this topic. No goes before es, así does not change in the negation.', 'pt-BR': 'Uma objeção direta a uma descrição de como as coisas estão — o título deste tema. No fica antes de es, así não muda na negação.', vi: 'Phản đối trực tiếp một mô tả về tình hình hiện tại — tiêu đề của chủ đề này. No đứng trước es, así không đổi trong phủ định.', id: 'Keberatan langsung terhadap deskripsi bagaimana keadaannya — judul topik ini. No berada sebelum es, así tidak berubah dalam negasi.', tr: 'İşlerin nasıl olduğuna dair bir açıklamaya doğrudan bir itiraz — bu konunun başlığı. No, es’ten önce gelir, así olumsuzlamada değişmez.', pl: 'Bezpośredni sprzeciw wobec opisu tego, jak sprawy się mają — tytuł tego tematu. No stoi przed es, así nie zmienia się w przeczeniu.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'así', { ru: 'Какое слово описывает образ действия «именно так»?', uk: 'Яке слово описує спосіб дії «саме так»?', en: 'Which word describes the manner "exactly like this"?', 'pt-BR': 'Qual palavra descreve o modo "exatamente assim"?', vi: 'Từ nào mô tả cách thức "chính xác như vậy"?', id: 'Kata mana yang menggambarkan cara "persis begini"?', tr: 'Tarzı "tam olarak böyle" olarak tanımlayan kelime hangisidir?', pl: 'Które słowo opisuje sposób „właśnie tak”?' },
    semanticNeighbor('así', 'verdad', { ru: '«правда» (существительное)', uk: '«правда» (іменник)', en: '"truth" (a noun)', 'pt-BR': '"verdade" (substantivo)', vi: '"sự thật" (danh từ)', id: '"kebenaran" (kata benda)', tr: '"gerçek" (isim)', pl: '„prawda” (rzeczownik)' }),
    semanticNeighbor('así', 'igual', { ru: '«всё равно»', uk: '«все одно»', en: '"the same"', 'pt-BR': '"igual"', vi: '"như nhau"', id: '"sama saja"', tr: '"aynı"', pl: '„wszystko jedno”' }),
  ),
  'es-e01-s19-no-es-igual': d(
    { ru: 'Это не всё равно', uk: 'Це не все одно', en: "It isn't the same", 'pt-BR': 'Não é igual', vi: 'Việc đó không như nhau', id: 'Itu tidak sama saja', tr: 'Bu aynı değil', pl: 'To nie jest to samo' },
    { ru: 'Возражение на чужое безразличие — говорящий настаивает, что разница есть. No перед es, igual не меняется.', uk: 'Заперечення на чужу байдужість — мовець наполягає, що різниця є. No перед es, igual не змінюється.', en: 'An objection to someone else\'s indifference — the speaker insists there is a difference. No goes before es, igual stays the same.', 'pt-BR': 'Uma objeção à indiferença de outra pessoa — quem fala insiste que há diferença. No fica antes de es, igual não muda.', vi: 'Phản đối sự thờ ơ của người khác — người nói khẳng định có sự khác biệt. No đứng trước es, igual không đổi.', id: 'Keberatan terhadap ketidakpedulian orang lain — penutur bersikeras ada perbedaan. No berada sebelum es, igual tidak berubah.', tr: 'Başkasının kayıtsızlığına bir itiraz — konuşan bir fark olduğunda ısrar eder. No, es’ten önce gelir, igual değişmez.', pl: 'Sprzeciw wobec czyjejś obojętności — mówiący upiera się, że różnica istnieje. No stoi przed es, igual się nie zmienia.' },
    'No', T.noQ, noNunca, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'igual', wordAndGenderPrompt('igual'), semanticNeighbor('igual', 'así', { ru: '«так» (образ действия)', uk: '«так» (спосіб дії)', en: '"like this" (manner)', 'pt-BR': '"assim" (modo)', vi: '"như vậy" (cách thức)', id: '"begitu" (cara)', tr: '"böyle" (tarz)', pl: '„tak” (sposób)' }), semanticNeighbor('igual', 'importante', { ru: '«важно»', uk: '«важливо»', en: '"important"', 'pt-BR': '"importante"', vi: '"quan trọng"', id: '"penting"', tr: '"önemli"', pl: '„ważne”' }),
  ),
  'es-e01-s19-no-es-importante': d(
    { ru: 'Это не важно', uk: 'Це не важливо', en: "It isn't important", 'pt-BR': 'Não é importante', vi: 'Việc đó không quan trọng', id: 'Itu tidak penting', tr: 'Bu önemli değil', pl: 'To nie jest ważne' },
    { ru: 'Так снижают значимость темы или дела, вопреки чужому мнению. No встаёт перед es, importante не меняется.', uk: 'Так знижують значущість теми чи справи, всупереч чужій думці. No стоїть перед es, importante не змінюється.', en: 'This lowers the significance of a topic or matter, against someone else\'s opinion. No goes before es, importante stays the same.', 'pt-BR': 'Assim se reduz a importância de um tema ou assunto, contra a opinião de outra pessoa. No fica antes de es, importante não muda.', vi: 'Cách này hạ thấp tầm quan trọng của một chủ đề hay vấn đề, trái với ý kiến người khác. No đứng trước es, importante không đổi.', id: 'Ini menurunkan pentingnya suatu topik atau hal, berlawanan dengan pendapat orang lain. No berada sebelum es, importante tidak berubah.', tr: 'Bu, başkasının görüşüne rağmen bir konunun ya da meselenin önemini azaltır. No, es’ten önce gelir, importante değişmez.', pl: 'Tak zmniejsza się znaczenie tematu lub sprawy, wbrew czyjejś opinii. No stoi przed es, importante się nie zmienia.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'importante', wordAndGenderPrompt('importante'), semanticNeighbor('importante', 'verdad', { ru: '«правда» (существительное)', uk: '«правда» (іменник)', en: '"truth" (a noun)', 'pt-BR': '"verdade" (substantivo)', vi: '"sự thật" (danh từ)', id: '"kebenaran" (kata benda)', tr: '"gerçek" (isim)', pl: '„prawda” (rzeczownik)' }), semanticNeighbor('importante', 'así', { ru: '«так» (образ действия)', uk: '«так» (спосіб дії)', en: '"like this" (manner)', 'pt-BR': '"assim" (modo)', vi: '"như vậy" (cách thức)', id: '"begitu" (cara)', tr: '"böyle" (tarz)', pl: '„tak” (sposób)' }),
  ),
  'es-e01-s19-no-es-dificil': d(
    { ru: 'Это не трудно', uk: 'Це не важко', en: "It isn't hard", 'pt-BR': 'Não é difícil', vi: 'Việc đó không khó', id: 'Itu tidak sulit', tr: 'Bu zor değil', pl: 'To nie jest trudne' },
    { ru: 'Ободряющий ответ на чужие сомнения перед задачей. Форма es не различает род вовсе, поэтому она одна и та же в любой оценке.', uk: 'Підбадьорлива відповідь на чужі сумніви перед завданням. Форма es не розрізняє рід зовсім, тому вона та сама в будь-якій оцінці.', en: 'An encouraging reply to someone else\'s doubts before a task. The form es does not mark gender at all, so it stays the same in any evaluation.', 'pt-BR': 'Uma resposta encorajadora às dúvidas de outra pessoa antes de uma tarefa. A forma es não marca gênero de forma alguma, então é a mesma em qualquer avaliação.', vi: 'Câu trả lời khích lệ trước những nghi ngờ của người khác về một nhiệm vụ. Dạng es không đánh dấu giống chút nào, nên nó giống nhau trong mọi đánh giá.', id: 'Jawaban yang menyemangati atas keraguan orang lain sebelum suatu tugas. Bentuk es sama sekali tidak menandai gender, jadi tetap sama dalam penilaian apa pun.', tr: 'Bir görevden önce başkasının şüphelerine cesaretlendirici bir cevap. Es biçimi cinsiyeti hiç işaretlemez, bu yüzden her değerlendirmede aynı kalır.', pl: 'Zachęcająca odpowiedź na czyjeś wątpliwości przed zadaniem. Forma es w ogóle nie oznacza rodzaju, więc jest taka sama w każdej ocenie.' },
    'No', T.noQ, noNunca, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'difícil', wordAndGenderPrompt('difícil'), semanticNeighbor('difícil', 'fácil', { ru: '«лёгкий»', uk: '«легкий»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwy”' }), semanticNeighbor('difícil', 'caro', { ru: '«дорого»', uk: '«дорого»', en: '"expensive"', 'pt-BR': '"caro"', vi: '"đắt"', id: '"mahal"', tr: '"pahalı"', pl: '„drogie”' }),
  ),
  'es-e01-s19-no-es-unico': d(
    { ru: 'Это не единственное такое', uk: 'Це не єдине таке', en: "It isn't one of a kind", 'pt-BR': 'Não é único', vi: 'Cái đó không duy nhất', id: 'Itu bukan satu-satunya', tr: 'Bu eşsiz değil', pl: 'To nie jest jedyne w swoim rodzaju' },
    { ru: 'Безличное отрицание неповторимости предмета — например, серийного изделия. Тильда над ú остаётся на месте и в отрицании.', uk: 'Безособове заперечення неповторності предмета — наприклад, серійного виробу. Тильда над ú лишається на місці і в запереченні.', en: "An impersonal denial of a thing's uniqueness — a mass-produced item, for example. The tilde over ú stays in place in the negation too.", 'pt-BR': 'Uma negação impessoal da singularidade de uma coisa — um item produzido em série, por exemplo. O til sobre ú permanece no lugar também na negação.', vi: 'Phủ định phi nhân xưng về sự độc đáo của một vật — món hàng sản xuất hàng loạt chẳng hạn. Dấu ngã trên ú vẫn giữ nguyên cả trong phủ định.', id: 'Penyangkalan impersonal tentang keunikan suatu benda — barang produksi massal, misalnya. Tilde di atas ú tetap di tempatnya juga dalam negasi.', tr: 'Bir şeyin eşsizliğinin kişisiz reddi — seri üretim bir eşya mesela. Ú üzerindeki tilde olumsuzlamada da yerinde kalır.', pl: 'Bezosobowe zaprzeczenie wyjątkowości rzeczy — na przykład produktu seryjnego. Tylda nad ú zostaje na miejscu także w przeczeniu.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'único', wordAndGenderPrompt('único'), genderPair('único', 'única', true), accentTrap('único', 'unico'),
  ),
  'es-e01-s19-no-es-unica': d(
    { ru: 'Это не единственная такая', uk: 'Це не єдина така', en: "It isn't one of a kind (feminine)", 'pt-BR': 'Não é única', vi: 'Cái đó không phải là duy nhất (giống cái)', id: 'Itu bukan satu-satunya (feminin)', tr: 'Bu eşsiz değil (dişil)', pl: 'To nie jest jedyna w swoim rodzaju' },
    { ru: 'Тот же ответ о неповторимости, но про предмет женского рода — например, серию открыток. Тильда над ú остаётся на месте в обеих формах.', uk: 'Та сама відповідь про неповторність, але про предмет жіночого роду — наприклад, серію листівок. Тильда над ú лишається на місці в обох формах.', en: 'The same reply about uniqueness, but about a feminine-gender thing — a series of postcards, for example. The tilde over ú stays in both forms.', 'pt-BR': 'A mesma resposta sobre singularidade, mas sobre uma coisa de gênero feminino — uma série de cartões-postais, por exemplo. O til sobre ú permanece nas duas formas.', vi: 'Cùng câu trả lời về sự độc đáo, nhưng về một vật giống cái — một bộ bưu thiếp chẳng hạn. Dấu ngã trên ú vẫn giữ ở cả hai dạng.', id: 'Jawaban yang sama tentang keunikan, tetapi tentang benda bergender feminin — serangkaian kartu pos, misalnya. Tilde di atas ú tetap di kedua bentuk.', tr: 'Eşsizlik hakkında aynı cevap, ama dişil cinsiyetteki bir şey hakkında — bir kartpostal serisi mesela. Ú üzerindeki tilde her iki biçimde de kalır.', pl: 'Ta sama odpowiedź o wyjątkowości, ale o rzeczy rodzaju żeńskiego — na przykład serii pocztówek. Tylda nad ú zostaje w obu formach.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'única', wordAndGenderPrompt('única'), genderPair('único', 'única', false), accentTrap('única', 'unica'),
  ),
  'es-e01-s19-no-es-bonito': d(
    { ru: 'Это некрасиво', uk: 'Це некрасиво', en: "It isn't pretty", 'pt-BR': 'Não é bonito', vi: 'Cái đó không đẹp', id: 'Itu tidak bagus', tr: 'Bu güzel değil', pl: 'To nie jest ładne' },
    { ru: 'Безличное отрицание внешнего вида предмета или ситуации — например, неаккуратного результата работы. Es здесь не про собеседника.', uk: 'Безособове заперечення зовнішнього вигляду предмета чи ситуації — наприклад, неохайного результату роботи. Es тут не про співрозмовника.', en: "An impersonal denial of a thing's appearance — sloppy work, for example. Es here is not about the listener.", 'pt-BR': 'Uma negação impessoal da aparência de uma coisa — um trabalho malfeito, por exemplo. Es aqui não é sobre o interlocutor.', vi: 'Phủ định phi nhân xưng về vẻ ngoài của một vật — công việc cẩu thả chẳng hạn. Es ở đây không nói về người nghe.', id: 'Penyangkalan impersonal tentang penampilan suatu benda — pekerjaan yang berantakan, misalnya. Es di sini bukan tentang pendengar.', tr: 'Bir şeyin görünümünün kişisiz reddi — özensiz bir iş mesela. Buradaki Es dinleyici hakkında değildir.', pl: 'Bezosobowe zaprzeczenie wyglądu rzeczy — na przykład niechlujnej pracy. Es tutaj nie dotyczy słuchacza.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'bonito', wordAndGenderPrompt('bonito'), genderPair('bonito', 'bonita', true), semanticNeighbor('bonito', 'fácil', { ru: '«лёгкий»', uk: '«легкий»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwy”' }),
  ),
  'es-e01-s19-no-es-bonita': d(
    { ru: 'Она не красивая', uk: 'Вона не красива', en: "It isn't pretty (feminine)", 'pt-BR': 'Não é bonita', vi: 'Cái đó không đẹp (giống cái)', id: 'Itu tidak bagus (feminin)', tr: 'Bu güzel değil (dişil)', pl: 'Ona nie jest ładna' },
    { ru: 'Тот же ответ о внешнем виде, но про вещь женского рода — например, casa (дом). Меняется только концовка признака.', uk: 'Та сама відповідь про зовнішній вигляд, але про річ жіночого роду — наприклад, casa (дім). Змінюється лише закінчення ознаки.', en: 'The same reply about appearance, but about a feminine-gender thing — a casa (house), for example. Only the ending of the quality changes.', 'pt-BR': 'A mesma resposta sobre aparência, mas sobre uma coisa de gênero feminino — uma casa, por exemplo. Só a terminação da qualidade muda.', vi: 'Cùng câu trả lời về vẻ ngoài, nhưng về một vật giống cái — ngôi nhà chẳng hạn. Chỉ đuôi đặc điểm đổi.', id: 'Jawaban yang sama tentang penampilan, tetapi tentang benda bergender feminin — rumah, misalnya. Hanya akhiran sifat yang berubah.', tr: 'Görünüm hakkında aynı cevap, ama dişil cinsiyette bir şey hakkında — bir ev mesela. Sadece niteliğin sonu değişir.', pl: 'Ta sama odpowiedź o wyglądzie, ale o rzeczy rodzaju żeńskiego — na przykład domu. Zmienia się tylko końcówka cechy.' },
    'No', T.noQ, noNada, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'bonita', wordAndGenderPrompt('bonita'), genderPair('bonito', 'bonita', false), semanticNeighbor('bonita', 'única', { ru: '«единственная»', uk: '«єдина»', en: '"unique"', 'pt-BR': '"única"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyna”' }),
  ),
  'es-e01-s19-no-es-rapido': d(
    { ru: 'Это не быстро', uk: 'Це не швидко', en: "It isn't fast", 'pt-BR': 'Não é rápido', vi: 'Cái đó không nhanh', id: 'Itu tidak cepat', tr: 'Bu hızlı değil', pl: 'To nie jest szybkie' },
    { ru: 'Безличное отрицание темпа процесса или транспорта — например, медленного интернета. Es про сам предмет, не про собеседника.', uk: 'Безособове заперечення темпу процесу чи транспорту — наприклад, повільного інтернету. Es про сам предмет, не про співрозмовника.', en: "An impersonal denial of a process's or vehicle's pace — slow internet, for example. Es is about the thing itself, not the listener.", 'pt-BR': 'Uma negação impessoal do ritmo de um processo ou transporte — internet lenta, por exemplo. Es é sobre a própria coisa, não sobre o interlocutor.', vi: 'Phủ định phi nhân xưng về tốc độ của một quá trình hay phương tiện — internet chậm chẳng hạn. Es nói về chính vật đó, không phải người nghe.', id: 'Penyangkalan impersonal tentang kecepatan suatu proses atau kendaraan — internet lambat, misalnya. Es tentang benda itu sendiri, bukan pendengar.', tr: 'Bir sürecin ya da aracın temposunun kişisiz reddi — yavaş internet mesela. Es dinleyici hakkında değil, şeyin kendisi hakkındadır.', pl: 'Bezosobowe zaprzeczenie tempa procesu lub pojazdu — na przykład wolnego internetu. Es dotyczy samej rzeczy, nie słuchacza.' },
    'No', T.noQ, noNunca, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'rápido', wordAndGenderPrompt('rápido'), genderPair('rápido', 'rápida', true), semanticNeighbor('rápido', 'único', { ru: '«единственный»', uk: '«єдиний»', en: '"unique"', 'pt-BR': '"único"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyny”' }),
  ),
  'es-e01-s19-no-es-rapida': d(
    { ru: 'Она не быстрая', uk: 'Вона не швидка', en: "It isn't fast (feminine)", 'pt-BR': 'Não é rápida', vi: 'Cái đó không nhanh (giống cái)', id: 'Itu tidak cepat (feminin)', tr: 'Bu hızlı değil (dişil)', pl: 'Ona nie jest szybka' },
    { ru: 'Та же оценка темпа, но про ситуацию или вещь женского рода — например, conexión (соединение). Признак меняет концовку на -a.', uk: 'Та сама оцінка темпу, але про ситуацію чи річ жіночого роду — наприклад, conexión (з’єднання). Ознака змінює закінчення на -a.', en: 'The same evaluation of pace, but about a feminine-gender situation or thing — a conexión (connection), for example. The quality changes its ending to -a.', 'pt-BR': 'A mesma avaliação de ritmo, mas sobre uma situação ou coisa de gênero feminino — uma conexión, por exemplo. A qualidade muda a terminação para -a.', vi: 'Cùng đánh giá về tốc độ, nhưng về một tình huống hay vật giống cái — kết nối chẳng hạn. Đặc điểm đổi đuôi thành -a.', id: 'Penilaian kecepatan yang sama, tetapi tentang situasi atau benda bergender feminin — koneksi, misalnya. Sifatnya mengubah akhiran menjadi -a.', tr: 'Tempo hakkında aynı değerlendirme, ama dişil cinsiyette bir durum ya da şey hakkında — bir bağlantı mesela. Nitelik sonunu -a olarak değiştirir.', pl: 'Ta sama ocena tempa, ale o sytuacji lub rzeczy rodzaju żeńskiego — na przykład połączeniu. Cecha zmienia końcówkę na -a.' },
    'No', T.noQ, noNunca, noNon,
    'es', T.esQ, esVsEres, esVsSoy,
    'rápida', wordAndGenderPrompt('rápida'), genderPair('rápido', 'rápida', false), semanticNeighbor('rápida', 'verdadera', { ru: '«истинная»', uk: '«істинна»', en: '"true"', 'pt-BR': '"verdadeira"', vi: '"đúng"', id: '"benar"', tr: '"doğru"', pl: '„prawdziwa”' }),
  ),
});
