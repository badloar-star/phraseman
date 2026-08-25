import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_28_LOCALIZED_DETAILS } from './es_episode_01_session_28_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 28 "Вдвоём: somos dos" / number_with_ser, builtOn: [9, 27],
// recalls: [9, 27], продолжает Главу 4 "Мы и они"): 15 фраз учат ser +
// числительное как способ назвать размер группы — "Somos dos" (нас двое),
// "Son tres" (их трое). Новых слов формально нет (kind: 'phrases'), но два
// числительных (dos, tres) вводятся как обычные позиционные токены words[],
// тем же способом, каким раньше вводились артикли и союзы (o/y) — без
// формального word-first экрана, с собственными дистракторами на каждой
// позиции. Проверено вручную: числительные нигде раньше в курсе не
// встречались как отдельные слова (только как номера сессий в комментариях
// карты, не как испанский текст фразы).
//
// зачем только dos и tres, а не весь ряд 1-10: kind: 'phrases' запрещает
// newVocabulary, а формальное word-first введение здесь не подходит.
// Полный числовой ряд (uno..diez) — это самостоятельная лексическая тема
// достаточного размера для отдельной будущей сессии; здесь фокус — САМА
// КОНСТРУКЦИЯ ser+число, а не запоминание всех цифр. Два числа достаточно,
// чтобы показать общий паттерн (число просто встаёт после связки) и дать
// содержательный контраст на позиции дистрактора (dos против tres и
// наоборот), не перегружая одну нелексическую сессию новой лексикой.
//
// зачем uno/eres не сочетаются: "Eres dos" грамматически бессмысленно —
// один собеседник не может быть "два". Естественный испанский счёт группы
// строится только через somos (говорящий в группе) и son (говорящий вне
// группы) — соответствует teaches: ['number_with_ser'] и builtOn: [9, 27]:
// eres (сессия 9) и son (сессия 27) остаются в игре как RECALL-контраст на
// позиции связки (грамматический дистрактор и как элемент диалоговых фраз),
// но никогда как "eres/es + число" — такой конструкции в живом испанском нет.
//
// зачем диалоговые фразы (recall eres/son + somos-ответ): чтобы получить 15
// РАЗНЫХ фраз без новой грамматики, часть фраз — самостоятельные somos/son +
// число, часть — короткие двухреплийные диалоги, где первая реплика recall'ит
// eres (сессия 9) или son (сессия 27), а вторая называет размер группы.
// Второй клоз всегда начинается со строчной буквы после "; " (правило
// phrase_not_standalone из уроков 26/27).
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
// та же экономия, что и в сессиях 10/14/17/25/26/27.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s28-somos-dos',
      english: 'Somos dos',
      russian: 'Нас двое',
      explanation:
        'Так говорят о размере своей группы, называя число сразу после связки. Somos уже включает говорящего, а dos просто добавляет точный счёт — сколько человек всего.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Somos', why: 'Eres — обращение к одному собеседнику. Счёт своей группы — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — «три», другое число. Здесь нужно именно dos — «два».', trapType: 'semantic_neighbor' },
            { value: 'tú', reasonCode: 'wrong_word:dos', why: 'Tú — местоимение «ты», а не число. После связки при счёте нужно числительное dos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'number_with_ser'],
    },
    {
      id: 'es-e01-s28-no-somos-dos',
      english: 'No somos dos',
      russian: 'Нас не двое',
      explanation:
        'Отрицание счёта своей группы — поправка на неверное число. No встаёт перед связкой, как и во всех прошлых отрицаниях, а dos остаётся простым числительным без изменений.',
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
            { value: 'eres', reasonCode: 'agreement_person_mismatch:somos', why: 'Eres — обращение к одному собеседнику. Счёт своей группы — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — «три», другое число. Здесь нужно именно dos — «два».', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:dos', why: 'Así означает «так», описание характера, а не число. Здесь нужен счёт: dos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'number_with_ser', 'negation'],
    },
    {
      id: 'es-e01-s28-somos-dos-verdad-q',
      english: '¿Somos dos, verdad?',
      russian: 'Нас двое, правда?',
      explanation:
        'Вопрос о размере своей группы с хвостовым подтверждением. Recall слова verdad из первой сессии как короткого «правда?» в конце фразы — Somos и dos не меняются, только добавляется вопрос-довесок.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Вопрос о своей группе — Somos.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Somos', why: 'Eres — обращение к одному собеседнику. Вопрос о счёте своей группы — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — «три», другое число. Здесь нужно именно dos — «два».', trapType: 'semantic_neighbor' },
            { value: 'ellos', reasonCode: 'wrong_word:dos', why: 'Ellos — местоимение «они», а не число. После связки при счёте нужно числительное dos.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'verdad',
          category: 'quality-noun',
          distractors: [
            { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с чужим мнением, а не короткий вопрос-подтверждение в конце фразы. Нужно verdad.', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:verdad', why: 'Así означает «так», описание характера, а не короткий вопрос-подтверждение. Нужно verdad.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'number_with_ser', 'question_marks', 'truth_adjective'],
    },
    {
      id: 'es-e01-s28-somos-dos-no-tres',
      english: 'Somos dos, no tres',
      russian: 'Нас двое, не трое',
      explanation:
        'Уточнение точного числа через контраст с соседним. No здесь отрицает не связку, а само число — короткая поправка сразу после первого числительного.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Somos', why: 'Eres — обращение к одному собеседнику. Счёт своей группы — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — то самое число, которое здесь отрицается дальше во фразе. Сначала нужно верное число: dos.', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:dos', why: 'Así означает «так», описание характера, а не число. Здесь нужен счёт: dos.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание числа — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'tres',
          category: 'cardinal-number',
          distractors: [
            { value: 'dos', reasonCode: 'wrong_number:tres', why: 'Dos — то число, что уже названо верным в начале фразы. Здесь отрицается другое число: tres.', trapType: 'semantic_neighbor' },
            { value: 'tú', reasonCode: 'wrong_word:tres', why: 'Tú — местоимение «ты», а не число. После no при счёте нужно числительное tres.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'number_with_ser', 'negation'],
    },
    {
      id: 'es-e01-s28-son-dos',
      english: 'Son dos',
      russian: 'Их двое',
      explanation:
        'Так говорят о размере чужой группы, в которую говорящий не входит. Son показывает третье лицо множественного числа, dos называет точный счёт — те же две части, что и в somos dos, но без говорящего внутри.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает самого говорящего в группу. Счёт чужой группы без говорящего — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Счёт нескольких — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — «три», другое число. Здесь нужно именно dos — «два».', trapType: 'semantic_neighbor' },
            { value: 'ellos', reasonCode: 'wrong_word:dos', why: 'Ellos — местоимение «они», а не число. После связки при счёте нужно числительное dos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'number_with_ser'],
    },
    {
      id: 'es-e01-s28-no-son-dos',
      english: 'No son dos',
      russian: 'Их не двое',
      explanation:
        'Отрицание счёта чужой группы — поправка на неверное число со стороны. No встаёт перед связкой, dos остаётся простым числительным без изменений, как и в somos-версии этого отрицания.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает самого говорящего в группу. Счёт чужой группы без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Счёт нескольких — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — «три», другое число. Здесь нужно именно dos — «два».', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:dos', why: 'Verdad — «правда», короткий вопрос-подтверждение, а не число. Здесь нужен счёт: dos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'number_with_ser', 'negation'],
    },
    {
      id: 'es-e01-s28-son-dos-verdad-q',
      english: '¿Son dos, verdad?',
      russian: 'Их двое, правда?',
      explanation:
        'Вопрос о размере чужой группы с хвостовым подтверждением. Recall слова verdad из первой сессии как короткого «правда?» в конце фразы — Son и dos не меняются, только добавляется вопрос-довесок.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает самого говорящего в группу. Вопрос о чужой группе без говорящего — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Вопрос о нескольких — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — «три», другое число. Здесь нужно именно dos — «два».', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:dos', why: 'Así означает «так», описание характера, а не число. Здесь нужен счёт: dos.', trapType: 'semantic_neighbor' },
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
      features: ['ser', 'third_person_plural', 'number_with_ser', 'question_marks', 'truth_adjective'],
    },
    {
      id: 'es-e01-s28-son-tres',
      english: 'Son tres',
      russian: 'Их трое',
      explanation:
        'Тот же счёт чужой группы, но с другим числом. Tres встаёт сразу после son точно так же, как dos — форма связки от числа не зависит вовсе.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает самого говорящего в группу. Счёт чужой группы без говорящего — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Счёт нескольких — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'tres',
          category: 'cardinal-number',
          distractors: [
            { value: 'dos', reasonCode: 'wrong_number:tres', why: 'Dos — «два», другое число. Здесь нужно именно tres — «три».', trapType: 'semantic_neighbor' },
            { value: 'ellos', reasonCode: 'wrong_word:tres', why: 'Ellos — местоимение «они», а не число. После связки при счёте нужно числительное tres.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'number_with_ser'],
    },
    {
      id: 'es-e01-s28-no-son-tres',
      english: 'No son tres',
      russian: 'Их не трое',
      explanation:
        'Отрицание счёта чужой группы с числом tres — та же поправка, что и с dos, только другое число. No встаёт перед связкой, tres остаётся без изменений.',
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
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает самого говорящего в группу. Счёт чужой группы без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Счёт нескольких — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'tres',
          category: 'cardinal-number',
          distractors: [
            { value: 'dos', reasonCode: 'wrong_number:tres', why: 'Dos — «два», другое число. Здесь нужно именно tres — «три».', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:tres', why: 'Verdad — «правда», короткий вопрос-подтверждение, а не число. Здесь нужен счёт: tres.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'number_with_ser', 'negation'],
    },
    {
      id: 'es-e01-s28-son-tres-q',
      english: '¿Son tres?; somos dos',
      russian: 'Их трое? Нас двое',
      explanation:
        'Диалог из вопроса о чужой группе и ответа о своей — прямой контраст somos против son на одной карточке. Оба числа разные: у них tres, у нас dos.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает самого говорящего в группу. Вопрос о чужой группе без говорящего — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Вопрос о нескольких — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'tres',
          category: 'cardinal-number',
          distractors: [
            { value: 'dos', reasonCode: 'wrong_number:tres', why: 'Dos — то число, что названо дальше во второй реплике. Первый вопрос — про другое число: tres.', trapType: 'semantic_neighbor' },
            { value: 'ellos', reasonCode: 'wrong_word:tres', why: 'Ellos — местоимение «они», а не число. После связки при счёте нужно числительное tres.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Ответ про свою группу — somos.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:somos', why: 'Eres — обращение к одному собеседнику. Ответ о счёте своей группы — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — то число, что уже прозвучало в вопросе про чужую группу. Ответ про своё число: dos.', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:dos', why: 'Así означает «так», описание характера, а не число. Здесь нужен счёт: dos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'first_person_plural', 'number_with_ser', 'question_marks'],
    },
    {
      id: 'es-e01-s28-eres-tu-somos-dos',
      english: '¿Eres tú?; somos dos',
      russian: 'Это ты? Нас двое',
      explanation:
        'Диалог из вопроса, узнают ли собеседника, и ответа про размер своей группы. Recall связки eres из девятой сессии в вопросе, ответ — уже somos перед числом dos.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Прямой вопрос собеседнику — только Eres.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'number_mismatch:Eres', why: 'Somos — про группу с говорящим. Вопрос об одном собеседнике — нужна Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'tú',
          category: 'pronoun',
          distractors: [
            { value: 'dos', reasonCode: 'wrong_word:tú', why: 'Dos — число «два», а не местоимение. Вопрос «это ты?» требует местоимение tú.', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:tú', why: 'Así означает «так», описание характера, а не местоимение. Нужно tú.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Ответ про свою группу — somos.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:somos', why: 'Eres — обращение к одному собеседнику. Ответ о счёте своей группы — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — «три», другое число. Здесь нужно именно dos — «два».', trapType: 'semantic_neighbor' },
            { value: 'tú', reasonCode: 'wrong_word:dos', why: 'Tú — местоимение «ты», уже использовано в вопросе. После связки при счёте нужно числительное dos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'first_person_plural', 'number_with_ser', 'question_marks'],
    },
    {
      id: 'es-e01-s28-eres-tu-son-tres',
      english: '¿Eres tú?; son tres',
      russian: 'Это ты? Их трое',
      explanation:
        'Тот же вопрос собеседнику, но ответ уже про чужую группу без говорящего. Recall связки eres из девятой сессии, ответ — son перед числом tres, а не somos.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Прямой вопрос собеседнику — только Eres.', trapType: 'grammar' },
            { value: 'Son', reasonCode: 'number_mismatch:Eres', why: 'Son — про нескольких без говорящего. Вопрос об одном собеседнике — нужна Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'tú',
          category: 'pronoun',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_word:tú', why: 'Tres — число «три», а не местоимение. Вопрос «это ты?» требует местоимение tú.', trapType: 'semantic_neighbor' },
            { value: 'acuerdo', reasonCode: 'wrong_word:tú', why: 'Acuerdo — часть формулы согласия, а не местоимение. Вопрос «это ты?» требует местоимение tú.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает самого говорящего в группу. Ответ про чужую группу без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Ответ про нескольких — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'tres',
          category: 'cardinal-number',
          distractors: [
            { value: 'dos', reasonCode: 'wrong_number:tres', why: 'Dos — «два», другое число. Здесь нужно именно tres — «три».', trapType: 'semantic_neighbor' },
            { value: 'ellos', reasonCode: 'wrong_word:tres', why: 'Ellos — местоимение «они», уже подразумевается связкой son. После связки при счёте нужно числительное tres.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'third_person_plural', 'number_with_ser', 'question_marks'],
    },
    {
      id: 'es-e01-s28-somos-dos-de-acuerdo',
      english: 'Somos dos, de acuerdo',
      russian: 'Нас двое, договорились',
      explanation:
        'Подтверждение размера своей группы с закреплением через уже знакомую формулу согласия. Somos dos называет число, de acuerdo закрепляет его как решённый вопрос — та же неизменяемая формула, что и в прежних сессиях.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Somos', why: 'Eres — обращение к одному собеседнику. Счёт своей группы — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — «три», другое число. Здесь нужно именно dos — «два».', trapType: 'semantic_neighbor' },
            { value: 'de', reasonCode: 'wrong_word:dos', why: 'De — часть формулы согласия, а не число. Перед ней нужен счёт: dos.', trapType: 'semantic_neighbor' },
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
            { value: 'caro', reasonCode: 'wrong_word:acuerdo', why: 'Caro означает «дорого» — совсем не про согласие с числом. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не закрепляет согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'number_with_ser', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s28-no-somos-tres-somos-dos',
      english: 'No somos tres, somos dos',
      russian: 'Нас не трое, нас двое',
      explanation:
        'Двойная поправка: сначала отрицается неверное число, затем сразу называется верное. No встаёт перед первой связкой, обе связки остаются somos — группа своя, меняется только число рядом с ней.',
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
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Отрицание своей группы — somos.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:somos', why: 'Eres — обращение к одному собеседнику. Про свою группу — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'tres',
          category: 'cardinal-number',
          distractors: [
            { value: 'dos', reasonCode: 'wrong_number:tres', why: 'Dos — то число, что названо дальше как верное. Здесь отрицается другое число: tres.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:tres', why: 'Verdad — «правда», короткий вопрос-подтверждение, а не число. Здесь нужен счёт: tres.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Поправка про свою группу — somos.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:somos', why: 'Eres — обращение к одному собеседнику. Поправка про свою группу — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'dos',
          category: 'cardinal-number',
          distractors: [
            { value: 'tres', reasonCode: 'wrong_number:dos', why: 'Tres — то число, что уже отрицалось в начале фразы. Верное число здесь: dos.', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:dos', why: 'Así означает «так», описание характера, а не число. Здесь нужен счёт: dos.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'number_with_ser', 'negation'],
    },
    {
      id: 'es-e01-s28-son-tres-de-acuerdo',
      english: 'Son tres, de acuerdo',
      russian: 'Их трое, договорились',
      explanation:
        'Подтверждение размера чужой группы с закреплением через уже знакомую формулу согласия — зеркально фразе про свою группу, но здесь без говорящего внутри. Son tres называет число, de acuerdo закрепляет его как решённый вопрос.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает самого говорящего в группу. Счёт чужой группы без говорящего — Son.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Счёт нескольких — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'tres',
          category: 'cardinal-number',
          distractors: [
            { value: 'dos', reasonCode: 'wrong_number:tres', why: 'Dos — «два», другое число. Здесь нужно именно tres — «три».', trapType: 'semantic_neighbor' },
            { value: 'de', reasonCode: 'wrong_word:tres', why: 'De — часть формулы согласия, а не число. Перед ней нужен счёт: tres.', trapType: 'semantic_neighbor' },
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
            { value: 'caro', reasonCode: 'wrong_word:acuerdo', why: 'Caro означает «дорого» — совсем не про согласие с числом. Нужно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'importante', reasonCode: 'wrong_word:acuerdo', why: 'Importante означает «важно» — совсем не про согласие с числом. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'number_with_ser', 'agreement_phrase'],
    },
  ]);

export const ES_EPISODE_01_SESSION_28_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_28_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
