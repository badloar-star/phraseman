/**
 * cards-2.0: токены движения раздела «Карточки» (Cards 2.0, §2 мастер-плана).
 * Единый источник правды для пружин/таймингов/стагера — не хардкодить в экранах.
 * Только transform + opacity на UI-потоке (Reanimated 4); бюджет — Helio G35 / 60fps.
 */

export const FC_SPRING = {
  /** Пресс-эффект «Duolingo-кнопки» (вынесено из HubTileShell) */
  press: { damping: 16, stiffness: 420 },
  /** 3D-флип карточки (duration-based spring Reanimated) */
  flip: { duration: 450, dampingRatio: 0.8 },
  /** Возврат карточки после незавершённого свайпа */
  return: { duration: 350, dampingRatio: 0.7 },
  /** SVG-кольцо прогресса колоды (один раз при входе) */
  ring: { duration: 800, dampingRatio: 1 },
} as const;

export const FC_TIMING = {
  /** Кроссфейд-фолбэк флипа (web / reduceMotion / lowPower) */
  fast: 150,
  base: 250,
  enter: 300,
  /** Полёт звезды в счётчик хедера */
  flyStar: 600,
} as const;

export const FC_STAGGER = {
  step: 60,
  cap: 8,
} as const;

/** delay = min(i, cap) * step — каскад входа секций/плиток */
export function fcStaggerDelay(index: number): number {
  return Math.min(Math.max(0, index), FC_STAGGER.cap) * FC_STAGGER.step;
}

/** Свайп-оценка (§3.3): порог 35% ширины ИЛИ velocityX > 800; наклон ±12°; улёт 250мс */
export const FC_SWIPE = {
  thresholdRatio: 0.35,
  velocityThreshold: 800,
  rotateZDeg: 12,
  flyOutMs: 250,
  /** activeOffsetX жеста Pan — не красть вертикальный скролл */
  activationOffsetX: 10,
} as const;

/** Пауза между SFX и TTS (правило очереди §5: SFX → 120мс → TTS, никогда одновременно) */
export const FC_SFX_TTS_GAP_MS = 120;

/** Perspective для 3D-флипа — ПЕРВЫМ элементом transform */
export const FC_FLIP_PERSPECTIVE = 1200;
