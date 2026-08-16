// ─── ГИБРИД «Световод + Чекан» — единый словарь движения ────────────────────
// зачем: владелец утвердил направление (2026-08-15): база — свет и глубина
// (без отскока), удар и вес — ТОЛЬКО в кульминациях наград. Эти токены —
// источник правды для всех новых анимаций; макеты-эталоны: .motion-mockups/
// (phraseman-hybrid.html), законы движения — из ResultsSequence (Motion DNA).

/** База «Световод»: свет рождает форму, посадка БЕЗ отскока. */
export const LUM = {
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
export const CHK = {
  anticipMs: 180,
  fallMs: 220,
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
  row: { mass: 0.6, damping: 13, stiffness: 150 },
  text: { mass: 0.7, damping: 14, stiffness: 160 },
  pulse: { mass: 0.55, damping: 14, stiffness: 210 },
} as const;

/** Тосты: вход/выход и жёсткая ошибка. */
export const TOAST = {
  enterMs: LUM.resolveMs,
  exitMs: LUM.exitMs,
  errorSpring: { mass: 1, damping: 17, stiffness: 240 },
  /** Горизонтальная дрожь ошибки: единственное место, где дрожь уместна. */
  errorShakePx: [6, -5, 3, -2, 0] as const,
  errorShakeStepMs: 60,
} as const;
