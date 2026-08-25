import type {
  EpisodeSessionPlanEntry,
  SessionKind,
} from './episode_01_session_map_v1';

/**
 * Карта 56 сессий испанского урока 1 — «Ser: какой и кто».
 *
 * зачем переписано (владелец, 2026-08-23): предыдущая версия была под тему
 * «estar», которую владелец после ресерча (VanPatten 1985/2010) утвердил
 * уроком 8 (место) и уроком 13 (состояние), а не уроком 1. Ресерч показал:
 * ser осваивается раньше estar, и на ранней стадии ученик всё равно
 * сверхобобщает ser на все контексты — курс не борется с этой стадией, а
 * совпадает с ней. Тема урока 1 зафиксирована в
 * docs/v2/SPANISH_CURRICULUM_GRID.ru.md, статус УТВЕРЖДЕНО.
 *
 * Правило №1 LESSON_DESIGN_RULES: одна грамматическая тема на все 56
 * сессий. Ничего кроме ser здесь нет — estar появляется в уроке 8 (место),
 * tener в уроке 5.
 *
 * Владелец также запретил анкетные формулы («Me llamo», «Soy de México»,
 * «Soy profesor», «Mucho gusto» — тот же класс, что «My name is Anna» в
 * английском курсе). Урок 1 поэтому НЕ про «представиться»: ser вводится
 * там, где звучит в жизни ежедневно — в оценке и реакции (Es fácil,
 * Es verdad, No es así). Каждая фраза самостоятельна вне диалога.
 *
 * Принцип деления на главы — по лицам глагола, как у английского to be,
 * с испанской спецификой:
 *
 * • ser имеет 5 форм (soy/eres/es/somos/son) против 3 у to be —
 *   лицам нужно больше места;
 * • род и число прилагательного — сквозная тема через все главы, у
 *   английского её нет вовсе;
 * • ser НЕ покрывает место (это estar, уроки 1 не касается) — вся
 *   развёртка идёт только по признаку/оценке и позже по предметам/людям.
 *
 * Vosotros не вводится: курс на латиноамериканском нейтральном
 * (решение владельца 2026-08-23). Множественное «вы» — ustedes, форма
 * совпадает с son, отдельной сессии не требует здесь (вводится в уроке 20
 * вместе с usted).
 */

