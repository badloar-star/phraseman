// ════════════════════════════════════════════════════════════════════════════
// bot_difficulty.ts — Параметры поведения бота в зависимости от ранга игрока
//
// Рантайм работает так: чем выше ранг игрока, тем «сложнее» бот — отвечает
// быстрее и точнее. Минимальная погрешность (jitter + не 100% точности)
// сохраняется на любом уровне, чтобы реальный игрок мог выиграть.
//
// rankIndex: 0 (Bronze I) … 23 (Legend III)
// ════════════════════════════════════════════════════════════════════════════

const MAX_RANK_INDEX = 23;

export interface BotProfile {
  /** Вероятность правильного ответа [0..1]. */
  accuracy: number;
  /** Базовая задержка ответа в мс (до случайного шума). */
  baseDelayMs: number;
  /** Случайный шум +/- мс к baseDelayMs. */
  jitterMs: number;
}

/** Линейная интерполяция a→b по t∈[0,1]. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Рассчитать поведение бота для текущего ранга игрока.
 * Bronze I  → 50% accuracy, ~8000±1500мс
 * Legend III → 85% accuracy, ~1800±1500мс
 */
export function getBotProfile(rankIndex: number): BotProfile {
  const t = Math.max(0, Math.min(1, rankIndex / MAX_RANK_INDEX));
  return {
    accuracy: lerp(0.50, 0.85, t),
    baseDelayMs: lerp(8000, 1800, t),
    jitterMs: 1500,
  };
}

/**
 * Сэмпл фактической задержки ответа бота.
 * Гарантия: >= 800мс (бот не отвечает мгновенно), <= 38_000мс (укладывается в окно вопроса 40с).
 */
export function sampleBotDelayMs(profile: BotProfile): number {
  const noise = (Math.random() * 2 - 1) * profile.jitterMs;
  const raw = profile.baseDelayMs + noise;
  return Math.max(800, Math.min(38_000, Math.round(raw)));
}

/**
 * Решить, ответит ли бот правильно на этот вопрос.
 * Простой Бернулли-сэмпл, без памяти стрика. Достаточно для раннего этапа.
 */
export function rollBotIsCorrect(profile: BotProfile): boolean {
  return Math.random() < profile.accuracy;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
