/**
 * cards-2.0 (E4): ядро системы звёзд (§4 мастер-плана).
 *
 * Звёзды = метрика качества сессии, НЕ кошелёк (кошелёк — осколки).
 * Хранение: AsyncStorage 'fc_stars_v1' (+SYNC_KEYS в cloud_sync с кастомным merge:
 * stars = max, checkpointsClaimed = union, weekKey — побеждает больший) +
 * зеркало users/{uid}.fc_stars в Firestore (fire-and-forget, по образцу shards_system).
 *
 * Недельный reset — по ISO-week UTC ("2026-W33"), НЕ «понедельник 00:00 локали»:
 * две таймзоны на двух устройствах давали бы двойной reset / потерю (§1).
 * Дневные кэпы и анти-фарм — тоже по UTC-дню (та же причина).
 *
 * Все записи — через одну очередь записи (withWriteLock, по образцу
 * hooks/use-flashcards.ts) — параллельные начисления не теряются.
 *
 * E5: начисление подключено из сессий тренера.
 * E6: клейм сундуков-чекпоинтов (7/14/21★): ролл награды 70/25/5 (джекпот ×2),
 * выплата осколков через shards_system.awardOneTimeVariable с регистрацией
 * '{weekKey}:{checkpoint}' в shards_one_time_events (дюп-защита второго девайса).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { emitAppEvent } from '../events';
import { getCanonicalUserId } from '../user_id_policy';
import { awardOneTimeVariable, getClaimedOneTimeEventKeys } from '../shards_system';
import {
  CHECKPOINT_JACKPOT_MULT,
  CHECKPOINT_ROLL_WEIGHTS,
  CHECKPOINT_SHARD_REWARDS,
  CUSTOM_DECK_MIN_UNIQUE_UNTRAINED,
  DECK_BEST_FADE_DAYS,
  FC_MILESTONES,
  MILESTONE_SHARD_REWARDS,
  LISTENING_SESSION_MIN_CARDS,
  LISTENING_SESSION_STARS,
  PERFECT_SESSION_XP_BOOST_MS,
  STAR_ACCURACY_ONE,
  STAR_ACCURACY_TWO,
  STAR_ACCURACY_THREE,
  STAR_DAILY_CAPS,
  STAR_MODE_CAP_SOURCE,
  STAR_THREE_AVG_TIME_SEC,
  WEEKLY_STAR_CHECKPOINTS,
  WEEKLY_STARS_TARGET,
  WEEKLY_STARS_TARGET_WITH_STREAK,
  WEEKLY_TARGET_STREAK_DAYS,
  type StarCapSource,
  type StarInputKind,
  type StarSessionMode,
} from './stars_config';

export const FC_STARS_KEY = 'fc_stars_v1';

// ════════════════════════════════════════════════════════════════════════════
// Типы состояния
// ════════════════════════════════════════════════════════════════════════════

export type FcStarsState = {
  /** ISO-week UTC, напр. "2026-W33". */
  weekKey: string;
  /** Звёзды, заработанные в текущей ISO-неделе (merge: max). */
  stars: number;
  /** Чекпоинты недели, уже заклеймленные (7/14/21; merge: union). */
  checkpointsClaimed: number[];
  /** Дневные кэпы по источникам: сколько ★ уже выдано сегодня (UTC-день). */
  dailyCaps: { dateKey: string; byMode: Partial<Record<StarCapSource, number>> };
  /** Анти-фарм кастомных колод: id карточек, тренированных сегодня (UTC-день). */
  customTrainedToday: { dateKey: string; cardIds: string[] };
  /** Lifetime-статистика (merge: max по каждому полю). */
  lifetime: { stars: number; sessions: number; perfectSessions: number };
  /** Perfect session → буст XP ×1.5; unix ms окончания (merge: max). */
  xpBoostUntil: number;
};

export type AwardSessionResult = {
  /** Правильных ответов в сессии. */
  correct: number;
  /** Всего карточек в сессии. */
  total: number;
  /** Среднее время ответа, сек (для 3★). Нет данных → 3★ недостижимы. */
  avgAnswerSec?: number;
  /** Тип ввода — порог времени 3★ пер-режимно (choice 5с / typed 12с / fill_gap 10с). */
  inputKind?: StarInputKind;
  /** id карточек сессии — обязательны для mode='custom_deck' (анти-фарм). */
  cardIds?: string[];
  /**
   * E12: ключ колоды ('saved' / 'custom' / 'pack:<id>') — best-звёзды колоды
   * (fc_deck_best_stars_v1) обновятся из этой же сессии (best = max, lastTrained).
   */
  deckKey?: string;
};

export type AwardStarsBreakdown = {
  /** «Сырые» звёзды за качество сессии (до кэпа), 0–3. */
  sessionStars: number;
  /** Точность сессии 0..1. */
  accuracy: number;
  /** Источник дневного кэпа (custom_deck → trainer). */
  capSource: StarCapSource;
  /** Остаток кэпа до начисления. */
  capRemainingBefore: number;
  /** Остаток кэпа после начисления. */
  capRemainingAfter: number;
  /** Причина нулевой выдачи (если было что выдавать). */
  reason?: 'daily_cap' | 'anti_farm' | 'low_quality' | 'too_few_cards';
};

