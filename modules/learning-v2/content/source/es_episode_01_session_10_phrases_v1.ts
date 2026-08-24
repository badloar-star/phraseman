import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_10_LOCALIZED_DETAILS } from './es_episode_01_session_10_localized_details_v1';

// зачем этот файл (владелец, 2026-08-24): фразы применения для сессии 10 —
// «Так ли это?» / question_marks, question_intonation. Никаких новых слов:
// все 15 фраз берут уже известную лексику (eres из сессии 9, es/soy/fácil/
// verdad из сессии 1, bonito/bonita из сессии 3, rápido/rápida из сессии 5,
// único/única из сессии 6) и оборачивают её в вопрос.
//
// зачем ¿...? НЕ отдельный word-токен (решение по совету Advisor, 2026-08-24,
// прецедент — английская сессия 11 question_inversion,
// episode_01_sessions_11_16_support_v1.ts): gate нормализует текст через
// normalize('NFKC') + strip пунктуации перед сравнением — «¿Eres bonito?» и
// «Eres bonito.» после нормализации становятся идентичным «eres bonito».
// Пунктуационный токен не может быть проверен как отдельная позиция.
// Решение — как в английском курсе: ¿...? живёт только в phrase.english,
// интерактивные word-токены — обычные грамматические слова (eres/es/soy,
// признак), сама тема "вопрос без инверсии, только знаки и интонация"
// преподаётся на трёх intro-страницах (там сравнение идёт по NFKC.trim()
// без стрипа пунктуации, значит там разница ¿...?/. видна).
//
// distractorAuthorship: 'manual' в SessionSource (см. es_episode_01_session_10_v1.ts)
// снижает минимум дистракторов с 3 до 2 — та же экономия, что и в сессиях 7/8.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s10-eres-bonito',
      english: '¿Eres bonito?',
      russian: 'Ты красивый?',
      explanation:
        'Так спрашивают собеседника мужского рода о его внешности напрямую. Порядок слов тот же, что в утверждении Eres bonito, — вопросом фразу делают только знаки ¿...? и интонация.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя, о собственном признаке. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonito',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonita', reasonCode: 'gender_mismatch:bonito', why: 'Bonita — форма женского рода на -a. О собеседнике мужского рода нужна форма bonito.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'wrong_word:bonito', why: 'Rápido — это «быстрый», признак темпа, а не внешности. Вопрос о внешности — bonito.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'question_marks', 'question_intonation'],
    },
    {
      id: 'es-e01-s10-eres-bonita',
      english: '¿Eres bonita?',
      russian: 'Ты красивая?',
      explanation:
        'Тот же вопрос, но собеседница женского рода. Меняется только концовка признака: -o становится -a, порядок слов и знаки ¿...? остаются теми же.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнице напрямую — только Eres.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя, о собственном признаке. Вопрос собеседнице — только Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonita',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito — форма мужского рода на -o. О собеседнице женского рода нужна форма bonita.', trapType: 'grammar' },
            { value: 'única', reasonCode: 'wrong_word:bonita', why: 'Única — это «единственная», совсем другой признак. Вопрос о внешности — bonita.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'question_marks'],
    },
    {
      id: 'es-e01-s10-eres-rapido',
      english: '¿Eres rápido?',
      russian: 'Ты быстрый?',
      explanation:
        'Вопрос про темп собеседника мужского рода — например, перед соревнованием. Слова стоят в том же порядке, что и в утверждении Eres rápido.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнику про его темп — только Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода на -a. О собеседнике мужского рода нужна форма rápido.', trapType: 'grammar' },
            { value: 'bonito', reasonCode: 'wrong_word:rápido', why: 'Bonito — это «красивый», признак внешности, а не темпа. Вопрос о скорости — rápido.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'pace_adjective', 'question_marks'],
    },
    {
      id: 'es-e01-s10-eres-rapida',
      english: '¿Eres rápida?',
      russian: 'Ты быстрая?',
      explanation:
        'Тот же вопрос о темпе, но собеседница женского рода. Меняется только концовка признака, сама связка eres и порядок слов остаются теми же.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнице — только Eres.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнице про её темп — только Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápido', reasonCode: 'gender_mismatch:rápida', why: 'Rápido — форма мужского рода на -o. О собеседнице женского рода нужна форма rápida.', trapType: 'grammar' },
            { value: 'verdadera', reasonCode: 'wrong_word:rápida', why: 'Verdadera — это «истинная», совсем другой признак. Вопрос о скорости — rápida.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'pace_adjective', 'question_marks'],
    },
    {
      id: 'es-e01-s10-eres-unico',
      english: '¿Eres único?',
      russian: 'Ты единственный такой?',
      explanation:
        'Вопрос о неповторимости собеседника мужского рода. Тильда над ú остаётся на месте, как и в утверждении Eres único — вопрос её не убирает и не двигает.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнику о нём самом — только Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'único',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única — форма женского рода на -a. О собеседнике мужского рода нужна форма único.', trapType: 'grammar' },
            { value: 'unico', reasonCode: 'accent_missing:único', why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'written_accent', 'question_marks'],
    },
    {
      id: 'es-e01-s10-eres-unica',
      english: '¿Eres única?',
      russian: 'Ты единственная такая?',
      explanation:
        'Тот же вопрос о неповторимости, но собеседница женского рода. Тильда над ú остаётся на месте в обеих формах — она отмечает ударение, а не род.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнице — только Eres.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнице о ней самой — только Eres.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'única',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'único', reasonCode: 'gender_mismatch:única', why: 'Único — форма мужского рода на -o. О собеседнице женского рода нужна форма única.', trapType: 'grammar' },
            { value: 'unica', reasonCode: 'accent_missing:única', why: 'Unica без тильды над ú звучала бы и писалась бы иначе. Нужна форма única с тильдой.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'written_accent', 'question_marks'],
    },
    {
      id: 'es-e01-s10-es-bonito',
      english: '¿Es bonito?',
      russian: 'Это красиво?',
      explanation:
        'Безличная оценка внешнего вида предмета или ситуации — например, картины или вида из окна. Es здесь не про собеседника, а про то, что перед глазами.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка предмета — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonito',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonita', reasonCode: 'gender_mismatch:bonito', why: 'Bonita согласуется с существительным женского рода. Безличная оценка «это» — по умолчанию bonito.', trapType: 'grammar' },
            { value: 'fácil', reasonCode: 'wrong_word:bonito', why: 'Fácil — это «лёгкий», признак сложности, а не внешнего вида. Вопрос о красоте — bonito.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'question_marks', 'question_intonation'],
    },
    {
      id: 'es-e01-s10-es-rapido',
      english: '¿Es rápido?',
      russian: 'Это быстро?',
      explanation:
        'Безличная оценка темпа процесса или транспорта — например, поезда или интернета. Es про сам предмет, не про собеседника.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка предмета — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida согласуется с существительным женского рода. Безличная оценка «это» — по умолчанию rápido.', trapType: 'grammar' },
            { value: 'verdad', reasonCode: 'wrong_word:rápido', why: 'Verdad — это существительное «правда», а не признак скорости. Вопрос о темпе — rápido.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'pace_adjective', 'question_marks'],
    },
    {
      id: 'es-e01-s10-es-facil',
      english: '¿Es fácil?',
      russian: 'Это легко?',
      explanation:
        'Тот же безличный es из первой сессии, но теперь как вопрос — оценивают что-то, спрашивая мнение собеседника, а не подтверждая своё. Порядок слов не меняется, вопрос делают только знаки ¿...? и интонация.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую — «ты лёгкий». Безличная оценка задачи — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка задачи или ситуации — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'fácil',
          category: 'quality-adjective',
          distractors: [
            { value: 'difícil', reasonCode: 'antonym_confusion:fácil', why: 'Difícil значит противоположное — «трудно». Вопрос о лёгкости — fácil.', trapType: 'semantic_neighbor' },
            { value: 'verdad', reasonCode: 'wrong_word:fácil', why: 'Verdad — это существительное «правда», а не признак сложности. Вопрос о лёгкости — fácil.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'question_marks', 'question_intonation'],
    },
    {
      id: 'es-e01-s10-es-dificil',
      english: '¿Es difícil?',
      russian: 'Это трудно?',
      explanation:
        'Вопрос о сложности — противоположность предыдущего. Difícil — уже знакомое слово из первой сессии, здесь оно просто оборачивается в вопрос.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Безличная оценка задачи — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка задачи — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'difícil',
          category: 'quality-adjective',
          distractors: [
            { value: 'fácil', reasonCode: 'antonym_confusion:difícil', why: 'Fácil значит противоположное — «легко». Вопрос о трудности — difícil.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:difícil', why: 'Igual — это «одинаково», признак сравнения, а не сложности. Вопрос о трудности — difícil.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'question_marks'],
    },
    {
      id: 'es-e01-s10-es-verdad',
      english: '¿Es verdad?',
      russian: 'Это правда?',
      explanation:
        'Тот же порядок слов, что и в утверждении Es verdad — вопрос не переставляет es и verdad местами, только добавляет знаки ¿ и ? по краям.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Оценка чужих слов — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка чужих слов — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdad',
          category: 'truth-noun',
          distractors: [
            { value: 'verdadero', reasonCode: 'adjective_for_fixed_phrase:verdad', why: 'Verdadero — признак предмета, «истинный». Устойчивая реакция — именно es verdad, с существительным verdad.', trapType: 'grammar' },
            { value: 'fácil', reasonCode: 'wrong_word:verdad', why: 'Fácil — это «лёгкий», признак сложности, а не подтверждение чужих слов. Нужно verdad.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'question_marks', 'fixed_reaction'],
    },
    {
      id: 'es-e01-s10-es-unico',
      english: '¿Es único?',
      russian: 'Это единственное такое?',
      explanation:
        'Безличная оценка неповторимости предмета — например, изделия ручной работы. Тильда над ú остаётся на месте и в вопросе.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Безличная оценка предмета — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка предмета — только Es.', trapType: 'grammar' },
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
      features: ['ser', 'written_accent', 'question_marks'],
    },
    {
      id: 'es-e01-s10-soy-verdadero',
      english: '¿Soy verdadero?',
      russian: 'Я настоящий?',
      explanation:
        'Редкий философский вопрос себе — искренен ли я в том, что говорю. Verdadero здесь согласуется с говорящим мужского рода, а не с предметом.',
      words: [
        {
          correct: 'Soy',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — про собеседника. Вопрос о себе самом — только Soy.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Soy', why: 'Es — про предмет или третье лицо. Вопрос о себе самом — только Soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdadero',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'verdadera', reasonCode: 'gender_mismatch:verdadero', why: 'Verdadera — форма женского рода на -a. Здесь говорит мужчина — нужна форма verdadero.', trapType: 'grammar' },
            { value: 'único', reasonCode: 'wrong_word:verdadero', why: 'Único — это «единственный», признак неповторимости, а не искренности. Вопрос об искренности — verdadero.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'truth_adjective', 'question_marks'],
    },
    {
      id: 'es-e01-s10-soy-rapido',
      english: '¿Soy rápido?',
      russian: 'Я быстрый?',
      explanation:
        'Редкий, но живой вопрос себе или третьему лицу о своей же скорости — например, после пробежки, спрашивая у тренера. Soy остаётся про говорящего даже в вопросе.',
      words: [
        {
          correct: 'Soy',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — про собеседника. Вопрос о себе самом — только Soy.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Soy', why: 'Es — про предмет или третье лицо. Вопрос о себе самом — только Soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida говорит о себе женщина. Здесь говорит мужчина — нужна форма rápido.', trapType: 'grammar' },
            { value: 'bonito', reasonCode: 'wrong_word:rápido', why: 'Bonito — это «красивый», признак внешности, а не темпа. Вопрос о скорости — rápido.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'pace_adjective', 'question_marks'],
    },
    {
      id: 'es-e01-s10-soy-bonita',
      english: '¿Soy bonita?',
      russian: 'Я красивая?',
      explanation:
        'Вопрос о собственной внешности — женщина спрашивает мнение вслух. Soy остаётся про говорящую даже в вопросе, порядок слов не меняется.',
      words: [
        {
          correct: 'Soy',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — про собеседницу. Вопрос о себе самой — только Soy.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'agreement_person_mismatch:Soy', why: 'Es — про предмет или третье лицо. Вопрос о себе самой — только Soy.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonita',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito говорит о себе мужчина. Здесь говорит женщина — нужна форма bonita.', trapType: 'grammar' },
            { value: 'rápida', reasonCode: 'wrong_word:bonita', why: 'Rápida — это «быстрая», признак темпа, а не внешности. Вопрос о внешности — bonita.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_singular', 'gender_agreement_full', 'question_marks'],
    },
  ]);

export const ES_EPISODE_01_SESSION_10_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_10_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
