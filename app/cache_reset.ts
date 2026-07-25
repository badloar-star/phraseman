/**
 * «Очистить кеш» из настроек (Bevel-style «Clear cache & reload all data»).
 *
 * Сбрасывает ТОЛЬКО косметические/сетевые кеши: картинки expo-image (memory+disk),
 * SWR-кеши вкладки друзей и рефералки, локальный кеш прокрутов рулетки
 * (серверный леджер — источник правды, он пересчитается при следующем фетче).
 *
 * НЕ трогаем: прогресс, аккаунт, stable_id, настройки, офлайн-очереди —
 * приложение local-first, «чистка» не должна ничего ломать.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { REFERRAL_STATE_STORAGE_KEY } from './referrals_cache';
import { FRIENDS_TAB_SWR_CACHE_KEY, FRIEND_PROFILES_CACHE_KEY } from './friends_tab_swr_warm';

const STATIC_CACHE_KEYS = [
  REFERRAL_STATE_STORAGE_KEY,
  FRIENDS_TAB_SWR_CACHE_KEY,
  FRIEND_PROFILES_CACHE_KEY,
] as const;

/** Аккаунт-scoped ключи, которые безопасно сбросить (пересоздаются с сервера). */
const SCOPED_CACHE_PREFIXES = ['referral_spin_credits_v1:'] as const;

export async function clearAppCaches(): Promise<{ removedKeys: number }> {
  let removedKeys = 0;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const doomed = keys.filter(
      (k) =>
        (STATIC_CACHE_KEYS as readonly string[]).includes(k) ||
        SCOPED_CACHE_PREFIXES.some((p) => k.startsWith(p)),
    );
    if (doomed.length > 0) {
      await AsyncStorage.multiRemove(doomed);
      removedKeys = doomed.length;
    }
  } catch { /* хранилище недоступно — просто чистим картинки */ }
  await Promise.all([
    Image.clearMemoryCache().catch(() => false),
    Image.clearDiskCache().catch(() => false),
  ]);
  return { removedKeys };
}

/* expo-router route shim: utility module under app/ */
export default function __RouteShim() {
  return null;
}