export type AwardStarsOutcome = {
  /** Фактически начислено (после кэпа/анти-фарма). */
  awarded: number;
  /** true — сессия дала бы больше, но упёрлась в дневной кэп. */
  capped: boolean;
  breakdown: AwardStarsBreakdown;
  /** Итог недели после начисления. */
  weeklyEarned: number;
};

// ════════════════════════════════════════════════════════════════════════════
// Чистые функции (экспортированы для тестов)
// ════════════════════════════════════════════════════════════════════════════

/** ISO-week ключ по UTC: "2026-W33". Понедельник — первый день недели. */
export function isoWeekKeyUTC(ms: number = Date.now()): string {
  const d = new Date(ms);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7; // Пн=0 … Вс=6
  target.setUTCDate(target.getUTCDate() - dayNum + 3); // четверг этой ISO-недели
  const isoYear = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** UTC-день "YYYY-MM-DD" — дневные кэпы/анти-фарм не двоятся между таймзонами. */
export function utcDateKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}

const clampInt = (v: unknown, min = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.floor(n));
};

export function emptyStarsState(nowMs: number = Date.now()): FcStarsState {
  return {
    weekKey: isoWeekKeyUTC(nowMs),
    stars: 0,
    checkpointsClaimed: [],
    dailyCaps: { dateKey: utcDateKey(nowMs), byMode: {} },
    customTrainedToday: { dateKey: utcDateKey(nowMs), cardIds: [] },
    lifetime: { stars: 0, sessions: 0, perfectSessions: 0 },
    xpBoostUntil: 0,
  };
}

/** Парсинг сырого значения БЕЗ ролловера (для merge двух снапшотов). Чистая. */
export function parseStarsStateRaw(raw: unknown, fallbackNowMs: number = Date.now()): FcStarsState | null {
  const empty = emptyStarsState(fallbackNowMs);
  let parsed: Record<string, unknown> | null = null;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && !Array.isArray(p)) parsed = p as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    parsed = raw as Record<string, unknown>;
  }
  if (!parsed) return null;

  const lifetimeRaw = (parsed.lifetime ?? {}) as Record<string, unknown>;
  return {
    weekKey: typeof parsed.weekKey === 'string' && parsed.weekKey ? parsed.weekKey : empty.weekKey,
    stars: clampInt(parsed.stars),
    checkpointsClaimed: Array.isArray(parsed.checkpointsClaimed)
      ? [...new Set(parsed.checkpointsClaimed.map((c) => clampInt(c)).filter((c) => c > 0))].sort((a, b) => a - b)
      : [],
    dailyCaps: parseDailyCaps(parsed.dailyCaps, empty.dailyCaps.dateKey),
    customTrainedToday: parseTrainedToday(parsed.customTrainedToday, empty.customTrainedToday.dateKey),
    lifetime: {
      stars: clampInt(lifetimeRaw.stars),
      sessions: clampInt(lifetimeRaw.sessions),
      perfectSessions: clampInt(lifetimeRaw.perfectSessions),
    },
    xpBoostUntil: clampInt(parsed.xpBoostUntil),
  };
}

/** Парсинг сырого JSON + ролловер недели (ISO-UTC) и дня (UTC). Чистая. */
export function normalizeStarsState(raw: unknown, nowMs: number = Date.now()): FcStarsState {
  const empty = emptyStarsState(nowMs);
  const state = parseStarsStateRaw(raw, nowMs);
  if (!state) return empty;

  // Недельный reset: ISO-week UTC (при расхождении назад — тоже сбрасываем на текущую).
  if (state.weekKey !== empty.weekKey) {
    state.weekKey = empty.weekKey;
    state.stars = 0;
    state.checkpointsClaimed = [];
  }
  // Дневной ролловер кэпов и анти-фарма.
  if (state.dailyCaps.dateKey !== empty.dailyCaps.dateKey) {
    state.dailyCaps = { dateKey: empty.dailyCaps.dateKey, byMode: {} };
  }
  if (state.customTrainedToday.dateKey !== empty.customTrainedToday.dateKey) {
    state.customTrainedToday = { dateKey: empty.customTrainedToday.dateKey, cardIds: [] };
  }
  return state;
}

function parseDailyCaps(raw: unknown, todayKey: string): FcStarsState['dailyCaps'] {
  if (!raw || typeof raw !== 'object') return { dateKey: todayKey, byMode: {} };
  const r = raw as Record<string, unknown>;
  const dateKey = typeof r.dateKey === 'string' && r.dateKey ? r.dateKey : todayKey;
  const byModeRaw = (r.byMode ?? {}) as Record<string, unknown>;
  const byMode: Partial<Record<StarCapSource, number>> = {};
  for (const src of Object.keys(STAR_DAILY_CAPS) as StarCapSource[]) {
    const v = clampInt(byModeRaw[src]);
    if (v > 0) byMode[src] = v;
  }
  return { dateKey, byMode };
}

