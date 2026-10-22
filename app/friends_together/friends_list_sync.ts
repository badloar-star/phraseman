/**
 * Когда список друзей последний раз пришёл с сервера — для полосы «Нет сети · список сохранён в 18:40» (идея 1).
 *
 * зачем (макет docs/design/v2-app/friends-full.html «Нет сети»: список из кэша, «Позвать» в очередь): без сети вкладка
 * честно говорит, насколько свежий список. Только телефон: память + AsyncStorage, своя отметка на аккаунт; Firestore не
 * трогаем. На диск — не чаще раза в минуту: снимки подписки приходят пачками.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCanonicalUserId } from '../user_id_policy';
import { maskUid } from '../diagnostic_mask';

const KEY = 'friends_list_synced_at_v1';
const WRITE_EVERY_MS = 60_000;

let lastScope = '';
const memory = new Map<string, number>();
const writtenAt = new Map<string, number>();

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Снимок списка друзей пришёл с сервера (не из кэша Firestore). scope — свой uid. */
export function noteFriendsListServerSnapshot(scope: string, atMs: number = Date.now()): void {
  if (!scope) {
    console.log('[FRIENDS-1] list_sync:skip reason=no_scope'); // guard-ok: ранний выход называет причину
    return;
  }
  lastScope = scope;
  memory.set(scope, atMs);
  const last = writtenAt.get(scope);
  if (last !== undefined && atMs - last < WRITE_EVERY_MS) {
    // зачем: память уже свежая, диск догонит следующий снимок
    console.log(`[FRIENDS-1] list_sync:memory_only reason=written_${Math.round((atMs - last) / 1000)}s_ago`); // guard-ok: ранний выход называет причину
    return;
  }
  writtenAt.set(scope, atMs);
  AsyncStorage.setItem(`${KEY}::${scope}`, String(atMs)).catch((e: unknown) => {
    console.warn(`[FRIENDS-1] list_sync:write failed owner=${maskUid(scope)} → полоса покажет время из памяти: ${errText(e)}`); // guard-ok: catch называет причину
  });
}

/** Время из памяти этой сессии (без диска) — чтобы полоса сразу встала с временем. */
export function peekFriendsListSyncedAt(): number | null {
  return lastScope ? memory.get(lastScope) ?? null : null;
}

/** Время своего аккаунта: память, иначе диск (холодный старт без сети). Неизвестно — null. */
export async function readFriendsListSyncedAt(): Promise<number | null> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    console.log('[FRIENDS-1] list_sync:read none reason=no_user'); // guard-ok: ранний выход называет причину
    return null;
  }
  const inMemory = memory.get(scope);
  if (inMemory !== undefined) return inMemory;
  try {
    const raw = await AsyncStorage.getItem(`${KEY}::${scope}`);
    const atMs = raw ? Number(raw) : NaN;
    if (!Number.isFinite(atMs) || atMs <= 0) {
      console.log(`[FRIENDS-1] list_sync:read none reason=${raw ? 'bad_value' : 'never'} owner=${maskUid(scope)}`); // guard-ok: ветка называет причину
      return null;
    }
    memory.set(scope, atMs);
    lastScope = scope;
    return atMs;
  } catch (e) {
    console.warn(`[FRIENDS-1] list_sync:read failed owner=${maskUid(scope)} → без времени: ${errText(e)}`); // guard-ok: catch называет причину
    return null;
  }
}

/** Только для тестов. */
export function __resetFriendsListSyncForTests(): void {
  lastScope = '';
  memory.clear();
  writtenAt.clear();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
