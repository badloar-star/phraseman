// ════════════════════════════════════════════════════════════════════════════
// premium_celebration_state.ts — pending/seen маркеры для celebration модалки
//
// Поток:
//  1. Юзер купил Premium через RevenueCat → premium_modal.tsx → markCelebrationPending()
//  2. Legacy only: старые admin_grant-маркеры больше не должны поднимать
//     Premium-модалку; новая админская выдача живет в vip_celebration_state.ts.
//  3. На следующем mount home.tsx (useFocusEffect) → isCelebrationPending() === true
//     → PremiumCelebrationModal show → onClose: consumeCelebration(marker)
//  4. seen_marker запоминается, чтобы повторная админ-выдача с новым timestamp
//     снова показала модалку (а старая — нет).
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

const PENDING_KEY = 'premium_celebration_pending_v1';
const PENDING_MARKER_KEY = 'premium_celebration_pending_marker_v1';
const SEEN_KEY = 'premium_celebration_seen_v1';
const ADMIN_SEEN_KEY = 'premium_celebration_admin_seen_v1';

function normalizeMarker(marker: string | null | undefined): string | null {
  const trimmed = String(marker ?? '').trim();
  return trimmed && trimmed !== '0' ? trimmed : null;
}

function timestampMs(marker: string | null | undefined): number | null {
  const value = normalizeMarker(marker);
  if (!value || !/^\d{10,}$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isAdminGrantMarker(marker: string | null | undefined): boolean {
  return timestampMs(marker) !== null;
}

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

/** Marker of the exact pending celebration event, if known. */
export async function getPendingCelebrationMarker(): Promise<string | null> {
  try {
    return normalizeMarker(await AsyncStorage.getItem(PENDING_MARKER_KEY));
  } catch (error) {
    DebugLogger.error('premium_celebration_state:getPendingCelebrationMarker', error, 'warning');
    return null;
  }
}

/**
 * Выставить pending. Вызывается из:
 *  - premium_modal.tsx после успешной IAP-покупки,
 *  - legacy callers only; admin/index.html now issues VIP, not Premium.
 */
export async function markCelebrationPending(marker?: string | null): Promise<void> {
  try {
    const resolvedMarker = normalizeMarker(marker) ?? `local_${Date.now()}`;
    await AsyncStorage.multiSet([
      [PENDING_KEY, '1'],
      [PENDING_MARKER_KEY, resolvedMarker],
    ]);
  } catch (error) {
    DebugLogger.error('premium_celebration_state:markCelebrationPending', error, 'warning');
  }
}

/**
 * Погасить pending после показа модалки. seenMarker сохраняется чтобы при
 * повторной legacy-выдаче (новый premium_admin_grant_at) celebration сработала
 * снова, если старый код еще вызовет этот путь.
 *
 * Для IAP-покупки можно передать `'iap_<productId>_<timestamp>'`.
 * Для legacy admin-grant — timestamp из progress.premium_admin_grant_at.
 */
export async function consumeCelebration(seenMarker?: string | null): Promise<void> {
  try {
    const marker =
      normalizeMarker(seenMarker) ??
      await getPendingCelebrationMarker() ??
      String(Date.now());
    const pairs: [string, string][] = [
      [PENDING_KEY, ''], // пустая строка надёжнее чем removeItem (некоторые backend cache путают null/missing)
      [PENDING_MARKER_KEY, ''],
      [SEEN_KEY, marker],
    ];
    if (isAdminGrantMarker(marker)) {
      pairs.push([ADMIN_SEEN_KEY, marker]);
    }
    await AsyncStorage.multiSet(pairs);
    await AsyncStorage.removeItem(PENDING_KEY);
    await AsyncStorage.removeItem(PENDING_MARKER_KEY);
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

async function getLastSeenAdminMarker(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(ADMIN_SEEN_KEY);
    return normalizeMarker(v);
  } catch (error) {
    DebugLogger.error('premium_celebration_state:getLastSeenAdminMarker', error, 'warning');
    return null;
  }
}

/**
 * Legacy helper. Новый admin/index.html пишет VIP и должен использовать
 * vip_celebration_state.ts, чтобы не выдавать золотую Premium-анимацию.
 *
 * grantAt — строка с unix-ms timestamp из cloud doc. null/undefined/'' — игнор.
 */
export async function processAdminGrantForCelebration(
  grantAt: string | null | undefined,
): Promise<void> {
  const trimmed = normalizeMarker(grantAt);
  if (!trimmed) return;
  try {
    const lastAdminSeen = await getLastSeenAdminMarker();
    if (lastAdminSeen === trimmed) return;
    const lastSeen = await getLastSeenMarker();
    // Уже видели именно этот grant — не показываем снова. Новая выдача = новый
    // timestamp, и getLastSeenMarker вернёт прошлый → срабатывает.
    if (lastSeen === trimmed) return;
    const lastSeenMs = timestampMs(lastAdminSeen) ?? timestampMs(lastSeen);
    const grantMs = timestampMs(trimmed);
    // Compatibility with older builds: home.tsx used to consume admin grants with Date.now()
    // instead of premium_admin_grant_at. If that already happened, do not re-arm old grants.
    if (lastSeenMs !== null && grantMs !== null && lastSeenMs >= grantMs) return;
    await markCelebrationPending(trimmed);
  } catch (error) {
    DebugLogger.error('premium_celebration_state:processAdminGrantForCelebration', error, 'warning');
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
