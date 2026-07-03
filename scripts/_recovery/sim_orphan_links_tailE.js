/**
 * sim_orphan_links_tailE.js — READ-ONLY: ищем осиротевшие auth_links, чей stable_id
 * указывает на НЕсуществующий users-док (хвост E: удаление аккаунта + повторный вход
 * тем же Google цепляется за мёртвую привязку → пустой/новый аккаунт).
 * Считаем масштаб, чтобы решить, нужна ли серверная правка resolveStableUidForAuth.
 */
const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '..', '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  console.log('Скан auth_links (до 5000) на осиротевшие привязки…');
  const snap = await db.collection('auth_links').limit(5000).get();
  let total = 0, orphan = 0, examples = [];
  // батчим проверки существования users-доков
  for (const doc of snap.docs) {
    total += 1;
    const stableId = String(doc.data()?.stable_id ?? '').trim();
    if (!stableId) { continue; }
    const u = await db.collection('users').doc(stableId).get().catch(() => null);
    if (!u || !u.exists) {
      orphan += 1;
      if (examples.length < 12) examples.push({ link: doc.id.slice(0, 10), stable: stableId.slice(0, 10), provider: doc.data()?.provider });
    }
  }
  console.log(`\nВсего auth_links просканировано: ${total}`);
  console.log(`Осиротевших (stable_id → несуществующий users): ${orphan}`);
  if (examples.length) {
    console.log('\nПримеры (хвост E — повторный вход тем же провайдером цепляется за мёртвый id):');
    for (const e of examples) console.log(`  auth_links/${e.link}… → users/${e.stable}… (НЕТ) provider=${e.provider}`);
    console.log('\nВЫВОД: хвост E РЕАЛЕН. Эти пользователи при повторном входе тем же Google');
    console.log('попадут на мёртвую привязку. Нужна серверная правка: при resolve, если');
    console.log('users/{linkedStableId} не существует — пересоздать привязку на текущий stable_id.');
  } else {
    console.log('\nОсиротевших привязок НЕ найдено в выборке — хвост E не подтверждён на этих данных.');
  }
})().then(() => process.exit(0)).catch((e) => { console.error('ERR', e); process.exit(1); });
