// ════════════════════════════════════════════════════════════════════════════
// premium_celebration_state.ts — pending/seen маркеры для celebration модалки
//
// Поток:
//  1. Юзер купил Premium через RevenueCat → premium_modal.tsx → markCelebrationPending()
//  2. ИЛИ: cloud_sync обнаружил admin_premium_override (выдал админ через index.html)
//     с новым premium_admin_grant_at → markCelebrationPending()
//  3. На следующем mount home.tsx (useFocusEffect) → isCelebrationPending() === true
//     → PremiumCelebrationModal show → onClose: consumeCelebration(marker)
//  4. seen_marker запоминается, чтобы повторная админ-выдача с новым timestamp
//     снова показала модалку (а старая — нет).
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

const PENDING_KEY = 'premium_celebration_pending_v1';
const SEEN_KEY = 'premium_celebration_seen_v1';

/** Активен ли pending-флаг (юзер ещё не видел celebration после последнего grant'а). */
export async function isCelebrationPending(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PENDING_KEY);
    return v === '1';
  } catch (error) {
    DebugLogger.error('premium_celebration_state:isCelebrationPending', error, 'warning');
    return false;
  }
}

/**
 * Выставить pending. Вызывается из:
 *  - premium_modal.tsx после успешной IAP-покупки,
 *  - cloud_sync.ts когда admin выдал premium через index.html (новый timestamp).
 */
export async function markCelebrationPending(): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, '1');
  } catch (error) {
    DebugLogger.error('premium_celebration_state:markCelebrationPending', error, 'warning');
  }
}

/**
 * Погасить pending после показа модалки. seenMarker сохраняется чтобы при
 * повторной админ-выдаче (новый premium_admin_grant_at) celebration сработала
 * снова — а та же выдача дважды не сработала.
 *
 * Для IAP-покупки можно передать `'iap_<productId>_<timestamp>'`.
 * Для admin-grant — timestamp из progress.premium_admin_grant_at.
 */
export async function consumeCelebration(seenMarker: string): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [PENDING_KEY, ''], // пустая строка надёжнее чем removeItem (некоторые backend cache путают null/missing)
      [SEEN_KEY, seenMarker],
    ]);
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch (error) {
    DebugLogger.error('premium_celebration_state:consumeCelebration', error, 'warning');
  }
}

/** Последний seenMarker (для cloud_sync compare с admin grant timestamp). */
export async function getLastSeenMarker(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(SEEN_KEY);
    return v && v.length > 0 ? v : null;
  } catch (error) {
    DebugLogger.error('premium_celebration_state:getLastSeenMarker', error, 'warning');
    return null;
  }
}

/**
 * Вызывается из cloud_sync при чтении users/{uid}.progress.
 * Если admin выставил новый premium_admin_grant_at (через admin/index.html) — поднимает pending.
 *
 * grantAt — строка с unix-ms timestamp из cloud doc. null/undefined/'' — игнор.
 */
export async function processAdminGrantForCelebration(
  grantAt: string | null | undefined,
): Promise<void> {
  if (!grantAt) return;
  const trimmed = String(grantAt).trim();
  if (!trimmed || trimmed === '0') return;
  try {
    const lastSeen = await getLastSeenMarker();
    // Уже видели именно этот grant — не показываем снова. Новая выдача = новый
    // timestamp, и getLastSeenMarker вернёт прошлый → срабатывает.
    if (lastSeen === trimmed) return;
    await markCelebrationPending();
  } catch (error) {
    DebugLogger.error('premium_celebration_state:processAdminGrantForCelebration', error, 'warning');
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
