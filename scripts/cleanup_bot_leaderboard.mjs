// Очистка бот-записей из leaderboard
// Удаляет: записи с points < 50 ИЛИ без соответствующего users/{uid}
// Запуск: node scripts/cleanup_bot_leaderboard.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const MIN_POINTS = 50;

async function main() {
  console.log('Загружаем leaderboard...');

  let lastDoc = null;
  let toDelete = [];
  let scanned = 0;

  while (true) {
    let q = db.collection('leaderboard').orderBy('__name__').limit(200);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];
    scanned += snap.size;

    for (const doc of snap.docs) {
      const { points, name } = doc.data();
      if ((points ?? 0) < MIN_POINTS) {
        toDelete.push({ ref: doc.ref, name: name ?? '?', points: points ?? 0 });
        continue;
      }
      // Проверяем наличие реального пользователя
      const userDoc = await db.collection('users').doc(doc.id).get();
      if (!userDoc.exists) {
        toDelete.push({ ref: doc.ref, name: name ?? '?', points: points ?? 0 });
      }
    }

    process.stdout.write(`  проверено: ${scanned}, на удаление: ${toDelete.length}\r`);
  }

  console.log(`\nНа удаление: ${toDelete.length} записей`);
  if (toDelete.length === 0) { console.log('Ничего удалять не нужно.'); return; }

  toDelete.forEach(e => console.log(`  - ${e.name} (${e.points} XP)`));

  // Удаляем батчами по 400
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 400) {
    const batch = db.batch();
    toDelete.slice(i, i + 400).forEach(e => batch.delete(e.ref));
    await batch.commit();
    deleted += Math.min(400, toDelete.length - i);
    console.log(`  удалено: ${deleted}/${toDelete.length}`);
  }

  console.log(`\n✅ Готово! Удалено ${deleted} бот/фейк записей из leaderboard.`);
}

main().catch(err => { console.error('❌ Ошибка:', err); process.exit(1); });
