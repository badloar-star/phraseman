/**
 * One-time migration: removes stale bot entries from league/week caches in Firestore users collection.
 * Also useful for reference — users need to clear AsyncStorage keys:
 * - league_state_v3
 * - week_leaderboard
 * - global_lb_cache_v3
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const svcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './service-account.json';
initializeApp({ credential: cert(JSON.parse(readFileSync(svcPath, 'utf8'))) });
const db = getFirestore();

// Clear league_state from all user progress docs so they rejoin clean groups
async function clearLeagueStateFromUsers() {
  const snap = await db.collection('users').limit(500).get();
  console.log(`Found ${snap.size} user docs`);
  if (snap.size === 0) return;

  const batch = db.batch();
  for (const doc of snap.docs) {
    const data = doc.data();
    const progress = data.progress ?? {};
    if (progress['league_state_v3']) {
      batch.update(doc.ref, { 'progress.league_state_v3': null });
    }
  }
  await batch.commit();
  console.log('Done. League state cleared from all users.');
}

clearLeagueStateFromUsers().catch(err => { console.error(err); process.exit(1); });
