// зачем (сверка Макетов e4e4149d0, «Каталог без сети»): без сети каталог показывал «Здесь появятся наборы после публикации.»,
// хотя наборы есть — просто не загрузились. Этот хук решает, показывать ли отдельное состояние «Нет сети» + «Повторить».
// Запросов в сеть не добавляет: NetInfo.fetch() читает состояние системы. Лог [CATALOG-OFFLINE] — вход, значения, причина, итог.
// зачем (владелец 26.10, «Нет сети» при живой сети; координатор — тот же шаблон здесь): одного reachable=false больше не хватает —
// общее правило app/net_offline_step.ts (connected=false сразу, reachable=false — 5 с подряд, null = сеть есть), журнал [NET-BANNER].
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { isDevCardsFail } from '../dev_cards_state';
import { netOfflineInstant, netOfflineStep } from '../net_offline_step';

type CatalogOfflineInput = Readonly<{
  /** Облачный каталог вообще включён (не Expo Go / не локальный режим). */
  enabled: boolean;
  /** Загрузка каталога завершена (успехом или нет). */
  loaded: boolean;
  /** В каталоге есть хотя бы один не-локальный (облачный) набор — пустого состояния нет. */
  hasCloudPacks: boolean;
}>;

/** Мгновенное решение «сети нет» по одному снимку (reachable=false само по себе — ещё не офлайн); причина — для лога. */
export function catalogOfflineVerdict(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable' | 'type'>): Readonly<{ offline: boolean; reason: string }> {
  return netOfflineInstant(state);
}

export function useCatalogOffline({ enabled, loaded, hasCloudPacks }: CatalogOfflineInput): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!enabled || !loaded || hasCloudPacks) {
      console.log(`[CATALOG-OFFLINE] skip enabled=${String(enabled)} loaded=${String(loaded)} hasCloudPacks=${String(hasCloudPacks)}`);
      setOffline(false);
      return undefined;
    }
    // зачем (Макеты 12.10, cards-v2-044 / section-029): dev `fail=catalog_load` — «Нет сети» без авиарежима (вместе с catalog=empty).
    if (isDevCardsFail('catalog_load')) {
      console.log('[CATALOG-OFFLINE] probe offline=true reason=dev_fail_catalog_load'); // guard-ok: dev-ветка
      setOffline(true);
      return undefined;
    }
    let cancelled = false;
    let recheck: ReturnType<typeof setTimeout> | null = null;
    // зачем: разовый NetInfo.fetch — reachable=false подтверждаем вторым чтением через 5 с (recheckInMs того же правила).
    const probe = (prevSinceMs: number | null, attempt: 'first' | 'confirm') => {
      void NetInfo.fetch()
        .then((state) => {
          if (cancelled) {
            console.log(`[NET-BANNER] place=cards_catalog probe:skip attempt=${attempt} reason=unmounted`); // guard-ok: ранний выход называет причину
            return;
          }
          const step = netOfflineStep(prevSinceMs, state, Date.now());
          console.log(`[NET-BANNER] place=cards_catalog probe attempt=${attempt} offline=${String(step.offline)} recheckInMs=${String(step.recheckInMs)} reason=${step.reason}`);
          setOffline(step.offline);
          if (step.recheckInMs !== null && attempt === 'first') {
            recheck = setTimeout(() => { recheck = null; probe(step.unreachableSinceMs, 'confirm'); }, step.recheckInMs);
          }
        })
        .catch((error: unknown) => {
          console.warn(`[NET-BANNER] place=cards_catalog probe failed attempt=${attempt} reason=${error instanceof Error ? error.name : typeof error} → считаем, что сеть есть`);
          if (!cancelled) setOffline(false);
        });
    };
    probe(null, 'first');
    return () => {
      cancelled = true;
      if (recheck !== null) clearTimeout(recheck);
    };
  }, [enabled, loaded, hasCloudPacks]);
  return offline;
}
