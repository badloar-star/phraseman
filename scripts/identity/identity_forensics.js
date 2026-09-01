// зачем (этап 0 перестройки идентичности, владелец 01.09.2026): перепись нашла
// 33 битые записи на 4701 аккаунт. Прежде чем строить новую схему, надо ЗНАТЬ,
// как именно они такими стали — иначе новая система унаследует тот же дефект.
//
// Правило владельца «сперва логи»: показываем ВСЁ по каждой записи (все девять
// имён, прогресс, возраст, куда указывает и что там на самом деле), а не сводку.
// Только чтение. Ничего не меняем.
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(require('C:/appsprojects/phraseman/service-account.json')),
});
const db = admin.firestore();

const s = (v) => String(v ?? '').trim();
const xpOf = (x) => parseInt(String((x.progress || {}).user_total_xp ?? '0'), 10) || 0;
const ageDays = (ms) => (ms > 0 ? Math.round((Date.now() - ms) / 864e5) : null);
const short = (id) => (id.length > 22 ? `${id.slice(0, 10)}…${id.slice(-8)}` : id);

(async () => {
  console.log('[FORENSICS] читаю users…');
  const usersSnap = await db.collection('users').select(
    'firebaseAuthUid', 'linkedAuth', 'identityHidden', 'canonicalStableId',
    'progress', 'updatedAt', 'createdAt', 'anon_merge_claim',
  ).get();

  const byId = new Map();
  const live = new Set();
  usersSnap.forEach((d) => {
    const x = d.data() || {};
    byId.set(d.id, x);
    if (x.identityHidden !== true) live.add(d.id);
  });
  console.log(`[FORENSICS] users=${usersSnap.size} live=${live.size}`);

  // ── ГРУППА A: firebaseAuthUid ≠ linkedAuth.providerUid ────────────────────
  console.log('\n╔══ ГРУППА A: два имени внутри одного аккаунта разошлись ══╗');
  const groupA = [];
  for (const [id, x] of byId) {
    if (x.identityHidden === true) continue;
    const authUid = s(x.firebaseAuthUid);
    const provUid = s((x.linkedAuth || {}).providerUid);
    if (provUid && authUid && provUid !== authUid) groupA.push({ id, x, authUid, provUid });
  }
  for (const { id, x, authUid, provUid } of groupA) {
    const la = x.linkedAuth || {};
    // Кому принадлежат ОБА uid по таблице привязок?
    const [linkAuth, linkProv] = await Promise.all([
      db.collection('auth_links').doc(authUid).get().catch(() => null),
      db.collection('auth_links').doc(provUid).get().catch(() => null),
    ]);
    const la_sid = s(linkAuth?.data()?.stable_id);
    const lp_sid = s(linkProv?.data()?.stable_id);
    // Живы ли сами uid в Firebase Auth?
    const [aliveAuth, aliveProv] = await Promise.all([
      admin.auth().getUser(authUid).then(() => true).catch(() => false),
      admin.auth().getUser(provUid).then(() => true).catch(() => false),
    ]);
    console.log(`\n  ── ${short(id)}`);
    console.log(`     XP=${xpOf(x)} провайдер=${s(la.provider) || '—'} возраст=${ageDays(Number(x.updatedAt))}д`);
    console.log(`     firebaseAuthUid=${short(authUid)} живой_в_auth=${aliveAuth} auth_links→${la_sid ? short(la_sid) : 'НЕТ'}`);
    console.log(`     providerUid    =${short(provUid)} живой_в_auth=${aliveProv} auth_links→${lp_sid ? short(lp_sid) : 'НЕТ'}`);
    const verdict = la_sid === id ? 'firebaseAuthUid — победитель (привязка на него)'
      : lp_sid === id ? 'providerUid — победитель (привязка на него)'
        : 'НИ ОДИН не подтверждён привязкой';
    console.log(`     ВЕРДИКТ: ${verdict}`);
  }
  console.log(`\n  итого группа A: ${groupA.length}`);

  // ── ГРУППА B: auth_links указывают на НЕживого ────────────────────────────
  console.log('\n╔══ ГРУППА B: привязка ведёт в никуда ══╗');
  const linksSnap = await db.collection('auth_links')
    .select('stable_id', 'provider', 'email', 'updatedAt').get();
  const groupB = [];
  linksSnap.forEach((d) => {
    const sid = s((d.data() || {}).stable_id);
    if (!sid || !live.has(sid)) groupB.push({ authUid: d.id, x: d.data() || {}, sid });
  });
  for (const { authUid, x, sid } of groupB) {
    const target = sid ? byId.get(sid) : null;
    const hidden = target ? target.identityHidden === true : false;
    const canon = target ? s(target.canonicalStableId) : '';
    const canonLive = canon ? live.has(canon) : false;
    const alive = await admin.auth().getUser(authUid).then(() => true).catch(() => false);
    let kind;
    if (!sid) kind = 'привязка без цели (пустой stable_id)';
    else if (!target) kind = 'ЦЕЛЬ УДАЛЕНА (документа нет)';
    else if (hidden && canonLive) kind = `цель скрыта, но ведёт к живому ${short(canon)} — ЧИНИТСЯ`;
    else if (hidden) kind = 'цель скрыта и ведёт в никуда';
    else kind = 'иное';
    console.log(`  ${short(authUid)} живой_в_auth=${alive} → ${sid ? short(sid) : '—'} :: ${kind}`);
  }
  console.log(`\n  итого группа B: ${groupB.length}`);

  // ── ГРУППА C: скрытые, указывающие в никуда ───────────────────────────────
  console.log('\n╔══ ГРУППА C: след слияния потерял цель ══╗');
  const groupC = [];
  for (const [id, x] of byId) {
    if (x.identityHidden !== true) continue;
    const canon = s(x.canonicalStableId);
    if (canon && !live.has(canon)) groupC.push({ id, x, canon });
  }
  for (const { id, x, canon } of groupC) {
    const canonDoc = byId.get(canon);
    const xp = xpOf(x);
    let kind;
    if (!canonDoc) kind = 'цель УДАЛЕНА полностью';
    else if (canonDoc.identityHidden === true) {
      const next = s(canonDoc.canonicalStableId);
      kind = next ? `цель тоже скрыта → ${short(next)} (цепочка)` : 'цель тоже скрыта, тупик';
    } else kind = 'иное';
    console.log(`  ${short(id)} XP=${xp} → ${short(canon)} :: ${kind}`);
  }
  console.log(`\n  итого группа C: ${groupC.length}`);

  console.log('\n╔══ СВОДКА ══╗');
  console.log(`A (имена разошлись): ${groupA.length}`);
  console.log(`B (привязка в никуда): ${groupB.length}`);
  console.log(`C (след слияния без цели): ${groupC.length}`);
  console.log(`ВСЕГО: ${groupA.length + groupB.length + groupC.length}`);
  process.exit(0);
})().catch((e) => { console.error('[FORENSICS] ОШИБКА:', e.stack || e.message); process.exit(1); });
