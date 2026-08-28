// зачем: разовый backfill. Коды, купленные через веб/Telegram, писались без
// updatedAtMs и потому НИКОГДА не попадали в adminListPromoCodes (orderBy —
// это фильтр). Проставляем поле из createdAtMs, чтобы порядок в разделе
// «Промокоды» отражал реальное время покупки, а не время починки.
import admin from 'firebase-admin';
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const apply = process.argv.includes('--apply');

const all = await db.collection('promo_codes').get();
const bad = all.docs.filter((d) => d.data().updatedAtMs === undefined);
console.log(`всего: ${all.size}, без updatedAtMs: ${bad.length}`);
if (!bad.length) process.exit(0);

for (const d of bad) {
  const x = d.data();
  const stamp = Number(x.createdAtMs) || 0;
  console.log(`${apply ? 'ПИШУ ' : 'план '} ${d.id} → updatedAtMs=${stamp} (${stamp ? new Date(stamp).toISOString() : 'нет createdAtMs'}) updatedBy=${x.createdBy || '—'}`);
  if (!stamp) { console.log('   ПРОПУСК: нет createdAtMs, не выдумываем дату'); continue; }
  if (apply) {
    await d.ref.set({ updatedAtMs: stamp, updatedBy: String(x.createdBy || 'backfill') }, { merge: true });
  }
}
console.log(apply ? 'готово' : 'это был сухой прогон, запустите с --apply');
process.exit(0);
