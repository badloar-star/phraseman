import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Для массива значений строит таблицу перцентильных порогов p1..p99.
 * pN = минимальное значение, чтобы быть «выше N% пользователей».
 * Возвращает массив из 100 элементов: index 0 → p1, index 98 → p99.
 */
function buildPercentileThresholds(values: number[]): number[] {
  if (values.length === 0) return new Array(99).fill(0);
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const out: number[] = [];
  for (let p = 1; p <= 99; p++) {
    // Линейная интерполяция (метод «exclusive»)
    const rank = (p / 100) * n;
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    if (lo === 0) {
      out.push(sorted[0] ?? 0);
    } else if (hi >= n) {
      out.push(sorted[n - 1] ?? 0);
    } else {
      const frac = rank - lo;
      out.push((sorted[lo - 1] ?? 0) * (1 - frac) + (sorted[lo] ?? 0) * frac);
    }
  }
  return out;
}

/**
 * По таблице порогов определяет, сколько процентов пользователей
 * данный пользователь обогнал (0–99). null = нет данных.
 */
export function lookupPercentile(thresholds: number[], myValue: number): number | null {
  if (thresholds.length === 0 || myValue <= 0) return null;
  // thresholds[i] = порог (i+1)-го перцентиля
  // Ищем наибольший p такой что thresholds[p-1] <= myValue
  let result = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (myValue > (thresholds[i] ?? 0)) result = i + 1;
    else break;
  }
  return result === 0 ? 0 : result;
}

export interface LeaderboardStats {
  totalUsers: number;
  updatedAt: number;
  // Каждый массив: 99 чисел, thresholds[i] = порог (i+1)-го перцентиля
  xpThresholds: number[];
  streakThresholds: number[];
  weekXpThresholds: number[];
  daily7xpThresholds: number[];
  daily7timeMsThresholds: number[];
  arenaXpThresholds: number[];
}

export async function computeLeaderboardStats(): Promise<void> {
  console.log('[computeLeaderboardStats] start');

  // ── 1. Читаем leaderboard (XP, streak, weekPoints, daily7xp, daily7time_ms) ──
  const xpVals: number[] = [];
  const streakVals: number[] = [];
  const weekXpVals: number[] = [];
  const daily7xpVals: number[] = [];
  const daily7timeMsVals: number[] = [];

  let lastLbDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let lbTotal = 0;

  while (true) {
    let q: FirebaseFirestore.Query = db.collection('leaderboard')
      .where('points', '>=', 50)
      .orderBy('points')
      .limit(500);
    if (lastLbDoc) q = q.startAfter(lastLbDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const d = doc.data();
      const xp = typeof d.points === 'number' ? d.points : 0;
      if (xp <= 0) continue;
      lbTotal++;
      xpVals.push(xp);
      if (typeof d.streak === 'number' && d.streak > 0) streakVals.push(d.streak);
      if (typeof d.weekPoints === 'number' && d.weekPoints > 0) weekXpVals.push(d.weekPoints);
      if (typeof d.daily7xp === 'number' && d.daily7xp > 0) daily7xpVals.push(d.daily7xp);
      if (typeof d.daily7time_ms === 'number' && d.daily7time_ms > 0) daily7timeMsVals.push(d.daily7time_ms);
    }

    lastLbDoc = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.size < 500) break;
  }

  // ── 2. Читаем arena_profiles (xp) ────────────────────────────────────────────
  const arenaXpVals: number[] = [];
  let lastArenaDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    let q: FirebaseFirestore.Query = db.collection('arena_profiles')
      .where('xp', '>', 0)
      .orderBy('xp')
      .limit(500);
    if (lastArenaDoc) q = q.startAfter(lastArenaDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const d = doc.data();
      const mp = d.stats?.matchesPlayed ?? 0;
      if (mp < 1) continue;
      const axp = typeof d.xp === 'number' ? d.xp : 0;
      if (axp > 0) arenaXpVals.push(axp);
    }

    lastArenaDoc = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.size < 500) break;
  }

  // ── 3. Строим таблицы порогов ─────────────────────────────────────────────────
  const stats: LeaderboardStats = {
    totalUsers: lbTotal,
    updatedAt: Date.now(),
    xpThresholds: buildPercentileThresholds(xpVals),
    streakThresholds: buildPercentileThresholds(streakVals),
    weekXpThresholds: buildPercentileThresholds(weekXpVals),
    daily7xpThresholds: buildPercentileThresholds(daily7xpVals),
    daily7timeMsThresholds: buildPercentileThresholds(daily7timeMsVals),
    arenaXpThresholds: buildPercentileThresholds(arenaXpVals),
  };

  await db.collection('leaderboard_stats').doc('global').set(stats);

  console.log(
    `[computeLeaderboardStats] done. users=${lbTotal}, ` +
    `streak=${streakVals.length}, daily7xp=${daily7xpVals.length}, ` +
    `arenaXp=${arenaXpVals.length}`,
  );
}
