// ─── «Вместе»: идентичность отправителя для callables ────────────────────────
// зачем: серверные callables (friendsTogetherClaimLevel / friendsClaimWeeklyChest /
// friendsNudge) требуют stableId — как и friend_gifts. Аудит 2026-08-17 нашёл,
// что клиентские обёртки его не передавали, и сервер отклонял бы каждый вызов
// с invalid-argument. Здесь один помощник по образцу prepareFriendGiftSender:
// canonical stableId + гарантированный auth-link + отображаемое имя для пуша.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAnonUser, ensureStableAuthLinkForStableIdDetailed } from '../cloud_sync';

export interface TogetherSenderIdentity {
  stableId: string;
  displayName: string;
}

const USER_NAME_KEY = 'user_name';
const MAX_NAME_LEN = 48;

/** Имя для пуша «<Имя> зовёт» — только первое слово, без фамилий/лишнего (PII-минимум). */
export function shortDisplayName(raw: string | null | undefined): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  const first = trimmed.split(/\s+/)[0] ?? '';
  return first.slice(0, MAX_NAME_LEN);
}

export async function prepareTogetherSender(): Promise<TogetherSenderIdentity | null> {
  const stableId = await ensureAnonUser().catch(() => null);
  if (!stableId) return null;
  const link = await ensureStableAuthLinkForStableIdDetailed(stableId).catch(() => null);
  if (!link?.ok) return null;
  if (link.stableUid && link.stableUid !== stableId) return null;
  const rawName = await AsyncStorage.getItem(USER_NAME_KEY).catch(() => null);
  return { stableId, displayName: shortDisplayName(rawName) };
}
