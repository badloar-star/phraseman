import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { logEvent } from './firebase';
import { STORE_URL_ANDROID } from './config';
import {
  callReferralApply,
  getReferralCallableErrorCode,
  isReferralCloudEnabled,
} from './referral_cloud';
import { loadShardsFromCloud } from './shards_system';
import { getCanonicalUserId } from './user_id_policy';
import { hasLocalReferralExistingAccountActivity } from './referral_account_activity';

const INVITE_HTTPS_BASE = 'https://knowlyapps.com/phraseman/invite';

/** Старый глобальный ключ (один ref на устройство) — больше не используем; убираем при apply. */
const LEGACY_APPLIED_KEY = 'referral_apply_success_code';

function appliedStorageKey(stableId: string): string {
  return `referral_applied_ref::${stableId}`;
}

/** Ссылки для «Поделиться» (нужен статический index на GitHub Pages / аналог с редиректом в app). */
export function buildReferralShareLinks(code: string): { https: string; app: string } {
  const c = encodeURIComponent(code.trim());
  return {
    https: `${INVITE_HTTPS_BASE}?ref=${c}`,
    app: `phraseman://invite?ref=${c}`,
  };
}

/** Google Play: `referrer` передаётся в Install Referrer как строка `ref=КОД` (код не показываем отдельно). */
export function buildPlayStoreUrlWithInstallReferral(code: string): string {
  const c = String(code).trim().toUpperCase();
  if (!c) return STORE_URL_ANDROID;
  const sep = STORE_URL_ANDROID.includes('?') ? '&' : '?';
  return `${STORE_URL_ANDROID}${sep}referrer=${encodeURIComponent(`ref=${c}`)}`;
}

const PENDING_REF_KEY = 'pending_referral_code';
const PENDING_REF_SOURCE_KEY = 'pending_referral_source';

/** Сохраняет pending-код; `source` — аналитика. */
export async function captureReferralCodeIfNew(
  code: string,
  source: 'deeplink' | 'play_install' | 'manual_code' | 'clipboard' = 'deeplink',
): Promise<void> {
  const c = String(code).trim().toUpperCase();
  if (c.length < 4) return;
  if (!isReferralCloudEnabled()) return;
  const sid = await getCanonicalUserId();
  if (sid) {
    const applied = await AsyncStorage.getItem(appliedStorageKey(sid));
    if (applied === c) {
      await AsyncStorage.removeItem(PENDING_REF_KEY);
      await AsyncStorage.removeItem(PENDING_REF_SOURCE_KEY);
      return;
    }
  }
  await AsyncStorage.setItem(PENDING_REF_KEY, c);
  await AsyncStorage.setItem(PENDING_REF_SOURCE_KEY, source);
  logEvent('referral_deeplink_captured', { ref_len: c.length, src: source });
}

/** Stores a code entered in Friends and kicks off best-effort apply without blocking the UI. */
export async function captureReferralCodeFromManualInput(code: string): Promise<void> {
  await captureReferralCodeIfNew(code, 'manual_code');
  void tryApplyPendingReferral().catch(() => {});
}

function extractRefParam(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const lower = url.toLowerCase();
  if (!lower.includes('invite') && !lower.includes('ref=')) return null;
  try {
    const parsed = Linking.parse(url);
    const r = parsed.queryParams?.ref ?? parsed.queryParams?.REF;
    if (Array.isArray(r)) return String(r[0] ?? '').trim().toUpperCase() || null;
    if (typeof r === 'string' && r.trim()) return r.trim().toUpperCase();
  } catch {
    const m = url.match(/[?&]ref=([^&]+)/i);
    if (m) {
      try {
        return decodeURIComponent(m[1]).trim().toUpperCase();
      } catch {
        return m[1].trim().toUpperCase();
      }
    }
  }
  return null;
}

/**
 * Сохраняет код из initial URL. Учёт по stableId: другой аккаунт на том же устройстве
 * не блокируется старым «уже применён».
 */
export async function captureReferralFromUrl(url: string | null | undefined): Promise<void> {
  if (!isReferralCloudEnabled()) return;
  const code = extractRefParam(url);
  if (!code || code.length < 4) return;
  await captureReferralCodeIfNew(code, 'deeplink');
}

/** Итог попытки применить реферальный код — для UI-фидбека и pending-логики. */
export type ReferralApplyStatus =
  | 'applied'       // привязка создана
  | 'already'       // этот аккаунт уже привязан (к этому или другому коду)
  | 'invalid'       // код короче 4 символов / мусор
  | 'unknown_code'  // кода нет в referral_codes
  | 'too_old'       // аккаунту больше 72ч — антифрод отклонил
  | 'self'          // собственный код
  | 'needs_link'    // нет auth_links (облако ещё не связало аккаунт) — можно повторить позже
  | 'disabled'      // referral_enabled выключен / нет облака
  | 'error';        // сеть/прочее — можно повторить позже

/** Статусы, после которых pending-код хранить бессмысленно (повтор не поможет). */
const TERMINAL_APPLY_STATUSES: ReadonlySet<ReferralApplyStatus> = new Set([
  'applied', 'already', 'too_old', 'self', 'unknown_code',
]);

/**
 * Применяет код для текущего пользователя СЕЙЧАС и возвращает статус.
 * Не трогает PENDING_REF_KEY — этим управляют обёртки (pending/manual).
 */
