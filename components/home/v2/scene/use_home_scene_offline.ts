// ═══════════════════════════════════════════════════════════════════════════
// use_home_scene_offline.ts — «Нет сети» для «Сцены» Главной.
//
// зачем (эталон home-new-concepts.html, состояние «Нет сети»): строка под шапкой и герой «Нет сети». Запросов в сеть не
// добавляет — NetInfo отдаёт состояние системы. Подписка — только пока Главная активна и только после её первого кадра
// (первый кадр не платит за NetInfo); до первого ответа — null («не знаем»), строку не показываем вслепую.
//
// зачем (владелец 26.10, «Нет сети» при живой сети): решение — homeNetBannerStep (home_net_banner_step.ts): reachable=false
// показывает строку только через 5 с подряд, connected=false — сразу, null = сеть есть, возврат — сразу. Здесь — таймер
// перепроверки и журнал [NET-BANNER]: снимок NetInfo, ветка и значение, которое её решило, показ/скрытие и сколько держалась.
// ═══════════════════════════════════════════════════════════════════════════
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

import { runAfterHomeFirstFrame } from '../../../../app/first_frame_deferred_warmups';
import { homeNetBannerStep, type NetBannerSnapshot } from './home_net_banner_step';

export { homeSceneOfflineVerdict } from './home_net_banner_step';

const LOG = '[NET-BANNER]';

export function useHomeSceneOffline(active: boolean): boolean | null {
  const [offline, setOffline] = useState<boolean | null>(null);
  const lastRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    let unsubscribe: (() => void) | null = null;
    let recheckTimer: ReturnType<typeof setTimeout> | null = null;
    let unreachableSinceMs: number | null = null;
    let shownAtMs: number | null = null;
    let lastState: NetBannerSnapshot | null = null;
    const clearRecheck = () => {
      if (recheckTimer !== null) clearTimeout(recheckTimer);
      recheckTimer = null;
    };
    const apply = (state: NetBannerSnapshot, source: 'event' | 'recheck') => {
      if (!alive) {
        console.log(LOG, 'apply:skip', JSON.stringify({ reason: 'unmounted', source })); // guard-ok: ранний выход называет причину
        return;
      }
      lastState = state;
      const nowMs = Date.now();
      const step = homeNetBannerStep(unreachableSinceMs, state, nowMs);
      unreachableSinceMs = step.unreachableSinceMs;
      clearRecheck();
      if (step.recheckInMs !== null) {
        recheckTimer = setTimeout(() => {
          recheckTimer = null;
          if (lastState) apply(lastState, 'recheck');
        }, step.recheckInMs);
      }
      console.log(LOG, 'decision', JSON.stringify({ // guard-ok: одна строка на сообщение NetInfo / перепроверку
        source,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        offline: step.offline,
        previous: lastRef.current,
        reason: step.reason,
        recheckInMs: step.recheckInMs,
      }));
      if (lastRef.current === step.offline) return;
      if (step.offline) {
        shownAtMs = nowMs;
        console.log(LOG, 'show', JSON.stringify({ reason: step.reason })); // guard-ok: строка появилась — что решило
      } else if (lastRef.current === true) {
        console.log(LOG, 'hide', JSON.stringify({ shownMs: shownAtMs === null ? null : nowMs - shownAtMs, reason: step.reason })); // guard-ok: строка ушла — сколько была на экране
        shownAtMs = null;
      }
      lastRef.current = step.offline;
      setOffline(step.offline);
    };
    const cancel = runAfterHomeFirstFrame('home_scene_netinfo', () => {
      if (!alive) {
        console.log(LOG, 'subscribe:skip', JSON.stringify({ reason: 'unmounted_before_first_frame' })); // guard-ok: ранний выход называет причину
        return;
      }
      unsubscribe = NetInfo.addEventListener((state) => {
        apply({ isConnected: state.isConnected, isInternetReachable: state.isInternetReachable, type: String(state.type) }, 'event');
      });
    });
    return () => {
      alive = false;
      clearRecheck();
      cancel();
      unsubscribe?.();
    };
  }, [active]);
  return offline;
}
