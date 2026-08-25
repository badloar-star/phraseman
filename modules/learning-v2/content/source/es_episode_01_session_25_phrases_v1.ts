import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_25_LOCALIZED_DETAILS } from './es_episode_01_session_25_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 25 "Мы" / first_person_plural, builtOn: [1, 17], recalls: [1],
// открывает Главу 4 "Мы и они"): 15 фраз вводят somos — связку первого лица
// МНОЖЕСТВЕННОГО числа, тот же участник разговора («я»), что и soy (сессия 1),
// но теперь группой. Это сдвиг по ЧИСЛУ, а не по лицу (в отличие от eres из
// сессии 9 и es из сессии 17, которые сдвигали лицо).
//
// зачем только así и de acuerdo как признаки при somos (не fácil/difícil/
// verdad/igual/importante/verdadero, как в сессиях 1/17): проверено вручную
// по словарю — большинство "неизменяемых" прилагательных сессии 1 на самом
// деле требуют окончание -s во множественном числе (somos fáciles,
// difíciles, importantes, iguales) — это и есть тема ЗАКОНОМЕРНО следующей
// сессии 26 "Много: и признак меняется" (plural_agreement), сюда её пускать
// нельзя. Verdad и igual как безличные реакции ("Es verdad", "Es igual")
// вообще не переходят в первое лицо множественного числа — это не вопрос
// согласования, а разная грамматическая природа (безличный оборот против
// связки с одушевлённым подлежащим). Из всей лексики сессии 1 только así
// (наречие, не меняется НИКОГДА — ни по роду, ни по числу) остаётся
// естественной, грамматически верной испанской фразой с somos: "Somos así"
// — обычное "мы такие". De acuerdo — тоже неизменяемая формула, уже
// использованная с Somos в сессии 14 ("Somos de acuerdo"/"No somos de
// acuerdo"), где first_person_plural был вторичной чертой; здесь она в
// фокусе.
//
// зачем фразы построены как двойные реплики (recall-фраза + somos-реакция):
// чтобы удержать 15 РАЗНЫХ фраз без новой лексики и без захода в plural_agreement,
// каждая фраза берёт уже известную реплику от первого/второго/третьего лица
// (soy/eres/es — recall сессии 1 и сессии 17) и отвечает на неё формой somos.
// Это даёт постоянный контраст soy/eres/es/son против somos на каждой
// карточке — ровно то, чему учит сессия: сдвиг ЧИСЛА при сохранении ПЕРВОГО
// ЛИЦА. Son (третье лицо множественного числа, сессия 27) используется
// ТОЛЬКО как грамматический дистрактор на позиции связки, никогда как
// правильный ответ — предвосхищения темы сессии 27 не происходит.
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
// та же экономия, что и в сессиях 10/14/17.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s25-somos-asi',
      english: 'Somos así',
      russian: 'Мы такие',
      explanation:
        'Так говорят о себе вместе с кем-то ещё — о характере или привычке целой группы. Así не меняется никогда, а связка sомos показывает, что речь о нескольких людях, включая говорящего.',
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
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «именно такие». Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural'],
    },
    {
      id: 'es-e01-s25-no-somos-asi',
      english: 'No somos así',
      russian: 'Мы не такие',
      explanation:
        'Отрицание группового описания — возражение на чужое обобщение о нас. No встаёт перед связкой, así остаётся без изменений, как и в отрицаниях от одного лица.',
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
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «именно такие». Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'negation'],
    },
    {
      id: 'es-e01-s25-somos-asi-verdad-q',
      english: '¿Somos así, verdad?',
      russian: 'Мы такие, правда?',
      explanation:
        'Утверждение о группе с хвостовым вопросом-подтверждением. Recall слова verdad из первой сессии в новой роли — не как отдельная реакция, а как короткий вопрос «правда?» в конце фразы.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Утверждение о себе вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одном. Утверждение о группе, включая говорящего, — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «именно такие». Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'importante', reasonCode: 'wrong_word:así', why: 'Importante означает «важно» — совсем другой признак, не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'verdad',
          category: 'quality-noun',
          distractors: [
            { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с чужим мнением, а не короткий вопрос-подтверждение в конце фразы. Нужно verdad.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение сказанного. Нужно verdad.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'question_marks', 'truth_adjective'],
    },
    {
      id: 'es-e01-s25-eres-asi-somos-asi',
      english: 'Eres así, somos así',
      russian: 'Ты такой, мы такие',
      explanation:
        'Диалог из двух реплик: признание собеседника и присоединение к нему. Recall связки eres из сессии про собеседника, ответ — уже новая somos, признак así не меняется ни разу.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Признание собеседника напрямую — только Eres.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Eres', why: 'Somos — про группу с говорящим. Первая реплика — только о собеседнике одном, нужна Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такой». Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Присоединение включает собеседника — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Присоединение к разговору — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такие же». Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'second_person_singular'],
    },
    {
      id: 'es-e01-s25-es-asi-somos-de-acuerdo',
      english: 'Es así, somos de acuerdo',
      russian: 'Это так, мы согласны',
      explanation:
        'Диалог из подтверждения факта и группового согласия с ним. Recall связки es из сессии про предмет или ситуацию, ответ — somos перед формулой de acuerdo, которая не меняется ни по роду, ни по числу.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Подтверждение факта о ситуации — только Es.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Es', why: 'Somos — про группу с говорящим. Первая реплика — про ситуацию, а не про людей, нужна Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — отдельное слово подтверждения, здесь же нужно «так». Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «именно так». Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Групповое согласие — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Групповое согласие с говорящим внутри — somos.', trapType: 'grammar' },
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
            { value: 'caro', reasonCode: 'wrong_word:acuerdo', why: 'Caro означает «дорого» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_singular', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s25-soy-asi-somos-de-acuerdo',
      english: 'Soy así, somos de acuerdo',
      russian: 'Я такой, мы согласны',
      explanation:
        'Диалог из личного признания и группового согласия. Recall связки soy из первой сессии, ответ снова somos перед неизменяемой формулой de acuerdo — та же смена числа, что и в прошлых фразах.',
      words: [
        {
          correct: 'Soy',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'number_mismatch:Soy', why: 'Somos — про группу с говорящим. Первая реплика — только о себе одном, нужна Soy.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — обращение к собеседнику. Признание о себе — только Soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такой». Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Групповое согласие — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Групповое согласие с говорящим внутри — somos.', trapType: 'grammar' },
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
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'importante', reasonCode: 'wrong_word:acuerdo', why: 'Importante означает «важно» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'first_person_singular', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s25-somos-de-acuerdo-q',
      english: '¿Somos de acuerdo?',
      russian: 'Мы согласны?',
      explanation:
        'Вопрос о согласии сразу нескольких людей — сомнение в общем мнении. Формула de acuerdo не меняется, вопросом фразу делают только знаки ¿...? и интонация.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Вопрос о нашем общем согласии — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одном. Вопрос о группе, включая говорящего, — Somos.', trapType: 'grammar' },
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
            { value: 'caro', reasonCode: 'wrong_word:acuerdo', why: 'Caro означает «дорого» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'agreement_phrase', 'question_marks'],
    },
    {
      id: 'es-e01-s25-eres-verdadero-somos-asi',
      english: 'Eres verdadero, somos así',
      russian: 'Ты настоящий, мы такие',
      explanation:
        'Диалог о честности собеседника мужского рода и присоединении к этому качеству всей группой. Recall прилагательного verdadero из четвёртой сессии, ответ — уже somos así, а не единственное число.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Признание собеседника напрямую — только Eres.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Eres', why: 'Somos — про группу с говорящим. Первая реплика — только о собеседнике одном, нужна Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdadero',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'verdadera', reasonCode: 'gender_mismatch:verdadero', why: 'Verdadera — форма женского рода, с -a. О собеседнике мужского рода нужна форма на -o: verdadero.', trapType: 'grammar' },
            { value: 'único', reasonCode: 'wrong_word:verdadero', why: 'Único означает «единственный» — совсем другой признак, не про честность. Нужно verdadero.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Присоединение включает собеседника — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Присоединение к разговору — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такие же». Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'second_person_singular', 'truth_adjective'],
    },
    {
      id: 'es-e01-s25-es-verdad-somos-de-acuerdo',
      english: 'Es verdad, somos de acuerdo',
      russian: 'Это правда, мы согласны',
      explanation:
        'Диалог из подтверждения факта и группового согласия. Recall фразы Es verdad из первой сессии здесь звучит как контраст с somos de acuerdo: подтверждение факта — это одно, а отдельное согласие уже нескольких людей — совсем другое.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Подтверждение чужих слов — только Es.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Es', why: 'Somos — про группу с говорящим. Первая реплика — про факт, а не про людей, нужна Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdad',
          category: 'quality-noun',
          distractors: [
            { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с мнением, а не про подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение. Нужно verdad.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Групповое согласие — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Групповое согласие с говорящим внутри — somos.', trapType: 'grammar' },
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
            { value: 'difícil', reasonCode: 'wrong_word:acuerdo', why: 'Difícil означает «трудно» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_singular', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s25-eres-unico-no-somos-iguales-somos-asi',
      english: 'Eres único, somos así',
      russian: 'Ты единственный такой, мы такие',
      explanation:
        'Диалог о неповторимости собеседника мужского рода и присоединении к этому качеству всей группой. Recall прилагательного único из шестой сессии, ответ — somos así, а не единственное число soy así.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Признание собеседника напрямую — только Eres.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Eres', why: 'Somos — про группу с говорящим. Первая реплика — только о собеседнике одном, нужна Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'único',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única — форма женского рода, с -a. О собеседнике мужского рода нужна форма на -o: único.', trapType: 'grammar' },
            { value: 'verdadero', reasonCode: 'wrong_word:único', why: 'Verdadero означает «настоящий» — совсем другой признак, не про неповторимость. Нужно único.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Присоединение включает собеседника — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Присоединение к разговору — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такие же». Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'second_person_singular'],
    },
    {
      id: 'es-e01-s25-no-eres-asi-no-somos-de-acuerdo',
      english: 'No eres así, no somos de acuerdo',
      russian: 'Ты не такой, мы не согласны',
      explanation:
        'Двойное отрицание в диалоге: возражение собеседнику и отказ в согласии всей группой. No встаёт перед каждой связкой отдельно, así и de acuerdo не меняются ни разу.',
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
            { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Возражение собеседнику напрямую — только eres.', trapType: 'grammar' },
            { value: 'somos', reasonCode: 'number_mismatch:eres', why: 'Somos — про группу с говорящим. Первая реплика — только о собеседнике одном, нужна eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такой». Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание второй связки — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Отказ в согласии от группы — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Отказ от группы с говорящим внутри — somos.', trapType: 'grammar' },
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
            { value: 'fácil', reasonCode: 'wrong_word:acuerdo', why: 'Fácil означает «легко» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'second_person_singular', 'negation', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s25-es-importante-somos-de-acuerdo',
      english: 'Es importante, somos de acuerdo',
      russian: 'Это важно, мы согласны',
      explanation:
        'Диалог из оценки значимости и группового согласия с ней. Recall прилагательного importante из первой сессии, ответ — somos перед формулой de acuerdo, которая не меняется ни по роду, ни по числу.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Оценка значимости ситуации — только Es.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Es', why: 'Somos — про группу с говорящим. Первая реплика — про ситуацию, а не про людей, нужна Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'difícil', reasonCode: 'wrong_word:importante', why: 'Difícil означает «трудно» — про сложность, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'caro', reasonCode: 'wrong_word:importante', why: 'Caro означает «дорого» — про цену, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Групповое согласие — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Групповое согласие с говорящим внутри — somos.', trapType: 'grammar' },
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
            { value: 'caro', reasonCode: 'wrong_word:acuerdo', why: 'Caro означает «дорого» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_singular', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s25-eres-rapido-somos-asi',
      english: 'Eres rápido, somos así',
      russian: 'Ты быстрый, мы такие',
      explanation:
        'Диалог о темпе собеседника мужского рода и присоединении к этому качеству всей группой. Recall прилагательного rápido из пятой сессии, ответ — somos así, показывая, что признак относится теперь к нескольким людям.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Признание темпа собеседника напрямую — только Eres.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Eres', why: 'Somos — про группу с говорящим. Первая реплика — только о собеседнике одном, нужна Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода, с -a. О собеседнике мужского рода нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'verdadero', reasonCode: 'wrong_word:rápido', why: 'Verdadero означает «истинный» — совсем другой признак, не про скорость. Нужно rápido.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Присоединение включает собеседника — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Присоединение к разговору — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такие же». Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'second_person_singular', 'pace_adjective'],
    },
    {
      id: 'es-e01-s25-es-caro-no-somos-de-acuerdo',
      english: 'Es caro, no somos de acuerdo',
      russian: 'Это дорого, мы не согласны',
      explanation:
        'Диалог из оценки цены и группового несогласия с ней. Recall прилагательного caro из восемнадцатой сессии, ответ — no перед somos de acuerdo, где отрицается вся групповая реакция целиком.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Оценка цены предмета — только Es.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Es', why: 'Somos — про группу с говорящим. Первая реплика — про предмет, а не про людей, нужна Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'cara', reasonCode: 'gender_mismatch:caro', why: 'Cara — форма женского рода, с -a. По умолчанию, без названного предмета, используется форма на -o: caro.', trapType: 'grammar' },
            { value: 'fácil', reasonCode: 'wrong_word:caro', why: 'Fácil означает «легко» — совсем другой признак, не про цену. Нужно caro.', trapType: 'semantic_neighbor' },
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
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Отказ в согласии от группы — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Отказ от группы с говорящим внутри — somos.', trapType: 'grammar' },
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
            { value: 'difícil', reasonCode: 'wrong_word:acuerdo', why: 'Difícil означает «трудно» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_singular', 'negation', 'agreement_phrase', 'price_context'],
    },
    {
      id: 'es-e01-s25-eres-dificil-no-somos-de-acuerdo',
      english: 'Eres difícil, no somos de acuerdo',
      russian: 'Ты трудный, мы не согласны',
      explanation:
        'Диалог о характере собеседника мужского рода и групповом несогласии с этой оценкой. Recall прилагательного difícil из второй сессии, ответ — no перед somos de acuerdo, где отрицается вся групповая реакция целиком.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Оценка собеседника напрямую — только Eres.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Eres', why: 'Somos — про группу с говорящим. Первая реплика — только о собеседнике одном, нужна Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'difícil',
          category: 'quality-adjective',
          distractors: [
            { value: 'fácil', reasonCode: 'wrong_word:difícil', why: 'Fácil означает «легко» — противоположный признак. Нужно difícil.', trapType: 'semantic_neighbor' },
            { value: 'caro', reasonCode: 'wrong_word:difícil', why: 'Caro означает «дорого» — про цену, а не про сложность характера. Нужно difícil.', trapType: 'semantic_neighbor' },
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
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Отказ в согласии от группы — somos.', trapType: 'grammar' },
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Отказ от группы с говорящим внутри — somos.', trapType: 'grammar' },
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
            { value: 'importante', reasonCode: 'wrong_word:acuerdo', why: 'Importante означает «важно» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'second_person_singular', 'negation', 'agreement_phrase'],
    },
  ]);

export const ES_EPISODE_01_SESSION_25_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_25_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