/** Что вводит каждая сессия впервые. Испанские грамматические признаки. */
export const ES_EPISODE_01_SESSION_MAP_V1: readonly EpisodeSessionPlanEntry[] =
  Object.freeze([
    // ── Глава 1. Я: оценка и признак ─────────────────────────────────────
    // Только soy. Ученик впервые оценивает и описывает, встречает род и отрицание.
    { sessionOrdinal: 1, kind: 'phrases', title: 'Это легко', teaches: ['ser_copula', 'first_person_singular', 'quality_adjective', 'gender_agreement_basic'], builtOn: [] },
    { sessionOrdinal: 2, kind: 'phrases', title: 'Это не так', teaches: ['negation_no'], builtOn: [1], recalls: [1] },
    { sessionOrdinal: 3, kind: 'words_then_phrases', title: 'Мужской и женский род', teaches: ['gender_agreement_full'], builtOn: [1], recalls: [1, 2] },
    { sessionOrdinal: 4, kind: 'words_then_phrases', title: 'Правда или нет', teaches: ['truth_adjective'], builtOn: [1, 3], recalls: [1, 3] },
    { sessionOrdinal: 5, kind: 'phrases', title: 'Быстрый и медленный', teaches: ['pace_adjective'], builtOn: [1], recalls: [2, 4] },
    { sessionOrdinal: 6, kind: 'words_then_phrases', title: 'Ударение слышно', teaches: ['written_accent'], builtOn: [1, 5], recalls: [1, 5] },
    { sessionOrdinal: 7, kind: 'voice', title: 'Скажи вслух: оцени', teaches: ['spoken_production'], builtOn: [1, 2, 3, 4, 5], recalls: [1, 3, 4, 5] },
    { sessionOrdinal: 8, kind: 'checkpoint', title: 'Всё про я целиком', teaches: [], builtOn: [1, 2, 3, 4, 5, 6, 7], recalls: [1, 2, 3, 4, 5] },

    // ── Глава 2. Ты: вопрос ──────────────────────────────────────────────
    // Второе лицо. Вопрос без инверсии — только интонация и знаки.
    { sessionOrdinal: 9, kind: 'phrases', title: 'Ты есть', teaches: ['second_person_singular'], builtOn: [1], recalls: [3] },
    { sessionOrdinal: 10, kind: 'phrases', title: 'Так ли это?', teaches: ['question_marks', 'question_intonation'], builtOn: [9], recalls: [1, 9] },
    { sessionOrdinal: 11, kind: 'phrases', title: 'Ты не', teaches: [], builtOn: [2, 9], recalls: [2, 9] },
    { sessionOrdinal: 12, kind: 'words_then_phrases', title: 'Спрашиваю женщину', teaches: ['confidence_adjective'], builtOn: [3, 10], recalls: [3, 10] },
    { sessionOrdinal: 13, kind: 'phrases', title: 'Местоимение не нужно', teaches: ['pronoun_drop'], builtOn: [9, 10], recalls: [1, 9] },
    { sessionOrdinal: 14, kind: 'words_then_phrases', title: 'Согласен или нет', teaches: ['agreement_phrase'], builtOn: [5, 10], recalls: [5, 10] },
    { sessionOrdinal: 15, kind: 'voice', title: 'Скажи вслух: спроси меня', teaches: [], builtOn: [10, 12, 14], recalls: [9, 10, 14] },
    { sessionOrdinal: 16, kind: 'checkpoint', title: 'Я и ты целиком', teaches: [], builtOn: [9, 10, 11, 12, 13, 14, 15], recalls: [1, 9, 10, 13, 14] },

    // ── Глава 3. Он, она, оно: предметы и ситуации ──────────────────────
    // Третье лицо. Здесь же предметы и ситуации как подлежащее (без имён людей).
    { sessionOrdinal: 17, kind: 'phrases', title: 'Это так', teaches: ['third_person_singular'], builtOn: [1, 9], recalls: [3] },
    { sessionOrdinal: 18, kind: 'words_then_phrases', title: 'Дорого или дёшево', teaches: ['price_adjective'], builtOn: [17], recalls: [3, 17] },
    { sessionOrdinal: 19, kind: 'phrases', title: 'Это не так', teaches: [], builtOn: [2, 17], recalls: [2, 11] },
    { sessionOrdinal: 20, kind: 'phrases', title: 'Верно ли это?', teaches: [], builtOn: [14, 17], recalls: [14, 17] },
    { sessionOrdinal: 21, kind: 'words_then_phrases', title: 'Предмет — он или она', teaches: ['noun_gender'], builtOn: [17, 18], recalls: [3, 18] },
    { sessionOrdinal: 22, kind: 'phrases', title: 'Важно или нет', teaches: ['importance_adjective'], builtOn: [5, 21], recalls: [5, 21] },
    { sessionOrdinal: 23, kind: 'voice', title: 'Скажи вслух: оцени ситуацию', teaches: [], builtOn: [17, 18, 20], recalls: [17, 18, 20] },
    { sessionOrdinal: 24, kind: 'checkpoint', title: 'Он, она, оно целиком', teaches: [], builtOn: [17, 18, 19, 20, 21, 22, 23], recalls: [17, 19, 20, 21, 22] },

    // ── Глава 4. Мы и они ────────────────────────────────────────────────
    // Множественное число: и глагол, и прилагательное.
    { sessionOrdinal: 25, kind: 'phrases', title: 'Мы', teaches: ['first_person_plural'], builtOn: [1, 17], recalls: [1] },
    { sessionOrdinal: 26, kind: 'words_then_phrases', title: 'Много: и признак меняется', teaches: ['plural_agreement'], builtOn: [3, 25], recalls: [3, 25] },
    { sessionOrdinal: 27, kind: 'phrases', title: 'Они', teaches: ['third_person_plural'], builtOn: [17, 25], recalls: [17, 25] },
    { sessionOrdinal: 28, kind: 'phrases', title: 'Вдвоём: somos dos', teaches: ['number_with_ser'], builtOn: [9, 27], recalls: [9, 27] },
    { sessionOrdinal: 29, kind: 'phrases', title: 'Мы не, они не', teaches: [], builtOn: [2, 25, 27], recalls: [2, 19] },
    { sessionOrdinal: 30, kind: 'recall', title: 'Все пять форм подряд', teaches: [], builtOn: [1, 9, 17, 25, 27], recalls: [1, 9, 17, 25, 27] },
    { sessionOrdinal: 31, kind: 'voice', title: 'Скажи вслух: про нас', teaches: [], builtOn: [25, 26, 27], recalls: [25, 26, 27] },
    { sessionOrdinal: 32, kind: 'checkpoint', title: 'Все формы ser целиком', teaches: [], builtOn: [25, 26, 27, 28, 29, 30, 31], recalls: [1, 9, 17, 25, 27] },

    // ── Глава 5. Больше признаков ────────────────────────────────────────
    // Расширение лексики оценки. Форма уже известна — растёт словарь.
    { sessionOrdinal: 33, kind: 'words_then_phrases', title: 'Хорошо или плохо', teaches: ['quality_extended_adjective'], builtOn: [1, 4], recalls: [1, 4] },
    { sessionOrdinal: 34, kind: 'words_then_phrases', title: 'Одинаковое и разное', teaches: ['comparison_basic_adjective'], builtOn: [33], recalls: [4, 33] },
    { sessionOrdinal: 35, kind: 'phrases', title: 'Легко или трудно', teaches: [], builtOn: [1, 33], recalls: [1, 33] },
    { sessionOrdinal: 36, kind: 'phrases', title: 'Новое и старое', teaches: ['age_adjective'], builtOn: [33], recalls: [5, 33] },
    { sessionOrdinal: 37, kind: 'phrases', title: 'Возможно или нет', teaches: ['possibility_adjective'], builtOn: [33, 36], recalls: [33, 36] },
    { sessionOrdinal: 38, kind: 'words_then_phrases', title: 'Очень и совсем', teaches: ['intensity_adverb'], builtOn: [14, 37], recalls: [14, 33, 37] },
    { sessionOrdinal: 39, kind: 'voice', title: 'Скажи вслух: оцени всё', teaches: [], builtOn: [33, 35, 37], recalls: [33, 35, 37] },
    { sessionOrdinal: 40, kind: 'checkpoint', title: 'Признаки целиком', teaches: [], builtOn: [33, 34, 35, 36, 37, 38, 39], recalls: [33, 34, 35, 36, 37] },

    // ── Глава 6. Числом и людьми ─────────────────────────────────────────
    // ser о количестве и о причастности к группе — без имён, без анкеты.
    { sessionOrdinal: 41, kind: 'words_then_phrases', title: 'Сколько нас', teaches: ['ser_quantity'], builtOn: [28], recalls: [25, 28] },
    { sessionOrdinal: 42, kind: 'words_then_phrases', title: 'Первый и последний', teaches: ['order_adjective'], builtOn: [33], recalls: [33, 41] },
    { sessionOrdinal: 43, kind: 'words_then_phrases', title: 'Такой же, как', teaches: ['equality_comparison'], builtOn: [34], recalls: [34, 42] },
    { sessionOrdinal: 44, kind: 'phrases', title: 'Опасно или безопасно', teaches: ['safety_adjective'], builtOn: [33], recalls: [33, 42] },
    { sessionOrdinal: 45, kind: 'phrases', title: 'Полезно или бесполезно', teaches: [], builtOn: [22, 44], recalls: [22, 44] },
    { sessionOrdinal: 46, kind: 'recall', title: 'Оценка о ком угодно', teaches: [], builtOn: [1, 17, 25, 33], recalls: [1, 17, 25, 33] },
    { sessionOrdinal: 47, kind: 'voice', title: 'Скажи вслух: аргументируй', teaches: [], builtOn: [41, 43, 44], recalls: [41, 43, 44] },
    { sessionOrdinal: 48, kind: 'checkpoint', title: 'Количество и сравнение целиком', teaches: [], builtOn: [41, 42, 43, 44, 45, 46, 47], recalls: [41, 42, 43, 44, 45] },

    // ── Глава 7. Свободный разговор ──────────────────────────────────────
    // Новых конструкций нет. Всё вместе, в живых ситуациях согласия/спора.
    { sessionOrdinal: 49, kind: 'phrases', title: 'Согласиться', teaches: [], builtOn: [10, 41], recalls: [10, 41] },
    { sessionOrdinal: 50, kind: 'phrases', title: 'Возразить', teaches: [], builtOn: [14, 35], recalls: [14, 33, 35] },
    { sessionOrdinal: 51, kind: 'recall', title: 'Быстрая оценка', teaches: [], builtOn: [1, 4, 33], recalls: [1, 4, 33, 37] },
    { sessionOrdinal: 52, kind: 'phrases', title: 'Спросить мнение', teaches: [], builtOn: [10, 14, 20], recalls: [10, 14, 20] },
    { sessionOrdinal: 53, kind: 'voice', title: 'Скажи вслух: короткий спор', teaches: [], builtOn: [49, 50, 52], recalls: [49, 50, 52] },
    { sessionOrdinal: 54, kind: 'recall', title: 'Всё про признаки и число', teaches: [], builtOn: [17, 25, 33], recalls: [17, 25, 27, 33] },
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