function parseTrainedToday(raw: unknown, todayKey: string): FcStarsState['customTrainedToday'] {
  if (!raw || typeof raw !== 'object') return { dateKey: todayKey, cardIds: [] };
  const r = raw as Record<string, unknown>;
  const dateKey = typeof r.dateKey === 'string' && r.dateKey ? r.dateKey : todayKey;
  const cardIds = Array.isArray(r.cardIds)
    ? [...new Set(r.cardIds.filter((c): c is string => typeof c === 'string' && c.length > 0))]
    : [];
  return { dateKey, cardIds };
}

/**
 * 0–3★ за качество сессии (§4):
 * ★ — accuracy ≥ 70%; ★★ — ≥ 90%; ★★★ — 100% + среднее время ≤ порога пер-режимно.
 * Слушание — фикс 1★ за сессию ≥10 карточек (качество не оценивается).
 */
export function computeSessionStars(mode: StarSessionMode, result: AwardSessionResult): number {
  const total = clampInt(result.total);
  if (mode === 'listening') {
    return total >= LISTENING_SESSION_MIN_CARDS ? LISTENING_SESSION_STARS : 0;
  }
  if (total <= 0) return 0;
  const correct = Math.min(clampInt(result.correct), total);
  const accuracy = correct / total;
  if (accuracy >= STAR_ACCURACY_THREE) {
    const kind: StarInputKind = result.inputKind ?? 'choice';
    const limit = STAR_THREE_AVG_TIME_SEC[kind];
    const avg = result.avgAnswerSec;
    if (typeof avg === 'number' && Number.isFinite(avg) && avg >= 0 && avg <= limit) return 3;
    return 2; // 100%, но медленно / нет данных о времени
  }
  if (accuracy >= STAR_ACCURACY_TWO) return 2;
  if (accuracy >= STAR_ACCURACY_ONE) return 1;
  return 0;
}

/** Сколько из want ★ влезает в дневной кэп источника. Чистая. */
export function applyDailyCap(
  byMode: Partial<Record<StarCapSource, number>>,
  capSource: StarCapSource,
  want: number,
): { granted: number; remainingBefore: number; remainingAfter: number } {
  const cap = STAR_DAILY_CAPS[capSource];
  const used = clampInt(byMode[capSource]);
  const remainingBefore = Math.max(0, cap - used);
  const granted = Math.max(0, Math.min(want, remainingBefore));
  return { granted, remainingBefore, remainingAfter: remainingBefore - granted };
}

/** Порог недели: стрик ≥7 дней → 18★ вместо 21★ (§4). */
export function weeklyTargetForStreak(streakDays: number): number {
  return streakDays >= WEEKLY_TARGET_STREAK_DAYS
    ? WEEKLY_STARS_TARGET_WITH_STREAK
    : WEEKLY_STARS_TARGET;
}

/** Чекпоинты недели с учётом стрик-скидки (последний = порог недели). */
export function weeklyCheckpointsForTarget(target: number): number[] {
  const base: number[] = [...WEEKLY_STAR_CHECKPOINTS];
  base[base.length - 1] = target;
  return base;
}

// ── Merge для cloud_sync restore (НЕ LWW!): union по claimed / max по stars ──

/** Больший weekKey = более свежая неделя ("YYYY-Www" сортируется лексикографически). */
const laterWeekKey = (a: string, b: string): string => (a >= b ? a : b);
const laterDateKey = laterWeekKey;

/** Merge двух состояний звёзд (два устройства). Чистая; без ролловера к «сейчас». */
export function mergeFcStarsStates(a: FcStarsState, b: FcStarsState): FcStarsState {
  const weekKey = laterWeekKey(a.weekKey, b.weekKey);
  const aWeek = a.weekKey === weekKey;
  const bWeek = b.weekKey === weekKey;
  const stars = Math.max(aWeek ? a.stars : 0, bWeek ? b.stars : 0);
  const checkpointsClaimed = [
    ...new Set([...(aWeek ? a.checkpointsClaimed : []), ...(bWeek ? b.checkpointsClaimed : [])]),
  ].sort((x, y) => x - y);

  const capsDate = laterDateKey(a.dailyCaps.dateKey, b.dailyCaps.dateKey);
  const byMode: Partial<Record<StarCapSource, number>> = {};
  for (const src of Object.keys(STAR_DAILY_CAPS) as StarCapSource[]) {
    const av = a.dailyCaps.dateKey === capsDate ? clampInt(a.dailyCaps.byMode[src]) : 0;
    const bv = b.dailyCaps.dateKey === capsDate ? clampInt(b.dailyCaps.byMode[src]) : 0;
    const v = Math.max(av, bv);
    if (v > 0) byMode[src] = v;
  }

  const trainedDate = laterDateKey(a.customTrainedToday.dateKey, b.customTrainedToday.dateKey);
  const cardIds = [
    ...new Set([
      ...(a.customTrainedToday.dateKey === trainedDate ? a.customTrainedToday.cardIds : []),
      ...(b.customTrainedToday.dateKey === trainedDate ? b.customTrainedToday.cardIds : []),
    ]),
  ];

  return {
    weekKey,
    stars,
    checkpointsClaimed,
    dailyCaps: { dateKey: capsDate, byMode },
    customTrainedToday: { dateKey: trainedDate, cardIds },
    lifetime: {
      stars: Math.max(a.lifetime.stars, b.lifetime.stars),
      sessions: Math.max(a.lifetime.sessions, b.lifetime.sessions),
      perfectSessions: Math.max(a.lifetime.perfectSessions, b.lifetime.perfectSessions),
    },
    xpBoostUntil: Math.max(a.xpBoostUntil, b.xpBoostUntil),
  };
}

