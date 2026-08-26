/**
 * Все тайминги/easing для 7 одобренных режимов, извлечённые дословно из
 * "СПЕЦИФИКАЦИЯ ДЛЯ RN (REANIMATED 4)" каждого макета в docs/v2/mockups/.
 * Один файл — единый источник правды, чтобы 7 компонентов режимов не плодили
 * рассинхронизированные копии одних и тех же чисел (владелец: "Быстрее" ≠
 * произвольная цифра в каждом файле).
 *
 * зачем: технический аудит (Advisor, Opus) потребовал явного комментария —
 * какой макет является источником каждого блока чисел, чтобы будущая
 * правка одного макета не потерялась при синхронизации с кодом.
 */

/** Общие easing-кривые, идентичные во ВСЕХ 7 макетах (--ease-slide/--ease-outquint/--ease-spring). */
export const MODE_EASING_V1 = Object.freeze({
  slide: [0.33, 0.52, 0.25, 0.99] as const,
  outQuint: [0.23, 1, 0.32, 1] as const,
  spring: [0.38, 0.7, 0.125, 1.0] as const,
});

/** Общая пружина Reanimated под "spring ui (d20 s300)" из макетов — умеренно
 * тугая пружина для стаггеров чипов/карточек. damping/stiffness взяты 1:1. */
export const MODE_SPRING_UI_V1 = Object.freeze({ damping: 20, stiffness: 300 });
/** "spring micro" — более резкая короткая пружина для посадки/сквоша/бампа. */
export const MODE_SPRING_MICRO_V1 = Object.freeze({ damping: 14, stiffness: 260 });

/**
 * Общие для всех режимов элементы шапки/наград (streak pill, star fly, miss
 * fly, confetti, gold wave, card transition) — идентичны байт-в-байт во всех
 * 7 макетах (02, 03, 04, 05, 06, 07, 14), источник: секция "Спецификация для
 * RN" в каждом файле, повторяющиеся строки "Полёт звезды", "Бамп счётчика",
 * "Пилюля серии", "Золотая волна", "Переход карточек".
 */
export const MODE_SHARED_MOTION_V1 = Object.freeze({
  /** Стаггер входа чипов/карточек банка. */
  bankStaggerMs: 46,
  /** Перелёт чипа между зонами (FLIP). Источник: 02 (320мс), 06 использует 280мс
   * — сохраняем разницу по режиму, см. PHRASE_BUILDER/CONTEXT_GAP ниже. */
  chipFlightMs: 320,
  /** Посадка чипа (сквош) после приземления. */
  chipLandMs: 300,
  /** Пресс чипа (3D-кромка), вибро без звука. */
  chipPressMs: 120,
  /** «Проверить»: лок кнопки перед processing-паузой. Совпадает с фазой
   * "processing" в mode_contract_v1 (LearningV2ModePhaseV1). */
  submitLockMs: 160,
  /** Волна вердикта по чипам/карточкам — задержка на элемент. */
  verdictWaveStepMs: 70,
  /** Полёт звезды + трейл к счётчику. */
  starFlightMs: 700,
  /** Бамп счётчика (звёзды/ошибки) — spring micro, scale 1.28. */
  counterBumpScale: 1.28,
  /** Золотая волна по экрану на вехах серии 3/5/7. */
  goldWaveMs: 700,
  /** Пилюля серии: анимация появления. */
  streakPillInMs: 340,
  /** Тонировка ошибки — БЕЗ тряски/вибро, только opacity/tint. */
  wrongTintMs: 180,
  /** Пауза перед возвратом неверного чипа/варианта в банк. */
  wrongPauseBeforeReturnMs: 900,
  /** Пауза перед автосборкой/автозаполнением после ВТОРОЙ ошибки. */
  secondWrongPauseMs: 1000,
  /** Каскад автосборки правильного ответа (чип/слово за шагом). */
  autoAssembleStepMs: 120,
  /** Авто-«Дальше»: прогресс-заливка кнопки, тап = сразу. */
  autoNextMs: 1400,
  /** Переход между карточками: выезд/въезд, сдвиг + поворот 2.5°. */
  cardTransitionOutMs: 240,
  cardTransitionInMs: 280,
  cardTransitionOffsetPx: 46,
  cardTransitionInOffsetPx: 52,
  cardTransitionRotateDeg: 2.5,
});