async function applyReferralCodeNow(stableId: string, code: string): Promise<ReferralApplyStatus> {
  try {
    const res = await callReferralApply({ refereeStableId: stableId, refCode: code });
    if (!res?.ok) return 'error';
    await AsyncStorage.setItem(appliedStorageKey(stableId), code);
    logEvent('referral_applied', { already: res.already ? 1 : 0 });
    await loadShardsFromCloud().catch(() => {});
    // Авто-дружба: отправляем запрос пригласившему, чтобы он сразу появился в друзьях.
    // Best-effort и только при первом apply (не already), чтобы не слать повторно.
    if (!res.already && res.referrerStableId) {
      await sendAutoFriendRequestToReferrer(res.referrerStableId).catch(() => {});
    }
    return res.already ? 'already' : 'applied';
  } catch (e: unknown) {
    const c = getReferralCallableErrorCode(e);
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '';
    const blob = `${msg} ${c} ${String(e)}`;
    if (blob.includes('REFERRAL_REFEREE_ACCOUNT_TOO_OLD')) {
      logEvent('referral_apply_too_old', {});
      return 'too_old';
    }
    if (blob.includes('LINK_ACCOUNT_REQUIRED')) {
      logEvent('referral_apply_needs_link', {});
      return 'needs_link';
    }
    if (blob.includes('SELF_REFERRAL')) return 'self';
    if (blob.includes('REF_CODE_UNKNOWN')) return 'unknown_code';
    return 'error';
  }
}

/**
 * Пытается применить отложенный код (нужна связка auth_links — облако создаёт её само).
 * Ключ «успеха» — на пару (stableId + ref), плюс снятие устаревшего глобального ключа.
 */
export async function tryApplyPendingReferral(): Promise<ReferralApplyStatus | null> {
  if (!isReferralCloudEnabled()) return 'disabled';
  const code = (await AsyncStorage.getItem(PENDING_REF_KEY) ?? '').trim().toUpperCase();
  if (!code) {
    await AsyncStorage.removeItem(LEGACY_APPLIED_KEY);
    await AsyncStorage.removeItem(PENDING_REF_SOURCE_KEY);
    return null;
  }
  const stableId = await getCanonicalUserId();
  if (!stableId) return 'needs_link';
  if (await AsyncStorage.getItem(LEGACY_APPLIED_KEY)) {
    await AsyncStorage.removeItem(LEGACY_APPLIED_KEY);
  }
  const appliedFor = await AsyncStorage.getItem(appliedStorageKey(stableId));
  if (appliedFor === code) {
    await AsyncStorage.removeItem(PENDING_REF_KEY);
    await AsyncStorage.removeItem(PENDING_REF_SOURCE_KEY);
    return 'already';
  }
  if (await hasLocalReferralExistingAccountActivity()) {
    await AsyncStorage.removeItem(PENDING_REF_KEY);
    await AsyncStorage.removeItem(PENDING_REF_SOURCE_KEY);
    return 'too_old';
  }
  const status = await applyReferralCodeNow(stableId, code);
  if (TERMINAL_APPLY_STATUSES.has(status)) {
    await AsyncStorage.removeItem(PENDING_REF_KEY);
    await AsyncStorage.removeItem(PENDING_REF_SOURCE_KEY);
  }
  return status;
}

/**
 * Ручной ввод реферального кода (модалка на экране «Друзья»). Возвращает статус
 * для человекочитаемого фидбека. При needs_link/error код остаётся pending —
 * фоновый tryApplyPendingReferral доделает при следующем запуске.
 */
export async function applyManualReferralCode(codeRaw: string): Promise<ReferralApplyStatus> {
  if (!isReferralCloudEnabled()) return 'disabled';
  const code = String(codeRaw).trim().toUpperCase();
  if (code.length < 4) return 'invalid';
  const stableId = await getCanonicalUserId();
  if (stableId) {
    const appliedFor = await AsyncStorage.getItem(appliedStorageKey(stableId));
    if (appliedFor === code) return 'already';
  }
  if (await hasLocalReferralExistingAccountActivity()) return 'too_old';
  await captureReferralCodeIfNew(code, 'manual_code');
  if (!stableId) return 'needs_link';
  const status = await applyReferralCodeNow(stableId, code);
  if (TERMINAL_APPLY_STATUSES.has(status)) {
    await AsyncStorage.removeItem(PENDING_REF_KEY);
    await AsyncStorage.removeItem(PENDING_REF_SOURCE_KEY);
  }
  return status;
}

/**
 * Отправляет пригласившему запрос в друзья (best-effort). Динамический импорт, чтобы
 * не тянуть граф модулей друзей в bootstrap. Дублирование/self обрабатывает sendFriendRequest.
 */
async function sendAutoFriendRequestToReferrer(referrerStableId: string): Promise<void> {
  const target = String(referrerStableId).trim();
  if (!target) return;
  try {
    const { sendFriendRequest } = await import('./firestore_friend_requests');
    const result = await sendFriendRequest(target);
    logEvent('referral_auto_friend', { result: String(result) });
  } catch {
    /* друзья недоступны — пропускаем, реферал уже зафиксирован */
  }
}

/** Подписка на phraseman:// и https-инвайт во время сессии. */
export function subscribeReferralUrl(handler: (url: string) => void): { remove: () => void } {
  const sub = Linking.addEventListener('url', (ev) => {
    if (ev?.url) handler(ev.url);
  });
  return { remove: () => sub.remove() };
}
