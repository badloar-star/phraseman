/*
 * РАЗОВАЯ ПОЧИНКА: заказы, чьи коды уже активированы, помечаем activated.
 * Governance-ID: TG-57491F88C30C
 *
 * Приводит поле status в соответствие с ФАКТОМ. Права и доступ не трогает.
 * Запуск без --apply — только показывает, что будет сделано.
 */
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'phraseman-ea0b3' });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

(async () => {
  const snap = await db.collection('web_premium_orders')
    .where('status', '==', 'paid_pending_activation')
    .limit(200)
    .get();

  console.log(`Заказов в статусе paid_pending_activation: ${snap.size}`);
  if (snap.empty) return;

  const codes = [...new Set(snap.docs
    .map((d) => String((d.data() || {}).activationCode || '').trim())
    .filter(Boolean))];
  const codeDocs = codes.length
    ? await db.getAll(...codes.map((c) => db.collection('promo_codes').doc(c)))
    : [];
  const redeemed = new Map();
  codeDocs.forEach((d) => {
    if (!d.exists) return;
    const p = d.data() || {};
    if (Number(p.usedCount ?? 0) > 0) {
      redeemed.set(d.id, { by: p.lastRedeemedBy || '', atMs: Number(p.lastRedeemedAtMs || 0) });
    }
  });

  const toFix = [];
  snap.forEach((d) => {
    const p = d.data() || {};
    const code = String(p.activationCode || '').trim();
    const hit = code ? redeemed.get(code) : null;
    if (!hit) {
      console.log(`  ОСТАВЛЯЕМ ${d.id}: код=${code || '—'} не активирован`);
      return;
    }
    toFix.push({ id: d.id, code, hit, email: p.email || '—', plan: p.plan });
  });

  console.log(`\nК починке: ${toFix.length}`);
  toFix.forEach((r) => {
    console.log(`  ${r.id} | ${r.email} | ${r.plan} | код=${r.code} | активирован=${r.hit.atMs ? new Date(r.hit.atMs).toISOString() : '—'} | uid=${r.hit.by}`);
  });

  if (!APPLY) {
    console.log('\n(сухой прогон — ничего не записано; добавь --apply)');
    return;
  }

  // Батчем: одна операция записи вместо N.
  const batch = db.batch();
  toFix.forEach((r) => {
    batch.set(db.collection('web_premium_orders').doc(r.id), {
      status: 'activated',
      activatedAtMs: r.hit.atMs || Date.now(),
      activatedAtIso: new Date(r.hit.atMs || Date.now()).toISOString(),
      activatedByStableUid: r.hit.by || null,
      activationCodeUsed: r.code,
      statusBackfilledAtIso: new Date().toISOString(),
      statusBackfillNote: 'promoCodeRedeem не помечал заказ; починено 2026-09-22',
    }, { merge: true });
  });
  await batch.commit();
  console.log(`\nГОТОВО: помечено ${toFix.length}`);
})().then(() => process.exit(0)).catch((e) => {
  console.error('ОШИБКА:', e.message);
  process.exit(1);
});
