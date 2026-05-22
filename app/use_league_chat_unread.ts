import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureAnonUser } from './cloud_sync';
import { emitAppEvent, onAppEvent } from './events';
import {
  authorizeLeagueChatRoom,
  getCachedLeagueChatMessagesSync,
  getCachedLeagueChatRoomSync,
  loadCachedLeagueChatMessages,
  loadCachedLeagueChatRoom,
  resolveMyLeagueChatRoom,
  subscribeLeagueChatMessages,
} from './firestore_league_chat';
import type { LeagueChatMessage, LeagueChatRoom } from './firestore_league_chat';
import {
  computeLeagueChatUnreadCount,
  leagueChatRoomKey,
  loadLeagueChatRoomSeenAt,
  markLeagueChatRoomRead,
} from './league_chat_unread';

function sameLeagueChatRoom(a: LeagueChatRoom | null | undefined, b: LeagueChatRoom | null | undefined): boolean {
  return !!a && !!b && a.groupId === b.groupId && a.weekId === b.weekId && a.leagueId === b.leagueId;
}

type UseLeagueChatUnreadOptions = {
  initialRoom?: LeagueChatRoom | null;
  myUid?: string | null;
  active?: boolean;
  enabled?: boolean;
};

export function useLeagueChatUnread({
  initialRoom,
  myUid: providedMyUid,
  active = false,
  enabled = true,
}: UseLeagueChatUnreadOptions = {}): number {
  const initialRoomRef = useRef<LeagueChatRoom | null | undefined>(undefined);
  if (initialRoomRef.current === undefined) {
    initialRoomRef.current = initialRoom ?? getCachedLeagueChatRoomSync();
  }
  const [room, setRoom] = useState<LeagueChatRoom | null>(initialRoomRef.current ?? null);
  const [myUid, setMyUid] = useState(() => String(providedMyUid ?? '').trim());
  const [unreadCount, setUnreadCount] = useState(0);
  const [authorizedRoomKey, setAuthorizedRoomKey] = useState('');
  const roomKey = room ? leagueChatRoomKey(room) : '';

  useEffect(() => {
    const uid = String(providedMyUid ?? '').trim();
    if (uid) setMyUid(uid);
  }, [providedMyUid]);

  useEffect(() => {
    if (myUid) return;
    let cancelled = false;
    void ensureAnonUser()
      .then((uid) => {
        if (!cancelled && uid) setMyUid(uid);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [myUid]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    if (initialRoom) {
      setRoom((cur) => (sameLeagueChatRoom(cur, initialRoom) ? cur : initialRoom));
    }
    void (async () => {
      const cached = await loadCachedLeagueChatRoom();
      if (!cancelled && cached) {
        setRoom((cur) => (sameLeagueChatRoom(cur, cached) ? cur : cur ?? cached));
      }
      const resolved = await resolveMyLeagueChatRoom();
      if (!cancelled && resolved) {
        setRoom((cur) => (sameLeagueChatRoom(cur, resolved) ? cur : resolved));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, initialRoom]);

  useEffect(() => {
    if (!enabled || !room) {
      setAuthorizedRoomKey('');
      return;
    }
    let cancelled = false;
    const key = roomKey;
    setAuthorizedRoomKey((cur) => (cur === key ? cur : ''));
    void authorizeLeagueChatRoom(room)
      .then((status) => {
        if (!cancelled && status === 'authorized') setAuthorizedRoomKey(key);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, roomKey]);

  const applyMessages = useCallback(async (
    targetRoom: LeagueChatRoom,
    messages: LeagueChatMessage[],
    shouldMarkRead: boolean,
    cancelledRef: { current: boolean },
  ) => {
    if (shouldMarkRead) {
      await markLeagueChatRoomRead(targetRoom, messages);
      if (!cancelledRef.current) {
        setUnreadCount(0);
        emitAppEvent('league_chat_unread_changed', {
          roomKey: leagueChatRoomKey(targetRoom),
          unreadCount: 0,
        });
      }
      return;
    }
    const seenAt = await loadLeagueChatRoomSeenAt(targetRoom);
    const nextCount = computeLeagueChatUnreadCount(messages, myUid, seenAt);
    if (!cancelledRef.current) setUnreadCount(nextCount);
  }, [myUid]);

  useEffect(() => {
    if (!enabled || !room) return;
    const cancelledRef = { current: false };
    const memoryMessages = getCachedLeagueChatMessagesSync(room);
    void applyMessages(room, memoryMessages, active, cancelledRef);
    void loadCachedLeagueChatMessages(room)
      .then((cached) => applyMessages(room, cached, active, cancelledRef))
      .catch(() => {});
    return () => {
      cancelledRef.current = true;
    };
  }, [enabled, roomKey, active, applyMessages]);

  useEffect(() => {
    if (!enabled || !room || authorizedRoomKey !== roomKey) return;
    const cancelledRef = { current: false };
    const unsubscribe = subscribeLeagueChatMessages(
      room,
      (rows) => {
        const cached = rows.length > 0 ? rows : getCachedLeagueChatMessagesSync(room);
        void applyMessages(room, cached, active, cancelledRef);
      },
      () => {},
    );
    return () => {
      cancelledRef.current = true;
      unsubscribe();
    };
  }, [enabled, roomKey, authorizedRoomKey, active, applyMessages]);

  useEffect(() => {
    const sub = onAppEvent('league_chat_unread_changed', (payload) => {
      if (!payload || !roomKey || payload.roomKey !== roomKey) return;
      setUnreadCount(Math.max(0, Math.floor(Number(payload.unreadCount) || 0)));
    });
    return () => sub.remove();
  }, [roomKey]);

  return unreadCount;
}
