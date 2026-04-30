// Исправляет avatar в leaderboard на правильный уровень из XP
// Работает с текущим продакшн кодом — не требует нового билда
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const TOTAL_XP_FOR_LEVEL = (l) => Math.max(0, (l - 1) ** 2 * 50);
const getLevelFromXP = (xp) => {
  let level = Math.floor(Math.sqrt(xp / 50)) + 1;
  while (TOTAL_XP_FOR_LEVEL(level + 1) <= xp) level++;
  while (level > 1 && TOTAL_XP_FOR_LEVEL(level) > xp) level--;
  return Math.min(level, 50);
};

let fixed = 0;
let lastDoc = null;

while (true) {
  let q = db.collection('leaderboard').orderBy('__name__').limit(200);
  if (lastDoc) q = q.startAfter(lastDoc);
  const snap = await q.get();
  if (snap.empty) break;
  lastDoc = snap.docs[snap.docs.length - 1];

  const batch = db.batch();
  let count = 0;

  for (const doc of snap.docs) {
    const { points, avatar } = doc.data();
    const xp = points ?? 0;
    if (xp <= 0) continue;

    const correctLevel = String(getLevelFromXP(xp));
    // Обновляем только если аватар числовой (старый) или не задан
    if (!avatar || /^\d+$/.test(avatar)) {
      batch.update(doc.ref, { avatar: correctLevel });
      count++;
      fixed++;
    }
  }

  if (count > 0) await batch.commit();
  process.stdout.write(`  обновлено: ${fixed}\r`);
}

console.log(`\nГотово! Обновлено ${fixed} записей в leaderboard.`);