/**
 * Merge-стратегия fc_stars_v1 для cloud_sync (restore со снапшота).
 * Без ролловера к «сейчас» — его сделает первый normalizeStarsState при чтении.
 */
export function mergeFcStarsForRestore(localRaw: string | null | undefined, cloudRaw: string): string {
  const localEmpty = !localRaw || !localRaw.trim();
  const cloudEmpty = !cloudRaw || !cloudRaw.trim();
  if (localEmpty && cloudEmpty) return cloudRaw;
  const local = localEmpty ? null : parseStarsStateRaw(localRaw as string);
  const cloud = cloudEmpty ? null : parseStarsStateRaw(cloudRaw);
  if (local && cloud) return JSON.stringify(mergeFcStarsStates(local, cloud));
  if (local) return JSON.stringify(local);
  if (cloud) return JSON.stringify(cloud);
  return cloudRaw;
}

/**
 * Merge-стратегия fc_deck_best_stars_v1 (E12 наполнит данными; ключ и merge — E4 по плану §7):
 * `{[deckId]: {best: 0|3, lastTrainedISO}}` — best = max, lastTrained = max.
 */
export function mergeFcDeckBestStarsForRestore(
  localRaw: string | null | undefined,
  cloudRaw: string,
): string {
  type Row = { best?: number; lastTrainedISO?: string };
  const parse = (raw: string | null | undefined): Record<string, Row> => {
    if (!raw || !raw.trim()) return {};
    try {
      const p = JSON.parse(raw);
      return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, Row>) : {};
    } catch {
      return {};
    }
  };
  const local = parse(localRaw);
  const cloud = parse(cloudRaw);
  const out: Record<string, Row> = { ...cloud };
  for (const [deckId, row] of Object.entries(local)) {
    const c = out[deckId];
    if (!c) {
      out[deckId] = row;
      continue;
    }
    const best = Math.max(clampInt(c.best), clampInt(row.best));
    const lastA = typeof c.lastTrainedISO === 'string' ? c.lastTrainedISO : '';
    const lastB = typeof row.lastTrainedISO === 'string' ? row.lastTrainedISO : '';
    const lastTrainedISO = lastA >= lastB ? lastA : lastB;
    out[deckId] = { best, ...(lastTrainedISO ? { lastTrainedISO } : {}) };
  }
  return JSON.stringify(out);
}

// ════════════════════════════════════════════════════════════════════════════
// Хранение: write-lock очередь + in-memory кэш + фоновый синк в Firestore
// ════════════════════════════════════════════════════════════════════════════

/** In-memory снимок — мгновенный UI без мигания нулей до AsyncStorage. */
let stateMemory: FcStarsState | null = null;

/** Все read-modify-write — по одному (образец hooks/use-flashcards.ts withWriteLock). */
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(() => fn());
  writeQueue = result.catch(() => {});
  return result;
}

/** Сброс модульного состояния — только для юнит-тестов. */
export function __resetStarsStateForTests(): void {
  stateMemory = null;
  writeQueue = Promise.resolve();
}

async function readStateFromDisk(nowMs: number): Promise<FcStarsState> {
  try {
    const raw = await AsyncStorage.getItem(FC_STARS_KEY);
    return normalizeStarsState(raw, nowMs);
  } catch {
    return stateMemory ? normalizeStarsState(stateMemory, nowMs) : emptyStarsState(nowMs);
  }
}

async function persistState(state: FcStarsState): Promise<void> {
  stateMemory = state;
  try {
    await AsyncStorage.setItem(FC_STARS_KEY, JSON.stringify(state));
  } catch {
    // fail-soft: память уже обновлена, следующий успешный write перезапишет
  }
}

/** Зеркало в users/{uid}.fc_stars — fire-and-forget (skipServerAwait-паттерн shards_system). */
const syncStarsToCloud = async (state: FcStarsState): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId();
    if (!uid) return;
    await firestore().collection('users').doc(uid).set({ fc_stars: JSON.stringify(state) }, { merge: true });
  } catch {
    // офлайн/ошибка — не критично: fc_stars_v1 также уходит с progress-снапшотом cloud_sync
  }
};

