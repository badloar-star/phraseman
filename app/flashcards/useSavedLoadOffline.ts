// useSavedLoadOffline — устройство без сети, пока «Сохранённые» в ошибке загрузки (cards-039, координатор 18.10 05:47).
//
// зачем: тихий скелетон на время автоповторов (D158, ~12 с) оправдан, когда сеть есть, а сервер молчит. Без сети ждать нечего — «Сейчас недоступно» + «Попробовать снова» показываем сразу после первой неудачи,
// автоповтор useLoadGate идёт фоном, при успехе список подставляется тихо. Запросов в сеть не добавляет: NetInfo.fetch() читает состояние системы (тот же вердикт, что у каталога — catalogOfflineVerdict).
// Журнал [CARDS-LOAD]: вход, значение вердикта и причина; сбой чтения NetInfo — предупреждение (offline=false, остаёмся на тихом повторе).
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import { catalogOfflineVerdict } from './useCatalogOffline';

export function useSavedLoadOffline(loadError: boolean): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!loadError) {
      if (offline) console.log('[CARDS-LOAD] offline probe: loadError снят → offline=false'); // guard-ok: ранний выход называет причину
      setOffline(false);
      return undefined;
    }
    let cancelled = false;
    const apply = (state: Parameters<typeof catalogOfflineVerdict>[0], source: 'fetch' | 'change') => {
      const verdict = catalogOfflineVerdict(state);
      console.log('[CARDS-LOAD] offline probe', JSON.stringify({ source, offline: verdict.offline, reason: verdict.reason, cancelled })); // guard-ok: одно решение на проверку
      if (!cancelled) setOffline(verdict.offline);
    };
    void NetInfo.fetch()
      .then((state) => apply(state, 'fetch'))
      .catch((error: unknown) => console.warn('[CARDS-LOAD] offline probe failed', error instanceof Error ? error.message : String(error))); // guard-ok: сбой чтения NetInfo — остаёмся на тихом повторе
    // сеть вернулась, пока открыт экран ошибки — «Сейчас недоступно» не залипает (автоповтор подставит список сам)
    const unsubscribe = NetInfo.addEventListener((state) => apply(state, 'change'));
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: проба на смену loadError; offline читается только для строки журнала
  }, [loadError]);
  return offline;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
