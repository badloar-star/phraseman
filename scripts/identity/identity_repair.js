// ════════════════════════════════════════════════════════════════════════════
// ЭТАП 0 перестройки идентичности: починка 33 расхождений (владелец, 01.09.2026)
//
// зачем: перепись нашла 33 битые записи на 4701 аккаунт. Разбор показал, что
// 26 из них — не поломка, а НЕДОДЕЛАННАЯ УБОРКА после слияний: указатели
// остались на промежуточном звене вместо конечного живого аккаунта. Их нужно
// «дожать». Ещё 7 — расхождение имён внутри аккаунта.
//
// ПРИНЦИП БЕЗОПАСНОСТИ: ничего не удаляем и не перезаписываем прогресс.
// Только достраиваем указатели до конечной живой цели. Любая запись обратима.
//
// Запуск: node identity_repair_tmp.js         → СУХОЙ ПРОГОН (ничего не пишет)
//         node identity_repair_tmp.js --apply → боевой прогон
// ════════════════════════════════════════════════════════════════════════════
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(require('C:/appsprojects/phraseman/service-account.json')),
});
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const s = (v) => String(v ?? '').trim();
const xpOf = (x) => parseInt(String((x?.progress || {}).user_total_xp ?? '0'), 10) || 0;

const plan = { linksRepointed: [], usersRepointed: [], authLinksCreated: [], skipped: [] };

