// ─── ГИБРИД «Световод + Чекан» — единый словарь движения ────────────────────
// зачем: владелец утвердил направление (2026-08-15): база — свет и глубина
// (без отскока), удар и вес — ТОЛЬКО в кульминациях наград. Эти токены —
// источник правды для всех новых анимаций; макеты-эталоны: .motion-mockups/
// (phraseman-hybrid.html), законы движения — из ResultsSequence (Motion DNA).

/** База «Световод»: свет рождает форму, посадка БЕЗ отскока. */
export const LUM = {
  instantMs: 0,
  backdropMs: 240,
  contentMs: 260,
  heroFadeMs: 110,
  bloomDriftMs: 900,
  /** Источник света загорается ПЕРВЫМ. */
  bloomMs: 420,
  /** Форма выходит из света (opacity). */
  resolveMs: 380,
  /** Свет обегает кромку после кульминации. */
  rimMs: 620,
  /** Выход всегда короче входа (закон №15). */
  exitMs: 260,
  /** Посадка без отскока. */
  settle: { stiffness: 150, damping: 22, mass: 1 },
  /** Неравномерная лестница каскада (закон №2: ровный метроном запрещён). */
  ladder: [0, 74, 172, 306, 478, 688] as const,
} as const;

/** Акцент «Чекан»: удар и вес — только герой кульминации (закон №1). */
/** Finite owner-approved first-visit artwork entrances. */
export const INTRO = {
  comic: { offset: 24 },
  orbit: { lift: 26, scaleFrom: 0.86, rotateFrom: -9, atmosphereFrom: -22, atmosphereTo: -10 },
  premiere: { lift: 12, scaleFrom: 1.12, rotateFrom: 0, atmosphereFrom: -28, atmosphereTo: -20 },
} as const;

export const CHK = {
  anticipMs: 180,
  fallMs: 220,
  ringPrimaryMs: 720,
  ringSecondaryMs: 920,
  ringDelayMs: 90,
  impactTextDelayMs: 80,
  ctaExtraDelayMs: 60,
  /** Кривая падения с ускорением. */
  fallBezier: [0.6, 0, 0.95, 0.5] as const,
  /** Сплющивание героя при ударе. */
  squash: { stiffness: 260, damping: 5, mass: 1 },
  /** Отдача поверхности (6px → 0). */
  recoil: { stiffness: 180, damping: 6, mass: 1 },
  recoilShiftPx: 6,
  ladder: [0, 62, 146, 262, 410, 590] as const,
} as const;

/** Единый пресс-стандарт (сводит PressableScale×2 и TapScale к одной физике). */
export const PRESS = {
  downMs: 90,
  reducedDownMs: 70,
  reducedUpMs: 90,
  edgeHeight: {
    compact: 4,
    default: 6,
  },
  scale: {
    primary: 0.965,
    secondary: 0.97,
    icon: 0.94,
    chip: 0.95,
    card: 0.988,
  },
  /** Возврат: перелёт ~6% ТОЛЬКО у primary; остальным — без перелёта. */
  releasePrimary: { mass: 0.55, damping: 12, stiffness: 210 },
  release: { mass: 0.6, damping: 16, stiffness: 210 },
} as const;

/** Свита: пружины второстепенных элементов (перелёт 6–9%). */
export const SUITE = {
  idleFloatMinPx: -7,
  idleFloatMaxPx: 2,
  idleFloatMs: 1700,
  row: { mass: 0.6, damping: 13, stiffness: 150 },
  text: { mass: 0.7, damping: 14, stiffness: 160 },
  pulse: { mass: 0.55, damping: 14, stiffness: 210 },
  anchor: { mass: 0.55, damping: 12, stiffness: 200 },
  hero: { mass: 0.8, damping: 12, stiffness: 130 },
  cta: { mass: 0.6, damping: 12, stiffness: 120 },
  orbit: { mass: 0.8, damping: 14, stiffness: 120 },
  glow: { mass: 0.5, damping: 10, stiffness: 190 },
} as const;

export const SURVEY_HYBRID = {
  questionShiftPx: 8,
  progressSegmentMinPx: 4,
  taskIconSize: 64,
  taskRewardIconSize: 18,
  rewardLiftPx: -12,
  rewardStartScale: 1.08,
} as const;

/** Bottom-sheet drag physics. Direct manipulation may follow the finger even
 * under Reduce Motion; the automatic snap-back becomes instantaneous there. */
export const SHEET = {
  dragReturn: { damping: 22, stiffness: 300 },
} as const;

/**
 * Движение кита 2.0 (kit.css, гейт владельца 04.10 «анимации в точности как на макетах»):
 * шторка .sheet — выезд 440 мс cubic-bezier(.2,1,.3,1), уход короче входа; затемнение как у гибрида.
 */
export const KIT_MOTION = {
  sheetInMs: 440,
  sheetOutMs: LUM.exitMs,
  backdropMs: LUM.backdropMs,
  /** cubic-bezier(.2,1,.3,1) */
  sheetEase: [0.2, 1, 0.3, 1] as const,
  /** Закрытие перетаскиванием — как у общих шторок. */
  dragClosePx: 88,
  dragCloseVelocity: 900,
  dragResist: 0.12,
} as const;

