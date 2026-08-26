// зачем: урок 1 — это 56 сессий (владелец, 2026-08-16), и ВСЕ 56 раскрывают
// точный can-do исходного эпизода 1: начать знакомство и кратко сказать о себе.
//
// ⛔ ГЛАВНОЕ ПРАВИЛО, ИЗ-ЗА КОТОРОГО КАРТА ПЕРЕПИСАНА ЦЕЛИКОМ:
//
// Первая версия этой карты была ОШИБОЧНОЙ. Она раскладывала по уроку 1:
// настоящее простое (с. 25), настоящее длительное (с. 33), прошедшее (с. 41),
// неправильные глаголы (с. 42, 44), будущее (с. 49), сравнительную степень
// (с. 53). Это материал уроков 2–12 по спецификации. Урок 1 съедал треть курса,
// а на 31 оставшийся урок грамматики не оставалось.
//
// Владелец 2026-08-17: «а как мы разобьём на 56 сессий, а потом ещё 32 урока,
// если в первых 10 сессиях уже что-то больше, чем to be? Смотри, оно же должно
// двигаться правильно, как в 32 уроках, то есть первый урок to be (как в
// оригинале). Значит все 56 сессий должны учить to be».
//
// Спецификация (docs/v2/03, эпизод 1): «I am / you are как фразовые модели,
// сокращение I'm, личные местоимения без полной таблицы to be». Прямое решение
// владельца 2026-08-25 отменило прежнее локальное расширение до полной таблицы.
// He/she/it, this/that, a/an, вопросы и отрицание принадлежат эпизоду 2;
// have и притяжательные — эпизоду 3. Карта не имеет права забирать их обратно.
//
// НИКАКОЙ другой порождающей грамматики в уроке 1. Канонические фразы
// I speak…, Nice to meet you, And you?, See you later учатся как цельные
// функциональные формулы знакомства и не порождают заданий на свои внутренние
// правила. Глубина создаётся support fading, retrieval и переносом, а не
// присвоением тем следующих эпизодов.
//
// Полные правила построения уроков: docs/v2/LESSON_DESIGN_RULES.ru.md
// Неподвижный стиль интро и восьми локалей:
// docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md
//
// ПРАВИЛА ВЛАДЕЛЬЦА, по которым построена эта карта:
//
// 1. НЕ КАЖДАЯ СЕССИЯ — ФРАЗЫ. Есть разные типы (см. SessionKind ниже).
// 2. СЛОВА ИДУТ ДО ФРАЗ. «Юзер не может начать сессию, не ознакомившись со
//    словами — он же не знает их». Слово получает НЕСКОЛЬКО касаний за сессию
//    (услышать → вспомнить → собрать → применить), а не один выбор из пяти:
//    один выбор — это узнавание, а не отработка (владелец, 2026-08-17).
// 2A. КАЖДАЯ ОБЫЧНАЯ УЧЕБНАЯ СЕССИЯ по возможности приносит новую полезную
//    лексику. Если budget/чистая грамматическая цель этого не допускают, нужна
//    явная редакторская причина. Voice, recall и checkpoint новых слов не дают.
// 3. АКТИВНОЕ ПРИПОМИНАНИЕ. Фразы МОГУТ повторяться в поздних сессиях — это не
//    дублирование, а извлечение из памяти после задержки.
// 4. ГОЛОСОВЫЕ СЕССИИ отдельным типом.
// 5. ВОСЕМЬ ЯЗЫКОВ ОБЯЗАТЕЛЬНЫ. Решение владельца 2026-08-16: «все языки должны
//    быть, это строго при генерации». Объяснения, подсказки и разборы ошибок
//    пишутся сразу на ru, uk, es, pt-BR, vi, id, tr, pl. Маркер
//    [[NEEDS_TRANSLATION]] в готовой сессии — ошибка: сессия с ним считается
//    ненаписанной, а не частично готовой.
// 6. ФИЛЬТР ПРИГОДНОСТИ ФРАЗ обязателен (владелец, 2026-08-17). Отбраковываются
//    непереводимые краткие ответы (Yes, I am), фразы без смысла вне диалога
//    (And you?), мёртвый учебниковый язык (How do you do) и чужие имена
//    (I am Anna). Исполняемый фильтр: phrase_admissibility_filter_v1.ts.
//
// ПОЧЕМУ НЕТ СЕССИЙ НА НЕПРАВИЛЬНЫЕ ГЛАГОЛЫ И ПРЕДЛОГИ. Они были в первой версии
// (с. 42, 44 и с. 18, 30, 46, 50) и убраны вместе с остальным забегом вперёд:
// неправильный глагол — это прошедшее время, а предлоги места и времени идут с
// теми уроками, где появляются их конструкции. В уроке про to be им нечего
// делать. Типы SessionKind для них сохранены — пригодятся в уроках 5+.
//
// АУДИТ ЭТАЛОНА (app/lesson_data_*, 2026-08-16), на который опирается карта:
//   • фразы — lesson_data_1_8_phrases_source.ts: фраза + разбор по словам +
//     5 дистракторов + категория;
//   • теория — lesson_intro_screens_lesson1_v2.ts: экраны concept/formula/practice;
//   • неправильные глаголы — irregular_verbs_data.ts: base/past/pp + альтформы,
//     порция на урок = 6 (IRREGULAR_VERB_PORTION_SIZE), это число сохраняем;
//   • предлоги — семь тренировок по типам: место in/on/at, время in/on/at,
//     направление to/into/from, длительность for/since, глагольные связки.

