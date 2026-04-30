// ════════════════════════════════════════════════════════════════════════════
// firestore_boosts.ts — Общие клубные бусты через Firestore
//
// Структура Firestore:
//   league_groups/{groupId}/boosts/{boostId} → { activatedBy, activatedAt, durationMs, multiplier, type }
//
// Логика:
//   - Игрок активирует буст → пишется в свою league_group
//   - Все участники группы читают активные бусты при старте и каждые 5 минут
//   - Истёкшие бусты игнорируются на клиенте (не удаляем — дорого)
//
// Активно только при CLOUD_SYNC_ENABLED = true.
// При отключённом флаге — работают только локальные бусты из AsyncStorage.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import { ActiveBoost } from './club_boosts';

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch { return null; }
};

const COL_LB = 'leaderboard';
const COL_GROUPS = 'league_groups';

// ── Получить groupId текущего пользователя ───────────────────────────────────
async function getMyGroupId(): Promise<string | null> {
  const db = getFirestore();
  if (!db) return null;
  const uid = await ensureAnonUser();
  if (!uid) return null;
  try {
    const doc = await db.collection(COL_LB).doc(uid).get();
    return doc.exists ? (doc.data()?.groupId ?? null) : null;
  } catch { return null; }
}

// ── Активировать буст для всей группы ───────────────────────────────────────
export async function activateGroupBoost(boost: ActiveBoost): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED) return false;
  const db = getFirestore();
  if (!db) return false;
  const groupId = await getMyGroupId();
  if (!groupId) return false;
  try {
    await db
      .collection(COL_GROUPS)
      .doc(groupId)
      .collection('boosts')
      .doc(boost.id)
      .set({
        activatedBy: boost.activatedBy,
        activatedAt: boost.activatedAt,
        durationMs:  boost.durationMs,
        expiresAt:   boost.activatedAt + boost.durationMs,
      });
    return true;
  } catch { return false; }
}

// ── Загрузить активные бусты группы ─────────────────────────────────────────
// Возвращает только те что ещё не истекли
export async function fetchGroupBoosts(): Promise<ActiveBoost[]> {
  if (!CLOUD_SYNC_ENABLED) return [];
  const db = getFirestore();
  if (!db) return [];
  const groupId = await getMyGroupId();
  if (!groupId) return [];
  try {
    const now = Date.now();
    const snap = await db
      .collection(COL_GROUPS)
      .doc(groupId)
      .collection('boosts')
      .where('expiresAt', '>', now)
      .get();
    return snap.docs.map((doc: any) => ({
      id:           doc.id,
      activatedBy:  doc.data().activatedBy ?? '',
      activatedAt:  doc.data().activatedAt ?? 0,
      durationMs:   doc.data().durationMs  ?? 0,
    }));
  } catch { return []; }
}

// ── Кэш бустов группы (обновляется раз в 5 минут) ───────────────────────────
const CACHE_KEY = 'group_boosts_cache';
const CACHE_TTL = 5 * 60 * 1000;

export async function getCachedGroupBoosts(): Promise<ActiveBoost[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts, data }: { ts: number; data: ActiveBoost[] } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch {}
  // Кэш устарел — обновляем
  const fresh = await fetchGroupBoosts();
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: fresh }));
  } catch {}
  return fresh;
}

export async function invalidateGroupBoostsCache(): Promise<void> {
  try { await AsyncStorage.removeItem(CACHE_KEY); } catch {}
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
