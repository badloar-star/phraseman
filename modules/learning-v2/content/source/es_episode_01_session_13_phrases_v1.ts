import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_13_LOCALIZED_DETAILS } from './es_episode_01_session_13_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25): фразы применения для сессии 13 —
// «Местоимение не нужно» / pronoun_drop. Никаких новых слов: все 15 фраз
// используют уже известную лексику (eres/es/soy из сессий 1 и 9, признаки
// bonito/bonita, rápido/rápida, único/única, segura/seguro, verdadero из
// сессий 3/5/6/12/4).
//
// зачем местоимение "tú" НЕ отдельный word-токен (решение по аналогии с
// решением сессии 10 про пунктуацию): тема "испанский обычно опускает
// подлежащее, потому что окончание глагола само называет лицо" — это
// объясняющий факт про язык в целом, а не выбор между двумя видимыми
// словами в конкретной позиции фразы. EpisodeSourceWord.correct — не может
// быть пустой строкой (тип требует string), значит "пропуск местоимения"
// нельзя смоделировать как позицию с "правильным ответом = ничего".
// Карточки этой сессии — recall уже известной грамматики (eres/es/soy +
// признак), сама тема pro-drop раскрывается только в трёх intro-страницах,
// где сравниваются целые фразы "Tú eres bonito" vs "Eres bonito" как текст
// (там сравнение по NFKC.trim(), не через normalized(), — разница видна).
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s13-eres-bonito',
      english: 'Eres bonito',
      russian: 'Ты красивый',
      explanation:
        'Естественная форма без местоимения tú — окончание -es уже само называет собеседника. Добавлять tú было бы избыточно, хотя и не ошибка.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', category: 'quality-adjective-gendered', distractors: [
          { value: 'bonita', reasonCode: 'gender_mismatch:bonito', why: 'Bonita — форма женского рода. О собеседнике мужского рода нужна форма bonito.', trapType: 'grammar' },
          { value: 'rápido', reasonCode: 'wrong_word:bonito', why: 'Rápido — это «быстрый», признак темпа, а не внешности. Нужно bonito.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'second_person_singular', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-eres-bonita',
      english: 'Eres bonita',
      russian: 'Ты красивая',
      explanation:
        'Тот же принцип, собеседница женского рода. Окончание -es само указывает на «ты», поэтому tú здесь избыточно.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Обращение к собеседнице — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Обращение к собеседнице — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', category: 'quality-adjective-gendered', distractors: [
          { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito — форма мужского рода. О собеседнице женского рода нужна форма bonita.', trapType: 'grammar' },
          { value: 'segura', reasonCode: 'wrong_word:bonita', why: 'Segura — это «уверенная», совсем другой признак, не про внешность. Нужно bonita.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-eres-rapido',
      english: 'Eres rápido',
      russian: 'Ты быстрый',
      explanation:
        'Так говорят собеседнику мужского рода про его темп, без лишнего tú. Форма связки сама несёт информацию о лице.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Обращение к собеседнику про его темп — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', category: 'quality-adjective-gendered', distractors: [
          { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода. О собеседнике мужского рода нужна форма rápido.', trapType: 'grammar' },
          { value: 'verdadero', reasonCode: 'wrong_word:rápido', why: 'Verdadero — это «истинный», совсем другой признак. Нужно rápido.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'second_person_singular', 'pace_adjective', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-eres-rapida',
      english: 'Eres rápida',
      russian: 'Ты быстрая',
      explanation:
        'Тот же принцип о темпе, собеседница женского рода. Местоимение tú не нужно — форма eres однозначна, а признак согласуется по роду.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Обращение к собеседнице — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Обращение к собеседнице про её темп — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', category: 'quality-adjective-gendered', distractors: [
          { value: 'rápido', reasonCode: 'gender_mismatch:rápida', why: 'Rápido — форма мужского рода. О собеседнице женского рода нужна форма rápida.', trapType: 'grammar' },
          { value: 'única', reasonCode: 'wrong_word:rápida', why: 'Única — это «единственная», совсем другой признак. Нужно rápida.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'pace_adjective', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-eres-segura',
      english: 'Eres segura',
      russian: 'Ты уверенная',
      explanation:
        'Утверждение о собеседнице без tú — окончание -es уже называет её напрямую. Лишнее местоимение не нужно и в утверждении, и в вопросе.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Обращение к собеседнице напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Обращение к собеседнице — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'segura', category: 'quality-adjective-gendered', distractors: [
          { value: 'seguro', reasonCode: 'gender_mismatch:segura', why: 'Seguro — форма мужского рода. О собеседнице женского рода нужна форма segura.', trapType: 'grammar' },
          { value: 'bonita', reasonCode: 'wrong_word:segura', why: 'Bonita означает «красивая» — совсем другой признак, не про уверенность. Нужно segura.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'second_person_singular', 'confidence_adjective', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-eres-unico',
      english: 'Eres único',
      russian: 'Ты единственный такой',
      explanation:
        'Собеседнику мужского рода говорят о его неповторимости без tú. Тильда над ú остаётся на месте, местоимение не влияет на написание.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Обращение к собеседнику о нём самом — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'único', category: 'quality-adjective-gendered', distractors: [
          { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única — форма женского рода. О собеседнике мужского рода нужна форма único.', trapType: 'grammar' },
          { value: 'unico', reasonCode: 'accent_missing:único', why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.', trapType: 'orthographic' },
        ]},
      ],
      features: ['ser', 'second_person_singular', 'written_accent', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-eres-unica',
      english: 'Eres única',
      russian: 'Ты единственная такая',
      explanation:
        'Тот же принцип о неповторимости, собеседница женского рода. Тильда над ú остаётся в обеих формах, а tú остаётся лишним.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Обращение к собеседнице — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Обращение к собеседнице о ней самой — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'única', category: 'quality-adjective-gendered', distractors: [
          { value: 'único', reasonCode: 'gender_mismatch:única', why: 'Único — форма мужского рода. О собеседнице женского рода нужна форма única.', trapType: 'grammar' },
          { value: 'unica', reasonCode: 'accent_missing:única', why: 'Unica без тильды над ú звучала бы и писалась бы иначе. Нужна форма única с тильдой.', trapType: 'orthographic' },
        ]},
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'written_accent', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-soy-rapido',
      english: 'Soy rápido',
      russian: 'Я быстрый',
      explanation:
        'Утверждение о себе без местоимения yo — форма soy сама называет говорящего. Recall из первой сессии внутри новой темы pro-drop.',
      words: [
        { correct: 'Soy', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — про тебя. Говорящий про себя — Soy.', trapType: 'grammar' },
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Soy', why: 'Es — про предмет или третье лицо. Говорящий про себя — Soy.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', category: 'quality-adjective-gendered', distractors: [
          { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida говорит о себе женщина. Здесь говорит мужчина — нужна форма rápido.', trapType: 'grammar' },
          { value: 'bonito', reasonCode: 'wrong_word:rápido', why: 'Bonito — это «красивый», признак внешности, а не темпа. Нужно rápido.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'first_person_singular', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-soy-bonita',
      english: 'Soy bonita',
      russian: 'Я красивая',
      explanation:
        'Женщина говорит о своей внешности без yo — форма soy уже её называет. То же правило pro-drop, что и с tú.',
      words: [
        { correct: 'Soy', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — про тебя. Говорящая про себя — Soy.', trapType: 'grammar' },
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Soy', why: 'Es — про предмет или третье лицо. Говорящая про себя — Soy.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', category: 'quality-adjective-gendered', distractors: [
          { value: 'bonito', reasonCode: 'gender_mismatch:bonita', why: 'Bonito говорит о себе мужчина. Здесь говорит женщина — нужна форма bonita.', trapType: 'grammar' },
          { value: 'rápida', reasonCode: 'wrong_word:bonita', why: 'Rápida — это «быстрая», признак темпа, а не внешности. Нужно bonita.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'first_person_singular', 'gender_agreement_full', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-soy-segura',
      english: 'Soy segura',
      russian: 'Я уверенная',
      explanation:
        'Женщина говорит о своей уверенности в себе без местоимения. Recall новой лексики (сессия 12) внутри темы pro-drop.',
      words: [
        { correct: 'Soy', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Soy', why: 'Eres — про тебя. Говорящая про себя — Soy.', trapType: 'grammar' },
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Soy', why: 'Es — про предмет или третье лицо. Говорящая про себя — Soy.', trapType: 'grammar' },
        ]},
        { correct: 'segura', category: 'quality-adjective-gendered', distractors: [
          { value: 'seguro', reasonCode: 'gender_mismatch:segura', why: 'Seguro говорит о себе мужчина. Здесь говорит женщина — нужна форма segura.', trapType: 'grammar' },
          { value: 'única', reasonCode: 'wrong_word:segura', why: 'Única — это «единственная», совсем другой признак, не про уверенность. Нужно segura.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'first_person_singular', 'confidence_adjective', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-es-bonito',
      english: 'Es bonito',
      russian: 'Это красиво',
      explanation:
        'Безличная оценка предмета — тут вообще нет личного местоимения, потому что подлежащее «это» не называется отдельным словом никогда. Признак согласуется по роду, как обычно.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка предмета — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', category: 'quality-adjective-gendered', distractors: [
          { value: 'bonita', reasonCode: 'gender_mismatch:bonito', why: 'Bonita согласуется с существительным женского рода. Безличная оценка «это» — по умолчанию bonito.', trapType: 'grammar' },
          { value: 'fácil', reasonCode: 'wrong_word:bonito', why: 'Fácil — это «лёгкий», признак сложности, а не внешнего вида. Нужно bonito.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-es-rapido',
      english: 'Es rápido',
      russian: 'Это быстро',
      explanation:
        'Безличная оценка темпа — так же без местоимения «это» как отдельного слова. Recall из пятой сессии внутри новой темы.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка предмета — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', category: 'quality-adjective-gendered', distractors: [
          { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida согласуется с существительным женского рода. Безличная оценка «это» — по умолчанию rápido.', trapType: 'grammar' },
          { value: 'único', reasonCode: 'wrong_word:rápido', why: 'Único — это «единственный», признак неповторимости, а не темпа. Нужно rápido.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'pace_adjective', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-es-verdad',
      english: 'Es verdad',
      russian: 'Это правда',
      explanation:
        'Устойчивая реакция подтверждения без местоимения — уже знакомая фраза из первой сессии, здесь встречается как recall внутри новой темы. Es и verdad не меняются никогда.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Оценка чужих слов — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка чужих слов — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', category: 'truth-noun', distractors: [
          { value: 'verdadero', reasonCode: 'adjective_for_fixed_phrase:verdad', why: 'Verdadero — признак предмета, «истинный». Устойчивая реакция — именно verdad, существительное.', trapType: 'grammar' },
          { value: 'única', reasonCode: 'wrong_word:verdad', why: 'Única — это «единственная», совсем другой признак, не подтверждение слов. Нужно verdad.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'fixed_reaction', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-es-unico',
      english: 'Es único',
      russian: 'Это единственное такое',
      explanation:
        'Безличная оценка неповторимости предмета, без местоимения. Тильда над ú остаётся на месте, как и в любой другой форме этого слова.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — про собеседника напрямую. Безличная оценка предмета — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка предмета — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'único', category: 'quality-adjective-gendered', distractors: [
          { value: 'única', reasonCode: 'gender_mismatch:único', why: 'Única согласуется с существительным женского рода. Безличная оценка «это» — по умолчанию único.', trapType: 'grammar' },
          { value: 'unico', reasonCode: 'accent_missing:único', why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.', trapType: 'orthographic' },
        ]},
      ],
      features: ['ser', 'written_accent', 'pronoun_drop'],
    },
    {
      id: 'es-e01-s13-es-segura',
      english: 'Es segura',
      russian: 'Она уверенная',
      explanation:
        'Про третье лицо женского рода без местоимения ella — форма es в разговоре о конкретном человеке обычно тоже опускает подлежащее. Признак согласуется по роду, как и с eres/soy.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'segura', category: 'quality-adjective-gendered', distractors: [
          { value: 'seguro', reasonCode: 'gender_mismatch:segura', why: 'Seguro — форма мужского рода. О женщине нужна форма segura.', trapType: 'grammar' },
          { value: 'rápida', reasonCode: 'wrong_word:segura', why: 'Rápida — это «быстрая», признак темпа, а не уверенности. Нужно segura.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'confidence_adjective', 'pronoun_drop'],
    },
  ]);

export const ES_EPISODE_01_SESSION_13_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_13_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
