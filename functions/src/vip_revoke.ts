import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK_SENSITIVE } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { writeAccessProjectionFromPatch } from './access_projection';

const REGION = 'us-central1';

/**
 * Self-service отзыв СВОЕГО VIP.
 *
 * Появился, когда progressHasNoPremiumWrites в firestore.rules закрыл прямую
 * клиентскую запись vip_* и premium_* — QA-кнопка «Снять премиум» больше не может
 * чистить серверный VIP сама. Endpoint безопасен публично: он только ПОНИЖАЕТ
 * права владельца (grant остаётся за админкой/ботом/RevenueCat), identity берём
 * исключительно из request.auth (никаких stableId из body).
 */
export function vipRevokeProgressFields(nowMs: number): Record<string, string> {
  const now = String(nowMs);
  // Зеркало «Снять VIP» из admin/index.html: vip_plan/vip_from не трогаем —
  // getVipProgressState гасит VIP по falsy vip_active/vip_admin_override,
  // а наличие vip-shape не даёт упасть в legacy admin-premium ветку.
  return {
    vip_active: 'false',
    vip_admin_override: 'false',
    vip_until: now,
    vip_revoked_at: now,
  };
}

export const vipRevokeMine = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'auth_required');
    }
    const db = admin.firestore();
    const stableUid = await resolveStableUidForAuth(db, request.auth.uid);
    const nowMs = Date.now();
    const userRef = db.collection('users').doc(stableUid);
    await db.runTransaction(async (tx) => {
      const current = await tx.get(userRef);
      const progress = (current.data()?.progress ?? {}) as Record<string, unknown>;
      const patch = vipRevokeProgressFields(nowMs);
      tx.set(userRef, { progress: patch, updatedAt: nowMs }, { merge: true });
      writeAccessProjectionFromPatch(tx, userRef, progress, patch, nowMs);
    });
    return { ok: true };
  },
);