(async () => {
  console.log(APPLY ? '### БОЕВОЙ ПРОГОН ###' : '### СУХОЙ ПРОГОН (ничего не пишется) ###\n');

  const usersSnap = await db.collection('users').select(
    'firebaseAuthUid', 'linkedAuth', 'identityHidden', 'canonicalStableId', 'progress', 'updatedAt',
  ).get();
  const byId = new Map();
  const live = new Set();
  usersSnap.forEach((d) => {
    const x = d.data() || {};
    byId.set(d.id, x);
    if (x.identityHidden !== true) live.add(d.id);
  });

  // Проходит цепочку скрытых указателей до конечного ЖИВОГО аккаунта.
  // Возвращает null, если цепочка обрывается — такие не трогаем.
  const resolveFinal = (startId) => {
    let cur = startId;
    const seen = new Set();
    for (let i = 0; i < 8; i += 1) {
      if (!cur || seen.has(cur)) return null;
      seen.add(cur);
      if (live.has(cur)) return cur;
      const x = byId.get(cur);
      if (!x) return null;
      const next = s(x.canonicalStableId);
      if (!next || next === cur) return null;
      cur = next;
    }
    return null;
  };

  // ── A. auth_links, ведущие на скрытый документ → перенаправить на живой ────
  const linksSnap = await db.collection('auth_links').select('stable_id').get();
  for (const doc of linksSnap.docs) {
    const sid = s((doc.data() || {}).stable_id);
    if (!sid || live.has(sid)) continue;
    const final = resolveFinal(sid);
    if (!final) {
      plan.skipped.push({ kind: 'auth_link', id: doc.id, from: sid, why: 'цепочка обрывается — цели нет' });
      continue;
    }
    plan.linksRepointed.push({ id: doc.id, from: sid, to: final, xp: xpOf(byId.get(final)) });
  }

  // ── B. скрытые users, чей указатель ведёт не к живому → дожать ────────────
  for (const [id, x] of byId) {
    if (x.identityHidden !== true) continue;
    const canon = s(x.canonicalStableId);
    if (!canon || live.has(canon)) continue;
    const final = resolveFinal(canon);
    if (!final) {
      plan.skipped.push({ kind: 'user', id, from: canon, why: 'цель исчезла, прогресса нет', xp: xpOf(x) });
      continue;
    }
    plan.usersRepointed.push({ id, from: canon, to: final, xp: xpOf(x) });
  }

  // ── C. живые аккаунты с провайдером, но БЕЗ записи в auth_links ────────────
  // Именно это делает вход невозможным при повторной установке: сервер не
  // находит человека по провайдеру. Создаём недостающую привязку.
  for (const [id, x] of byId) {
    if (x.identityHidden === true) continue;
    const la = x.linkedAuth || {};
    const provider = s(la.provider);
    const provUid = s(la.providerUid);
    const authUid = s(x.firebaseAuthUid);
    if (!provider || !provUid) continue;
    // Проверяем оба возможных ключа привязки.
    const candidates = [...new Set([provUid, authUid].filter(Boolean))];
    const existing = await Promise.all(
      candidates.map((uid) => db.collection('auth_links').doc(uid).get().catch(() => null)),
    );
    const pointsHere = existing.some((snap) => snap?.exists && s(snap.data()?.stable_id) === id);
    if (pointsHere) continue;
    // Не трогаем, если ключ уже занят ЧУЖИМ аккаунтом — это разбирается руками.
    const takenByOther = existing.find((snap) => snap?.exists && s(snap.data()?.stable_id) !== id);
    if (takenByOther) {
      plan.skipped.push({
        kind: 'auth_link_conflict', id, why: `ключ занят чужим ${s(takenByOther.data()?.stable_id)}`, xp: xpOf(x),
      });
      continue;
    }
    // Пишем привязку на тот uid, которым человек РЕАЛЬНО входит.
    const key = authUid || provUid;
    // Мёртвые в Firebase Auth uid (например admin-vip-*) пропускаем: по ним
    // никто не войдёт, а лишняя запись только запутает будущую миграцию.
    const alive = await admin.auth().getUser(key).then(() => true).catch(() => false);
    if (!alive) {
      plan.skipped.push({ kind: 'auth_link_dead_uid', id, why: `uid ${key} не существует в Auth`, xp: xpOf(x) });
      continue;
    }
    if (id.startsWith('admin-vip-')) {
      plan.skipped.push({ kind: 'test_account', id, why: 'следы автотестов, живых людей нет', xp: xpOf(x) });
      continue;
    }
    plan.authLinksCreated.push({ authUid: key, stableId: id, provider, xp: xpOf(x) });
  }

  // ── ОТЧЁТ ─────────────────────────────────────────────────────────────────
  console.log(`A. Привязки на перенаправление: ${plan.linksRepointed.length}`);
  plan.linksRepointed.forEach((r) => console.log(`   ${r.id} : ${r.from} → ${r.to} (XP цели ${r.xp})`));
  console.log(`\nB. Следы слияния на дожатие: ${plan.usersRepointed.length}`);
  plan.usersRepointed.forEach((r) => console.log(`   ${r.id} → ${r.to} (свой XP ${r.xp})`));
  console.log(`\nC. Недостающие привязки: ${plan.authLinksCreated.length}`);
  plan.authLinksCreated.forEach((r) => console.log(`   ${r.authUid} → ${r.stableId} (${r.provider}, XP ${r.xp})`));
  console.log(`\nПРОПУЩЕНО (руками): ${plan.skipped.length}`);
  plan.skipped.forEach((r) => console.log(`   [${r.kind}] ${r.id} :: ${r.why}${r.xp !== undefined ? ` XP=${r.xp}` : ''}`));

  const totalWrites = plan.linksRepointed.length + plan.usersRepointed.length + plan.authLinksCreated.length;
  console.log(`\nВСЕГО ЗАПИСЕЙ: ${totalWrites}`);

  if (!APPLY) { console.log('\n(сухой прогон — ничего не записано)'); process.exit(0); }

  // ── ПРИМЕНЕНИЕ ────────────────────────────────────────────────────────────
  const now = Date.now();
  const stamp = { identityRepairAt: now, identityRepairReason: 'stage0_identity_rebuild_2026_09_01' };
  let batch = db.batch();
  let n = 0;
  const flush = async () => { if (n) { await batch.commit(); batch = db.batch(); n = 0; } };

  for (const r of plan.linksRepointed) {
    batch.set(db.collection('auth_links').doc(r.id),
      { stable_id: r.to, updatedAt: now, ...stamp }, { merge: true });
    if (++n >= 400) await flush();
  }
  for (const r of plan.usersRepointed) {
    batch.set(db.collection('users').doc(r.id),
      { canonicalStableId: r.to, updatedAt: now, ...stamp }, { merge: true });
    if (++n >= 400) await flush();
  }
  for (const r of plan.authLinksCreated) {
    batch.set(db.collection('auth_links').doc(r.authUid),
      { stable_id: r.stableId, provider: r.provider, updatedAt: now, ...stamp }, { merge: true });
    if (++n >= 400) await flush();
  }
  await flush();
  console.log(`\nПРИМЕНЕНО: ${totalWrites} записей`);
  process.exit(0);
})().catch((e) => { console.error('ОШИБКА:', e.stack || e.message); process.exit(1); });