/**
 * Режим 1/7 — Сборка фразы (ЭТАЛОН). Источник: docs/v2/mockups/02-phrase-builder.html,
 * секция "Спецификация для RN (Reanimated 4)".
 */
export const PHRASE_BUILDER_MOTION_V1 = Object.freeze({
  bankChipStaggerMs: MODE_SHARED_MOTION_V1.bankStaggerMs,
  chipFlightMs: 320,
  chipLandMs: MODE_SHARED_MOTION_V1.chipLandMs,
  chipPressMs: MODE_SHARED_MOTION_V1.chipPressMs,
  submitLockMs: MODE_SHARED_MOTION_V1.submitLockMs,
  verdictWaveStepMs: MODE_SHARED_MOTION_V1.verdictWaveStepMs,
  starFlightMs: MODE_SHARED_MOTION_V1.starFlightMs,
  wrongTintMs: MODE_SHARED_MOTION_V1.wrongTintMs,
  wrongReturnMs: 320,
  wrongPauseBeforeReturnMs: MODE_SHARED_MOTION_V1.wrongPauseBeforeReturnMs,
  autoAssembleStepMs: MODE_SHARED_MOTION_V1.autoAssembleStepMs,
  autoNextMs: MODE_SHARED_MOTION_V1.autoNextMs,
});

/**
 * Режим 2/7 — Выбор на слух. Источник: docs/v2/mockups/03-listen-choose.html.
 */
export const LISTEN_CHOOSE_MOTION_V1 = Object.freeze({
  /** Прогресс-кольцо play: полный проход при нормальной скорости. */
  ringFillMs: 1500,
  /** «Медленнее» (0.75×): отдельный slow-файл, не playbackRate. */
  ringFillSlowMs: 2000,
  /** Пульс кнопки play пока звучит, останов на audioend/blur. */
  playPulseMs: 1100,
  /** Выбор строки-варианта: подъём + чек-бейдж spring. */
  optionSelectMs: 140,
  submitLockMs: MODE_SHARED_MOTION_V1.submitLockMs,
  /** Success: radial-wipe от точки тапа (центр). */
  successWipeMs: 360,
  /** Раскрытие транскрипта после успеха (blur-in). */
  revealMs: 320,
  starFlightMs: MODE_SHARED_MOTION_V1.starFlightMs,
  wrongTintMs: MODE_SHARED_MOTION_V1.wrongTintMs,
  /** Первая попытка: пауза перед сбросом выбора. */
  wrongFirstAttemptPauseMs: 1400,
  /** Вторая попытка: пауза перед подсветкой верного + reveal. */
  secondWrongPauseMs: MODE_SHARED_MOTION_V1.secondWrongPauseMs,
  autoNextMs: MODE_SHARED_MOTION_V1.autoNextMs,
});

/**
 * Режим 3/7 — Пары звуков. Источник: docs/v2/mockups/04-sound-contrast.html.
 */
export const SOUND_CONTRAST_MOTION_V1 = Object.freeze({
  roundRingFillMs: 1400,
  cardListenPulseMs: 900,
  playPulseMs: 1100,
  cardSelectMs: 140,
  submitLockMs: MODE_SHARED_MOTION_V1.submitLockMs,
  successFillMs: 220,
  starFlightMs: MODE_SHARED_MOTION_V1.starFlightMs,
  wrongTintMs: MODE_SHARED_MOTION_V1.wrongTintMs,
  finalAppearMs: 240,
  finalStarStepMs: 700,
  autoNextMs: MODE_SHARED_MOTION_V1.autoNextMs,
});

/**
 * Режим 4/7 — Диктант. Источник: docs/v2/mockups/05-listen-build.html.
 */