// ════════════════════════════════════════════════════════════════════════════
// Публичный API
// ════════════════════════════════════════════════════════════════════════════

/** Текущее состояние (с ролловером недели/дня); копия — мутировать безопасно. */
export async function getStarsState(): Promise<FcStarsState> {
  const now = Date.now();
  if (stateMemory) return normalizeStarsState(stateMemory, now);
  const state = await readStateFromDisk(now);
  stateMemory = state;
  return normalizeStarsState(state, now);
}

/** Можно ли ещё заработать ★ в этом режиме сегодня (дневной кэп источника). */
export async function canEarnToday(
  mode: StarSessionMode,
): Promise<{ allowed: boolean; remaining: number; cap: number }> {
  const state = await getStarsState();
  const capSource = STAR_MODE_CAP_SOURCE[mode];
  const cap = STAR_DAILY_CAPS[capSource];
  const used = clampInt(state.dailyCaps.byMode[capSource]);
  const remaining = Math.max(0, cap - used);
  return { allowed: remaining > 0, remaining, cap };
}

export type WeeklyStarsProgress = {
  weekKey: string;
  earned: number;
  target: number;
  checkpoints: number[];
  claimed: number[];
};

/** Недельный трек X/21 (или X/18 при стрике ≥7 — §4). */
export async function getWeeklyProgress(): Promise<WeeklyStarsProgress> {
  const state = await getStarsState();
  let streak = 0;
  try {
    streak = clampInt(await AsyncStorage.getItem('streak_count'));
  } catch {
    streak = 0;
  }
  const target = weeklyTargetForStreak(streak);
  return {
    weekKey: state.weekKey,
    earned: state.stars,
    target,
    checkpoints: weeklyCheckpointsForTarget(target),
    claimed: [...state.checkpointsClaimed],
  };
}

/**
 * Начислить звёзды за завершённую сессию (E5 подключит вызовы из экранов сессий).
 * Оптимистик: память + emitAppEvent('fc_stars_earned') сразу, AsyncStorage в очереди
 * записи, Firestore — фоном (UI не блокируется).
 */
