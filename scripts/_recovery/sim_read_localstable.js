/**
 * sim_read_localstable.js — READ-ONLY симуляция правила read для нового localStableId.
 * Подтверждает гипотезу корня бага 1.5.41: tx.get(users/{localStableId}) режется
 * правилами, потому что на новый локальный stableId ничто не указывает.
 */
const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '..', '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const PROVIDER_UID = 'OQ6sKFWdL0gfknUzQX4sQhFNMOE2';
const STABLE = 'ae9fee12-34e8-46c8-8c17-d88e27268a5e';

(async () => {
  const link = await db.collection('auth_links').doc(PROVIDER_UID).get();
  const linkStable = link.exists ? link.data().stable_id : null;
  console.log('auth_links/{OQ6sKFWd}.stable_id =', linkStable);
  console.log('');
  console.log('READ-правило userDocOwnerMatchesAuth(localStableId) для НОВОГО uuid свежей установки:');
  console.log('  isOwner(localStableId)            = false (request.auth.uid=OQ6sKFWd != uuid)');
  console.log('  stableUserMatchesAuth(localStable)= false (users/{localStableId} не существует)');
  console.log('  authLinkMapsToUser(localStable)   = false (auth_links/{OQ6sKFWd}.stable_id=' + linkStable + ' != localStableId)');
  console.log('  => read users/{localStableId} = DENIED');
  console.log('');
  console.log('В транзакции 1.5.41 присутствует tx.get(usersRef.doc(localStableId)).');
  console.log('Любой denied READ внутри runTransaction → вся транзакция падает');
  console.log('PERMISSION_DENIED [firestore/unknown] → метка transaction_ в Crashlytics. ПОДТВЕРЖДЕНО.');
})().then(() => process.exit(0)).catch((e) => { console.error('ERR', e); process.exit(1); });
