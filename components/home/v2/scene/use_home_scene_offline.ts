// ═══════════════════════════════════════════════════════════════════════════
// use_home_scene_offline.ts — «Нет сети» для «Сцены» Главной.
//
// зачем (эталон home-new-concepts.html, состояние «Нет сети»): строка под шапкой и герой «Нет сети». Запросов в сеть не
// добавляет — NetInfo отдаёт состояние системы. Подписка — только пока Главная активна и только после её первого кадра
// (первый кадр не платит за NetInfo); до первого ответа — null («не знаем»), строку не показываем вслепую.
//
// зачем (владелец 26.10, «Нет сети» при живой сети): решение и таймер — общий trackNetOffline (app/net_offline_step.ts):
// reachable=false показывает строку только через 5 с подряд, connected=false — сразу, null = сеть есть, возврат — сразу.
// Журнал [NET-BANNER] place=home_scene: снимок NetInfo, ветка и значение, которое её решило, «нет сети» / «сеть вернулась».
// ═══════════════════════════════════════════════════════════════════════════
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

import { runAfterHomeFirstFrame } from '../../../../app/first_frame_deferred_warmups';
import { trackNetOffline } from '../../../../app/net_offline_step';

export { homeSceneOfflineVerdict } from './home_net_banner_step';

const LOG = '[NET-BANNER]';

export function useHomeSceneOffline(active: boolean): boolean | null {
  const [offline, setOffline] = useState<boolean | null>(null);
  const lastRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    let stop: (() => void) | null = null;
    const cancel = runAfterHomeFirstFrame('home_scene_netinfo', () => {
      if (!alive) {
        console.log(LOG, 'subscribe:skip', JSON.stringify({ place: 'home_scene', reason: 'unmounted_before_first_frame' })); // guard-ok: ранний выход называет причину
        return;
      }
      stop = trackNetOffline('home_scene', (listener) => NetInfo.addEventListener(listener), (next) => {
        if (!alive || lastRef.current === next) return;
        lastRef.current = next;
        setOffline(next);
      });
    });
    return () => {
      alive = false;
      cancel();
      stop?.();
    };
  }, [active]);
  return offline;
}