export async function awardSessionStars(
  mode: StarSessionMode,
  result: AwardSessionResult,
): Promise<AwardStarsOutcome> {
  return withWriteLock(async () => {
    const now = Date.now();
    const state = stateMemory
      ? normalizeStarsState(stateMemory, now)
      : await readStateFromDisk(now);
    const capSource = STAR_MODE_CAP_SOURCE[mode];

    const total = clampInt(result.total);
    const accuracy = total > 0 ? Math.min(clampInt(result.correct), total) / total : 0;
    let sessionStars = computeSessionStars(mode, result);
    let reason: AwardStarsBreakdown['reason'] | undefined;

    // Анти-фарм кастомных колод (§4): ≥10 карточек, из них ≥10 уникальных,
    // не тренированных сегодня. «a→a»×10 фармится максимум раз в день.
    if (mode === 'custom_deck') {
      const ids = [...new Set((result.cardIds ?? []).filter((c) => typeof c === 'string' && c))];
      const trained = new Set(state.customTrainedToday.cardIds);
      const freshIds = ids.filter((id) => !trained.has(id));
      if (total < CUSTOM_DECK_MIN_UNIQUE_UNTRAINED) {
        sessionStars = 0;
        reason = 'too_few_cards';
      } else if (freshIds.length < CUSTOM_DECK_MIN_UNIQUE_UNTRAINED) {
        sessionStars = 0;
        reason = 'anti_farm';
      } else {
        // Регистрируем ВСЕ id сессии — повторная сессия той же колодой сегодня не фармится.
        state.customTrainedToday = {
          dateKey: state.customTrainedToday.dateKey,
          cardIds: [...new Set([...state.customTrainedToday.cardIds, ...ids])],
        };
      }
    } else if (mode === 'listening' && sessionStars === 0) {
      reason = total < LISTENING_SESSION_MIN_CARDS ? 'too_few_cards' : 'low_quality';
    } else if (sessionStars === 0) {
      reason = 'low_quality';
    }

    const { granted, remainingBefore, remainingAfter } = applyDailyCap(
      state.dailyCaps.byMode,
      capSource,
      sessionStars,
    );
    const capped = sessionStars > 0 && granted < sessionStars;
    if (capped && granted === 0) reason = 'daily_cap';

    // Обновления состояния (сессия засчитывается в lifetime всегда).
    state.lifetime = {
      stars: state.lifetime.stars + granted,
      sessions: state.lifetime.sessions + 1,
      perfectSessions: state.lifetime.perfectSessions + (sessionStars === 3 ? 1 : 0),
    };
    if (granted > 0) {
      state.stars += granted;
      state.dailyCaps = {
        dateKey: state.dailyCaps.dateKey,
        byMode: {
          ...state.dailyCaps.byMode,
          [capSource]: clampInt(state.dailyCaps.byMode[capSource]) + granted,
        },
      };
    }
    // Perfect session (3★ по качеству) → XP-буст ×1.5 на 15 минут — даже если кэп съел выдачу.
    if (sessionStars === 3) {
      state.xpBoostUntil = Math.max(state.xpBoostUntil, now + PERFECT_SESSION_XP_BOOST_MS);
    }

    // Оптимистик: память + событие мгновенно, диск — здесь же (мы уже в очереди), облако — фоном.
    stateMemory = state;
    if (granted > 0) {
      emitAppEvent('fc_stars_earned', { awarded: granted, weeklyEarned: state.stars, mode });
    }
    await persistState(state);
    void syncStarsToCloud(state);

    // E12: best-звёзды колоды — по КАЧЕСТВУ сессии (sessionStars после анти-фарма,
    // ДО дневного кэпа: кэп — экономика, best — метрика). Тренировка освежает
    // lastTrained даже при 0★ (снимает «тускнение»). Мы уже в очереди записи.
    if (result.deckKey) {
      await updateDeckBestLocked(result.deckKey, sessionStars, now);
    }

    return {
      awarded: granted,
      capped,
      weeklyEarned: state.stars,
      breakdown: {
        sessionStars,
        accuracy,
        capSource,
        capRemainingBefore: remainingBefore,
        capRemainingAfter: remainingAfter,
        ...(reason && granted === 0 ? { reason } : {}),
      },
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// E6: сундуки-чекпоинты недельного трека — ролл награды и клейм
// ════════════════════════════════════════════════════════════════════════════

export type CheckpointRollTier = 'low' | 'mid' | 'jackpot';
export type CheckpointRollResult = { amount: number; tier: CheckpointRollTier };

const randIntInclusive = (min: number, max: number, rnd: () => number): number =>
  Math.min(max, min + Math.floor(rnd() * (max - min + 1)));

/**
 * Ролл награды сундука 70/25/5 (§4): low — нижняя половина диапазона,
 * mid — верхняя, jackpot (5%) — max × 2. Чистая: rnd инжектится для тестов.
 * Эмиссия без джекпотов ≤ 40+80+200 = 320 осколков/нед (§4 «≤ ~320»).
 */
export function rollCheckpointReward(
  checkpoint: number,
  rnd: () => number = Math.random,
): CheckpointRollResult | null {
  const range = CHECKPOINT_SHARD_REWARDS[checkpoint];
  if (!range) return null;
  const { low, mid, jackpot } = CHECKPOINT_ROLL_WEIGHTS;
  const total = low + mid + jackpot;
  const r = rnd() * total;
  const midpoint = Math.floor((range.min + range.max) / 2);
  if (r < low) return { amount: randIntInclusive(range.min, midpoint, rnd), tier: 'low' };
  if (r < low + mid) return { amount: randIntInclusive(midpoint, range.max, rnd), tier: 'mid' };
  return { amount: range.max * CHECKPOINT_JACKPOT_MULT, tier: 'jackpot' };
}

/** Ключ one-time события выплаты чекпоинта: '{weekKey}:{checkpoint}' (§4). */
export const checkpointOneTimeEventKey = (weekKey: string, checkpoint: number): string =>
  `${weekKey}:${checkpoint}`;

export type ClaimCheckpointOutcome =
  | { ok: true; checkpoint: number; amount: number; tier: CheckpointRollTier; weekKey: string }
  | { ok: false; reason: 'unknown_checkpoint' | 'not_reached' | 'already_claimed' | 'payout_failed' };

/**
 * Клейм сундука-чекпоинта (тап на хабе). checkpoint — БАЗОВОЕ значение 7/14/21
 * (в checkpointsClaimed храним канон, даже когда стрик-скидка рисует последний как 18★).
 *
 * Гарантии:
 *  - валидация: чекпоинт достигнут по звёздам недели и ещё не клеймлен в этой неделе;
 *  - ролл 70/25/5 по stars_config; выплата через awardOneTimeVariable — атомарная
 *    регистрация '{weekKey}:{checkpoint}' в shards_one_time_events (ключ в SYNC_KEYS):
 *    второй девайс после restore увидит событие и не выплатит повторно;
 *  - оптимистик: память + emitAppEvent('fc_checkpoint_claimed') сразу после выплаты,
 *    AsyncStorage в очереди записи, Firestore-зеркало фоном.
 */
export async function claimCheckpoint(checkpoint: number): Promise<ClaimCheckpointOutcome> {
  return withWriteLock(async () => {
    const now = Date.now();
    const state = stateMemory
      ? normalizeStarsState(stateMemory, now)
      : await readStateFromDisk(now);

    const idx = (WEEKLY_STAR_CHECKPOINTS as readonly number[]).indexOf(checkpoint);
    if (idx < 0) return { ok: false, reason: 'unknown_checkpoint' } as const;
    if (state.checkpointsClaimed.includes(checkpoint)) {
      return { ok: false, reason: 'already_claimed' } as const;
    }

    // Порог с учётом стрик-скидки: последний чекпоинт может требовать 18★, не 21★ (§4).
    let streak = 0;
    try {
      streak = clampInt(await AsyncStorage.getItem('streak_count'));
    } catch {
      streak = 0;
    }
    const threshold = weeklyCheckpointsForTarget(weeklyTargetForStreak(streak))[idx]!;
    if (state.stars < threshold) return { ok: false, reason: 'not_reached' } as const;

    const roll = rollCheckpointReward(checkpoint);
    if (!roll) return { ok: false, reason: 'unknown_checkpoint' } as const;

    const persistClaim = async (): Promise<void> => {
      state.checkpointsClaimed = [...new Set([...state.checkpointsClaimed, checkpoint])].sort(
        (a, b) => a - b,
      );
      stateMemory = state;
      await persistState(state);
      void syncStarsToCloud(state);
    };

    // Выплата ПЕРЕД записью клейма: упади приложение между — one-time событие уже
    // зарегистрировано, повторный тап вернёт already_claimed и допишет клейм локально.
    const paid = await awardOneTimeVariable(
      checkpointOneTimeEventKey(state.weekKey, checkpoint),
      roll.amount,
      'fc_checkpoint',
    );
    if (paid.alreadyClaimed) {
      // «Второй девайс»: выплата уже была на другом устройстве — фиксируем клейм без денег.
      await persistClaim();
      return { ok: false, reason: 'already_claimed' } as const;
    }
    if (paid.awarded <= 0) return { ok: false, reason: 'payout_failed' } as const;

    await persistClaim();
    emitAppEvent('fc_checkpoint_claimed', {
      checkpoint,
      amount: paid.awarded,
      weekKey: state.weekKey,
      jackpot: roll.tier === 'jackpot',
    });
    return {
      ok: true,
      checkpoint,
      amount: paid.awarded,
      tier: roll.tier,
      weekKey: state.weekKey,
    } as const;
  });
}

// ════════════════════════════════════════════════════════════════════════════
// E12: best-звёзды колод (fc_deck_best_stars_v1) + milestone-сундуки 10/25/50★
// ════════════════════════════════════════════════════════════════════════════

export const FC_DECK_BEST_KEY = 'fc_deck_best_stars_v1';

/** Строка колоды: best 0–3★ (max за сессию) + ISO последней тренировки. */
export type DeckBestRow = { best: number; lastTrainedISO: string };
/** Ключ — deckKey: 'saved' / 'custom' / 'pack:<id>'. */
export type DeckBestMap = Record<string, DeckBestRow>;

const clampStars = (v: unknown): number => Math.max(0, Math.min(3, clampInt(v)));

/** Толерантный парсинг fc_deck_best_stars_v1 (битое/чужое отбрасывается). Чистая. */
export function parseDeckBestMap(raw: unknown): DeckBestMap {
  let parsed: Record<string, unknown> | null = null;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && !Array.isArray(p)) parsed = p as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    parsed = raw as Record<string, unknown>;
  }
  if (!parsed) return {};
  const out: DeckBestMap = {};
  for (const [deckKey, rowRaw] of Object.entries(parsed)) {
    if (!deckKey || !rowRaw || typeof rowRaw !== 'object' || Array.isArray(rowRaw)) continue;
    const r = rowRaw as Record<string, unknown>;
    out[deckKey] = {
      best: clampStars(r.best),
      lastTrainedISO: typeof r.lastTrainedISO === 'string' ? r.lastTrainedISO : '',
    };
  }
  return out;
}

/** «Тускнение» (§4): колода не тренировалась ≥7 дней → isFaded (UI opacity 0.4). Чистая. */
export function isDeckFaded(lastTrainedISO: string | undefined, nowMs: number = Date.now()): boolean {
  if (!lastTrainedISO) return true;
  const t = Date.parse(lastTrainedISO);
  if (!Number.isFinite(t)) return true;
  return nowMs - t >= DECK_BEST_FADE_DAYS * 24 * 3600 * 1000;
}

/** Суммарные best-звёзды всех колод — прогресс milestone-сундуков (§4). Чистая. */
export function sumDeckBestStars(map: DeckBestMap): number {
  let sum = 0;
  for (const row of Object.values(map)) sum += clampStars(row.best);
  return sum;
}

/** In-memory снимок карты best-звёзд (мгновенный UI, как stateMemory). */
let deckBestMemory: DeckBestMap | null = null;

/** Сброс модульного состояния deck-best — только для юнит-тестов. */
export function __resetDeckBestForTests(): void {
  deckBestMemory = null;
}

async function readDeckBestFromDisk(): Promise<DeckBestMap> {
  try {
    const raw = await AsyncStorage.getItem(FC_DECK_BEST_KEY);
    return parseDeckBestMap(raw);
  } catch {
    return deckBestMemory ? { ...deckBestMemory } : {};
  }
}

/** Карта best-звёзд колод (копия — мутировать безопасно). */
export async function getDeckBestMap(): Promise<DeckBestMap> {
  if (deckBestMemory) return { ...deckBestMemory };
  const map = await readDeckBestFromDisk();
  deckBestMemory = map;
  return { ...map };
}

/** Зеркало в users/{uid}.fc_deck_best — fire-and-forget (паттерн syncStarsToCloud). */
const syncDeckBestToCloud = async (map: DeckBestMap): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId();
    if (!uid) return;
    await firestore()
      .collection('users')
      .doc(uid)
      .set({ fc_deck_best: JSON.stringify(map) }, { merge: true });
  } catch {
    // офлайн — не критично: fc_deck_best_stars_v1 уходит с progress-снапшотом cloud_sync
  }
};

