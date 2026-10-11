// зачем (сверка Макетов e4e4149d0, «Каталог без сети»): без сети каталог показывал «Здесь появятся наборы после публикации.»,
// хотя наборы есть — просто не загрузились. Этот хук решает, показывать ли отдельное состояние «Нет сети» + «Повторить».
// Запросов в сеть не добавляет: NetInfo.fetch() читает состояние системы. Лог [CATALOG-OFFLINE] — вход, значения, причина, итог.
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

type CatalogOfflineInput = Readonly<{
  /** Облачный каталог вообще включён (не Expo Go / не локальный режим). */
  enabled: boolean;
  /** Загрузка каталога завершена (успехом или нет). */
  loaded: boolean;
  /** В каталоге есть хотя бы один не-локальный (облачный) набор — пустого состояния нет. */
  hasCloudPacks: boolean;
}>;

/** Чистое решение «сети нет» по снимку NetInfo; причина — для лога. */
export function catalogOfflineVerdict(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable' | 'type'>): Readonly<{ offline: boolean; reason: string }> {
  if (state.isConnected === false) return { offline: true, reason: `not_connected type=${String(state.type)}` };
  if (state.isInternetReachable === false) return { offline: true, reason: `internet_unreachable type=${String(state.type)}` };
  return { offline: false, reason: `online connected=${String(state.isConnected)} reachable=${String(state.isInternetReachable)} type=${String(state.type)}` };
}

export function useCatalogOffline({ enabled, loaded, hasCloudPacks }: CatalogOfflineInput): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!enabled || !loaded || hasCloudPacks) {
      console.log(`[CATALOG-OFFLINE] skip enabled=${String(enabled)} loaded=${String(loaded)} hasCloudPacks=${String(hasCloudPacks)}`);
      setOffline(false);
      return undefined;
    }
    let cancelled = false;
    void NetInfo.fetch()
      .then((state) => {
        const verdict = catalogOfflineVerdict(state);
        console.log(`[CATALOG-OFFLINE] probe offline=${String(verdict.offline)} reason=${verdict.reason}`);
        if (!cancelled) setOffline(verdict.offline);
      })
      .catch((error: unknown) => {
        console.warn(`[CATALOG-OFFLINE] probe failed reason=${error instanceof Error ? error.name : typeof error} → считаем, что сеть есть`);
        if (!cancelled) setOffline(false);
      });
    return () => { cancelled = true; };
  }, [enabled, loaded, hasCloudPacks]);
  return offline;
}
