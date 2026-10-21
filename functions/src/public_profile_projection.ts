import {
  accountStateFromSnapshots,
  assertAccountUsable,
} from './account_gate';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { isLifetimePlanActive, isPremiumAccessActive, isRealPlusActive, isVipActive, realPlusUntilMs } from './premium_status';
type ProfileReason = 'display_change' | 'entitlement_change';

export type PublicProfileProjectionInput = {
  reason?: ProfileReason;
  name?: unknown;
  lang?: unknown;
  avatar?: unknown;
  frame?: unknown;
  aura?: unknown;
  profileCardLevel?: unknown;
  profileCardTheme?: unknown;
  profileCardMotion?: unknown;
  profileCardPublicFocus?: unknown;
  /** Визитка «Про» (2026-09-30): куплена ли и какой из 6 стилей выбран. */
  profileCardPro?: unknown;
  profileCardStyle?: unknown;
  profileCardLegendNo?: unknown;
  coinRank?: unknown;
  displayHash?: unknown;
  // Explicitly accepted by the type so callers cannot accidentally make these
  // trusted through a future spread. The projection intentionally ignores them.
  streak?: unknown;
  isPremium?: unknown;
  isVip?: unknown;
  isLifetime?: unknown;
  cardWordsLearned?: unknown;
  cardPhrasesLearned?: unknown;
  cardAppDays?: unknown;
  cardLongestStreak?: unknown;
};

type UserProjectionSource = Record<string, unknown>;

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
}

