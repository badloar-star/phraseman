import type {
  EpisodeSessionPlanEntry,
  SessionKind,
} from './episode_01_session_map_v1';

/**
 * Карта 56 сессий испанского урока 1 — «estar».
 *
 * Тема урока взята из docs/v2/SPANISH_CURRICULUM_GRID.ru.md (урок 1 = только
 * estar, состояние и место). Правило №1 LESSON_DESIGN_RULES: одна
 * грамматическая тема на все 56 сессий. Ничего кроме estar здесь нет —
 * ser идёт уроком 2, tener уроком 4.
 *
 * Принцип деления на главы взят у английского урока 1 (по лицам глагола),
 * но с испанской спецификой:
 *
 * • английский to be имеет 3 формы (am/is/are) — испанский estar имеет 5
 *   (estoy/estás/está/estamos/están), поэтому лиц больше и им нужно больше
 *   места;
 * • у английского нет рода прилагательного — у испанского есть, и это
 *   сквозная тема, которая идёт через все главы, а не отдельная глава;
 * • estar покрывает И состояние, И место: это два разных смысла одного
 *   глагола, им отведены разные главы (1-2 состояние, 5 место).
 *
 * Vosotros не вводится: курс на латиноамериканском нейтральном
 * (решение владельца 2026-08-23). Множественное «вы» — ustedes, форма
 * совпадает с están, поэтому отдельной сессии не требует.
 *
 * Признаки в `teaches` — испанские, не скопированы из английской карты.
 */

