/**
 * Запись результатов бот-матча через CF arenaBotMatchRecord (Admin SDK — обходит
 * firestore.rules allow write: if false). Клиент вызывает CF, всё хранится на сервере.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const FUNCTIONS_REGION = 'us-central1';

const DRAW_XP = 30;

const LEVELS = ['I', 'II', 'III'] as const;
const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'] as const;

const PENDING_KEY = 'arena_bot_match_pending_v1';

export type BotArenaMatchArgs = {
  sessionId: string;
  uid: string;
  won: boolean;
  isLast: boolean;
  isDraw: boolean;
  myScore: number;
  oppScore: number;
  oppName: string;
  /** Текущий ник игрока. Если не пуст и не локализованный placeholder ("Игрок"/"Гравець"/"Jugador") —
   * перетрём `arena_profiles.{uid}.displayName`, иначе оставим существующее значение нетронутым. */
  myName?: string;
};



export type BotArenaMatchResult = {
  xpDelta: number;
  oldStars: number;
  newStars: number;
  oldTier: string;
  newTier: string;
  oldLevel: string;
  newLevel: string;
  rankChanged: boolean;
  promoted: boolean;
  idempotentReplay?: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Чистая математика ранга после бот-матча (без Firestore) — для UI и транзакции. */
export function computeBotMatchRankDelta(
  oldStars: number,
  oldTier: string,
  oldLevel: string,
  won: boolean,
  isLast: boolean,
  isDraw: boolean,
): Pick<BotArenaMatchResult, 'newStars' | 'newTier' | 'newLevel' | 'rankChanged' | 'promoted'> {
  const atCeiling = oldTier === 'legend' && oldLevel === 'III';
  let newStars = (isDraw || atCeiling) ? oldStars : oldStars + (won ? 1 : isLast ? -1 : 0);
  let newTier = oldTier;
  let newLevel = oldLevel;

  if (newStars >= 3) {
    newStars = 0;
    const li = LEVELS.indexOf(oldLevel as (typeof LEVELS)[number]);
    if (li < LEVELS.length - 1 && li >= 0) {
      newLevel = LEVELS[li + 1];
    } else {
      const ti = TIERS.indexOf(oldTier as (typeof TIERS)[number]);
      if (ti < TIERS.length - 1 && ti >= 0) {
        // Переход в следующий ранг — уровень с начала.
        newTier = TIERS[ti + 1];
        newLevel = LEVELS[0];
      } else {
        // Уже на вершине (Легенда III) — потолок: ранг не меняется,
        // звёзды держим на максимуме (2). Иначе победа откатывала на Легенда I.
        // Должно совпадать с applyStarDelta в functions/src/arena_rank_progression.ts.
        newStars = 2;
      }
    }
  } else if (newStars < 0) {
    newStars = 2;
    const li = LEVELS.indexOf(oldLevel as (typeof LEVELS)[number]);
    if (li > 0) {
      newLevel = LEVELS[li - 1];
    } else {
      const ti = TIERS.indexOf(oldTier as (typeof TIERS)[number]);
      if (ti > 0) {
        newTier = TIERS[ti - 1];
        newLevel = LEVELS[LEVELS.length - 1];
      } else {
        // Уже на дне (Бронза I) — пол: ранг не меняется, звёзды на 0.
        newStars = 0;
      }
    }
  }

  const rankChanged = newTier !== oldTier || newLevel !== oldLevel;
  const promoted = rankChanged && (
    TIERS.indexOf(newTier as (typeof TIERS)[number]) > TIERS.indexOf(oldTier as (typeof TIERS)[number])
    || (newTier === oldTier && LEVELS.indexOf(newLevel as (typeof LEVELS)[number]) > LEVELS.indexOf(oldLevel as (typeof LEVELS)[number]))
  );
  return { newStars, newTier, newLevel, rankChanged, promoted };
}

/** Экран результатов: показать правильные звёзды/ранг до прихода ответа с сервера. */
export function buildBotMatchDisplayResult(
  args: BotArenaMatchArgs,
  profileRank: { stars?: number; tier?: string; level?: string } | null | undefined,
): BotArenaMatchResult {
  const xpDelta = args.isDraw ? DRAW_XP : (args.won ? 50 : 15);
  const oldStars = profileRank?.stars ?? 0;
  const oldTier = profileRank?.tier ?? 'bronze';
  const oldLevel = profileRank?.level ?? 'I';
  const d = computeBotMatchRankDelta(oldStars, oldTier, oldLevel, args.won, args.isLast, args.isDraw);
  return {
    xpDelta,
    oldStars,
    oldTier,
    oldLevel,
    newStars: d.newStars,
    newTier: d.newTier,
    newLevel: d.newLevel,
    rankChanged: d.rankChanged,
    promoted: d.promoted,
  };
}

/** Догоняем запись в фоне без тостов и блокировок UI. */
export function startSilentArenaPersistLoop(args: BotArenaMatchArgs): void {
  void (async () => {
    for (let wave = 0; wave < 80; wave++) {
      await sleep(Math.min(45_000, 2500 + wave * 1200));
      const { ok } = await persistBotArenaMatchWithRetries(args, 4);
      if (ok) return;
    }
  })();
}

export async function runBotArenaProfileTransaction(
  args: BotArenaMatchArgs,
): Promise<BotArenaMatchResult> {
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const { getApp } = require('@react-native-firebase/app');
  const callCf = httpsCallable(
    getFunctions(getApp(), FUNCTIONS_REGION), 'arenaBotMatchRecord',
  ) as (data: BotArenaMatchArgs) => Promise<{ data: BotArenaMatchResult }>;
  const res = await callCf(args);
  return res.data;
}

type PendingPayload = BotArenaMatchArgs & { ts?: number };

export async function persistBotArenaMatchWithRetries(
  args: BotArenaMatchArgs,
  maxAttempts = 6,
): Promise<{ ok: boolean; result: BotArenaMatchResult | null }> {
  let lastResult: BotArenaMatchResult | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      lastResult = await runBotArenaProfileTransaction(args);
      try {
        await AsyncStorage.removeItem(PENDING_KEY);
      } catch { /* empty */ }
      return { ok: true, result: lastResult };
    } catch {
      if (attempt < maxAttempts - 1) {
        await sleep(400 * (attempt + 1));
      }
    }
  }
  try {
    const pending: PendingPayload = { ...args, ts: Date.now() };
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch { /* empty */ }
  return { ok: false, result: lastResult };
}

/** Вызов при открытии приложения / экрана результатов — добить зависшую запись. */
export async function flushPendingBotArenaMatch(uid: string | null | undefined): Promise<void> {
  if (!uid) return;
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(PENDING_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  let p: PendingPayload;
  try {
    p = JSON.parse(raw) as PendingPayload;
  } catch {
    await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
    return;
  }
  if (p.uid !== uid) return;
  await persistBotArenaMatchWithRetries(
    {
      sessionId: p.sessionId,
      uid: p.uid,
      won: p.won,
      isLast: p.isLast,
      isDraw: p.isDraw,
      myScore: p.myScore,
      oppScore: p.oppScore,
      oppName: p.oppName,
    },
    8,
  );
}
