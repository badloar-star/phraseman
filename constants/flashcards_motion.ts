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
  /** SVG-кольцо прогресса набора (один раз при входе) */
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

/**
 * Свайп-оценка (§3.3). Значения перепломбированы после теста на iPhone: прежние
 * 35% ширины + velocity 800 не отрабатывали на обычном флике — карточка
 * «прыгала назад». Порог 22% (≈86px на 390pt) + velocity 450 засчитывают
 * короткий быстрый флик, но не срабатывают на случайном касании.
 * Наклон ±12°; улёт 250мс.
 */
export const FC_SWIPE = {
  thresholdRatio: 0.22,
  velocityThreshold: 450,
  rotateZDeg: 12,
  flyOutMs: 250,
  /** activeOffsetX жеста Pan — не красть вертикальный скролл */
  activationOffsetX: 8,
  /**
   * failOffsetY жеста Pan: вертикальное движение больше порога — жест падает и
   * скролл списка забирает палец (иначе Pan «съедает» вертикальный скролл).
   */
  failOffsetY: 18,
  /**
   * Подпись «знаю/учу» набирает полную непрозрачность уже на 10% ширины и
   * держится до конца жеста (без CLAMP она мигала и уходила в минус).
   */
  labelFullRatio: 0.1,
} as const;

/** Пауза между SFX и TTS (правило очереди §5: SFX → 120мс → TTS, никогда одновременно) */
export const FC_SFX_TTS_GAP_MS = 120;

/**
 * Пик scale-пульса флипа. Строго < 1: апскейл текстового слоя на iOS даёт
 * «мыльный/пиксельный» текст (растр рисуется в layout-размере и растягивается).
 * Пульс поджимает карточку вниз и возвращает в 1 — вверх не уходит НИКОГДА.
 */
export const FC_FLIP_PULSE_MIN = 0.965;

/** Perspective для 3D-флипа — ПЕРВЫМ элементом transform */
export const FC_FLIP_PERSPECTIVE = 1200;