function optionalString(value: unknown, max: number): string | null {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

function nonnegativeInt(value: unknown): number {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function boundedInt(value: unknown, min: number, max: number, fallback: number): number {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

// зачем: стили визитки «Про» из макета profile-card-pro.html (A–F). Любое другое
// значение не проецируется — чужие визитки не должны получить «неизвестный» стиль.
export const PROFILE_CARD_PRO_STYLES = ['holo', 'obs', 'aura', 'ice', 'space', 'neon'] as const;

function validProfileCardStyle(value: unknown): string | null {
  return typeof value === 'string' && (PROFILE_CARD_PRO_STYLES as readonly string[]).includes(value)
    ? value
    : null;
}

function validCoinRank(value: unknown): number | null {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 19
    ? value
    : null;
}

/** Pure builder used by the callable and deterministic repair tooling/tests. */
export function buildAuthoritativePublicProfileProjection(
  stableUid: string,
  user: UserProjectionSource,
  input: PublicProfileProjectionInput,
  nowMs: number,
): Record<string, unknown> {
  const progress = user.progress && typeof user.progress === 'object'
    ? user.progress as Record<string, unknown>
    : {};
  const name = cleanString(input.name, 32);
  const projection: Record<string, unknown> = {
    uid: stableUid,
    name,
    nameLower: name.toLowerCase(),
    lang: cleanString(input.lang, 12) || 'ru',
    avatar: optionalString(input.avatar, 80),
    frame: optionalString(input.frame, 80),
    aura: optionalString(input.aura, 80),
    profileCardLevel: boundedInt(input.profileCardLevel, 0, 5, 0),
    profileCardTheme: cleanString(input.profileCardTheme, 40) || 'classic',
    profileCardMotion: cleanString(input.profileCardMotion, 40) || 'still',
    profileCardPublicFocus: cleanString(input.profileCardPublicFocus, 40) || 'words',
    // Свой текст (profileCardBio) здесь НЕ принимается: он пишется только
    // profileCardBioSetMine с проверками, а merge:true его не трогает.
    profileCardPro: input.profileCardPro === true,
    displayHash: cleanString(input.displayHash, 1000),
    updatedAt: nowMs,
    updatedReason: input.reason === 'entitlement_change' ? 'entitlement_change' : 'display_change',
    isPremium: isPremiumAccessActive(progress, nowMs),
    isVip: isVipActive(progress, nowMs),
    isLifetime: isLifetimePlanActive(progress, nowMs),
    // зачем (владелец 21.10, Ревизор 🟡): кольцо Plus для других — только настоящий Plus, без вводного 72-часового доступа.
    // isPremium не трогаем (его читают другие экраны). plusUntilMs: 0 — бессрочно; иначе кольцо гаснет само по сроку.
    isPlus: isRealPlusActive(progress, nowMs),
    plusUntilMs: realPlusUntilMs(progress, nowMs),
  };

  const legendNo = nonnegativeInt(input.profileCardLegendNo);
  if (legendNo > 0) projection.profileCardLegendNo = legendNo;
  const coinRank = validCoinRank(input.coinRank);
  if (coinRank !== null) projection.coinRank = coinRank;
  const proStyle = projection.profileCardPro === true ? validProfileCardStyle(input.profileCardStyle) : null;
  if (proStyle !== null) projection.profileCardStyle = proStyle;
  if (input.cardWordsLearned !== undefined) {
    projection.cardWordsLearned = boundedInt(input.cardWordsLearned, 0, 10_000_000, 0);
  }
  if (input.cardPhrasesLearned !== undefined) {
    projection.cardPhrasesLearned = boundedInt(input.cardPhrasesLearned, 0, 10_000_000, 0);
  }
  if (input.cardAppDays !== undefined) {
    projection.cardAppDays = boundedInt(input.cardAppDays, 0, 100_000, 0);
  }
  if (input.cardLongestStreak !== undefined) {
    projection.cardLongestStreak = boundedInt(input.cardLongestStreak, 0, 100_000, 0);
  }

  const serverState = user.progressServerState && typeof user.progressServerState === 'object'
    ? user.progressServerState as Record<string, unknown>
    : null;
  if (user.progressServerAuthoritative === true && serverState) {
    projection.streak = nonnegativeInt(serverState.streakCount);
    projection.progressAuthority = 'server';
  } else {
    projection.progressAuthority = 'unavailable';
  }

  return projection;
}

export const publicProfileProjectMine = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId, {
    repairLinks: false,
    requireKnownIdentity: true,
  });
  const profileInput = request.data?.profile && typeof request.data.profile === 'object'
    ? { ...request.data.profile as PublicProfileProjectionInput, reason: request.data?.reason }
    : {};
  return db.runTransaction(async (transaction) => {
    const userRef = db.collection('users').doc(stableUid);
    const profileRef = db.collection('public_profiles').doc(stableUid);
    const [userSnapshot, authDeletionMarker, stableDeletionTombstone] = await Promise.all([
      transaction.get(userRef),
      transaction.get(db.collection('account_deletion_auth_markers').doc(request.auth!.uid)),
      transaction.get(db.collection('account_deletion_tombstones').doc(stableUid)),
    ]);
    // зачем через ЕДИНУЮ ДВЕРЬ (этап 1): раньше отвечало account_delete_pending
    // всегда, то есть и по завершённому удалению обещало возможность вернуть
    // аккаунт. Запись в профиль не проходит в обоих случаях, но человек
    // получает честный ответ.
    assertAccountUsable(accountStateFromSnapshots({
      markers: [authDeletionMarker, stableDeletionTombstone], subject: 'stable',
    }));
    if (!userSnapshot.exists) throw new HttpsError('failed-precondition', 'canonical_user_missing');
    const user = userSnapshot.data() ?? {};
    if (user.identityHidden === true) throw new HttpsError('failed-precondition', 'identity_hidden');

    const projection = buildAuthoritativePublicProfileProjection(stableUid, user, profileInput, Date.now());
    const writePayload: Record<string, unknown> = {
      ...projection,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (projection.progressAuthority !== 'server') {
      // Do not leave a previously client-claimed progress snapshot looking current.
      writePayload.streak = admin.firestore.FieldValue.delete();
    }
    if (!Object.prototype.hasOwnProperty.call(projection, 'coinRank')) {
      // Invalid/missing local state must never preserve a stale projected rank.
      writePayload.coinRank = admin.firestore.FieldValue.delete();
    }
    if (!Object.prototype.hasOwnProperty.call(projection, 'profileCardStyle')) {
      // Без «Про» (или с неизвестным стилем) стиль у чужих не должен залипнуть.
      writePayload.profileCardStyle = admin.firestore.FieldValue.delete();
    }
    transaction.set(profileRef, writePayload, { merge: true });
    return {
      ok: true,
      stableUid,
      isPremium: projection.isPremium === true,
      isVip: projection.isVip === true,
      isLifetime: projection.isLifetime === true,
      progressAuthority: projection.progressAuthority,
    };
  });
});
