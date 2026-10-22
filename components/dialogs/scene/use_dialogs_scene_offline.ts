// ═══════════════════════════════════════════════════════════════════════════
// use_dialogs_scene_offline.ts — «Нет сети» для «Сцены» «Диалогов»: решение, кнопка «Повторить» и журнал [DIALOGS-NET].
//
// зачем (аудит кнопок Ревизора 22.10, F2; координатор: «ничего не нажимается» — офлайн мог определяться ложно): раньше «Диалоги» брали флаг у «Главной» —
// одно `isInternetReachable === false` — и в офлайне выключали единственную кнопку, а «Повторить» ничего не делала. Здесь:
//   · «нет сети» только по `isConnected === false`; `isInternetReachable === false` при живом подключении (портал Wi-Fi, эмулятор, медленная проба) экран НЕ блокирует
//     и пишет причину в журнал;
//   · «Повторить» = NetInfo.refresh() и новое решение (повторный тап, пока идёт проверка, игнорируется — с причиной в журнале);
//   · каждое решение в журнале [DIALOGS-NET]: снимок NetInfo (connected / reachable / type), вердикт и причина — по ним видно, откуда взялся флаг.
// Запросов в сеть не добавляет: NetInfo отдаёт состояние системы (refresh — одна системная проба). Подписка — после анимации входа (первый кадр не платит за NetInfo).
// ═══════════════════════════════════════════════════════════════════════════
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

const LOG = '[DIALOGS-NET]';

export type DialogsNetVerdict = Readonly<{ offline: boolean; reason: string }>;

/** Чистое решение по снимку NetInfo; причина — для журнала. */
export function dialogsSceneOfflineVerdict(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable' | 'type'>): DialogsNetVerdict {
  const snap = `connected=${String(state.isConnected)} reachable=${String(state.isInternetReachable)} type=${String(state.type)}`;
  if (state.isConnected === false) return { offline: true, reason: `not_connected ${snap}` };
  if (state.isInternetReachable === false) return { offline: false, reason: `reachable_false_but_connected_not_blocking ${snap}` };
  return { offline: false, reason: `online ${snap}` };
}

export type DialogsSceneOffline = Readonly<{
  /** null — ещё не знаем (до первого ответа NetInfo): состояние вслепую не включаем. */
  offline: boolean | null;
  /** «Повторить»: перепроверить сеть; возвращает новое решение (null — проверка не удалась). */
  retry: () => Promise<boolean | null>;
}>;

export function useDialogsSceneOffline(active: boolean): DialogsSceneOffline {
  const [offline, setOffline] = useState<boolean | null>(null);
  const lastRef = useRef<boolean | null>(null);
  const aliveRef = useRef(true);
  const retryingRef = useRef(false);

  const apply = useCallback((state: NetInfoState, source: 'event' | 'retry'): boolean => {
    const verdict = dialogsSceneOfflineVerdict(state);
    console.log(LOG, 'verdict', JSON.stringify({ source, offline: verdict.offline, reason: verdict.reason, previous: lastRef.current })); // guard-ok: одна строка на сообщение NetInfo
    if (lastRef.current !== verdict.offline) {
      lastRef.current = verdict.offline;
      if (aliveRef.current) setOffline(verdict.offline);
    }
    return verdict.offline;
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    if (!active) {
      console.log(LOG, 'subscribe:skip', JSON.stringify({ reason: 'inactive' })); // guard-ok: ранний выход называет причину
      return () => { aliveRef.current = false; };
    }
    let unsubscribe: (() => void) | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!aliveRef.current) {
        console.log(LOG, 'subscribe:skip', JSON.stringify({ reason: 'unmounted_before_subscribe' })); // guard-ok: ранний выход называет причину
        return;
      }
      unsubscribe = NetInfo.addEventListener((state) => { apply(state, 'event'); });
    });
    return () => {
      aliveRef.current = false;
      task.cancel();
      unsubscribe?.();
    };
  }, [active, apply]);

  const retry = useCallback(async (): Promise<boolean | null> => {
    if (retryingRef.current) {
      console.warn(LOG, 'retry:ignored', JSON.stringify({ reason: 'already_checking' })); // guard-ok: ранний выход называет причину
      return lastRef.current;
    }
    retryingRef.current = true;
    const startedAt = Date.now();
    console.log(LOG, 'retry:start', JSON.stringify({ before: lastRef.current })); // guard-ok: одна строка на тап
    try {
      const state = await NetInfo.refresh();
      const result = apply(state, 'retry');
      console.log(LOG, 'retry:done', JSON.stringify({ offline: result, ms: Date.now() - startedAt })); // guard-ok: итог проверки
      return result;
    } catch (error: unknown) {
      console.warn(LOG, 'retry:failed', JSON.stringify({ reason: error instanceof Error ? error.name : String(error), ms: Date.now() - startedAt })); // guard-ok: причина отказа проверки
      return null;
    } finally {
      retryingRef.current = false;
    }
  }, [apply]);

  return { offline, retry };
}