export const LISTEN_BUILD_DICTATION_MOTION_V1 = Object.freeze({
  ringFillMs: 1500,
  ringFillSlowMs: 3000,
  bankChipStaggerMs: MODE_SHARED_MOTION_V1.bankStaggerMs,
  chipFlightMs: 320,
  chipLandMs: MODE_SHARED_MOTION_V1.chipLandMs,
  chipPressMs: MODE_SHARED_MOTION_V1.chipPressMs,
  submitLockMs: MODE_SHARED_MOTION_V1.submitLockMs,
  verdictWaveStepMs: MODE_SHARED_MOTION_V1.verdictWaveStepMs,
  revealMs: 320,
  starFlightMs: MODE_SHARED_MOTION_V1.starFlightMs,
  wrongTintMs: MODE_SHARED_MOTION_V1.wrongTintMs,
  wrongReturnMs: 320,
  wrongPauseBeforeReturnMs: MODE_SHARED_MOTION_V1.wrongPauseBeforeReturnMs,
  autoAssembleStepMs: MODE_SHARED_MOTION_V1.autoAssembleStepMs,
  autoNextMs: MODE_SHARED_MOTION_V1.autoNextMs,
});

/**
 * Режим 5/7 — Контекстный пропуск. Источник: docs/v2/mockups/06-context-gap.html.
 */
export const CONTEXT_GAP_GRAMMAR_MOTION_V1 = Object.freeze({
  chipFlightMs: 280,
  chipLandMs: 260,
  chipPressMs: MODE_SHARED_MOTION_V1.chipPressMs,
  submitLockMs: MODE_SHARED_MOTION_V1.submitLockMs,
  /** Wipe-заливка ВСЕГО предложения слева направо (clip-path на вебе;
   * в RN — MaskedView + Reanimated shared value ширины маски). */
  successWipeMs: 560,
  revealMs: 320,
  starFlightMs: MODE_SHARED_MOTION_V1.starFlightMs,
  wrongTintMs: MODE_SHARED_MOTION_V1.wrongTintMs,
  wrongReturnMs: 280,
  wrongPauseBeforeReturnMs: MODE_SHARED_MOTION_V1.wrongPauseBeforeReturnMs,
  autoNextMs: MODE_SHARED_MOTION_V1.autoNextMs,
});

/**
 * Режим 6/7 — Пары на скорость. Источник: docs/v2/mockups/07-speed-match.html.
 * ВАЖНО: макет использует JS setInterval для таймера раунда — правило проекта
 * (AGENTS.md Performance Bible) запрещает setInterval+setState для таймера
 * в RN; speed_match_mode_v1.tsx обязан использовать useSharedValue +
 * useFrameCallback, тайминги ниже остаются как контракт длительностей,
 * а не как рецепт реализации таймера.
 */
export const SPEED_MATCH_MOTION_V1 = Object.freeze({
  fieldCardStaggerMs: 40,
  cardSelectMs: 140,
  matchSquashMs: 160,
  matchFadeOutMs: 240,
  mismatchTintMs: 300,
  comboPopMs: 900,
  counterBumpMs: 360,
  pauseOverlayMs: 240,
  finishStarStepMs: 420,
  finishStarFlightMs: MODE_SHARED_MOTION_V1.starFlightMs,
  screenTransitionMs: 240,
  /** Окно блокировки повторного тапа во время резолва пары (не даёт гонок). */
  interactionLockMs: 550,
});

/**
 * Режим 7/7 — Повтор за моделью. Источник:
 * docs/v2/mockups/14-repeat-compare.html.
 */
export const SCRIPTED_REPEAT_COMPARE_MOTION_V1 = Object.freeze({
  chunkHighlightStepMs: 120,
  micRingPulseMs: 1400,
  /** Столбики амплитуды — НЕ setTimeout-цикл в RN, а Reanimated withRepeat
   * per-bar; интервал ниже — только длительность одного шага-цели. */
  waveformStepMs: 140,
  recordStopToProcessingMs: 400,
  wordChipStaggerMs: 80,
  comparePanelMs: 180,
  starFlightMs: MODE_SHARED_MOTION_V1.starFlightMs,
  wrongTintMs: MODE_SHARED_MOTION_V1.wrongTintMs,
  /** UNCERTAIN/INVALID — нейтральная полоса, БЕЗ error-хаптика. */
  neutralStripeMs: 200,
  autoNextMs: MODE_SHARED_MOTION_V1.autoNextMs,
  /** Максимум учебных повторов до "Продолжить с поддержкой". */
  maxLearningRetries: 2,
});
