// Разовая дозапись public_profiles.isPlus / plusUntilMs (владелец 21.10: вводный доступ кольца не даёт).
// зачем: проекцию переписывает только приложение при запуске, а за неделю открывают его ~1% профилей.
// Берём ТОЛЬКО профили, помеченные isPremium или isVip (≈300), — остальным поле не нужно: без него кольца нет.
// Запуск: npx tsx scripts/backfill_public_profile_is_plus.ts            — пробный (только чтение, печатает план);
//         npx tsx scripts/backfill_public_profile_is_plus.ts --apply    — запись (только по «да» владельца).
import * as admin from 'firebase-admin';
import { isRealPlusActive, realPlusUntilMs } from '../src/premium_status';

const APPLY = process.argv.includes('--apply');
const LOG = '[PLUS-BACKFILL]';
const PAGE = 500;

type Snap = FirebaseFirestore.QueryDocumentSnapshot;

// зачем (Ревизор 🟡(а), 22.10): прежний .limit(2000) молча обрезал бы кандидатов сверх потолка. Постранично по id —
// без потолка и без композитного индекса (равенство + порядок по id). Каждую страницу пишем в журнал.
async function fetchFlagged(col: FirebaseFirestore.CollectionReference, field: 'isPremium' | 'isVip'): Promise<Snap[]> {
  const out: Snap[] = [];
  let last: Snap | null = null;
  for (;;) {
    let q = col.where(field, '==', true).select('isPlus', 'plusUntilMs')
      .orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    out.push(...page.docs);
    console.log(LOG, JSON.stringify({ step: 'page', field, size: page.size, total: out.length }));
    if (page.size < PAGE) return out;
    last = page.docs[page.docs.length - 1];
  }
}

// зачем (22.10): «не Plus» хранит plusUntilMs = null; прежнее Number(null ?? -1) давало 0 ≠ null, и повторный прогон
// считал все такие профили изменёнными. Сравниваем с тем же null.
export function plusUntilMsEqual(stored: unknown, next: number | null): boolean {
  const normalized = typeof stored === 'number' && Number.isFinite(stored) ? stored : null;
  return normalized === next;
}

async function main(): Promise<void> {
  admin.initializeApp({ projectId: 'phraseman-ea0b3' });
  const db = admin.firestore();
  const col = db.collection('public_profiles');
  const [premium, vip] = await Promise.all([fetchFlagged(col, 'isPremium'), fetchFlagged(col, 'isVip')]);
  const ids = [...new Set([...premium, ...vip].map((doc) => doc.id))];
  const current = new Map([...premium, ...vip].map((doc) => [doc.id, doc.data()]));
  console.log(LOG, JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY', candidates: ids.length, premium: premium.length, vip: vip.length }));
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
      if (before.isPlus === isPlus && plusUntilMsEqual(before.plusUntilMs, plusUntilMs)) { unchanged += 1; return; }
      if (APPLY) { batch.set(col.doc(id), { isPlus, plusUntilMs }, { merge: true }); pending += 1; }
    });
    if (APPLY && pending > 0) { await batch.commit(); written += pending; }
  }
  console.log(LOG, JSON.stringify({ isPlusTrue: plus, isPlusFalse: notPlus, missingUser, unchanged, written, readsUsers: ids.length }));
}

// зачем: импорт plusUntilMsEqual в тесте не должен запускать прогон по проду.
if (require.main === module) {
  main().then(() => process.exit(0)).catch((error) => {
    console.error(LOG, 'failed', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