/** Тосты: вход/выход и жёсткая ошибка. */
export const TOAST = {
  enterMs: LUM.contentMs,
  exitMs: LUM.exitMs,
  errorSpring: { mass: 1, damping: 17, stiffness: 240 },
  /** Горизонтальная дрожь ошибки: единственное место, где дрожь уместна. */
  errorShakePx: [6, -5, 3, -2, 0] as const,
  errorShakeStepMs: 60,
  sweepMs: 520,
  countMs: 420,
  feedbackMs: 220,
  stateResolveMs: 180,
  idleBreathMs: 1400,
} as const;

/** Три попытки в учебной сессии: короткая дрожь и исчезновение одного сердца. */
export const SESSION_ATTEMPTS_MOTION = {
  shakeOffsetsPx: [0, -3, 3, -2, 0] as const,
  shakeSegmentMs: 60,
  lossPopScale: 1.22,
  lossLiftPx: -3,
  lossDropPx: 8,
  lossTiltDeg: 12,
  lossPopMs: 90,
  lossExitMs: 210,
  consumedScale: 0.64,
  consumedFadeMs: 210,
  refillStartScale: 0.42,
  refillLiftPx: 7,
  refillStaggerMs: 70,
  refillFadeMs: 160,
  refillSpring: Object.freeze({ damping: 9, stiffness: 260, mass: 0.55 }),
  haloStartScale: 0.55,
  haloEndScale: 1.55,
  haloMs: 280,
  exhaustedModalDelayMs: 340,
} as const;

/** Угловой знак цены старта: один короткий вход и конечный световой импульс. */
export const ENERGY_COST_BADGE_HYBRID = {
  entryShiftPx: -6,
  entryScale: 0.94,
  pulseScale: 1.06,
  idleRotationDeg: -4,
  pulseRotationDeg: 4,
} as const;

/** Таббар «жидкое золото»: капсула течёт тяжёлой пружиной без дрожи, пресс глубже. */
export const TABBAR_HYBRID = {
  /** Капсула активной вкладки (legacy Animated.spring принимает stiffness/damping/mass). */
  capsule: { stiffness: 190, damping: 22, mass: 1.1 },
  /** Вдавливание иконки при нажатии. */
  press: { stiffness: 260, damping: 18, mass: 0.7 },
  /** Bloom активной иконки: масштаб свечения и длительность зажигания. */
  bloomScale: 1.9,
  bloomMs: LUM.bloomMs,
  /** Перелив по кромке капсулы после переключения. */
  rimMs: LUM.rimMs,
  /** One-shot Arena hub entrance; finite by design to release the GPU. */
  hubEntry: {
    iconSpring: { damping: 15, stiffness: 190, mass: 0.75 },
    glowInMs: LUM.bloomMs,
    glowOutMs: TOAST.sweepMs,
    backdropInMs: LUM.resolveMs,
    backdropOutMs: TOAST.sweepMs,
  },
  /** Полная хореография интерактивного DEV-превью, без локальных motion-чисел. */
  preview: {
    stretchPerTab: 0.22,
    stretchY: 0.82,
    stretchMs: 160,
    dropStartY: -6,
    dropEndY: 10,
    dropAppearMs: 90,
    dropDelayMs: 200,
    dropFallMs: 170,
    iconImpactScale: 0.9,
    waveNudgePx: 2.5,
    waveLeadMs: 60,
    waveStepMs: 55,
    waveNudgeMs: 110,
    blobTravel: { stiffness: 160, damping: 15, mass: 0.9 },
    blobSettle: { stiffness: 170, damping: 11, mass: 0.6 },
    iconPop: { stiffness: 200, damping: 9, mass: 0.5 },
    waveReturn: { stiffness: 210, damping: 12, mass: 0.5 },
  },
} as const;

/** Полка достижений: один неподвижный свет, награды проходят под ним. */
export const ACHIEVEMENT_SHELF_HYBRID = {
  selectedScale: 1.08,
  neighborScale: 0.88,
  neighborOpacity: 0.48,
  selectedOpacity: 1,
  detailFadeMs: LUM.contentMs,
  detailTranslateY: 6,
  selectionHapticMinIntervalMs: 90,
  reflectionDelayMs: 80,
  reflectionMs: 720,
  reflectionStartX: -54,
  reflectionTravel: 320,
} as const;

/** Нижний выбор категории достижений: карточная капсула и список вверх. */
export const ACHIEVEMENT_CATEGORY_DOCK_HYBRID = {
  rowTranslateY: 18,
  rowScaleFrom: 0.9,
  rowStaggerMs: 46,
  reducedMotionMs: LUM.heroFadeMs,
  scrimMs: LUM.backdropMs,
  scrimOpacity: 0.38,
  springOpen: { damping: 20, stiffness: 240, mass: 0.75 },
  springClose: { damping: 24, stiffness: 280, mass: 0.75 },
  dockBottomGap: 6,
  capsuleMinHeight: 52,
  capsuleHorizontalPadding: 18,
  capsuleGap: 10,
  rowMinHeight: 52,
  rowGap: 8,
  menuGap: 10,
  menuMaxHeight: 430,
  menuMinHeight: 180,
  headerClearance: 160,
} as const;