/** Внутри очереди записи: best = max(best, stars), lastTrained = now. */
async function updateDeckBestLocked(deckKey: string, stars: number, nowMs: number): Promise<DeckBestRow> {
  const map = deckBestMemory ? { ...deckBestMemory } : await readDeckBestFromDisk();
  const prev = map[deckKey];
  const row: DeckBestRow = {
    best: Math.max(prev ? clampStars(prev.best) : 0, clampStars(stars)),
    lastTrainedISO: new Date(nowMs).toISOString(),
  };
  map[deckKey] = row;
  deckBestMemory = map;
  try {
    await AsyncStorage.setItem(FC_DECK_BEST_KEY, JSON.stringify(map));
  } catch {
    // fail-soft: память обновлена, следующий успешный write перезапишет
  }
  void syncDeckBestToCloud(map);
  return row;
}

/**
 * Записать best-звёзды колоды вне awardSessionStars (сессии, которые считают
 * звёзды сами). best = max за все сессии, lastTrained освежается всегда.
 */
export async function recordDeckBest(
  deckKey: string,
  stars: number,
  nowMs: number = Date.now(),
): Promise<DeckBestRow> {
  return withWriteLock(() => updateDeckBestLocked(deckKey, stars, nowMs));
}

// ── Milestone-сундуки за суммарные best-звёзды (10/25/50★, §4) ───────────────

