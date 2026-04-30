export const MOTION_DURATION = {
  fast: 180,
  normal: 240,
  slow: 320,
  celebrate: 420,
} as const;

export const MOTION_SPRING = {
  micro: { tension: 190, friction: 7 },
  ui: { tension: 85, friction: 10 },
  panel: { tension: 75, friction: 10 },
  toast: { tension: 70, friction: 9 },
} as const;

/** Subtle scale peaks — keep UI motion premium, not “bouncy toy” */
export const MOTION_SCALE = {
  hint: 1.02,
  nudge: 1.06,
  celebrate: 1.12,
  streakPop: 1.28,
  multBadge: 1.18,
  energyPulse: 1.08,
  /** Мягкое «подтверждение» иконки энергии при восстановлении (без 1.5×) */
  energyRefill: 1.14,
} as const;

/** Главный экран: каскад секций (home) — плавные пружины, не «дёрганая» детская кукла */
export const HOME_ENTRANCE = {
  sectionStaggerMs: 58,
  quickStaggerMs: 46,
  bgDriftPx: 9,
  bgDriftMs: 1500,
  initialOpacity: 0.9,
  initialTranslateY: 20,
  initialScale: 0.95,
  quickTranslateY: 12,
  quickScale: 0.93,
} as const;

