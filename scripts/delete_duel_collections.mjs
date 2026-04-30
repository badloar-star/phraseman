import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const COLLECTIONS_TO_DELETE = [
  'duel_rooms',
  'duel_invites',
  'duel_profiles',
  'duel_sessions',
  'duel_questions',
  'matchmaking_queue',
];

async function deleteCollection(colName) {
  const snap = await db.collection(colName).get();
  if (snap.empty) {
    console.log(`  ${colName}: пусто, пропускаем`);
    return;
  }
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  ${colName}: удалено ${snap.size} документов`);
}

for (const col of COLLECTIONS_TO_DELETE) {
  process.stdout.write(`Удаляем ${col}...`);
  await deleteCollection(col);
}

console.log('\nГотово! Старые duel_* коллекции удалены.');
