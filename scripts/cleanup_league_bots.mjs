import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const svcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './service-account.json';
initializeApp({ credential: cert(JSON.parse(readFileSync(svcPath, 'utf8'))) });
const db = getFirestore();

async function cleanLeagueBots() {
  const snap = await db.collection('league_groups').limit(500).get();
  console.log(`Found ${snap.size} league groups`);

  let updated = 0, deleted = 0;
  const batch = db.batch();

  for (const doc of snap.docs) {
    const data = doc.data();
    const members = data.members ?? [];
    const realMembers = members.filter((m) => !m.isBot && !m.botId);

    if (realMembers.length === 0) {
      // Empty group after removing bots — delete it
      batch.delete(doc.ref);
      deleted++;
    } else if (realMembers.length < members.length) {
      // Had bots — update with only real members
      batch.update(doc.ref, { members: realMembers });
      updated++;
    }
  }

  await batch.commit();
  console.log(`Done. Updated: ${updated}, Deleted (empty): ${deleted}`);
}

cleanLeagueBots().catch(err => { console.error(err); process.exit(1); });
