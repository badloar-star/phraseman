// Выставляет admin_premium_override=true для всех пользователей,
// у которых уже стоит premium_plan через админку (нет активной RC подписки).
// Запуск: node scripts/fix_admin_premium.js

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const snap = await db.collection('users').get();
  let fixed = 0;
  const batch = db.batch();

  for (const doc of snap.docs) {
    const p = doc.data().progress || {};
    const plan = p.premium_plan;
    if (plan && plan !== 'null' && plan !== '' && !p.admin_premium_override) {
      batch.update(doc.ref, { 'progress.admin_premium_override': 'true' });
      console.log(`✅ ${p.user_name || doc.id} → premium_plan=${plan}`);
      fixed++;
    }
  }

  if (fixed === 0) { console.log('Нечего исправлять.'); process.exit(0); }
  await batch.commit();
  console.log(`\nГотово: выставлен флаг для ${fixed} пользователей`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
