/**
 * set_admin_claim.js — Устанавливает Custom Claim { admin: true } для admin-аккаунта.
 *
 * Запуск (ONE TIME):
 *   node scripts/set_admin_claim.js zavetkashop@gmail.com
 *
 * Требует: service-account.json в корне проекта (Firebase Console → Project Settings → Service Accounts)
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/set_admin_claim.js <email>');
  process.exit(1);
}

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Custom claim { admin: true } установлен для ${email} (uid: ${user.uid})`);
    console.log('   Пользователь должен выйти и войти заново чтобы claim обновился в токене.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
  }
})();