/** Что вводит каждая сессия впервые. Испанские грамматические признаки. */
export const ES_EPISODE_01_SESSION_MAP_V1: readonly EpisodeSessionPlanEntry[] =
  Object.freeze([
    // ── Глава 1. Я: как я себя чувствую ──────────────────────────────────
    // Только estoy. Ученик впервые говорит о себе, встречает род и отрицание.
    { sessionOrdinal: 1, kind: 'phrases', title: 'Я в порядке', teaches: ['estar_copula', 'first_person_singular', 'state_adjective', 'gender_agreement_basic'], builtOn: [] },
    { sessionOrdinal: 2, kind: 'phrases', title: 'Я не', teaches: ['negation_no'], builtOn: [1], recalls: [1] },
    { sessionOrdinal: 3, kind: 'words_then_phrases', title: 'Мужской и женский род', teaches: ['gender_agreement_full'], builtOn: [1], recalls: [1, 2] },
    { sessionOrdinal: 4, kind: 'words_then_phrases', title: 'Как я себя чувствую', teaches: ['feeling_adjective'], builtOn: [1, 3], recalls: [1, 3] },
    { sessionOrdinal: 5, kind: 'phrases', title: 'Я здесь', teaches: ['place_adverb'], builtOn: [1], recalls: [2, 4] },
    { sessionOrdinal: 6, kind: 'words_then_phrases', title: 'Ударение слышно', teaches: ['written_accent'], builtOn: [1, 5], recalls: [1, 5] },
    { sessionOrdinal: 7, kind: 'voice', title: 'Скажи вслух: о себе', teaches: ['spoken_production'], builtOn: [1, 2, 3, 4, 5], recalls: [1, 3, 4, 5] },
    { sessionOrdinal: 8, kind: 'checkpoint', title: 'Всё про я целиком', teaches: [], builtOn: [1, 2, 3, 4, 5, 6, 7], recalls: [1, 2, 3, 4, 5] },

    // ── Глава 2. Ты: вопрос ──────────────────────────────────────────────
    // Второе лицо. Вопрос без инверсии — только интонация и знаки.
    { sessionOrdinal: 9, kind: 'phrases', title: 'Ты есть', teaches: ['second_person_singular'], builtOn: [1], recalls: [3] },
    { sessionOrdinal: 10, kind: 'phrases', title: 'Как дела?', teaches: ['question_marks', 'question_intonation'], builtOn: [9], recalls: [1, 9] },
    { sessionOrdinal: 11, kind: 'phrases', title: 'Ты не', teaches: [], builtOn: [2, 9], recalls: [2, 9] },
    { sessionOrdinal: 12, kind: 'words_then_phrases', title: 'Спрашиваю женщину', teaches: [], builtOn: [3, 10], recalls: [3, 10] },
    { sessionOrdinal: 13, kind: 'phrases', title: 'Местоимение не нужно', teaches: ['pronoun_drop'], builtOn: [9, 10], recalls: [1, 9] },
    { sessionOrdinal: 14, kind: 'words_then_phrases', title: 'Где ты', teaches: ['question_word_donde'], builtOn: [5, 10], recalls: [5, 10] },
    { sessionOrdinal: 15, kind: 'voice', title: 'Скажи вслух: спроси меня', teaches: [], builtOn: [10, 12, 14], recalls: [9, 10, 14] },
    { sessionOrdinal: 16, kind: 'checkpoint', title: 'Я и ты целиком', teaches: [], builtOn: [9, 10, 11, 12, 13, 14, 15], recalls: [1, 9, 10, 13, 14] },

    // ── Глава 3. Он, она, оно ────────────────────────────────────────────
    // Третье лицо. Здесь же имена и предметы как подлежащее.
    { sessionOrdinal: 17, kind: 'phrases', title: 'Он и она', teaches: ['third_person_singular'], builtOn: [1, 9], recalls: [3] },
    { sessionOrdinal: 18, kind: 'words_then_phrases', title: 'Про людей вокруг', teaches: ['person_noun'], builtOn: [17], recalls: [3, 17] },
    { sessionOrdinal: 19, kind: 'phrases', title: 'Он не', teaches: [], builtOn: [2, 17], recalls: [2, 11] },
    { sessionOrdinal: 20, kind: 'phrases', title: 'Он где?', teaches: [], builtOn: [14, 17], recalls: [14, 17] },
    { sessionOrdinal: 21, kind: 'words_then_phrases', title: 'Предмет тоже он или она', teaches: ['noun_gender'], builtOn: [17, 18], recalls: [3, 18] },
    { sessionOrdinal: 22, kind: 'phrases', title: 'Это здесь', teaches: ['demonstrative_esto'], builtOn: [5, 21], recalls: [5, 21] },
    { sessionOrdinal: 23, kind: 'voice', title: 'Скажи вслух: про другого', teaches: [], builtOn: [17, 18, 20], recalls: [17, 18, 20] },
    { sessionOrdinal: 24, kind: 'checkpoint', title: 'Он, она, оно целиком', teaches: [], builtOn: [17, 18, 19, 20, 21, 22, 23], recalls: [17, 19, 20, 21, 22] },

    // ── Глава 4. Мы и они ────────────────────────────────────────────────
    // Множественное число: и глагол, и прилагательное.
    { sessionOrdinal: 25, kind: 'phrases', title: 'Мы', teaches: ['first_person_plural'], builtOn: [1, 17], recalls: [1] },
    { sessionOrdinal: 26, kind: 'words_then_phrases', title: 'Много: и признак меняется', teaches: ['plural_agreement'], builtOn: [3, 25], recalls: [3, 25] },
    { sessionOrdinal: 27, kind: 'phrases', title: 'Они', teaches: ['third_person_plural'], builtOn: [17, 25], recalls: [17, 25] },
    { sessionOrdinal: 28, kind: 'phrases', title: 'Вы (несколько человек)', teaches: ['ustedes_plural'], builtOn: [9, 27], recalls: [9, 27] },
    { sessionOrdinal: 29, kind: 'phrases', title: 'Мы не, они не', teaches: [], builtOn: [2, 25, 27], recalls: [2, 19] },
    { sessionOrdinal: 30, kind: 'recall', title: 'Все пять форм подряд', teaches: [], builtOn: [1, 9, 17, 25, 27], recalls: [1, 9, 17, 25, 27] },
    { sessionOrdinal: 31, kind: 'voice', title: 'Скажи вслух: про нас', teaches: [], builtOn: [25, 26, 27], recalls: [25, 26, 27] },
    { sessionOrdinal: 32, kind: 'checkpoint', title: 'Все формы estar целиком', teaches: [], builtOn: [25, 26, 27, 28, 29, 30, 31], recalls: [1, 9, 17, 25, 27] },

    // ── Глава 5. Место ───────────────────────────────────────────────────
    // Второй смысл estar. Предлоги и ориентиры.
    { sessionOrdinal: 33, kind: 'prepositions', title: 'В, на, рядом', teaches: ['preposition_place'], builtOn: [5, 20], recalls: [5, 20] },
    { sessionOrdinal: 34, kind: 'words_then_phrases', title: 'Места вокруг', teaches: ['place_noun'], builtOn: [33], recalls: [5, 33] },
    { sessionOrdinal: 35, kind: 'phrases', title: 'Дома — без артикля', teaches: ['article_omission_place'], builtOn: [33, 34], recalls: [33, 34] },
    { sessionOrdinal: 36, kind: 'phrases', title: 'Далеко и близко', teaches: ['distance_adverb'], builtOn: [34], recalls: [5, 34] },
    { sessionOrdinal: 37, kind: 'phrases', title: 'Справа и слева', teaches: ['direction_phrase'], builtOn: [33, 36], recalls: [33, 36] },
    { sessionOrdinal: 38, kind: 'words_then_phrases', title: 'Где именно', teaches: [], builtOn: [14, 37], recalls: [14, 33, 37] },
    { sessionOrdinal: 39, kind: 'voice', title: 'Скажи вслух: где я', teaches: [], builtOn: [33, 35, 37], recalls: [33, 35, 37] },
    { sessionOrdinal: 40, kind: 'checkpoint', title: 'Место целиком', teaches: [], builtOn: [33, 34, 35, 36, 37, 38, 39], recalls: [33, 34, 35, 36, 37] },

    // ── Глава 6. Состояния шире ──────────────────────────────────────────
    // Расширение лексики признаков. Форма уже известна — растёт словарь.
    { sessionOrdinal: 41, kind: 'words_then_phrases', title: 'Настроение', teaches: ['emotion_adjective'], builtOn: [4], recalls: [4, 26] },
    { sessionOrdinal: 42, kind: 'words_then_phrases', title: 'Здоровье и силы', teaches: ['physical_state_adjective'], builtOn: [4, 41], recalls: [4, 41] },
    { sessionOrdinal: 43, kind: 'words_then_phrases', title: 'Готов, занят, свободен', teaches: ['readiness_adjective'], builtOn: [4], recalls: [4, 42] },
    { sessionOrdinal: 44, kind: 'phrases', title: 'Очень и немного', teaches: ['intensity_adverb'], builtOn: [41, 42], recalls: [41, 42] },
    { sessionOrdinal: 45, kind: 'phrases', title: 'Как вещи и еда', teaches: ['object_state'], builtOn: [21, 41], recalls: [21, 41] },
    { sessionOrdinal: 46, kind: 'recall', title: 'Состояние или место', teaches: [], builtOn: [4, 33, 41], recalls: [4, 5, 33, 41] },
    { sessionOrdinal: 47, kind: 'voice', title: 'Скажи вслух: как всё', teaches: [], builtOn: [41, 43, 44], recalls: [41, 43, 44] },
    { sessionOrdinal: 48, kind: 'checkpoint', title: 'Состояния целиком', teaches: [], builtOn: [41, 42, 43, 44, 45, 46, 47], recalls: [41, 42, 43, 44, 45] },

    // ── Глава 7. Свободный разговор ──────────────────────────────────────
    // Новых конструкций нет. Всё вместе, в живых ситуациях.
    { sessionOrdinal: 49, kind: 'phrases', title: 'Встреча и приветствие', teaches: [], builtOn: [10, 41], recalls: [10, 41] },
    { sessionOrdinal: 50, kind: 'phrases', title: 'Разговор по телефону', teaches: [], builtOn: [14, 35], recalls: [14, 33, 35] },
    { sessionOrdinal: 51, kind: 'recall', title: 'Быстрый ответ о себе', teaches: [], builtOn: [1, 4, 41], recalls: [1, 4, 41, 43] },
    { sessionOrdinal: 52, kind: 'phrases', title: 'Спросить и ответить', teaches: [], builtOn: [10, 14, 20], recalls: [10, 14, 20] },
    { sessionOrdinal: 53, kind: 'voice', title: 'Скажи вслух: короткий разговор', teaches: [], builtOn: [49, 50, 52], recalls: [49, 50, 52] },
    { sessionOrdinal: 54, kind: 'recall', title: 'Всё про людей и места', teaches: [], builtOn: [17, 25, 33], recalls: [17, 25, 27, 33] },
    { sessionOrdinal: 55, kind: 'voice', title: 'Скажи вслух: свободно', teaches: [], builtOn: [51, 53, 54], recalls: [49, 51, 53] },
    { sessionOrdinal: 56, kind: 'checkpoint', title: 'Экзамен урока', teaches: [], builtOn: [8, 16, 24, 32, 40, 48, 55], recalls: [8, 16, 24, 32, 40, 48] },
  ]);

/** Тип сессии по номеру. Бросает на неизвестном номере, а не молчит. */
export function esEpisode01SessionKind(sessionOrdinal: number): SessionKind {
  const entry = ES_EPISODE_01_SESSION_MAP_V1.find(
    (item) => item.sessionOrdinal === sessionOrdinal,
  );
  if (!entry) {
    throw new Error(
      `es_episode_01_session_unknown:ordinal=${sessionOrdinal}:expected=1..56`,
    );
  }
  return entry.kind;
}
