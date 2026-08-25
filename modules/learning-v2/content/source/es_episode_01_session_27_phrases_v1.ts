import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_27_LOCALIZED_DETAILS } from './es_episode_01_session_27_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 27 "Они" / third_person_plural, builtOn: [17, 25], recalls: [17, 25],
// продолжает Главу 4 "Мы и они"): 15 фраз вводят son — связку третьего лица
// МНОЖЕСТВЕННОГО числа, впервые как ПРАВИЛЬНЫЙ ответ. Son уже звучала в
// сессиях 25 и 26 как грамматический дистрактор на позиции somos (contrast
// "Son — «они», без говорящего в составе группы"), но никогда не была верным
// ответом — эта сессия впервые делает её главным предметом.
//
// зачем сдвиг именно ЛИЦА, а не числа (в отличие от сессии 25, где somos
// сдвигала число при неизменном первом лице): es (сессия 17, третье лицо
// единственного числа — предметы, ситуации, "он/она") уже установлена;
// son — тот же признак третьего лица (не говорящий, не собеседник), но
// теперь о группе БЕЗ говорящего внутри. Это зеркально сессии 9→17
// (eres→es сдвигало лицо при неизменном единственном числе), только теперь
// на пару es/son при неизменном третьем лице. Somos (сессия 25) — главный
// контрастный дистрактор: son и somos оба про "нескольких", но son НЕ
// включает говорящего, а somos включает всегда.
//
// зачем двойные реплики (recall es/somos + son-реакция), как в сессии 25:
// чтобы получить 15 РАЗНЫХ фраз без новой лексики, каждая фраза либо
// продолжает уже известную реплику от первого лица множественного
// (somos, сессия 25) или третьего лица единственного (es, сессия 17) и
// отвечает / расширяет её формой son, либо целиком строит son-фразу с
// уже известными признаками из сессий 3/5/6/18/26 (bonito/rápido/único/
// caro и их формы множественного числа согласной/гласной концовки).
//
// зачем признаки взяты из уже известного набора (fácil/difícil/importante/
// igual/verdad/así из сессии 1/17, bonito/bonita/bonitos/bonitas из
// сессий 3/26, rápido/…/rápidos/rápidas из сессий 5/26, único/…/únicos/
// únicas из сессии 6/26, caro/cara из сессии 18): сессии 25/26 уже
// построили всю машинерию рода/числа — эта сессия про СДВИГ ЛИЦА, а не
// про новую лексику согласования, поэтому son всегда встаёт перед уже
// отработанными формами множественного числа.
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
// та же экономия, что и в сессиях 10/14/17/25/26.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s27-son-asi',
      english: 'Son así',
      russian: 'Они такие',
      explanation:
        'Так говорят о характере группы людей, в которую не входит сам говорящий — просто «они». Así не меняется никогда, а связка son показывает третье лицо множественного числа.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном предмете или человеке. Про нескольких «они» — Son.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает самого говорящего в группу. Про «них» без говорящего внутри — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такие». Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural'],
    },
    {
      id: 'es-e01-s27-no-son-asi',
      english: 'No son así',
      russian: 'Они не такие',
      explanation:
        'Отрицание группового описания — возражение чужому обобщению о них. No встаёт перед связкой, así остаётся без изменений, как и во всех прошлых отрицаниях.',
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
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про нескольких «они» — son.', trapType: 'grammar' },
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такие». Нужно así.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:así', why: 'Verdad означает «правда» — подтверждение факта, а не описание характера. Нужно así.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'negation'],
    },
    {
      id: 'es-e01-s27-son-asi-verdad-q',
      english: '¿Son así, verdad?',
      russian: 'Они такие, правда?',
      explanation:
        'Утверждение о группе без говорящего внутри с хвостовым вопросом-подтверждением. Recall слова verdad из первой сессии — не как отдельная реакция, а как короткий вопрос «правда?» в конце фразы.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящего в группу. Вопрос про «них» без говорящего — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Вопрос про нескольких «они» — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:así', why: 'Igual означает «всё равно» — другой оттенок, не «такие». Нужно así.', trapType: 'semantic_neighbor' },
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
      features: ['ser', 'third_person_plural', 'question_marks', 'truth_adjective'],
    },
    {
      id: 'es-e01-s27-es-rapido-son-rapidos',
      english: 'Es rápido; son rápidos',
      russian: 'Он быстрый; они быстрые',
      explanation:
        'Диалог из оценки одного и обобщения на группу без говорящего. Recall связки es из сессии про предмет или третье лицо единственного числа, ответ — son перед формой множественного числа rápidos.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Оценка третьего лица — только Es.', trapType: 'grammar' },
            { value: 'Son', reasonCode: 'number_mismatch:Es', why: 'Son — про нескольких. Первая реплика — только об одном, нужна Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. По умолчанию нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'lento', reasonCode: 'wrong_word:rápido', why: 'Lento означает противоположное — «медленный». Нужно rápido.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Ответ про группу без говорящего — son.', trapType: 'grammar' },
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Ответ про «них» без говорящего — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Ответ про группу — форма множественного числа: rápidos.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'third_person_plural', 'plural_agreement', 'pace_adjective'],
    },
    {
      id: 'es-e01-s27-somos-rapidos-son-rapidos-tambien',
      english: 'Somos rápidos, son rápidos también',
      russian: 'Мы быстрые, они тоже быстрые',
      explanation:
        'Диалог из утверждения о своей группе и признания того же качества за другой группой. Recall связки somos из сессии про говорящего с группой, ответ — son о группе без говорящего, признак rápidos не меняется.',
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
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
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
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про другую группу тоже нужна форма множественного числа: rápidos.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'también',
          category: 'inclusion-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:también', why: 'Igual означает «всё равно» — другой смысл, не «тоже». Нужно también.', trapType: 'semantic_neighbor' },
            { value: 'muy', reasonCode: 'wrong_word:también', why: 'Muy означает «очень», не «тоже». Нужно también.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_plural', 'plural_agreement', 'pace_adjective'],
    },
    {
      id: 'es-e01-s27-son-de-acuerdo',
      english: 'Son de acuerdo',
      russian: 'Они согласны',
      explanation:
        'Так говорят о согласии группы людей, в которую говорящий не входит. De acuerdo не меняется никогда, а связка son показывает, что согласны именно «они», а не «мы».',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящего в группу согласных. Согласие «них» без говорящего — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Согласие нескольких людей — Son.', trapType: 'grammar' },
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
      features: ['ser', 'third_person_plural', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s27-son-de-acuerdo-q-es-verdad',
      english: '¿Son de acuerdo?; es verdad',
      russian: 'Они согласны? Это правда',
      explanation:
        'Вопрос о согласии группы людей без говорящего внутри и подтверждение факта в ответ. Формула de acuerdo не меняется в вопросе, а Es verdad — recall безличной реакции из первой сессии.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Вопрос о согласии нескольких — Son.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящего. Вопрос про «них» без говорящего — Son.', trapType: 'grammar' },
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
            { value: 'caro', reasonCode: 'wrong_word:acuerdo', why: 'Caro означает «дорого» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Es', why: 'Somos включает говорящего в группу. Подтверждение факта как такового — Es.', trapType: 'grammar' },
            { value: 'Son', reasonCode: 'number_mismatch:Es', why: 'Son — про нескольких. Подтверждение факта как такового — Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdad',
          category: 'quality-noun',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
            { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с мнением, а не про подтверждение факта. Нужно verdad.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'agreement_phrase', 'question_marks'],
    },
    {
      id: 'es-e01-s27-no-son-de-acuerdo',
      english: 'No son de acuerdo',
      russian: 'Они не согласны',
      explanation:
        'Отрицание группового согласия — говорящий сообщает, что «они» против. No встаёт перед связкой, de acuerdo остаётся неизменной формулой, как и в прошлых отрицаниях.',
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
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Отказ «них» без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Отказ нескольких людей — son.', trapType: 'grammar' },
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
      features: ['ser', 'third_person_plural', 'negation', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s27-es-bonita-son-bonitas',
      english: 'Es bonita; son bonitas',
      russian: 'Она красивая; они красивые',
      explanation:
        'Диалог из оценки внешности одной женщины и обобщения на группу женского рода без говорящего. Recall связки es и признака bonita, ответ — son перед формой множественного числа bonitas.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнице напрямую. Оценка третьего лица — только Es.', trapType: 'grammar' },
            { value: 'Son', reasonCode: 'number_mismatch:Es', why: 'Son — про нескольких. Первая реплика — только об одной, нужна Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonita',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito — форма мужского рода. О женщине нужна форма на -a: bonita.', trapType: 'grammar' },
            { value: 'cara', reasonCode: 'wrong_word:bonita', why: 'Cara означает «дорогая» — про цену, а не про внешность. Нужно bonita.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одной. Ответ про группу — son.', trapType: 'grammar' },
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Ответ про «них» без говорящего — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitos', reasonCode: 'gender_mismatch:bonitas', why: 'Bonitos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: bonitas.', trapType: 'grammar' },
            { value: 'bonita', reasonCode: 'number_mismatch:bonitas', why: 'Bonita — форма единственного числа. Про группу нужна форма множественного числа: bonitas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'third_person_plural', 'plural_agreement', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s27-son-unicos',
      english: 'Son únicos',
      russian: 'Они единственные в своём роде',
      explanation:
        'Так говорят о неповторимости группы мужского рода или смешанной по умолчанию, в которую говорящий не входит. Тильда над ú остаётся на месте, окончание -os показывает множественное число.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Про нескольких «они» — Son.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicas', reasonCode: 'gender_mismatch:únicos', why: 'Únicas — форма женского рода множественного числа. По умолчанию нужна форма на -os: únicos.', trapType: 'grammar' },
            { value: 'unicos', reasonCode: 'accent_missing:únicos', why: 'Unicos без тильды над ú звучал бы и писался бы иначе. Нужна форма с тильдой: únicos.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'written_accent'],
    },
    {
      id: 'es-e01-s27-son-unicas',
      english: 'Son únicas',
      russian: 'Они единственные в своём роде (о группе женского рода)',
      explanation:
        'Та же неповторимость, но про группу женского рода без говорящего внутри. Único переходит сразу в обе формы согласования: единственное → множественное и мужской → женский род.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящую в группу. Про «них» без говорящей — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одной. Про нескольких «они» — Son.', trapType: 'grammar' },
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
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'written_accent'],
    },
    {
      id: 'es-e01-s27-son-dificiles',
      english: 'Son difíciles',
      russian: 'Они сложные (в общении)',
      explanation:
        'Difícil заканчивается на согласную -l, поэтому во множественном числе получает не -s, а -es: difíciles. Признак не различается по роду — форма одна и для мужчин, и для женщин.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Про несколько человек — Son.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'difíciles',
          category: 'quality-adjective-plural',
          distractors: [
            { value: 'fáciles', reasonCode: 'wrong_word:difíciles', why: 'Fáciles означает противоположное — «простые». Нужно difíciles.', trapType: 'semantic_neighbor' },
            { value: 'difícil', reasonCode: 'number_mismatch:difíciles', why: 'Difícil — форма единственного числа. Про группу нужна форма множественного числа: difíciles.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement'],
    },
    {
      id: 'es-e01-s27-no-son-faciles',
      english: 'No son fáciles',
      russian: 'Они не простые (в общении)',
      explanation:
        'Отрицание согласной формы множественного числа без говорящего внутри группы. No встаёт перед son, fáciles сохраняет окончание -es, как и в утвердительной форме.',
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
          correct: 'fáciles',
          category: 'quality-adjective-plural',
          distractors: [
            { value: 'facil', reasonCode: 'accent_missing:fáciles', why: 'Facil без ударения над a читалось бы иначе. Нужна форма множественного числа с ударением: fáciles.', trapType: 'orthographic' },
            { value: 'difíciles', reasonCode: 'wrong_word:fáciles', why: 'Difíciles означает противоположное — «сложные». Нужно fáciles.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'negation'],
    },
    {
      id: 'es-e01-s27-es-caro-son-caros',
      english: 'Es caro; son caros',
      russian: 'Это дорого; они дорогие',
      explanation:
        'Диалог из оценки цены одного предмета и обобщения на несколько предметов. Recall связки es и признака caro из восемнадцатой сессии, ответ — son перед формой множественного числа caros.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Оценка цены предмета — только Es.', trapType: 'grammar' },
            { value: 'Son', reasonCode: 'number_mismatch:Es', why: 'Son — про несколько предметов. Первая реплика — только про один, нужна Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'cara', reasonCode: 'gender_mismatch:caro', why: 'Cara — форма женского рода. По умолчанию нужна форма на -o: caro.', trapType: 'grammar' },
            { value: 'fácil', reasonCode: 'wrong_word:caro', why: 'Fácil означает «легко» — совсем другой признак, не про цену. Нужно caro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном предмете. Ответ про несколько предметов — son.', trapType: 'grammar' },
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos — про группу людей с говорящим. Про несколько предметов — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caros',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'caro', reasonCode: 'number_mismatch:caros', why: 'Caro — форма единственного числа. Про несколько предметов нужна форма множественного числа: caros.', trapType: 'grammar' },
            { value: 'caras', reasonCode: 'gender_mismatch:caros', why: 'Caras — форма женского рода множественного числа. По умолчанию нужна форма на -os: caros.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'third_person_plural', 'plural_agreement', 'price_adjective'],
    },
    {
      id: 'es-e01-s27-somos-de-acuerdo-son-de-acuerdo-tambien',
      english: 'Somos de acuerdo, son de acuerdo también',
      russian: 'Мы согласны, они тоже согласны',
      explanation:
        'Диалог из группового согласия говорящего и признания того же согласия за другой группой. Recall связки somos из сессии про говорящего с группой, ответ — son о другой группе, формула de acuerdo не меняется.',
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
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про другую группу без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про несколько человек — son.', trapType: 'grammar' },
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
            { value: 'importante', reasonCode: 'wrong_word:acuerdo', why: 'Importante означает «важно» — совсем не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'también',
          category: 'inclusion-adverb',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:también', why: 'Igual означает «всё равно» — другой смысл, не «тоже». Нужно también.', trapType: 'semantic_neighbor' },
            { value: 'muy', reasonCode: 'wrong_word:también', why: 'Muy означает «очень», не «тоже». Нужно también.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_plural', 'agreement_phrase'],
    },
  ]);

export const ES_EPISODE_01_SESSION_27_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_27_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
