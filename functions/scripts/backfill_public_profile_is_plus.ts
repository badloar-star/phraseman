// Разовая дозапись public_profiles.isPlus / plusUntilMs (владелец 21.10: вводный доступ кольца не даёт).
// зачем: проекцию переписывает только приложение при запуске, а за неделю открывают его ~1% профилей.
// Берём ТОЛЬКО профили, помеченные isPremium или isVip (≈300), — остальным поле не нужно: без него кольца нет.
// Запуск: npx tsx scripts/backfill_public_profile_is_plus.ts            — пробный (только чтение, печатает план);
//         npx tsx scripts/backfill_public_profile_is_plus.ts --apply    — запись (только по «да» владельца).
import * as admin from 'firebase-admin';
import { isRealPlusActive, realPlusUntilMs } from '../src/premium_status';

const APPLY = process.argv.includes('--apply');
const LOG = '[PLUS-BACKFILL]';

async function main(): Promise<void> {
  admin.initializeApp({ projectId: 'phraseman-ea0b3' });
  const db = admin.firestore();
  const col = db.collection('public_profiles');
  // Потолок 2000: на 21.10 кандидатов 237 (isPremium 223, isVip 85) — запас на рост, но не выкачка всей коллекции.
  const [premium, vip] = await Promise.all([
    col.where('isPremium', '==', true).select('isPlus', 'plusUntilMs').limit(2000).get(),
    col.where('isVip', '==', true).select('isPlus', 'plusUntilMs').limit(2000).get(),
  ]);
  const ids = [...new Set([...premium.docs, ...vip.docs].map((doc) => doc.id))];
  console.log(LOG, JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY', candidates: ids.length, premium: premium.size, vip: vip.size }));
  const nowMs = Date.now();
  let plus = 0;
  let notPlus = 0;
  let missingUser = 0;
  let unchanged = 0;
  let written = 0;
  // Пачками по 100: чтения users батчем через getAll, запись — одним batch на пачку.
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const users = await db.getAll(...chunk.map((id) => db.collection('users').doc(id)));
    const current = new Map([...premium.docs, ...vip.docs].map((doc) => [doc.id, doc.data()]));
    const batch = db.batch();
    let pending = 0;
    users.forEach((snap, index) => {
      const id = chunk[index];
      if (!snap.exists) { missingUser += 1; return; }
      const progress = ((snap.data() ?? {}).progress ?? {}) as Record<string, unknown>;
      const isPlus = isRealPlusActive(progress, nowMs);
      const plusUntilMs = realPlusUntilMs(progress, nowMs);
      if (isPlus) plus += 1; else notPlus += 1;
      const before = current.get(id) ?? {};
      if (before.isPlus === isPlus && Number(before.plusUntilMs ?? -1) === plusUntilMs) { unchanged += 1; return; }
      if (APPLY) { batch.set(col.doc(id), { isPlus, plusUntilMs }, { merge: true }); pending += 1; }
    });
    if (APPLY && pending > 0) { await batch.commit(); written += pending; }
  }
  console.log(LOG, JSON.stringify({ isPlusTrue: plus, isPlusFalse: notPlus, missingUser, unchanged, written, readsUsers: ids.length }));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(LOG, 'failed', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
