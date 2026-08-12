/**
 * cards-2.0 (E4): ВСЕ числа звёздной экономики (§4 мастер-плана) в одном модуле.
 * Единственный источник правды таблицы «режим × лимит × звёзды» — менять цифры
 * можно без правки логики (задел под remote config, §1 мастер-плана).
 * Логика начисления — app/flashcards/stars_system.ts.
 */

/** Режимы-источники звёзд. Режим «Колода» (просмотр) звёзд не даёт — его тут нет. */
export type StarSessionMode =
  | 'trainer'      // тренер words/phrases/arena
  | 'custom_deck'  // «Тренировать эту колоду» через тренер (общий кэп с trainer)
  | 'review'       // SRS-повторение
  | 'listening'    // слушание: фикс 1★ за сессию ≥10 карточек
  | 'blitz';       // блиц (Speed Review)

/** Источник дневного кэпа (custom_deck делит кэп с trainer — §4). */
export type StarCapSource = 'trainer' | 'review' | 'listening' | 'blitz';

/** Тип ввода ответа — порог среднего времени для 3★ пер-режимно (§4). */
export type StarInputKind = 'choice' | 'typed' | 'fill_gap';

// ── Качество сессии → звёзды ────────────────────────────────────────────────
/** ★ — accuracy ≥ 70%; ★★ — ≥ 90%; ★★★ — 100% + среднее время ≤ порога. */
export const STAR_ACCURACY_ONE = 0.7;
export const STAR_ACCURACY_TWO = 0.9;
export const STAR_ACCURACY_THREE = 1.0;

/** Средний порог времени ответа для 3★, сек: свайп/выбор 5с, письменный 12с, fill_gap 10с. */
export const STAR_THREE_AVG_TIME_SEC: Record<StarInputKind, number> = {
  choice: 5,
  typed: 12,
  fill_gap: 10,
};

// ── Таблица «режим × дневной кэп ★ с источника» (§4) ────────────────────────
export const STAR_DAILY_CAPS: Record<StarCapSource, number> = {
  trainer: 3,   // тренер + «Тренировать эту колоду» (общий кэп)
  review: 6,    // безлимит сессий — core loop, но ≤6★/день
  listening: 2, // 1★/сессия ≥10 карточек, ≤2★/день
  blitz: 3,
};

/** custom_deck входит в кэп тренера — анти-фарм экономики (§4). */
export const STAR_MODE_CAP_SOURCE: Record<StarSessionMode, StarCapSource> = {
  trainer: 'trainer',
  custom_deck: 'trainer',
  review: 'review',
  listening: 'listening',
  blitz: 'blitz',
};

// ── Слушание ────────────────────────────────────────────────────────────────
/** Фикс 1★ за сессию слушания от N карточек. */
export const LISTENING_SESSION_MIN_CARDS = 10;
export const LISTENING_SESSION_STARS = 1;

// ── Анти-фарм кастомных колод (§4, п.13 критики) ───────────────────────────
/**
 * Сессия по кастомной колоде даёт звёзды, только если содержит ≥N карточек,
 * из них ≥N уникальных, не тренированных сегодня (учёт id в customTrainedToday).
 */
export const CUSTOM_DECK_MIN_UNIQUE_UNTRAINED = 10;

// ── Недельный трек (reset по ISO-week UTC) ─────────────────────────────────
export const WEEKLY_STARS_TARGET = 21;
/** Стрик ≥7 дней → порог «идеальной недели» снижается до 18★ (§4). */
export const WEEKLY_STARS_TARGET_WITH_STREAK = 18;
export const WEEKLY_TARGET_STREAK_DAYS = 7;

/** Сундуки-чекпоинты (клейм — E6). Последний чекпоинт при стрик-скидке = 18. */
export const WEEKLY_STAR_CHECKPOINTS = [7, 14, WEEKLY_STARS_TARGET] as const;

/**
 * Выплаты чекпоинтов осколками (E6): диапазоны + ролл 70/25/5 (джекпот ×2).
 * Эмиссия ≤ ~320 осколков/нед (§4).
 */
export const CHECKPOINT_SHARD_REWARDS: Record<number, { min: number; max: number }> = {
  7: { min: 20, max: 40 },
  14: { min: 40, max: 80 },
  21: { min: 100, max: 200 },
};
export const CHECKPOINT_ROLL_WEIGHTS = { low: 70, mid: 25, jackpot: 5 } as const;
export const CHECKPOINT_JACKPOT_MULT = 2;

// ── Perfect session (3★) → буст XP ×1.5 на 15 минут (§4) ───────────────────
export const PERFECT_SESSION_XP_BOOST_MULT = 1.5;
export const PERFECT_SESSION_XP_BOOST_MS = 15 * 60_000;

// ── Best-звёзды колод (E12, §4 «Долгосрочный хук») ─────────────────────────
/** «Тускнение» best-звёзд колоды: не тренировалась N дней → isFaded (UI opacity 0.4). */
export const DECK_BEST_FADE_DAYS = 7;

/**
 * Milestone-сундуки за СУММАРНЫЕ best-звёзды всех колод (lifetime, без reset):
 * 10★ → 50 осколков, 25★ → 150 (+рамка — косметика за горизонтом), 50★ → 400.
 * Дюп-защита (п.11 критики): клейм-флаги ТОЛЬКО в shards_one_time_events
 * ('fc_milestone_10|25|50') — переустановка не выплачивает повторно.
 */
export const FC_MILESTONES = [10, 25, 50] as const;
export const MILESTONE_SHARD_REWARDS: Record<number, number> = {
  10: 50,
  25: 150,
  50: 400,
};

// ── Блиц (E12, §3.9: Speed Review по Memrise) ──────────────────────────────
export const BLITZ_DURATION_SEC = 60;
export const BLITZ_LIVES = 3;
/** Минимум карточек в колоде для блица (нужны 4 варианта ответа). */
export const BLITZ_MIN_CARDS = 4;
/** База очков за верный ответ (умножается на комбо-множитель). */
export const BLITZ_POINTS_CORRECT = 100;
/** Комбо-серии → множитель очков (пороги ×3/×5/×10 — SFX fc_combo_*, §5). */
export const BLITZ_COMBO_STEPS: readonly { streak: number; mult: number }[] = [
  { streak: 10, mult: 3 },
  { streak: 5, mult: 2 },
  { streak: 3, mult: 1.5 },
];
/** Автопереход к следующему вопросу: быстрее арены (§3.9) — 350мс / 700мс на ошибке. */
export const BLITZ_ADVANCE_OK_MS = 350;
export const BLITZ_ADVANCE_WRONG_MS = 700;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
