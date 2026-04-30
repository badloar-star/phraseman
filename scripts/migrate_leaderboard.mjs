// Миграция: синхронизирует всех users → leaderboard
// Запускать: node scripts/migrate_leaderboard.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const weekKey = getWeekKey();
let processed = 0, updated = 0, skipped = 0;

// Читаем users постранично
let lastDoc = null;
const PAGE = 200;

while (true) {
  let query = db.collection('users').orderBy('__name__').limit(PAGE);
  if (lastDoc) query = query.startAfter(lastDoc);

  const snap = await query.get();
  if (snap.empty) break;
  lastDoc = snap.docs[snap.docs.length - 1];

  // Батч запись в leaderboard
  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    processed++;
    const p = doc.data().progress || {};
    const name = (p.user_name || '').trim();
    const xp = p.user_total_xp ?? 0;

    // Пропускаем без имени или без XP
    if (!name || xp <= 0) { skipped++; continue; }

    const levelFromXP = Math.min(50, Math.floor(Math.sqrt(xp / 50)) + 1);

    const weekLb = p.week_leaderboard || {};
    const weekPoints = (weekLb.weekKey === weekKey ? weekLb.points : 0) ?? 0;

    const lbRef = db.collection('leaderboard').doc(doc.id);
    batch.set(lbRef, {
      name,
      nameLower: name.toLowerCase(),
      points: xp,
      weekPoints,
      weekKey,
      lang: p.lang ?? 'ru',
      avatar: p.user_avatar ?? String(levelFromXP),
      frame: p.user_avatar_frame ?? null,
      streak: p.streak_count ?? null,
      leagueId: p.league_state_v3?.leagueId ?? null,
      updatedAt: Date.now(),
    }, { merge: true });

    batchCount++;
    updated++;
  }

  if (batchCount > 0) await batch.commit();
  process.stdout.write(`  обработано: ${processed}, добавлено: ${updated}, пропущено: ${skipped}\r`);
}

console.log(`\nГотово! Обработано: ${processed} | Добавлено в leaderboard: ${updated} | Пропущено (нет имени/XP): ${skipped}`);