/** Ключ one-time события выплаты milestone: 'fc_milestone_10|25|50' (§4, п.11). */
export const milestoneOneTimeEventKey = (milestone: number): string => `fc_milestone_${milestone}`;

export type MilestoneInfo = {
  milestone: number;
  reward: number;
  /** Суммарные best-звёзды достигли порога. */
  reached: boolean;
  /**
   * Выплата уже была (по shards_one_time_events — ЕДИНСТВЕННЫЙ источник правды:
   * после переустановки локальный стейт пуст, но событие есть → «заклеймлено»).
   */
  claimed: boolean;
};

export type MilestonesState = { totalBest: number; milestones: MilestoneInfo[] };

/** Состояние milestone-сундуков для UI (прогресс + клеймы из one-time событий). */
export async function getMilestonesState(): Promise<MilestonesState> {
  const [map, claimedKeys] = await Promise.all([
    getDeckBestMap(),
    getClaimedOneTimeEventKeys(FC_MILESTONES.map(milestoneOneTimeEventKey)).catch((): string[] => []),
  ]);
  const claimed = new Set(claimedKeys);
  const totalBest = sumDeckBestStars(map);
  return {
    totalBest,
    milestones: FC_MILESTONES.map((m) => ({
      milestone: m,
      reward: MILESTONE_SHARD_REWARDS[m] ?? 0,
      reached: totalBest >= m,
      claimed: claimed.has(milestoneOneTimeEventKey(m)),
    })),
  };
}

export type ClaimMilestoneOutcome =
  | { ok: true; milestone: number; amount: number }
  | { ok: false; reason: 'unknown_milestone' | 'not_reached' | 'already_claimed' | 'payout_failed' };

/**
 * Клейм milestone-сундука (тап на хабе). Клейм-флаг — ТОЛЬКО регистрация
 * 'fc_milestone_N' в shards_one_time_events внутри awardOneTimeVariable
 * (атомарно с балансом): переустановка/второй девайс не выплатят повторно.
 */
export async function claimMilestone(milestone: number): Promise<ClaimMilestoneOutcome> {
  if (!(FC_MILESTONES as readonly number[]).includes(milestone)) {
    return { ok: false, reason: 'unknown_milestone' };
  }
  const amount = MILESTONE_SHARD_REWARDS[milestone] ?? 0;
  if (amount <= 0) return { ok: false, reason: 'unknown_milestone' };

  const totalBest = sumDeckBestStars(await getDeckBestMap());
  if (totalBest < milestone) return { ok: false, reason: 'not_reached' };

  const paid = await awardOneTimeVariable(milestoneOneTimeEventKey(milestone), amount, 'fc_milestone');
  if (paid.alreadyClaimed) return { ok: false, reason: 'already_claimed' };
  if (paid.awarded <= 0) return { ok: false, reason: 'payout_failed' };

  emitAppEvent('fc_milestone_claimed', { milestone, amount: paid.awarded });
  return { ok: true, milestone, amount: paid.awarded };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
