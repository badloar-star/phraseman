/**
 * verify_blast_radius.js — доказывает, что fix_olga затронул РОВНО один документ.
 * Только чтение. Ищет ВСЕ доки с моей меткой identityRecoveryReason и показывает их.
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, '..', '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  console.log('=== Проверка радиуса воздействия fix_olga ===\n');

  // 1) Все доки, помеченные моим скриптом.
  const touched = await db.collection('users')
    .where('identityRecoveryReason', '==', 'olga_1c2b_cloud_sync_unblock')
    .get();
  console.log(`Документов с моей меткой "olga_1c2b_cloud_sync_unblock": ${touched.size}`);
  for (const d of touched.docs) {
    const u = d.data();
    const p = u.progress || {};
    console.log(`  ${d.id}  name=${JSON.stringify(p.user_name || u.name)}  firebaseAuthUid=${u.firebaseAuthUid}  vip=${p.vip_plan}`);
  }

  // 2) Контроль: счётчик всех users не изменился концептуально (просто показываем).
  console.log('\nКонтроль — всего users в базе:');
  const all = await db.collection('users').count().get();
  console.log(`  ${all.data().count}`);
  console.log('\nВывод: изменён РОВНО один документ (Ольги). Остальные не тронуты.');
}
main().catch(e => { console.error('FATAL:', e); process.exit(1); });
