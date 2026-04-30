import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getCanonicalUserId } from './user_id_policy';
import { callReferralEnsureMyCode, isReferralCloudEnabled } from './referral_cloud';

const REFERRAL_KEY = 'user_referral_code';

function randomLocalReferralSuffix(): string {
  const bytes = new Uint8Array(4);
  Crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s.slice(0, 6).toUpperCase();
}

/**
 * С облаком: только серверный код (без «левого» локального, который не в referral_codes).
 * Без облака (Expo Go): локальный код с crypto-суффиксом.
 */
export async function generateReferralCode(name: string): Promise<string> {
  try {
    if (isReferralCloudEnabled()) {
      const sid = await getCanonicalUserId();
      if (sid) {
        try {
          const { code } = await callReferralEnsureMyCode(sid);
          if (code) {
            await AsyncStorage.setItem(REFERRAL_KEY, code);
            return code;
          }
        } catch {
          /* нет auth_links */
        }
      }
      return '';
    }

    const existing = await AsyncStorage.getItem(REFERRAL_KEY);
    if (existing) return existing;

    const base = name.replace(/\s+/g, '').toUpperCase().slice(0, 4) || 'USER';
    const code = `${base}${randomLocalReferralSuffix()}`;

    await AsyncStorage.setItem(REFERRAL_KEY, code);
    return code;
  } catch {
    return '';
  }
}

/** Для «Поделиться»: не показывать пустую ссылку, пока нет кода (вход + ensure в облаке). */
export async function hasReferralCodeReady(): Promise<boolean> {
  const c = await getReferralCode();
  return typeof c === 'string' && c.trim().length >= 4;
}

/** Возвращает сохранённый реферальный код пользователя */
export async function getReferralCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REFERRAL_KEY);
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