/**
 * Тип сессии. Определяет, ЧЕМ она наполнена, и какие режимы уместны.
 *
 * Режимы подобраны под задачу, а не «по кругу»: форму глагола нужно извлекать
 * из памяти на скорость, предлог — различать в контексте, фразу — собирать.
 */
export type SessionKind =
  /**
   * Слова И СРАЗУ фразы из них, в одной сессии (владелец, 2026-08-16: «сессии
   * могут включать в себя и отработку слов и сразу фраз с этими словами, так
   * лучше будет»). Слоты 4–7 знакомят со словами, 8–12 собирают из них фразы —
   * человек не встречает слово, которого не видел, но и не ждёт целую сессию.
   */
  | 'words_then_phrases'
  /** Фразы из слов, введённых ранее — когда новой лексики нет. */
  | 'phrases'
  /**
   * Неправильные глаголы С НЕМЕДЛЕННОЙ ОТРАБОТКОЙ во фразах: форма и её
   * применение в одной сессии. Владелец: «будет скучно, если целая сессия
   * будет учить одному неправильному глаголу».
   */
  | 'irregular_verbs'
  /** Предлоги по типам плюс фразы с ними — отдельно от общего потока. */
  | 'prepositions'
  /** Голос: произнести, сравнить с образцом, ответить вслух. */
  | 'voice'
  /** Возврат пройденного после задержки — активное припоминание. */
  | 'recall'
  /** Граница главы: сборка всего, без новых конструкций. */
  | 'checkpoint';

/**
 * Семьи заданий под каждый тип сессии.
 *
 * Обоснование выбора:
 * • irregular_verbs → speed_match ведущий (форму доводят до автоматизма),
 *   context_gap_grammar (форма по смыслу), listen_choose (went/want на слух
 *   неразличимы), scripted_repeat_compare (caught/bought не читаются по буквам);
 * • prepositions → context_gap_grammar ведущий (in/on/at различимы только в
 *   контексте), sound_contrast (в беглой речи предлоги безударны и глотаются),
 *   phrase_builder (ловит пропуск предлога — типичная ошибка русскоязычных);
 * • vocabulary → listen_choose и sound_contrast: сначала узнать слово на слух
 *   и на письме, до всякой сборки;
 * • voice → scripted_repeat_compare как ядро.
 */
export const SESSION_KIND_FAMILIES: Readonly<Record<SessionKind, readonly string[]>> =
  Object.freeze({
    // Сначала узнать слово (слух + различение), потом собрать из него фразу.
    words_then_phrases: [
      'listen_choose',
      'sound_contrast',
      'phrase_builder',
      'context_gap_grammar',
    ],
    phrases: ['phrase_builder', 'listen_choose', 'context_gap_grammar'],
    irregular_verbs: [
      'speed_match',
      'context_gap_grammar',
      'listen_choose',
      'scripted_repeat_compare',
    ],
    prepositions: ['context_gap_grammar', 'sound_contrast', 'phrase_builder'],
    voice: ['scripted_repeat_compare', 'listen_build_dictation'],
    recall: ['speed_match', 'listen_build_dictation', 'phrase_builder'],
    checkpoint: ['phrase_builder', 'listen_build_dictation', 'context_gap_grammar'],
  });

