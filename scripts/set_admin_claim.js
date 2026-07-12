/**
 * set_admin_claim.js — выдаёт или обновляет admin-доступ с явной RBAC-ролью.
 *
 * Запуск (ONE TIME):
 *   node scripts/set_admin_claim.js admin@example.com owner
 * Для нового администратора дополнительно требуется --grant.
 *
 * Требует: service-account.json в корне проекта (Firebase Console → Project Settings → Service Accounts)
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const ADMIN_ROLES = new Set(['owner', 'admin', 'support', 'content_editor', 'moderator', 'analyst', 'developer']);
const argv = process.argv.slice(2);
const allowGrant = argv.includes('--grant');
const args = argv.filter((value) => value !== '--grant');
const email = args[0]?.trim();
const role = args[1]?.trim();
if (!email || !ADMIN_ROLES.has(role)) {
  console.error('Usage: node scripts/set_admin_claim.js <email> <role> [--grant]');
  console.error(`Allowed roles: ${[...ADMIN_ROLES].join(', ')}`);
  process.exit(1);
}

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    const existingClaims = user.customClaims ?? {};
    if (existingClaims.admin !== true && !allowGrant) {
      throw new Error('Refusing to grant a non-admin account without explicit --grant');
    }
    await admin.auth().setCustomUserClaims(user.uid, {
      ...(user.customClaims ?? {}),
      admin: true,
      adminRole: role,
    });
    console.log(`✅ Admin claims обновлены для ${email}; role=${role}; project=${admin.app().options.projectId || 'default'}`);
    console.log('   Пользователь должен выйти и войти заново чтобы claim обновился в токене.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
  }
})();
