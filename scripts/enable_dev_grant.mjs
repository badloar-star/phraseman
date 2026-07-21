// Одноразовый скрипт: включает гейт DEV-выдачи прокрутов рулетки.
//   remote_config/app.numbers.referral_dev_grant_enabled = true
// Запуск из корня проекта:
//   set GOOGLE_APPLICATION_CREDENTIALS=./service-account.json && node scripts/enable_dev_grant.mjs
// Выключить обратно: тот же скрипт с аргументом "off":
//   node scripts/enable_dev_grant.mjs off
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const enabled = process.argv[2] !== 'off';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const ref = db.collection('remote_config').doc('app');
await ref.set({ numbers: { referral_dev_grant_enabled: enabled } }, { merge: true });

// Читаем обратно из продa — подтверждение.
const snap = await ref.get();
const value = snap.data()?.numbers?.referral_dev_grant_enabled;
console.log(`remote_config/app.numbers.referral_dev_grant_enabled = ${JSON.stringify(value)} (requested ${enabled})`);
if (value !== enabled) {
  console.error('MISMATCH: значение в проде не совпало с запрошенным!');
  process.exit(1);
}
