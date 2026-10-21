// ═══════════════════════════════════════════════════════════════════════════
// use_home_scene_offline.ts — «Нет сети» для «Сцены» Главной.
//
// зачем (эталон home-new-concepts.html, состояние «Нет сети»): строка под шапкой и герой «Нет сети». Запросов в сеть не
// добавляет — NetInfo отдаёт состояние системы. Подписка — только пока Главная активна и только после её первого кадра
// (первый кадр не платит за NetInfo); до первого ответа — null («не знаем»), строку не показываем вслепую.
// ═══════════════════════════════════════════════════════════════════════════
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

import { runAfterHomeFirstFrame } from '../../../../app/first_frame_deferred_warmups';

const LOG = '[HOME-SCENE]';

/** Чистое решение «сети нет» по снимку NetInfo; причина — для журнала. */
export function homeSceneOfflineVerdict(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable' | 'type'>): Readonly<{ offline: boolean; reason: string }> {
  if (state.isConnected === false) return { offline: true, reason: `not_connected type=${String(state.type)}` };
  if (state.isInternetReachable === false) return { offline: true, reason: `internet_unreachable type=${String(state.type)}` };
  return { offline: false, reason: `online connected=${String(state.isConnected)} reachable=${String(state.isInternetReachable)} type=${String(state.type)}` };
}

export function useHomeSceneOffline(active: boolean): boolean | null {
  const [offline, setOffline] = useState<boolean | null>(null);
  const lastRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    let unsubscribe: (() => void) | null = null;
    const cancel = runAfterHomeFirstFrame('home_scene_netinfo', () => {
      if (!alive) {
        console.log(LOG, 'offline:skip', JSON.stringify({ reason: 'unmounted_before_first_frame' })); // guard-ok: ранний выход называет причину
        return;
      }
      unsubscribe = NetInfo.addEventListener((state) => {
        const verdict = homeSceneOfflineVerdict(state);
        if (lastRef.current === verdict.offline) return;
        lastRef.current = verdict.offline;
        console.log(LOG, 'offline', JSON.stringify(verdict)); // guard-ok: одна строка на смену состояния сети
        setOffline(verdict.offline);
      });
    });
    return () => {
      alive = false;
      cancel();
      unsubscribe?.();
    };
  }, [active]);
  return offline;
}
