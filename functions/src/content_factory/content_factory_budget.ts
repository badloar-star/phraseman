import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export const CONTENT_FACTORY_BUDGET_COLLECTION = 'content_factory_daily_budget';
export const CONTENT_FACTORY_BUDGET_RESERVATIONS = 'content_factory_budget_reservations';

function utcDateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function contentFactoryBudgetDocId(unitId: string, nowMs: number): string {
  const day = utcDateKey(nowMs);
  const hash = createHash('sha256').update(unitId).digest('hex').slice(0, 48);
  return `${day}_${hash}`;
}

export async function reserveContentFactoryBudget(
  db: FirebaseFirestore.Firestore,
  unitId: string,
  cap: number,
  nowMs: number = Date.now(),
): Promise<{ reserved: boolean; replayed: boolean }> {
  if (!/^[A-Za-z0-9._:-]{1,260}$/.test(unitId)) throw new HttpsError('invalid-argument', 'content_factory_budget_unit_invalid');
  if (!Number.isFinite(cap) || cap <= 0) return Object.freeze({ reserved: false, replayed: false });
  const day = utcDateKey(nowMs);
  const counterRef = db.collection(CONTENT_FACTORY_BUDGET_COLLECTION).doc(day);
  const reservationRef = db.collection(CONTENT_FACTORY_BUDGET_RESERVATIONS).doc(contentFactoryBudgetDocId(unitId, nowMs));
  return db.runTransaction(async (tx) => {
    const reservationSnap = await tx.get(reservationRef);
    if (reservationSnap.exists) return Object.freeze({ reserved: true, replayed: true });
    const counterSnap = await tx.get(counterRef);
    const used = Number(counterSnap.data()?.generationCount ?? 0);
    if (!Number.isSafeInteger(used) || used < 0) throw new HttpsError('data-loss', 'content_factory_budget_counter_invalid');
    if (used >= Math.floor(cap)) throw new HttpsError('resource-exhausted', 'content_factory_daily_budget_exceeded');
    tx.set(counterRef, { generationCount: used + 1, cap: Math.floor(cap), updatedAtMs: nowMs }, { merge: true });
    tx.create(reservationRef, { unitId, day, reservedAtMs: nowMs });
    return Object.freeze({ reserved: true, replayed: false });
  });
}
