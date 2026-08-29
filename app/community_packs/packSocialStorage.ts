/**
 * Локальный слой соц-состояния наборов (Cards 2.1 §2): что я лайкнул и что уже добавил себе.
 *
 * Нужен для мгновенного (оптимистичного) UI и для дедупликации счётчика добавлений,
 * когда Firestore недоступен / выключен. Сервер — источник правды для чисел,
 * локальное хранилище — источник правды для «моего» флага до синхронизации.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../debug-logger';

const LIKED_KEY = 'community_pack_liked_ids_v1';
const ADDED_KEY = 'community_pack_added_registered_ids_v1';

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function readIds(key: string): Promise<string[]> {
  try {
    return parseIds(await AsyncStorage.getItem(key));
  } catch {
    return [];
  }
}

async function writeIds(key: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch (e) {
      // ignore
      DebugLogger.error('packSocialStorage:writeIds', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export async function loadLikedCommunityPackIds(): Promise<string[]> {
  return readIds(LIKED_KEY);
}

export async function isCommunityPackLikedLocally(packId: string): Promise<boolean> {
  return (await loadLikedCommunityPackIds()).includes(packId);
}

/** Сохранить локальный флаг лайка; возвращает true, если состояние реально изменилось. */
export async function setCommunityPackLikedLocally(packId: string, liked: boolean): Promise<boolean> {
  const cur = await loadLikedCommunityPackIds();
  const has = cur.includes(packId);
  if (has === liked) return false;
  await writeIds(LIKED_KEY, liked ? [...cur, packId] : cur.filter((id) => id !== packId));
  return true;
}

export async function loadAddCountedCommunityPackIds(): Promise<string[]> {
  return readIds(ADDED_KEY);
}

/**
 * Отметить, что добавление этого набора уже учтено в `addedCount`.
 * Возвращает true только при первой отметке — на её основе шлём инкремент.
 */
export async function markCommunityPackAddCounted(packId: string): Promise<boolean> {
  const cur = await loadAddCountedCommunityPackIds();
  if (cur.includes(packId)) return false;
  await writeIds(ADDED_KEY, [...cur, packId]);
  return true;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
