import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hasCommunityUnreadSince,
  readCachedUserNotifications,
  subscribeUserNotificationsCache,
  type UserNotification,
} from '../app/user_notifications';

// зачем (макет system.html «Точка — есть новое в Сообществе», 30.09): точка на
// вкладке «Сообщество», когда пришло непрочитанное событие друзей ПОСЛЕ последнего
// захода во вкладку. Источник — локальный кэш центра уведомлений (его обновляет
// Главная раз в 12 ч), поэтому точка не стоит ни одного чтения Firestore.
// Заход во вкладку гасит точку сразу (локально), не дожидаясь отметки «прочитано».
const COMMUNITY_TAB_SEEN_AT_KEY = 'community_tab_seen_at_v1';

export function useCommunityTabDot(communityTabActive: boolean): boolean {
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const [list, setList] = useState<readonly UserNotification[]>([]);
  const seenAtRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(COMMUNITY_TAB_SEEN_AT_KEY)
      .then((raw) => {
        if (!alive) return;
        const parsed = Math.floor(Number(raw || 0));
        // Первый запуск: считаем «видел всё» сейчас, чтобы старые события не зажгли точку.
        const value = Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
        seenAtRef.current = value;
        setSeenAt(value);
        if (!(parsed > 0)) {
          void AsyncStorage.setItem(COMMUNITY_TAB_SEEN_AT_KEY, String(value)).catch((error: unknown) => {
            console.warn('[COMMUNITY-DOT] seed seenAt failed', { message: error instanceof Error ? error.message : String(error) });
          });
        }
      })
      .catch((error: unknown) => {
        console.warn('[COMMUNITY-DOT] read seenAt failed', { message: error instanceof Error ? error.message : String(error) });
        if (alive) setSeenAt(Date.now());
      });
    void readCachedUserNotifications().then((cached) => { if (alive) setList(cached); });
    const unsubscribe = subscribeUserNotificationsCache((next) => setList(next));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const markSeen = useCallback(() => {
    const now = Date.now();
    seenAtRef.current = now;
    setSeenAt(now);
    void AsyncStorage.setItem(COMMUNITY_TAB_SEEN_AT_KEY, String(now)).catch((error: unknown) => {
      console.warn('[COMMUNITY-DOT] write seenAt failed', { message: error instanceof Error ? error.message : String(error) });
    });
  }, []);

  useEffect(() => {
    if (communityTabActive) markSeen();
  }, [communityTabActive, list, markSeen]);

  if (communityTabActive || seenAt == null) return false;
  return hasCommunityUnreadSince(list, seenAt);
}
