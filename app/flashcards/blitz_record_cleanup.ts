/**
 * зачем (владелец 04.10: «ОЧКИ ИЗ БЛИЦА УБИРАЙ ВООБЩЕ, ТОЛЬКО МОНЕТЫ СЧИТАЕМ»):
 * рекорд Блица удалён вместе с очками. На устройствах остался локальный ключ
 * рекорда — стираем его тихо при запуске. Одно чтение, удаление только если
 * ключ есть; в сеть ничего не уходит.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const RETIRED_FC_BLITZ_BEST_KEY = 'fc_blitz_best_v1';

export async function cleanupRetiredBlitzRecord(): Promise<'removed' | 'absent'> {
  const stored = await AsyncStorage.getItem(RETIRED_FC_BLITZ_BEST_KEY);
  if (stored == null) return 'absent';
  await AsyncStorage.removeItem(RETIRED_FC_BLITZ_BEST_KEY);
  console.warn('[FC-BLITZ] retired best-score key removed', JSON.stringify({ bytes: stored.length }));
  return 'removed';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
