// ═══════════════════════════════════════════════════════════════════════════
// friend_block.ts — клиентский API блокировки пользователей (Q41, PM-162-A2).
//
// зачем: «Дизайн» рисует кнопку «Заблокировать», а здесь — логика. Сервер хранит
// users/{me}/blocked/{actorUid} (пишут только callable friendBlockUser/friendUnblockUser),
// клиент держит локальный набор для мгновенного отклика (Optimistic UI):
//   • blockUser/unblockUser меняют набор СРАЗУ, сеть догоняет фоном;
//   • ошибка сети → откат набора к прежнему значению + результат 'error' (UI покажет сообщение);
//   • двойной тап по тому же человеку не создаёт второго вызова (inflight-защита);
//   • поздний ответ старого вызова не затирает свежее локальное решение (счётчик поколений).
// Экономия Firebase: список читается с сервера не чаще раза в REFRESH_TTL_MS, иначе — из AsyncStorage.
// Лог: [FRIEND-BLOCK].
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { getCanonicalUserId } from './user_id_policy';

export type FriendBlockResult = 'ok' | 'limit' | 'error';

export type FriendBlockDeps = {
  getMyUid: () => Promise<string | null>;
  callBlock: (myUid: string, actorUid: string) => Promise<void>;
  callUnblock: (myUid: string, actorUid: string) => Promise<void>;
  fetchRemote: (myUid: string) => Promise<string[] | null>;
  loadCache: (myUid: string) => Promise<{ uids: string[]; fetchedAt: number } | null>;
  saveCache: (myUid: string, uids: string[], fetchedAt: number) => Promise<void>;
  now: () => number;
};

const REFRESH_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY_PREFIX = 'friend_blocked_v1:';

export function createFriendBlockStore(deps: FriendBlockDeps) {
  let ownerUid: string | null = null;
  let blocked = new Set<string>();
  const generation = new Map<string, number>();
  const inflight = new Set<string>();
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());
  const bump = (uid: string) => {
    const next = (generation.get(uid) ?? 0) + 1;
    generation.set(uid, next);
    return next;
  };
  const persist = (uid: string) => {
    void deps.saveCache(uid, [...blocked], deps.now()).catch((e: unknown) => {
      console.warn('[FRIEND-BLOCK] client: saveCache failed', String(e));
    });
  };

  async function change(actorUid: string, wantBlocked: boolean): Promise<FriendBlockResult> {
    const target = String(actorUid ?? '').trim();
    const myUid = await deps.getMyUid();
    if (!target || !myUid || target === myUid) {
      console.warn('[FRIEND-BLOCK] client: change skipped', { hasTarget: Boolean(target), hasMe: Boolean(myUid), self: target === myUid });
      return 'error';
    }
    if (inflight.has(target)) {
      console.log('[FRIEND-BLOCK] client: double tap ignored');
      return 'ok';
    }
    if (ownerUid !== myUid) { ownerUid = myUid; blocked = new Set(); }
    const before = blocked.has(target);
    if (before === wantBlocked) return 'ok';
    inflight.add(target);
    const gen = bump(target);
    blocked = new Set(blocked);
    if (wantBlocked) blocked.add(target); else blocked.delete(target);
    emit();
    persist(myUid);
    try {
      if (wantBlocked) await deps.callBlock(myUid, target); else await deps.callUnblock(myUid, target);
      console.log('[FRIEND-BLOCK] client: server confirmed', { wantBlocked });
      return 'ok';
    } catch (e) {
      const code = String((e as { code?: unknown })?.code ?? '');
      console.warn('[FRIEND-BLOCK] client: server failed, rolling back', { wantBlocked, code });
      // зачем: откатываем, только если за время вызова пользователь не принял новое решение по этому же человеку.
      if (generation.get(target) === gen && ownerUid === myUid) {
        blocked = new Set(blocked);
        if (before) blocked.add(target); else blocked.delete(target);
        emit();
        persist(myUid);
      }
      return code.endsWith('resource-exhausted') ? 'limit' : 'error';
    } finally {
      inflight.delete(target);
    }
  }

  return {
    blockUser: (uid: string) => change(uid, true),
    unblockUser: (uid: string) => change(uid, false),
    isBlockedLocally: (uid: string): boolean => blocked.has(String(uid ?? '').trim()),
    getBlockedUids: (): string[] => [...blocked],
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Подтянуть список: из кэша мгновенно, с сервера — не чаще раза в REFRESH_TTL_MS. */
    async refresh(force = false): Promise<void> {
      const myUid = await deps.getMyUid();
      if (!myUid) { console.log('[FRIEND-BLOCK] client: refresh skipped, no uid'); return; }
      if (ownerUid !== myUid) { ownerUid = myUid; blocked = new Set(); }
      const cached = await deps.loadCache(myUid);
      if (cached && blocked.size === 0) { blocked = new Set(cached.uids); emit(); }
      const fresh = cached && deps.now() - cached.fetchedAt < REFRESH_TTL_MS;
      if (fresh && !force) { console.log('[FRIEND-BLOCK] client: refresh from cache', { count: blocked.size }); return; }
      if (inflight.size > 0) { console.log('[FRIEND-BLOCK] client: refresh deferred, change in flight'); return; }
      const remote = await deps.fetchRemote(myUid);
      if (!remote) { console.warn('[FRIEND-BLOCK] client: refresh remote unavailable, keeping cache'); return; }
      blocked = new Set(remote);
      emit();
      persist(myUid);
      console.log('[FRIEND-BLOCK] client: refresh from server', { count: remote.length });
    },
  };
}

function cloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), 'us-central1'), name);
}

async function prepareCall(myUid: string): Promise<void> {
  await ensureAnonUser();
  await ensureStableAuthLinkForStableId(myUid);
}

const defaultDeps: FriendBlockDeps = {
  getMyUid: async () => (cloudEnabled() ? getCanonicalUserId() : null),
  callBlock: async (myUid, actorUid) => {
    await prepareCall(myUid);
    await callable<{ stableId: string; actorUid: string }, unknown>('friendBlockUser')({ stableId: myUid, actorUid });
  },
  callUnblock: async (myUid, actorUid) => {
    await prepareCall(myUid);
    await callable<{ stableId: string; actorUid: string }, unknown>('friendUnblockUser')({ stableId: myUid, actorUid });
  },
  fetchRemote: async (myUid) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const db = require('@react-native-firebase/firestore').default();
      const snap = await db.collection('users').doc(myUid).collection('blocked').limit(500).get();
      return (snap.docs as { id: string }[]).map((d) => d.id);
    } catch (e) {
      console.warn('[FRIEND-BLOCK] client: fetchRemote failed', String(e));
      return null;
    }
  },
  loadCache: async (myUid) => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + myUid);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { uids?: unknown; fetchedAt?: unknown };
      if (!Array.isArray(parsed.uids) || typeof parsed.fetchedAt !== 'number') return null;
      return { uids: parsed.uids.filter((u): u is string => typeof u === 'string'), fetchedAt: parsed.fetchedAt };
    } catch (e) {
      console.warn('[FRIEND-BLOCK] client: loadCache failed', String(e));
      return null;
    }
  },
  saveCache: async (myUid, uids, fetchedAt) => {
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + myUid, JSON.stringify({ uids, fetchedAt }));
  },
  now: () => Date.now(),
};

const store = createFriendBlockStore(defaultDeps);

export const blockUser = store.blockUser;
export const unblockUser = store.unblockUser;
export const isBlockedLocally = store.isBlockedLocally;
export const getBlockedUids = store.getBlockedUids;
export const subscribeToBlocked = store.subscribe;
export const refreshBlockedList = store.refresh;
