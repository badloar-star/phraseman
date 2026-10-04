// ════════════════════════════════════════════════════════════════════════════
// banned_identity_hash.ts — бан, переживающий удаление аккаунта (PM-252, решение координатора 04.10).
//
// При удалении забаненного аккаунта запись banned_users/{uid} уходит, остаётся только хеш в
// banned_identity_hashes/{sha256}: без имени, uid и текста причины. После пересоздания аккаунта uid
// НОВЫЙ, поэтому хеш одного uid повторную регистрацию не поймал бы — пишем ещё хеш каждого email
// аккаунта, а при входе через Google/Apple сверяем хеш email из токена.
// ════════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

export const BANNED_IDENTITY_HASHES = 'banned_identity_hashes';
const BANNED_USERS = 'banned_users';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeBanEmail(raw: unknown): string {
  const email = String(raw ?? '').trim().toLowerCase();
  return email.includes('@') && email.length <= 320 ? email : '';
}

/** id хеша uid — тот же, что писала первая версия (3a3486319), чтобы старые записи остались валидны. */
export function bannedUidHashId(uid: string): string {
  return sha256(uid);
}

/** Префикс разводит пространство email и uid: строка uid не может совпасть с хешем email. */
export function bannedEmailHashId(email: string): string {
  return sha256(`email:${email}`);
}

/**
 * Вход через Google/Apple: одно чтение документа по id. Совпадение → тот же бан на новый аккаунт
 * (banned_users/{stableUid} + users.banned, как ставит админка), дальше работают все прежние проверки бана.
 * Сбой проверки не ломает вход — логируется (бан для чтения ведёт себя как «пропустить с логом»).
 */
export async function restoreBanFromIdentityHash(
  db: admin.firestore.Firestore,
  params: { stableUid: string; email: unknown; provider: string },
): Promise<'no_email' | 'no_match' | 'already_banned' | 'restored' | 'check_failed'> {
  const email = normalizeBanEmail(params.email);
  if (!email || !params.stableUid) return 'no_email';
  try {
    const hashSnap = await db.collection(BANNED_IDENTITY_HASHES).doc(bannedEmailHashId(email)).get();
    if (!hashSnap.exists) return 'no_match';
    const banRef = db.collection(BANNED_USERS).doc(params.stableUid);
    const banSnap = await banRef.get();
    if (banSnap.exists) {
      console.log('[BAN-HASH] match, ban already present', JSON.stringify({ provider: params.provider }));
      return 'already_banned';
    }
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const batch = db.batch();
    batch.set(banRef, {
      uid: params.stableUid,
      reason: 'identity_hash_match',
      bannedAt: nowIso,
      bannedAtMs: nowMs,
      bannedBy: 'system:banned_identity_hash',
      originalBannedAtMs: Number(hashSnap.data()?.bannedAtMs ?? 0) || null,
    });
    batch.set(db.collection('users').doc(params.stableUid), { banned: true, bannedAt: nowIso, updatedAt: nowMs }, { merge: true });
    await batch.commit();
    console.warn('[BAN-HASH] ban restored for re-registered identity', JSON.stringify({
      provider: params.provider,
      originalBannedAtMs: Number(hashSnap.data()?.bannedAtMs ?? 0) || null,
    }));
    return 'restored';
  } catch (error) {
    console.error('[BAN-HASH] check_failed', JSON.stringify({
      provider: params.provider,
      error: String((error as { message?: unknown })?.message ?? error).slice(0, 200),
    }));
    return 'check_failed';
  }
}
