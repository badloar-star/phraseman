import auth from '@react-native-firebase/auth';
import { isCommunityPacksCloudEnabled } from './functionsClient';

/**
 * Cloud Functions (onCall) require Firebase Auth. `cloud_sync.ensureAnonUser` only starts
 * signInAnonymously() without await — purchse could run unauthenticated and fail.
 */
export async function ensureFirebaseUserSignedInForCallable(): Promise<boolean> {
  if (!isCommunityPacksCloudEnabled()) return false;
  try {
    if (auth().currentUser) return true;
    await auth().signInAnonymously();
    return !!auth().currentUser;
  } catch (e) {
    console.warn(`[PACK-PURCHASE] вход для вызова не поднялся → false: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
    return false;
  }
}

// зачем: D140 (владелец 2026-10-01) — погашение подарочного набора
// (redeemCommunityPackGiftVoucher → flashcardPackGiftRedeem) удалено: подарочные
// наборы убраны, непогашенные ваучеры аннулированы. Полученные наборы остаются
// в библиотеке (community_owned_pack_ids_v1 / community_pack_purchases).

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