export interface EpisodeSessionPlanEntry {
  readonly sessionOrdinal: number;
  readonly kind: SessionKind;
  /** Тема сессии на языке ученика, без грамматического жаргона. */
  readonly title: string;
  /** Учебные элементы (форма, лексика или функция), вводимые ВПЕРВЫЕ. */
  readonly teaches: readonly string[];
  /** Сессии, без которых эта непроходима. */
  readonly builtOn: readonly number[];
  /**
   * Активное припоминание: какие ранние сессии эта возвращает после задержки.
   * Повтор фраз здесь — намеренный, а не оплошность.
   */
  readonly recalls?: readonly number[];
}

/**
 * Семь глав по восемь сессий. Порядок внутри главы держит одно правило:
 * слово → фраза из этого слова → голос/припоминание → граница главы.
 */
export const EPISODE_01_SESSION_MAP_V1: readonly EpisodeSessionPlanEntry[] =
  Object.freeze([
    // ── Глава 1. Первое «я здесь» ─────────────────────────────────────────
    // Только утвердительное I am / I'm. Никакого отрицания или вопроса.
    { sessionOrdinal: 1, kind: 'words_then_phrases', title: 'Я здесь', teaches: ['copula_be', 'first_person_singular', 'state_adjective', 'adverb_place'], builtOn: [] },
    { sessionOrdinal: 2, kind: 'phrases', title: 'I am целиком', teaches: ['affirmative_self_statement'], builtOn: [1], recalls: [1] },
    { sessionOrdinal: 3, kind: 'phrases', title: 'I’m — коротко и живо', teaches: ['contraction_im'], builtOn: [1, 2], recalls: [1] },
    { sessionOrdinal: 4, kind: 'words_then_phrases', title: 'Я готов', teaches: ['readiness_vocabulary'], builtOn: [1], recalls: [1, 2] },
    { sessionOrdinal: 5, kind: 'words_then_phrases', title: 'Hi и Hello', teaches: ['greeting_formula', 'greeting_choice'], builtOn: [], recalls: [1] },
    { sessionOrdinal: 6, kind: 'phrases', title: 'Первые две реплики', teaches: ['opening_turn'], builtOn: [3, 5], recalls: [1, 3, 5] },
    { sessionOrdinal: 7, kind: 'voice', title: 'Скажи о себе вслух', teaches: ['spoken_production'], builtOn: [1, 3, 4, 5, 6], recalls: [1, 3, 4, 5] },
    { sessionOrdinal: 8, kind: 'checkpoint', title: 'Я начинаю разговор', teaches: [], builtOn: [1, 2, 3, 4, 5, 6, 7], recalls: [1, 3, 4, 5, 6] },

    // ── Глава 2. Назвать себя ─────────────────────────────────────────────
    { sessionOrdinal: 9, kind: 'words_then_phrases', title: 'Имя после Hi', teaches: ['personal_name_slot', 'self_introduction_formula'], builtOn: [3, 5], recalls: [5, 6] },
    { sessionOrdinal: 10, kind: 'phrases', title: 'I’m и имя одним дыханием', teaches: ['name_chunking'], builtOn: [9], recalls: [3, 9] },
    { sessionOrdinal: 11, kind: 'phrases', title: 'Hello, I’m…', teaches: ['greeting_name_sequence'], builtOn: [5, 9], recalls: [5, 9] },
    { sessionOrdinal: 12, kind: 'words_then_phrases', title: 'Nice to meet you', teaches: ['meeting_formula'], builtOn: [9], recalls: [5, 9] },
    { sessionOrdinal: 13, kind: 'phrases', title: 'Имя без текста', teaches: ['name_retrieval'], builtOn: [9, 10], recalls: [3, 9, 10] },
    { sessionOrdinal: 14, kind: 'recall', title: 'Два начала знакомства', teaches: ['greeting_retrieval'], builtOn: [11, 12], recalls: [5, 9, 11, 12] },
    { sessionOrdinal: 15, kind: 'voice', title: 'Представься вслух', teaches: ['self_intro_fluency'], builtOn: [9, 10, 11, 12], recalls: [5, 9, 10, 12] },
    { sessionOrdinal: 16, kind: 'checkpoint', title: 'Я представляюсь', teaches: [], builtOn: [9, 10, 11, 12, 13, 14, 15], recalls: [5, 9, 11, 12, 15] },

    // ── Глава 3. Назвать страну ───────────────────────────────────────────
    { sessionOrdinal: 17, kind: 'words_then_phrases', title: 'I’m from…', teaches: ['origin_from_fixed_frame'], builtOn: [3, 9], recalls: [3, 9] },
    { sessionOrdinal: 18, kind: 'words_then_phrases', title: 'Страны на слух', teaches: ['country_name', 'country_sound'], builtOn: [17], recalls: [9, 17] },
    { sessionOrdinal: 19, kind: 'phrases', title: 'Моя страна', teaches: ['origin_statement'], builtOn: [17, 18], recalls: [17, 18] },
    { sessionOrdinal: 20, kind: 'phrases', title: 'Имя, затем страна', teaches: ['identity_origin_sequence'], builtOn: [9, 19], recalls: [9, 11, 17, 19] },
    { sessionOrdinal: 21, kind: 'words_then_phrases', title: 'Ещё одна страна', teaches: ['country_slot_variation'], builtOn: [18, 19], recalls: [17, 18, 19] },
    { sessionOrdinal: 22, kind: 'recall', title: 'Откуда я — без подсказки', teaches: ['origin_retrieval'], builtOn: [19, 21], recalls: [9, 17, 19] },
    { sessionOrdinal: 23, kind: 'voice', title: 'Назови имя и страну', teaches: ['origin_spoken_fluency'], builtOn: [20, 22], recalls: [9, 17, 19, 20] },
    { sessionOrdinal: 24, kind: 'checkpoint', title: 'Имя и страна', teaches: [], builtOn: [17, 18, 19, 20, 21, 22, 23], recalls: [9, 17, 19, 20, 23] },

    // ── Глава 4. Назвать язык ─────────────────────────────────────────────
    { sessionOrdinal: 25, kind: 'words_then_phrases', title: 'Названия языков', teaches: ['language_name'], builtOn: [18], recalls: [18, 21] },
    { sessionOrdinal: 26, kind: 'words_then_phrases', title: 'I speak… как готовая фраза', teaches: ['language_fixed_formula'], builtOn: [25], recalls: [17, 25] },
    { sessionOrdinal: 27, kind: 'phrases', title: 'Страна и язык — не одно и то же', teaches: ['country_language_distinction'], builtOn: [18, 25, 26], recalls: [18, 21, 25, 26] },
    { sessionOrdinal: 28, kind: 'phrases', title: 'Язык после страны', teaches: ['origin_language_sequence'], builtOn: [19, 26], recalls: [17, 19, 25, 26] },
    { sessionOrdinal: 29, kind: 'phrases', title: 'Три факта о себе', teaches: ['three_fact_sequence'], builtOn: [9, 19, 26], recalls: [9, 19, 20, 26, 28] },
    { sessionOrdinal: 30, kind: 'recall', title: 'Три факта из памяти', teaches: ['three_fact_retrieval'], builtOn: [29], recalls: [9, 17, 25, 29] },
    { sessionOrdinal: 31, kind: 'voice', title: 'Имя, страна, язык — вслух', teaches: ['language_spoken_fluency'], builtOn: [29, 30], recalls: [9, 19, 26, 29] },
    { sessionOrdinal: 32, kind: 'checkpoint', title: 'Имя, страна и язык', teaches: [], builtOn: [25, 26, 27, 28, 29, 30, 31], recalls: [16, 24, 25, 26, 29, 31] },

    // ── Глава 5. Утвердительное you are ──────────────────────────────────
    // Только утверждение. Вопрос и отрицание остаются в эпизоде 2.
    { sessionOrdinal: 33, kind: 'words_then_phrases', title: 'You are — о собеседнике', teaches: ['second_person', 'affirmative_addressee_statement'], builtOn: [1, 2], recalls: [1, 2] },
    { sessionOrdinal: 34, kind: 'phrases', title: 'I am или you are', teaches: ['speaker_addressee_choice'], builtOn: [2, 33], recalls: [1, 2, 33] },
    { sessionOrdinal: 35, kind: 'phrases', title: 'You are here', teaches: ['addressee_presence'], builtOn: [1, 33], recalls: [1, 33, 34] },
    { sessionOrdinal: 36, kind: 'words_then_phrases', title: 'You are ready', teaches: ['addressee_readiness'], builtOn: [4, 33], recalls: [4, 33, 35] },
    { sessionOrdinal: 37, kind: 'phrases', title: 'I am и you are рядом', teaches: ['person_agreement_contrast'], builtOn: [34, 35, 36], recalls: [1, 4, 33, 34] },
    { sessionOrdinal: 38, kind: 'recall', title: 'Кто говорит', teaches: ['perspective_retrieval'], builtOn: [37], recalls: [2, 33, 34, 37] },
    { sessionOrdinal: 39, kind: 'voice', title: 'Скажи это собеседнику', teaches: ['addressee_spoken_production'], builtOn: [35, 36, 38], recalls: [1, 4, 33, 35, 36] },
    { sessionOrdinal: 40, kind: 'checkpoint', title: 'Я и ты', teaches: [], builtOn: [33, 34, 35, 36, 37, 38, 39], recalls: [1, 4, 33, 34, 37, 39] },

    // ── Глава 6. Передать очередь и завершить ─────────────────────────────
    { sessionOrdinal: 41, kind: 'words_then_phrases', title: 'And you?', teaches: ['and_you_fixed_formula'], builtOn: [29, 33], recalls: [29, 33] },
    { sessionOrdinal: 42, kind: 'phrases', title: 'Передай очередь', teaches: ['turn_taking'], builtOn: [41], recalls: [33, 37, 41] },
    { sessionOrdinal: 43, kind: 'words_then_phrases', title: 'See you later', teaches: ['farewell_formula'], builtOn: [5, 12], recalls: [5, 12] },
    { sessionOrdinal: 44, kind: 'phrases', title: 'Начать и закончить', teaches: ['opening_closing_sequence'], builtOn: [11, 43], recalls: [5, 11, 12, 43] },
    { sessionOrdinal: 45, kind: 'phrases', title: 'Собеседник отвечает', teaches: ['response_selection'], builtOn: [33, 41, 42], recalls: [29, 33, 41, 42] },
    { sessionOrdinal: 46, kind: 'recall', title: 'Вся цепочка знакомства', teaches: ['conversation_retrieval'], builtOn: [44, 45], recalls: [11, 20, 29, 41, 43] },
    { sessionOrdinal: 47, kind: 'voice', title: 'Разыграй знакомство', teaches: ['dialogue_production'], builtOn: [44, 45, 46], recalls: [15, 23, 31, 39, 43] },
    { sessionOrdinal: 48, kind: 'checkpoint', title: 'Разговор целиком', teaches: [], builtOn: [41, 42, 43, 44, 45, 46, 47], recalls: [16, 24, 32, 40, 43, 47] },

    // ── Глава 7. Перенос без новой грамматики ─────────────────────────────
    { sessionOrdinal: 49, kind: 'phrases', title: 'Новая встреча', teaches: ['transfer_context_variation'], builtOn: [48], recalls: [11, 20, 29, 44] },
    { sessionOrdinal: 50, kind: 'recall', title: 'Быстрее без текста', teaches: ['fluency_retrieval'], builtOn: [49], recalls: [9, 17, 25, 33, 41] },
    { sessionOrdinal: 51, kind: 'phrases', title: 'Услышать и продолжить', teaches: ['aural_turn_response'], builtOn: [45, 49], recalls: [12, 28, 41, 45] },
    { sessionOrdinal: 52, kind: 'recall', title: 'Собрать по одному намёку', teaches: ['minimal_cue_retrieval'], builtOn: [50, 51], recalls: [3, 9, 17, 25, 43] },
    { sessionOrdinal: 53, kind: 'phrases', title: 'Три факта в живом порядке', teaches: ['conversation_coherence'], builtOn: [29, 49, 52], recalls: [20, 29, 41, 44] },
    { sessionOrdinal: 54, kind: 'recall', title: 'Все формулы из памяти', teaches: ['independent_formula_retrieval'], builtOn: [52, 53], recalls: [5, 9, 17, 25, 33, 41, 43] },
    { sessionOrdinal: 55, kind: 'voice', title: 'Разговор без текста', teaches: ['independent_spoken_transfer'], builtOn: [49, 53, 54], recalls: [15, 23, 31, 39, 47] },
    { sessionOrdinal: 56, kind: 'checkpoint', title: 'Финальная встреча', teaches: [], builtOn: [8, 16, 24, 32, 40, 48, 55], recalls: [8, 16, 24, 32, 40, 48, 55] },
  ]);

/** Всё, что объяснено к началу указанной сессии (включая её собственное интро). */
export function featuresTaughtBySession(sessionOrdinal: number): ReadonlySet<string> {
  const taught = new Set<string>();
  for (const entry of EPISODE_01_SESSION_MAP_V1) {
    if (entry.sessionOrdinal > sessionOrdinal) break;
    for (const feature of entry.teaches) taught.add(feature);
  }
  return taught;
}
