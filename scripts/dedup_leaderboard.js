// Удаляет дубли в leaderboard/{uid}: один юзер с двумя UID (старый Firebase Auth + новый stable_id)
// Стратегия: группируем по nameLower, оставляем документ с MAX points, удаляем остальные.

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  console.log('Читаем leaderboard...');
  const snap = await db.collection('leaderboard').get();
  console.log(`Всего документов: ${snap.size}`);

  // Группируем по имени (case-insensitive)
  const byName = new Map(); // nameLower → [{ id, data }]
  for (const doc of snap.docs) {
    const data = doc.data();
    const key = (data.nameLower || (data.name || '').trim().toLowerCase());
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push({ id: doc.id, data });
  }

  let toDelete = [];
  let duplicateGroups = 0;

  for (const [name, entries] of byName) {
    if (entries.length < 2) continue;
    duplicateGroups++;
    // Оставляем запись с наибольшим points
    entries.sort((a, b) => (b.data.points || 0) - (a.data.points || 0));
    const keep = entries[0];
    const remove = entries.slice(1);
    console.log(`  "${name}": оставляем uid=${keep.id} (${keep.data.points} pts), удаляем ${remove.map(e => e.id).join(', ')}`);
    toDelete.push(...remove.map(e => e.id));
  }

  if (toDelete.length === 0) {
    console.log('Дублей не найдено. Всё чисто!');
    process.exit(0);
  }

  console.log(`\nНайдено групп с дублями: ${duplicateGroups}`);
  console.log(`Документов к удалению: ${toDelete.length}`);
  console.log('Удаляем...');

  // Удаляем батчами по 400
  const BATCH_SIZE = 400;
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    for (const id of chunk) {
      batch.delete(db.collection('leaderboard').doc(id));
    }
    await batch.commit();
    console.log(`  Удалено ${Math.min(i + BATCH_SIZE, toDelete.length)} / ${toDelete.length}`);
  }

  console.log('\nГотово! Дубли удалены.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
