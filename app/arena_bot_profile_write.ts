/**
 * Запись результатов бот-матча в arena_profiles с ретраями и отложенным flush,
 * чтобы игрок не терял награды при временных сбоях сети.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

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

const PLACEHOLDER_NAMES: ReadonlySet<string> = new Set([
  'Игрок', 'Гравець', 'Jugador', 'Player', 'Соперник', 'Суперник', 'Opponent',
]);

function pickIncomingDisplayName(raw: string | null | undefined): string | null {
  const dn = String(raw ?? '').trim();
  if (!dn) return null;
  if (PLACEHOLDER_NAMES.has(dn)) return null;
  return dn.slice(0, 120);
}

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
  let newStars = isDraw ? oldStars : oldStars + (won ? 1 : isLast ? -1 : 0);
  let newTier = oldTier;
  let newLevel = oldLevel;

  if (newStars >= 3) {
    newStars = 0;
    const li = LEVELS.indexOf(oldLevel as (typeof LEVELS)[number]);
    if (li < LEVELS.length - 1 && li >= 0) {
      newLevel = LEVELS[li + 1];
    } else {
      newLevel = LEVELS[0];
      const ti = TIERS.indexOf(oldTier as (typeof TIERS)[number]);
      if (ti < TIERS.length - 1 && ti >= 0) newTier = TIERS[ti + 1];
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
  const { sessionId, uid, won, isLast, isDraw, myScore, oppScore, oppName, myName } = args;
  const xpDelta = isDraw ? DRAW_XP : (won ? 50 : 15);
  const cleanName = pickIncomingDisplayName(myName);

  let oldStars = 0;
  let newStars = 0;
  let oldTier = 'bronze';
  let newTier = 'bronze';
  let oldLevel = 'I';
  let newLevel = 'I';
  let rankChanged = false;
  let promoted = false;

  await firestore().runTransaction(async (tx) => {
    const profileRef = firestore().collection('arena_profiles').doc(uid);
    const profileSnap = await tx.get(profileRef);
    const data = profileSnap.exists
      ? (profileSnap.data() as {
          rank?: { stars?: number; tier?: string; level?: string };
          xp?: number;
          stats?: {
            matchesPlayed?: number; matchesWon?: number; totalScore?: number;
            winStreak?: number; bestWinStreak?: number;
          };
        })
      : {};
    oldStars = data.rank?.stars ?? 0;
    oldTier = data.rank?.tier ?? 'bronze';
    oldLevel = data.rank?.level ?? 'I';
    const curStreak = data.stats?.winStreak ?? 0;
    const bestStreak = data.stats?.bestWinStreak ?? 0;

    const delta = computeBotMatchRankDelta(oldStars, oldTier, oldLevel, won, isLast, isDraw);
    newStars = delta.newStars;
    newTier = delta.newTier;
    newLevel = delta.newLevel;
    rankChanged = delta.rankChanged;
    promoted = delta.promoted;
    const newStreak = won ? curStreak + 1 : isDraw ? curStreak : 0;

    const profileUpdate: Record<string, unknown> = {
      'rank.tier': newTier,
      'rank.level': newLevel,
      'rank.stars': newStars,
      xp: (data.xp ?? 0) + xpDelta,
      'stats.matchesPlayed': (data.stats?.matchesPlayed ?? 0) + 1,
      'stats.matchesWon': (data.stats?.matchesWon ?? 0) + (won ? 1 : 0),
      'stats.totalScore': (data.stats?.totalScore ?? 0) + myScore,
      'stats.winStreak': newStreak,
      'stats.bestWinStreak': Math.max(bestStreak, newStreak),
      updatedAt: Date.now(),
    };
    if (cleanName) profileUpdate.displayName = cleanName;
    if (profileSnap.exists) {
      tx.update(profileRef, profileUpdate);
    } else {
      // Новый профиль — ВАЖНО использовать nested object (не dot-notation), потому что
      // `tx.set` с merge:true НЕ разворачивает ключи вида `'rank.tier'` в nested поля.
      // Раньше создавались плоские поля с литеральной точкой в имени (`"rank.tier": "bronze"`),
      // и `useArenaRank` читал `data.rank?.tier` → undefined → всегда «Бронза I, 0 ХР».
      const initialDn = cleanName ?? (myName?.trim() || 'Игрок');
      tx.set(profileRef, {
        userId: uid,
        displayName: initialDn,
        rank: { tier: newTier, level: newLevel, stars: newStars },
        xp: xpDelta,
        stats: {
          matchesPlayed: 1,
          matchesWon: won ? 1 : 0,
          totalScore: myScore,
          winStreak: newStreak,
          bestWinStreak: Math.max(bestStreak, newStreak),
        },
        updatedAt: Date.now(),
      }, { merge: true });
    }

  });

  // История пишется ОТДЕЛЬНО от транзакции: если правила ещё не задеплоены или
  // write упадёт по любой причине — rank/xp/stats уже сохранены выше.
  // Поля совпадают с тем, что ожидает sanitizeMatchRecordForRating / fetchAndCacheArenaRating.
  firestore()
    .collection('arena_profiles')
    .doc(uid)
    .collection('match_history')
    .doc(sessionId)
    .set({
      createdAt: Date.now(),   // orderBy('createdAt') в fetchAndCacheArenaRating
      oppName,
      myScore,
      oppScore,
      won,
      isDraw,
      xpGained: xpDelta,       // поле xpGained, не xpDelta
      // При ранг-апе newStars сбрасывается в 0 (2→0), но семантически это +1 (добыл 3-ю звезду).
      // При дауне с 0 звёзд newStars становится 2 следующего уровня — семантически -1.
      starsChange: rankChanged ? (promoted ? 1 : -1) : newStars - oldStars,
      rankBefore: { tier: oldTier, level: oldLevel, stars: oldStars },
      rankAfter: { tier: newTier, level: newLevel, stars: newStars },
      isBot: true,
    })
    .catch(() => { /* non-critical */ });

  return {
    xpDelta,
    oldStars,
    newStars,
    oldTier,
    newTier,
    oldLevel,
    newLevel,
    rankChanged,
    promoted,
  };
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
