import * as admin from 'firebase-admin';

const db = admin.firestore();

function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function syncLeaderboardFromUsers(): Promise<void> {
  const currentWeekKey = getWeekKey();
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
      const levelFromXP = Math.min(50, Math.floor(Math.pow(xp / 250, 1 / 1.82)) + 1);
      // Всегда вычисляем аватар из XP — user_avatar может быть устаревшим (старая формула уровней)
      const avatar = String(levelFromXP);
      const frame = progress['user_frame'] ?? progress['user_avatar_frame'] ?? null;
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
      batch.set(lbRef, {
        name,
        nameLower: name.toLowerCase(),
        points: xp,
        weekPoints,
        weekKey: currentWeekKey,
        lang,
        avatar,
        frame,
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
