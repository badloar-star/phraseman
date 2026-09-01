// зачем: группа A (7 записей) — «два имени внутри аккаунта разошлись». Но
// расхождение имён само по себе НЕ баг: человек мог войти анонимно, потом
// привязать Google — тогда firebaseAuthUid и providerUid законно разные.
// Опасно ТОЛЬКО одно: человек не сможет войти, потому что ни один его ключ
// не ведёт на его аккаунт. Проверяем именно это. Только чтение.
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(require('C:/appsprojects/phraseman/service-account.json')),
});
const db = admin.firestore();
const s = (v) => String(v ?? '').trim();
const xpOf = (x) => parseInt(String((x?.progress || {}).user_total_xp ?? '0'), 10) || 0;

(async () => {
  const usersSnap = await db.collection('users')
    .select('firebaseAuthUid', 'linkedAuth', 'identityHidden', 'progress').get();

  const rows = [];
  usersSnap.forEach((d) => {
    const x = d.data() || {};
    if (x.identityHidden === true) return;
    const authUid = s(x.firebaseAuthUid);
    const provUid = s((x.linkedAuth || {}).providerUid);
    if (provUid && authUid && provUid !== authUid) rows.push({ id: d.id, x, authUid, provUid });
  });

  let canSignIn = 0, cannot = 0;
  const broken = [];
  for (const r of rows) {
    const [la, lp, aliveA, aliveP] = await Promise.all([
      db.collection('auth_links').doc(r.authUid).get().catch(() => null),
      db.collection('auth_links').doc(r.provUid).get().catch(() => null),
      admin.auth().getUser(r.authUid).then(() => true).catch(() => false),
      admin.auth().getUser(r.provUid).then(() => true).catch(() => false),
    ]);
    // Человек войдёт, если ХОТЬ ОДИН его живой в Auth ключ ведёт на его аккаунт.
    const okA = aliveA && la?.exists && s(la.data()?.stable_id) === r.id;
    const okP = aliveP && lp?.exists && s(lp.data()?.stable_id) === r.id;
    const ok = okA || okP;
    if (ok) canSignIn += 1; else { cannot += 1; broken.push({ ...r, aliveA, aliveP, xp: xpOf(r.x) }); }
    console.log(`${ok ? 'ВОЙДЁТ    ' : 'НЕ ВОЙДЁТ '} ${r.id} XP=${xpOf(r.x)}`);
    console.log(`            auth=${r.authUid.slice(0, 12)}… жив=${aliveA} ведёт_сюда=${okA}`);
    console.log(`            prov=${r.provUid.slice(0, 12)}… жив=${aliveP} ведёт_сюда=${okP}`);
  }

  console.log(`\n╔══ ИТОГ ГРУППЫ A ══╗`);
  console.log(`всего с разными именами: ${rows.length}`);
  console.log(`  войдут нормально (норма, не баг): ${canSignIn}`);
  console.log(`  НЕ войдут (настоящая проблема):   ${cannot}`);
  if (broken.length) {
    console.log('\nтребуют внимания:');
    broken.forEach((b) => console.log(`  ${b.id} XP=${b.xp} (auth жив=${b.aliveA}, prov жив=${b.aliveP})`));
  }
  process.exit(0);
})().catch((e) => { console.error('ОШИБКА:', e.stack || e.message); process.exit(1); });
