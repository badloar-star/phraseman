import * as admin from 'firebase-admin';
import { VIDEO_PROMO_UNTIL } from './website_contact';

const LOG = '[VIDEO-PROMO-RETENTION]';
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS_AFTER_PROMO = 90;
const PAGE = 300;

/**
 * Момент, после которого непривязанные заявки акции удаляются: конец последнего дня акции по UTC−12
 * (сайт считает дату включительно «где угодно на Земле») + 90 дней.
 */
export function videoPromoRetentionCutoffMs(until: string = VIDEO_PROMO_UNTIL): number {
  const endOfLastDayUtcMinus12 = Date.parse(`${until}T23:59:59.999-12:00`);
  return endOfLastDayUtcMinus12 + RETENTION_DAYS_AFTER_PROMO * DAY_MS;
}

/**
 * Заявка, которую нельзя связать с человеком: нет почты и админ не выдавал по ней Plus (нет promo.resolvedUid).
 * зачем (координатор 22.10): такие заявки удаление аккаунта не находит — по имени искать нельзя (имена не уникальны),
 * поэтому они уходят по сроку. Заявки с почтой или resolvedUid уходят при удалении аккаунта (d4fb962fc).
 */
export function isUnlinkedVideoPromoEntry(data: Record<string, unknown>): boolean {
  if (data.topic !== 'video_promo') return false;
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const promo = (data.promo ?? {}) as Record<string, unknown>;
  const resolvedUid = typeof promo.resolvedUid === 'string' ? promo.resolvedUid.trim() : '';
  return !email && !resolvedUid;
}

export async function cleanupUnlinkedVideoPromoEntries(
  db: FirebaseFirestore.Firestore = admin.firestore(),
  nowMs: number = Date.now(),
): Promise<{ scanned: number; deleted: number; skipped: 'before_cutoff' | null }> {
  const cutoffMs = videoPromoRetentionCutoffMs();
  if (nowMs < cutoffMs) {
    // зачем: до отсечки — ноль чтений, только строка журнала.
    console.log(LOG, JSON.stringify({ step: 'before_cutoff', cutoffIso: new Date(cutoffMs).toISOString() }));
    return { scanned: 0, deleted: 0, skipped: 'before_cutoff' };
  }
  let scanned = 0;
  let deleted = 0;
  let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = db.collection('website_contact_inbox').where('topic', '==', 'video_promo')
      .orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    scanned += page.size;
    const doomed = page.docs.filter((doc) => isUnlinkedVideoPromoEntry(doc.data()));
    if (doomed.length > 0) {
      const batch = db.batch();
      doomed.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += doomed.length;
    }
    if (page.size < PAGE) break;
    last = page.docs[page.docs.length - 1];
  }
  console.log(LOG, JSON.stringify({ step: 'done', scanned, deleted }));
  return { scanned, deleted, skipped: null };
}
