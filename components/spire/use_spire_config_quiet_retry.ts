// use_spire_config_quiet_retry.ts — тихий повтор чтения конфига Пика вместо экрана «Нет интернета».
//
// зачем (правило владельца 01.10 и 18.10 «экранов-ошибок нигде»; координатор 18.10 08:00, опись fullscreen-error-states): конфиг не прочитался —
// вкладка показывает то, что есть (конфиг из памяти/диска) или спокойную фразу замка, а чтение тихо повторяется: паузы и потолок —
// общие ворота useLoadGate (app/load_gate_config.ts), после исчерпания — повтор при возврате в приложение. Экрана-ошибки нет.
// Журнал: [NO-ERROR-SCREEN] — почему раньше был бы экран ошибки и что показали; [LOAD-GATE:spire_config] — сами повторы.
import { useCallback, useEffect, useRef, useState } from 'react';

import { loadSpireConfig } from '../../app/spire_config_client';
import { useLoadGate } from '../../app/use_load_gate';
import type { SpireConfigDoc } from '../../modules/spire/config_contract';
import { SPIRE_CONFIG_OFFLINE, spireConfigFallback } from './spire_config_offline';

type SetConfig = (update: (cur: SpireConfigDoc | null) => SpireConfigDoc | null) => void;

export function logSpireNoErrorScreen(reason: string, shown: 'cache' | 'quiet_empty', extra: Readonly<Record<string, unknown>> = {}): void {
  console.log('[NO-ERROR-SCREEN]', JSON.stringify({ screen: 'spire_home', reason, shown, ...extra })); // guard-ok: причина замены экрана-ошибки, без данных пользователя
}

/**
 * Сбой чтения конфига → тихие повторы; успех повтора кладётся в setConfig.
 * handleLoadFailure: конфиг из памяти/диска НЕ затирается (показываем сохранённое); без него — дефолт (спокойный замок).
 * spireConfigFallback оставлен ради журнала причины (сеть или нет).
 */
export function useSpireConfigQuietRetry(enabled: boolean, currentConfig: SpireConfigDoc | null, setConfig: SetConfig): Readonly<{
  handleLoadFailure: (error: unknown, isAlive: () => boolean) => void;
}> {
  const [status, setStatus] = useState<'ready' | 'error'>('ready');
  const currentRef = useRef(currentConfig);
  currentRef.current = currentConfig;
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const retry = useCallback(() => {
    loadSpireConfig()
      .then((next) => {
        if (!mountedRef.current) {
          console.log('[NO-ERROR-SCREEN] spire_home retry_result dropped reason=unmounted'); // guard-ok: ранний выход пишет причину
          return;
        }
        console.log(`[NO-ERROR-SCREEN] spire_home retry_ok enabled=${String(next.enabled === true)}`); // guard-ok: итог повтора
        setConfig(() => next);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        // статус остаётся 'error' — ворота сами поставят следующую паузу или перейдут к повтору при возврате в приложение
        console.warn(`[NO-ERROR-SCREEN] spire_home retry_failed reason=${error instanceof Error ? error.message.slice(0, 80) : typeof error}`); // guard-ok: catch пишет причину
      });
  }, [setConfig]);

  useLoadGate({ id: 'spire_config', status, retry, enabled: enabled && status === 'error' });

  const handleLoadFailure = useCallback((error: unknown, isAlive: () => boolean) => {
    const reason = String(error).slice(0, 80);
    void spireConfigFallback(error).then((fallback) => {
      if (!isAlive()) {
        console.log('[NO-ERROR-SCREEN] spire_home config_failed dropped reason=unmounted'); // guard-ok: ранний выход пишет причину
        return;
      }
      const cached = currentRef.current;
      logSpireNoErrorScreen(reason, cached ? 'cache' : 'quiet_empty', { offline: fallback === SPIRE_CONFIG_OFFLINE, cachedEnabled: cached ? cached.enabled === true : null });
      setConfig((cur) => cur ?? fallback);
      setStatus('error');
    });
  }, [setConfig]);
  return { handleLoadFailure };
}
