import * as admin from 'firebase-admin';

const db = admin.firestore();

const MIN_PERCENTILE_SAMPLE_XP = 5000;

function readProgressInt(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : 0;
}

function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function readCurrentWeekPoints(value: unknown, currentWeekKey: string): number {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return 0;
    const weekKey = (parsed as Record<string, unknown>).weekKey;
    if (weekKey !== currentWeekKey) return 0;
    return Math.max(0, readProgressInt((parsed as Record<string, unknown>).points));
  } catch {
    return 0;
  }
}

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
  minimumSampleXp: number;
  // Каждый массив: 99 чисел, thresholds[i] = порог (i+1)-го перцентиля
  xpThresholds: number[];
  streakThresholds: number[];
  weekXpThresholds: number[];
  daily7xpThresholds: number[];
  daily7timeMsThresholds: number[];
}

export async function computeLeaderboardStats(): Promise<void> {
  console.log('[computeLeaderboardStats] start');

  // 1. Lifetime XP thresholds.
  // Lifetime XP must come from the real progress document, not from leaderboard
  // mirrors that can lag behind or be jump-clamped by the callable guard.
  const xpVals: number[] = [];
  const streakVals: number[] = [];
  const weekXpVals: number[] = [];
  const eligibleUserIds = new Set<string>();
  const currentWeekKey = getWeekKey();
  let lastUserDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    // зачем: перцентили считаются ровно по трём полям, а страница тянула документы users
    // целиком — это самые «толстые» доки в базе. Проекция режет трафик и память функции,
    // не меняя ни логику, ни число тарифицируемых чтений. Имена полей вложенные, поэтому
    // указаны через точку — Firestore вернёт их внутри объекта progress, как и раньше.
    let q: FirebaseFirestore.Query = db.collection('users')
      .orderBy('__name__')
      .limit(500)
      .select('progress.user_total_xp', 'progress.streak_count', 'progress.week_points_v2');
    if (lastUserDoc) q = q.startAfter(lastUserDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const progress = doc.data()?.progress ?? {};
      const xp = readProgressInt(progress.user_total_xp);
      if (xp >= MIN_PERCENTILE_SAMPLE_XP) {
        eligibleUserIds.add(doc.id);
        xpVals.push(xp);
        streakVals.push(Math.max(0, readProgressInt(progress.streak_count)));
        weekXpVals.push(readCurrentWeekPoints(progress.week_points_v2, currentWeekKey));
      }
    }

    lastUserDoc = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.size < 500) break;
  }

  const daily7xpVals: number[] = [];
  const daily7timeMsVals: number[] = [];
  const dailyAnalyticsSeenUserIds = new Set<string>();

  let lastLbDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    let q: FirebaseFirestore.Query = db.collection('leaderboard')
      .orderBy('__name__')
      .limit(500);
    if (lastLbDoc) q = q.startAfter(lastLbDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      if (!eligibleUserIds.has(doc.id)) continue;
      const d = doc.data();
      dailyAnalyticsSeenUserIds.add(doc.id);
      daily7xpVals.push(Math.max(0, readProgressInt(d.daily7xp)));
      daily7timeMsVals.push(Math.max(0, readProgressInt(d.daily7time_ms)));
    }

    lastLbDoc = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.size < 500) break;
  }

  const missingDailyAnalytics = Math.max(0, eligibleUserIds.size - dailyAnalyticsSeenUserIds.size);
  for (let i = 0; i < missingDailyAnalytics; i++) {
    daily7xpVals.push(0);
    daily7timeMsVals.push(0);
  }

  // ── 2. Строим таблицы порогов ─────────────────────────────────────────────────
  const stats: LeaderboardStats = {
    totalUsers: xpVals.length,
    updatedAt: Date.now(),
    minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
    xpThresholds: buildPercentileThresholds(xpVals),
    streakThresholds: buildPercentileThresholds(streakVals),
    weekXpThresholds: buildPercentileThresholds(weekXpVals),
    daily7xpThresholds: buildPercentileThresholds(daily7xpVals),
    daily7timeMsThresholds: buildPercentileThresholds(daily7timeMsVals),
  };

  await db.collection('leaderboard_stats').doc('global').set(stats);

  console.log(
    `[computeLeaderboardStats] done. minSampleXp=${MIN_PERCENTILE_SAMPLE_XP}, xpUsers=${xpVals.length}, ` +
    `streak=${streakVals.length}, daily7xp=${daily7xpVals.length}`,
  );
}
