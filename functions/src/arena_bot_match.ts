/**
 * arenaBotMatchRecord — серверная запись результата БОТ-матча (Admin SDK).
 *
 * Зачем серверно: правила Firestore запрещают клиенту писать arena_profiles
 * (`allow write: if false`), поэтому прежняя клиентская запись бот-матчей молча
 * падала. Эта CF пишет ранг/XP/SR бот-матча от имени сервера (минует rules),
 * только в СВОЙ профиль (request.auth.uid) — никакой накрутки чужого.
 *
 * Математика — та же, что у PvP: applyStarDelta (ниже потолка) +
 * applySeasonRatingDelta (на Легенде III, бот = половина SR). Один источник правды.
 */
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { applyStarDelta } from './arena_rank_progression';
import { applySeasonRatingDelta, seasonIdForDate, rankIndex, type MatchOutcome } from './arena_season';
import { resolveArenaSeasonConfig } from './arena_season_config';

const REGION = 'us-central1';
const DRAW_XP = 30;
const PLACEHOLDER_NAMES = new Set([
  'Игрок', 'Гравець', 'Jugador', 'Player', 'Соперник', 'Суперник', 'Opponent',
]);

function cleanName(raw: unknown): string | null {
  const dn = String(raw ?? '').trim();
  if (!dn || PLACEHOLDER_NAMES.has(dn)) return null;
  return dn.slice(0, 120);
}

export const arenaBotMatchRecord = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const uid = request.auth.uid; // запись ТОЛЬКО в свой профиль
  const d = (request.data ?? {}) as Record<string, unknown>;
  const sessionId = String(d.sessionId ?? '').trim();
  const won = d.won === true;
  const isLast = d.isLast === true;
  const isDraw = d.isDraw === true;
  const myScore = Math.max(0, Math.trunc(Number(d.myScore ?? 0)));
  const oppScore = Math.max(0, Math.trunc(Number(d.oppScore ?? 0)));
  const oppName = String(d.oppName ?? 'Соперник').slice(0, 120);
  const incomingName = cleanName(d.myName);
  if (!sessionId) throw new HttpsError('invalid-argument', 'session_required');

  const db = admin.firestore();
  const profileRef = db.collection('arena_profiles').doc(uid);
  const xpDelta = isDraw ? DRAW_XP : (won ? 50 : 15);
  const nowSeasonId = seasonIdForDate(new Date());
  const outcome: MatchOutcome = isDraw ? 'draw' : won ? 'win' : isLast ? 'loss' : 'neutral';
  // Тюнинг SR из Firestore (fallback = дефолты). Читаем до транзакции.
  const seasonCfg = await resolveArenaSeasonConfig(db);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    const data = (snap.exists ? snap.data() : {}) as {
      rank?: { stars?: number; tier?: string; level?: string };
      xp?: number; sr?: number; peakSR?: number; seasonId?: string; seasonPeakRankIndex?: number;
      displayName?: string;
      stats?: {
        matchesPlayed?: number; matchesWon?: number; totalScore?: number;
        winStreak?: number; bestWinStreak?: number;
      };
    };
    const oldStars = data.rank?.stars ?? 0;
    const oldTier = data.rank?.tier ?? 'bronze';
    const oldLevel = data.rank?.level ?? 'I';
    const wasCeiling = oldTier === 'legend' && oldLevel === 'III';

    // На потолке звёзды не двигаем — работает SR.
    const starDelta = isDraw ? 0 : (won ? 1 : isLast ? -1 : 0);
    const progressed = applyStarDelta(
      { tier: oldTier, level: oldLevel, stars: oldStars },
      wasCeiling ? 0 : starDelta,
    );
    const newTier = progressed.tier;
    const newLevel = progressed.level;
    const newStars = progressed.stars;

    const staleSeason = data.seasonId !== nowSeasonId;
    const curSr = staleSeason ? 0 : (data.sr ?? 0);
    const curPeak = staleSeason ? 0 : (data.peakSR ?? 0);
    const curPeakRankIdx = staleSeason ? 0 : (data.seasonPeakRankIndex ?? 0);
    const sr = wasCeiling
      ? applySeasonRatingDelta(curSr, curPeak, outcome, true, seasonCfg) // бот = половина победы
      : { sr: curSr, peakSR: curPeak };
    const newPeakRankIdx = Math.max(curPeakRankIdx, rankIndex(newTier, newLevel));

    const curStreak = data.stats?.winStreak ?? 0;
    const bestStreak = data.stats?.bestWinStreak ?? 0;
    const newStreak = won ? curStreak + 1 : isDraw ? curStreak : 0;

    const rankChanged = newTier !== oldTier || newLevel !== oldLevel;
    const promoted = rankChanged && rankIndex(newTier, newLevel) > rankIndex(oldTier, oldLevel);

    const update: Record<string, unknown> = {
      userId: uid,
      'rank.tier': newTier, 'rank.level': newLevel, 'rank.stars': newStars,
      sr: sr.sr, peakSR: sr.peakSR, seasonId: nowSeasonId, seasonPeakRankIndex: newPeakRankIdx,
      xp: (data.xp ?? 0) + xpDelta,
      'stats.matchesPlayed': (data.stats?.matchesPlayed ?? 0) + 1,
      'stats.matchesWon': (data.stats?.matchesWon ?? 0) + (won ? 1 : 0),
      'stats.totalScore': (data.stats?.totalScore ?? 0) + myScore,
      'stats.winStreak': newStreak,
      'stats.bestWinStreak': Math.max(bestStreak, newStreak),
      updatedAt: Date.now(),
    };
    if (incomingName) update.displayName = incomingName;
    tx.set(profileRef, update, { merge: true });

    if (wasCeiling) {
      tx.set(
        db.collection('arena_season_leaderboard').doc(nowSeasonId).collection('entries').doc(uid),
        { uid, sr: sr.sr, peakSR: sr.peakSR, updatedAt: Date.now() },
        { merge: true },
      );
    }

    // История матча (раньше писалась с клиента — теперь серверно).
    tx.set(profileRef.collection('match_history').doc(sessionId), {
      createdAt: Date.now(), oppName, myScore, oppScore, won, isDraw,
      xpGained: xpDelta,
      starsChange: rankChanged ? (promoted ? 1 : -1) : newStars - oldStars,
      rankBefore: { tier: oldTier, level: oldLevel, stars: oldStars },
      rankAfter: { tier: newTier, level: newLevel, stars: newStars },
      isBot: true,
    }, { merge: true });

    return {
      xpDelta,
      oldStars, newStars, oldTier, newTier, oldLevel, newLevel,
      rankChanged, promoted,
      sr: sr.sr, peakSR: sr.peakSR,
    };
  });

  return result;
});
