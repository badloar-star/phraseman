import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const snap = await db.collection('leaderboard').orderBy('points', 'desc').limit(15).get();
console.log('TOP 15 leaderboard:');
snap.docs.forEach((d, i) => {
  const { name, points } = d.data();
  console.log(`${i+1}. ${name}: ${points}`);
});

// Найдём Alex в users
const usersSnap = await db.collection('users').get();
for (const doc of usersSnap.docs) {
  const name = doc.data()?.progress?.user_name;
  const xp = doc.data()?.progress?.user_total_xp;
  if (name === 'Alex') console.log(`\nAlex в users: xp=${xp}`);
}
