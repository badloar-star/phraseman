const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const UID = '608d8930-6a62-4349-a878-0298cdfc9104';
const GROUP_ID = '2026-W18_0_1777355364974'; // из league_state_v3 юзера

async function main() {
  // 1. league_groups напрямую
  console.log('=== league_groups/' + GROUP_ID + ' ===');
  const g = await db.collection('league_groups').doc(GROUP_ID).get();
  if (!g.exists) {
    console.log('NOT FOUND. Try search…');
    const q = await db.collection('league_groups').where('weekId', '==', '2026-W18').limit(50).get();
    console.log('groups for W18 (sample):', q.size);
    for (const d of q.docs.slice(0, 10)) console.log(' ', d.id);
    return;
  }
  const data = g.data();
  console.log('weekId:', data.weekId, 'leagueId:', data.leagueId, 'createdAt:', data.createdAt);
  const members = data.members || {};
  const list = Object.entries(members).map(([uid, m]) => ({
    uid: uid.slice(0, 8) + '…',
    me: uid === UID,
    name: m.name,
    points: m.points,
    avatar: m.avatar,
    streak: m.streak,
    isPremium: m.isPremium,
  }));
  list.sort((a, b) => (b.points || 0) - (a.points || 0));
  console.log('members:', list.length);
  for (const m of list) console.log(JSON.stringify(m));

  console.log('\n=== leaderboard/' + UID + ' (актуальные weekPoints) ===');
  const lb = await db.collection('leaderboard').doc(UID).get();
  console.log({
    name: lb.data().name,
    points: lb.data().points,
    weekPoints: lb.data().weekPoints,
    weekKey: lb.data().weekKey,
    leagueId: lb.data().leagueId,
    groupId: lb.data().groupId,
    updatedAt: lb.data().updatedAt ? new Date(lb.data().updatedAt).toISOString() : null,
  });

  // 3. Проверим есть ли в Firestore subcollection daily_stats у этого users-doc — оттуда можно восстановить недельный XP
  console.log('\n=== users/' + UID + '/daily_stats ===');
  try {
    const ds = await db.collection('users').doc(UID).collection('daily_stats').get();
    console.log('size:', ds.size);
    for (const d of ds.docs) {
      console.log(' ', d.id, JSON.stringify(d.data()));
    }
  } catch (e) {
    console.log('err:', e.message);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
