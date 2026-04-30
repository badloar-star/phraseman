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

const INVITE_HTTPS_BASE = 'https://badloar-star.github.io/phraseman/invite';

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

/** Сохраняет pending-код; `source` — аналитика. */
export async function captureReferralCodeIfNew(
  code: string,
  source: 'deeplink' | 'play_install' = 'deeplink',
): Promise<void> {
  const c = String(code).trim().toUpperCase();
  if (c.length < 4) return;
  if (!isReferralCloudEnabled()) return;
  const sid = await getCanonicalUserId();
  if (sid) {
    const applied = await AsyncStorage.getItem(appliedStorageKey(sid));
    if (applied === c) return;
  }
  await AsyncStorage.setItem(PENDING_REF_KEY, c);
  logEvent('referral_deeplink_captured', { ref_len: c.length, src: source });
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

/**
 * Пытается применить отложенный код (нужен вход Google/Apple: auth_links).
 * Ключ «успеха» — на пару (stableId + ref), плюс снятие устаревшего глобального ключа.
 */
export async function tryApplyPendingReferral(): Promise<void> {
  if (!isReferralCloudEnabled()) return;
  const code = (await AsyncStorage.getItem(PENDING_REF_KEY) ?? '').trim().toUpperCase();
  if (!code) {
    await AsyncStorage.removeItem(LEGACY_APPLIED_KEY);
    return;
  }
  const stableId = await getCanonicalUserId();
  if (!stableId) return;
  if (await AsyncStorage.getItem(LEGACY_APPLIED_KEY)) {
    await AsyncStorage.removeItem(LEGACY_APPLIED_KEY);
  }
  const appliedFor = await AsyncStorage.getItem(appliedStorageKey(stableId));
  if (appliedFor === code) {
    await AsyncStorage.removeItem(PENDING_REF_KEY);
    return;
  }
  try {
    const res = await callReferralApply({ refereeStableId: stableId, refCode: code });
    if (res?.ok) {
      await AsyncStorage.setItem(appliedStorageKey(stableId), code);
      await AsyncStorage.removeItem(PENDING_REF_KEY);
      logEvent('referral_applied', { already: res.already ? 1 : 0 });
      await loadShardsFromCloud().catch(() => {});
    }
  } catch (e: unknown) {
    const c = getReferralCallableErrorCode(e);
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '';
    const blob = `${msg} ${c} ${String(e)}`;
    if (blob.includes('REFERRAL_REFEREE_ACCOUNT_TOO_OLD')) {
      logEvent('referral_apply_too_old', {});
      await AsyncStorage.removeItem(PENDING_REF_KEY);
      return;
    }
    if (blob.includes('LINK_ACCOUNT_REQUIRED')) {
      logEvent('referral_apply_needs_link', {});
      return;
    }
    if (blob.includes('SELF_REFERRAL')) {
      await AsyncStorage.removeItem(PENDING_REF_KEY);
    }
  }
}

/** Подписка на phraseman:// и https-инвайт во время сессии. */
export function subscribeReferralUrl(handler: (url: string) => void): { remove: () => void } {
  const sub = Linking.addEventListener('url', (ev) => {
    if (ev?.url) handler(ev.url);
  });
  return { remove: () => sub.remove() };
}
