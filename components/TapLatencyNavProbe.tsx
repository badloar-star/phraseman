import { useEffect } from 'react';
import { useNavigationContainerRef } from 'expo-router';
import { TAP_LATENCY_TRACE_ENABLED, noteTapNavigationCommit, traceLog } from '../app/tap_latency_trace';

/**
 * Пробник навигации для трассировки [TAP-LAT] (см. app/tap_latency_trace.ts).
 *
 * зачем: чтобы измерить «тап → экран открылся» для ЛЮБОГО маршрута, не трогая
 * сотню экранов, слушаем событие 'state' контейнера навигации: оно приходит
 * после того, как React закоммитил новый экран. Компонент ничего не рисует.
 * Когда трассировка выключена — не подписывается вовсе.
 */
type RouteLike = Readonly<{ name?: string }> | undefined;

export function TapLatencyNavProbe() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (!TAP_LATENCY_TRACE_ENABLED) return undefined;
    // зачем: типизированные маршруты expo-router сводят getCurrentRoute() к never —
    // нам нужно только имя, читаем его через узкий локальный тип.
    const currentRouteName = (): string | null => (navigationRef.getCurrentRoute() as RouteLike)?.name ?? null;
    let lastRoute: string | null = null;
    try {
      lastRoute = currentRouteName();
    } catch (e) {
      // зачем: до готовности контейнера getCurrentRoute может бросить — стартуем с null.
      traceLog(`пробник: контейнер ещё не готов, стартуем без маршрута: ${e instanceof Error ? e.message : String(e)}`);
    }
    const unsubscribe = navigationRef.addListener('state', () => {
      let route: string | null = null;
      try {
        route = currentRouteName();
      } catch (e) {
        traceLog(`пробник: getCurrentRoute упал: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      if (route === lastRoute) return;
      const from = lastRoute;
      lastRoute = route;
      noteTapNavigationCommit(route ?? '?', from);
    });
    return unsubscribe;
  }, [navigationRef]);

  return null;
}

export default TapLatencyNavProbe;
