import * as admin from 'firebase-admin';
import type { EvidenceState } from './decision';

/**
 * Читатель поломок в платежах — департамент «Платежи».
 *
 * зачем отдельно от департамента «Деньги»: тот смотрит на УСПЕШНЫЕ события
 * (покупки, продления, возвраты) и считает выручку. Здесь ровно наоборот —
 * то, что сломалось. Одна запись в telegram_premium_dead_letter с
 * hasSuccessfulPayment=true означает: человек ЗАПЛАТИЛ, а доступ не выдался.
 * Сейчас владелец узнаёт о таком только из жалобы пострадавшего.
 */

export const PAYMENT_FAILURE_COLLECTIONS = ['telegram_premium_dead_letter', 'revenuecat_premium_denials'] as const;
export type PaymentFailureCollection = typeof PAYMENT_FAILURE_COLLECTIONS[number];

/** Окно наблюдения — неделя: платёжные поломки живут дольше суток и копятся. */
export const PAYMENTS_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1_000;
export const MAX_PAYMENT_FAILURE_DOCS = 200;

export interface PaymentFailureRow {
  readonly reason: string;
  /** true ТОЛЬКО когда деньги реально списаны, а доступ не выдан и проблема не закрыта. */
  readonly paidButUnfulfilled: boolean;
  readonly resolved: boolean;
}

export interface FetchPaymentsSourceInput {
  readonly sourceId: PaymentFailureCollection;
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

export interface FetchPaymentsSourceResult {
  readonly sourceId: PaymentFailureCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly PaymentFailureRow[];
  readonly observedAtMs: number;
}

function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : 'unknown';
}

function toRow(data: Record<string, unknown>): PaymentFailureRow {
  const resolved = data.resolved === true;
  // hasSuccessfulPayment есть только у telegram-dead-letter; у отказов
  // RevenueCat его нет — и мы НЕ выдаём такой отказ за потерянные деньги.
  const hadPayment = data.hasSuccessfulPayment === true;
  return Object.freeze({
    reason: text(data.reason),
    paidButUnfulfilled: hadPayment && !resolved,
    resolved,
  });
}

export async function fetchPaymentsSource(input: FetchPaymentsSourceInput): Promise<FetchPaymentsSourceResult> {
  const sinceMs = input.nowMs - PAYMENTS_LOOKBACK_MS;
  try {
    const snapshot = await input.collection
      .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(sinceMs))
      .select('reason', 'hasSuccessfulPayment', 'resolved')
      .limit(MAX_PAYMENT_FAILURE_DOCS + 1)
      .get();
    const docs = snapshot.docs;
    const truncated = docs.length > MAX_PAYMENT_FAILURE_DOCS;
    const kept = truncated ? docs.slice(0, MAX_PAYMENT_FAILURE_DOCS) : docs;
    return Object.freeze({
      sourceId: input.sourceId,
      state: kept.length === 0 ? ('empty' as const) : ('ready' as const),
      truncated,
      droppedCount: truncated ? docs.length - MAX_PAYMENT_FAILURE_DOCS : 0,
      rows: Object.freeze(kept.map((snap) => toRow(snap.data() as Record<string, unknown>))),
      observedAtMs: input.nowMs,
    });
  } catch {
    return Object.freeze({
      sourceId: input.sourceId,
      state: 'error' as const,
      truncated: false,
      droppedCount: 0,
      rows: Object.freeze([]),
      observedAtMs: input.nowMs,
    });
  }
}
