// Диагностика: поиск аккаунта "Loardars" и истории привязок Google
// Запуск: node functions/scripts/diag_loardars.js

const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const CURRENT_STABLE_ID = '608d8930-6a62-4349-a878-0298cdfc9104';

const NEEDLE = 'loardar'; // case-insensitive

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

function shortDoc(doc) {
  const d = doc.data() || {};
  return {
    id: doc.id,
    linkedAuth: d.linkedAuth ? safe(d.linkedAuth) : undefined,
    progress_user_name: d.progress?.user_name ?? null,
    progress_total_xp: d.progress?.user_total_xp ?? null,
    created_at: d.created_at ?? null,
    updatedAt: d.updatedAt ?? null,
    last_active_at: d.last_active_at ?? null,
  };
}

async function main() {
  console.log('============================================================');
  console.log('1. Текущий users/' + CURRENT_STABLE_ID);
  console.log('============================================================');
  const cur = await db.collection('users').doc(CURRENT_STABLE_ID).get();
  if (cur.exists) {
    console.log(JSON.stringify(shortDoc(cur), null, 2));
  } else {
    console.log('NOT FOUND');
  }

  console.log('\n============================================================');
  console.log('2. Все auth_links где stable_id == ' + CURRENT_STABLE_ID);
  console.log('============================================================');
  const linksToMe = await db
    .collection('auth_links')
    .where('stable_id', '==', CURRENT_STABLE_ID)
    .get();
  console.log(`Найдено: ${linksToMe.size}`);
  for (const d of linksToMe.docs) {
    const data = d.data();
    console.log({
      providerUid: d.id,
      provider: data.provider,
      email: data.email,
      displayName: data.displayName,
      linkedAt: data.linkedAt ? new Date(data.linkedAt).toISOString() : null,
      lastSignInAt: data.lastSignInAt ? new Date(data.lastSignInAt).toISOString() : null,
    });
  }

  console.log('\n============================================================');
  console.log('3. Поиск "loardar*" во ВСЕХ auth_links');
  console.log('============================================================');
  const allLinks = await db.collection('auth_links').get();
  console.log(`Всего auth_links: ${allLinks.size}`);
  const matchingLinks = [];
  for (const d of allLinks.docs) {
    const data = d.data();
    const dn = (data.displayName || '').toLowerCase();
    const em = (data.email || '').toLowerCase();
    if (dn.includes(NEEDLE) || em.includes(NEEDLE)) {
      matchingLinks.push({
        providerUid: d.id,
        provider: data.provider,
        email: data.email,
        displayName: data.displayName,
        stable_id: data.stable_id,
        linkedAt: data.linkedAt ? new Date(data.linkedAt).toISOString() : null,
        lastSignInAt: data.lastSignInAt ? new Date(data.lastSignInAt).toISOString() : null,
      });
    }
  }
  console.log(`Совпадений по "${NEEDLE}": ${matchingLinks.length}`);
  for (const l of matchingLinks) console.log(JSON.stringify(l, null, 2));

  console.log('\n============================================================');
  console.log('4. Поиск "loardar*" в users (linkedAuth.displayName / progress.user_name)');
  console.log('============================================================');
  // Большая коллекция — стримом, без полного загруза в память
  let usersScanned = 0;
  const matchingUsers = [];
  const orphanedStableIds = new Set(matchingLinks.map(l => l.stable_id).filter(Boolean));
  let cursor = null;
  while (true) {
    let q = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).limit(500);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      usersScanned++;
      const data = d.data();
      const ln = ((data.linkedAuth && data.linkedAuth.displayName) || '').toLowerCase();
      const le = ((data.linkedAuth && data.linkedAuth.email) || '').toLowerCase();
      const un = ((data.progress && data.progress.user_name) || '').toLowerCase();
      if (ln.includes(NEEDLE) || le.includes(NEEDLE) || un.includes(NEEDLE) || orphanedStableIds.has(d.id)) {
        matchingUsers.push(shortDoc(d));
      }
    }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) break;
  }
  console.log(`Просканировано users: ${usersScanned}`);
  console.log(`Совпадений: ${matchingUsers.length}`);
  for (const u of matchingUsers) console.log(JSON.stringify(u, null, 2));

  console.log('\n============================================================');
  console.log('5. Поиск "loardar*" в leaderboard');
  console.log('============================================================');
  const lbSnap = await db
    .collection('leaderboard')
    .where('nameLower', '>=', NEEDLE)
    .where('nameLower', '<', NEEDLE + '\uf8ff')
    .limit(20)
    .get();
  console.log(`Совпадений в leaderboard: ${lbSnap.size}`);
  for (const d of lbSnap.docs) {
    const data = d.data();
    console.log({
      uid: d.id,
      name: data.name,
      points: data.points,
      lang: data.lang,
      isPremium: data.isPremium,
      lastActive: data.lastActive ? new Date(data.lastActive).toISOString() : null,
    });
  }

  console.log('\n============================================================');
  console.log('6. Поиск "loardar*" в name_index');
  console.log('============================================================');
  const niSnap = await db
    .collection('name_index')
    .where(admin.firestore.FieldPath.documentId(), '>=', NEEDLE)
    .where(admin.firestore.FieldPath.documentId(), '<', NEEDLE + '\uf8ff')
    .limit(20)
    .get();
  console.log(`Совпадений в name_index: ${niSnap.size}`);
  for (const d of niSnap.docs) {
    console.log({ id: d.id, ...d.data() });
  }

  console.log('\nDONE');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
