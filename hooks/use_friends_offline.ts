/**
 * «Сети нет» для вкладки «Друзья» (идея 1, полоса «Нет сети · список сохранён в 18:40»).
 *
 * зачем (макет docs/design/v2-app/friends-full.html «Нет сети»): NetInfo отдаёт состояние системы — запросов в сеть нет.
 * Подписка только пока вкладка на экране; до первого ответа — null («не знаем»), полосу вслепую не показываем.
 * Признак — тот же, что у очереди зовов (subscribeOffline), чтобы полоса и тост «В очереди» не спорили.
 */
import { useEffect, useRef, useState } from 'react';

import { subscribeOffline } from '../app/friends_together/nudge_queue';

export function useFriendsOffline(active: boolean): boolean | null {
  const [offline, setOffline] = useState<boolean | null>(null);
  const lastRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    return subscribeOffline((next) => {
      if (lastRef.current !== next) {
        console.log(`[FRIENDS-1] offline:${next ? 'on' : 'off'} was=${String(lastRef.current)}`); // guard-ok: одна строка на смену сети
        lastRef.current = next;
        setOffline(next);
      }
    });
  }, [active]);

  return offline;
}
