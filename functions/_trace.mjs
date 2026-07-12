import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync('C:/appsprojects/phraseman/service-account.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const UIDS = [
  'xjQksVY8wqhF3zIeNLOSTPZ2rI12',
  'rsaZF3UfoeSVVWhrLsHBNb8Auuc2',
  'e41fe1f9-61e7-4aae-b63b-7f5eca7228c1',
  'PL58uhnvVzcLTafWqeQ1JajmDG53',
];

for (const uid of UIDS) {
  console.log(`\n════════ helper uid: ${uid} ════════`);
  const doc = await db.collection('users').doc(uid).get();
  const d = doc.data() || {};
  console.log('users/{uid} keys:', Object.keys(d).sort().join(', ') || '(нет дока)');
  console.log('  firebaseAuthUid =', JSON.stringify(d.firebaseAuthUid));
  console.log('  linkedAuth =', JSON.stringify(d.linkedAuth));

  // 1) вдруг этот uid = stableId, а профиль под firebaseAuthUid
  const authUid = d.firebaseAuthUid;
  if (authUid && authUid !== uid) {
    const alt = await db.collection('users').doc(authUid).get();
    const ad = alt.data() || {};
    console.log(`  → users/{firebaseAuthUid=${authUid.slice(0,10)}} exists=${alt.exists} user_name=${JSON.stringify(ad.progress?.user_name)} user_level=${JSON.stringify(ad.progress?.user_level)}`);
  }

  // 2) обратный поиск: кто ссылается на этот uid как на свой firebaseAuthUid
  const back = await db.collection('users').where('firebaseAuthUid', '==', uid).limit(5).get();
  console.log(`  ← docs c firebaseAuthUid==этот uid: ${back.size}`);
  back.docs.forEach(b => {
    const bp = b.data().progress || {};
    console.log(`      ${b.id.slice(0,12)}  user_name=${JSON.stringify(bp.user_name)}  user_level=${JSON.stringify(bp.user_level)}  xp=${JSON.stringify(bp.user_total_xp)}`);
  });

  // 3) в leaderboard по этому uid или по firebaseAuthUid
  const lb = await db.collection('leaderboard').doc(uid).get();
  console.log(`  leaderboard/{uid} exists=${lb.exists}`, lb.exists ? `name=${JSON.stringify(lb.data().name)}` : '');
}
process.exit(0);
