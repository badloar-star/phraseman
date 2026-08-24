import * as admin from 'firebase-admin';
import { getLevelFromXP } from './xp_levels';

const db = admin.firestore();

function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getWeekStartIso(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export async function syncLeaderboardFromUsers(): Promise<void> {
  const currentWeekKey = getWeekKey();
  const currentWeekStart = getWeekStartIso();
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let count = 0;
  let skipped = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    let query: FirebaseFirestore.Query = db.collection('users').orderBy('__name__').limit(200);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    for (const doc of snap.docs) {
      const progress = doc.data()?.progress ?? {};
      const uid = doc.id;

      const xp = parseInt(progress['user_total_xp'] ?? '0') || 0;
      const name = (progress['user_name'] ?? '').trim();

      // Пропускаем пользователей без имени или без XP
      if (!name || xp < 50) { skipped++; continue; }

      const lang = progress['lang'] ?? progress['app_lang'] ?? 'ru';
      const levelFromXP = getLevelFromXP(xp);
      const avatarRaw = typeof progress['user_avatar'] === 'string' ? progress['user_avatar'].trim() : '';
      // Numeric legacy avatars are still derived from XP, but custom avatars must survive leaderboard syncs.
      const avatar = avatarRaw && !/^\d+$/.test(avatarRaw) ? avatarRaw : String(levelFromXP);
      const frame = progress['user_frame'] ?? progress['user_avatar_frame'] ?? null;
      const aura = typeof progress['user_avatar_aura'] === 'string' && progress['user_avatar_aura'].trim()
        ? progress['user_avatar_aura'].trim()
        : null;
      const profileCardLevel = Math.max(0, Math.min(1, parseInt(progress['profile_card_level'] ?? '0') || 0));
      const profileCardTheme = typeof progress['profile_card_theme'] === 'string' && progress['profile_card_theme'].trim()
        ? progress['profile_card_theme'].trim().slice(0, 32)
        : 'classic';
      const profileCardMotion = typeof progress['profile_card_motion'] === 'string' && progress['profile_card_motion'].trim()
        ? progress['profile_card_motion'].trim().slice(0, 32)
        : 'none';
      const profileCardPublicFocus = typeof progress['profile_card_public_focus'] === 'string' && progress['profile_card_public_focus'].trim()
        ? progress['profile_card_public_focus'].trim().slice(0, 32)
        : 'balanced';
      const streak = parseInt(progress['streak_count'] ?? '0') || null;

      // Недельные очки
      let weekPoints = 0;
      try {
        const wpRaw = progress['week_points_v2'];
        if (wpRaw) {
          const wpData = JSON.parse(wpRaw);
          weekPoints = wpData.weekKey === currentWeekKey ? (wpData.points ?? 0) : 0;
        }
      } catch { /* ignore */ }
      if (progress['weekly_xp_period_start'] === currentWeekStart) {
        weekPoints = Math.max(weekPoints, Number(progress['weekly_xp'] ?? 0) || 0);
      }
      weekPoints = Math.max(0, Math.floor(weekPoints));

      // Лига
      let leagueId = 0;
      try {
        const lsRaw = progress['league_state_v3'];
        if (lsRaw) {
          const ls = JSON.parse(lsRaw);
          leagueId = ls.leagueId ?? 0;
        }
      } catch { /* ignore */ }

      const lbRef = db.collection('leaderboard').doc(uid);
      // This legacy backfill must never turn a live current-week score into a
      // lower value just because users.progress is stale or incomplete.
      const existingLb = (await lbRef.get()).data() ?? {};
      const existingWeekKey = existingLb.weekKey ?? existingLb.groupWeekId;
      const existingWeekPoints = existingWeekKey === currentWeekKey
        ? Math.max(0, Math.floor(Number(existingLb.weekPoints) || 0))
        : 0;
      const safeWeekPoints = Math.max(existingWeekPoints, weekPoints);
      batch.set(lbRef, {
        name,
        nameLower: name.toLowerCase(),
        points: xp,
        weekPoints: safeWeekPoints,
        weekKey: currentWeekKey,
        lang,
        avatar,
        frame,
        aura,
        profileCardLevel,
        profileCardTheme,
        profileCardMotion,
        profileCardPublicFocus,
        streak,
        leagueId,
        isBot: false,
        syncVersion: 2,
        updatedAt: Date.now(),
      }, { merge: true });

      count++;
      if (count % BATCH_SIZE === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }

  if (count % BATCH_SIZE !== 0) {
    await batch.commit();
  }

  console.log(`syncLeaderboard: updated=${count}, skipped=${skipped}`);
}
