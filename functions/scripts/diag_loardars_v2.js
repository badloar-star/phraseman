// Глубокая диагностика "Loardars": историческая XP, league, level
const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const UID = '608d8930-6a62-4349-a878-0298cdfc9104';

function safe(val) {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (val instanceof admin.firestore.Timestamp) return val.toDate().toISOString();
  if (Array.isArray(val)) return val.map(safe);
  if (typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) out[k] = safe(val[k]);
    return out;
  }
  return val;
}

async function main() {
  console.log('=== users/' + UID + ' (FULL) ===');
  const u = await db.collection('users').doc(UID).get();
  if (u.exists) {
    const data = safe(u.data());
    // Печатаем целиком, кроме длинных JSON-полей
    console.log(JSON.stringify(data, (k, v) => {
      if (typeof v === 'string' && v.length > 200) return v.slice(0, 200) + '... (' + v.length + ' chars)';
      return v;
    }, 2));
  } else {
    console.log('NOT FOUND');
  }

  console.log('\n=== users/' + UID + ' subcollections ===');
  const subs = await db.collection('users').doc(UID).listCollections();
  for (const s of subs) {
    console.log('  - ' + s.id);
    const docs = await s.limit(5).get();
    console.log('    sample size: ' + docs.size);
    docs.forEach(d => console.log('      ' + d.id, JSON.stringify(safe(d.data())).slice(0, 200)));
  }

  console.log('\n=== leaderboard/' + UID + ' (FULL) ===');
  const lb = await db.collection('leaderboard').doc(UID).get();
  if (lb.exists) console.log(JSON.stringify(safe(lb.data()), null, 2));
  else console.log('NOT FOUND');

  console.log('\n=== Все users где linkedAuth.email == badloar@gmail.com (или похожие) ===');
  const byEmail = await db.collection('users').where('linkedAuth.email', '==', 'badloar@gmail.com').get();
  console.log('по email:', byEmail.size);
  for (const d of byEmail.docs) {
    console.log({
      id: d.id,
      name: d.data()?.progress?.user_name,
      xp: d.data()?.progress?.user_total_xp,
      streak: d.data()?.progress?.streak_count,
      created_at: d.data()?.created_at,
      updatedAt: d.data()?.updatedAt,
      linkedAt: d.data()?.linkedAuth?.linkedAt,
    });
  }

  console.log('\n=== Все users где linkedAuth.providerUid == lawQgWtWz8gfaNw1DzoWa4buD153 ===');
  const byProvider = await db.collection('users').where('linkedAuth.providerUid', '==', 'lawQgWtWz8gfaNw1DzoWa4buD153').get();
  console.log('по providerUid:', byProvider.size);
  for (const d of byProvider.docs) {
    console.log({
      id: d.id,
      name: d.data()?.progress?.user_name,
      xp: d.data()?.progress?.user_total_xp,
    });
  }

  console.log('\n=== league_groups записи где есть наш UID ===');
  // Поищем по полю uids массивом — но league_groups у вас вложенные, поищем коллекцию-группой через collectionGroup
  try {
    const cg = await db.collectionGroup('members').where('uid', '==', UID).limit(10).get();
    console.log('collectionGroup(members) совпадений:', cg.size);
    for (const d of cg.docs) {
      console.log({ path: d.ref.path, ...safe(d.data()) });
    }
  } catch (e) {
    console.log('collectionGroup(members) err:', e.message);
  }

  console.log('\n=== Уровни в проекте: формула — посмотрим в functions/lib (если есть) ===');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
