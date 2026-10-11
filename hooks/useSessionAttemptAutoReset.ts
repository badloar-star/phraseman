import { useEffect, useRef } from 'react';

import { DebugLogger } from '../app/debug-logger';
import type { SessionAttemptsPhase } from '../app/session_attempts/session_attempts_domain';

type Input = Readonly<{
  phase: SessionAttemptsPhase;
  /**
   * Состояние попыток прочитано (успешно или нет).
   *
   * зачем необязательный: экран, который его не передаёт, не получает автовосстановления (ранний выход пишет причину), а не падает.
   */
  hydrated?: boolean;
  /**
   * Достоверно ли прочитано состояние попыток и ресурсов.
   *
   * зачем (аудит 2026-09-03): при сбое чтения «не знаем» — не то же, что «ничего нет». Сжигать за такое «не знаем» руны сессии
   * нельзя — попытки восстанавливаем, заработанное сохраняем. Значение по умолчанию `true` бережёт экраны, которые флаг не передают.
   */
  hydrationTrusted?: boolean;
  /** Persists clearing unclaimed runes belonging only to this session. */
  forfeitSessionRunes?: () => Promise<void> | void;
  /** Restores the three hearts without a wallet operation. */
  restoreAttempts: () => void;
  /** Re-enables the current card/activity after the state becomes active. */
  onRestored?: () => void;
}>;

/**
 * Converts the zero-heart recovery stop into one automatic recovery.
 *
 * зачем (D09/D148, 04.10): подарки «защиты от трёх попыток» убраны (старые подарки не конвертируются) — остался единственный
 * способ: сжечь руны сессии и вернуть попытки. Достоверно прочитанное состояние — платим рунами сессии; недостоверное («не знаем») —
 * попытки возвращаем БЕЗ платы. Экран оживает ВСЕГДА: раньше недостоверное чтение оставляло экран заблокированным (то самое
 * зависание) либо сжигало руны за «ничего нет», которого никто не проверял.
 */
export function useSessionAttemptAutoReset({
  phase,
  hydrated = false,
  hydrationTrusted = true,
  forfeitSessionRunes,
  restoreAttempts,
  onRestored,
}: Input): void {
  const handlingRef = useRef(false);
  const mountedRef = useRef(true);
  const callbacksRef = useRef({
    hydrationTrusted,
    forfeitSessionRunes,
    restoreAttempts,
    onRestored,
  });
  callbacksRef.current = {
    hydrationTrusted,
    forfeitSessionRunes,
    restoreAttempts,
    onRestored,
  };

  useEffect(() => () => { mountedRef.current = false; }, []);

  // зачем (владелец 11.10, режим энергии Б; ревью Ядра): остановка без энергии снята — Plus или энергия вернулась, хук Ядра сам вернул фазу
  // в 'active'. Экран обязан открыть ТОТ ЖЕ вопрос заново (onRestored), как после рунного спасения, но БЕЗ сжигания монет и без restoreAttempts:
  // в режиме Б сердечек и платы монетами нет. Один хук закрывает все экраны занятий.
  const prevPhaseRef = useRef<SessionAttemptsPhase>(phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev !== 'stopped_no_energy' || phase === 'stopped_no_energy') return;
    DebugLogger.info('[ATTEMPTS-RESET]', `остановка без энергии снята: ${prev}→${phase}; onRestored=${String(Boolean(callbacksRef.current.onRestored))}`);
    if (phase === 'active') callbacksRef.current.onRestored?.();
  }, [phase]);

  useEffect(() => {
    // зачем (2026-09-03): КАЖДЫЙ ранний выход обязан назвать причину. Именно немой выход по `hydrated === false` делал экран мёртвым:
    // сердца кончались, блокировщик ввода ложился поверх, а восстановление молча не запускалось.
    if (phase !== 'awaiting_recovery') return;
    if (!hydrated) {
      DebugLogger.warn('[ATTEMPTS-RESET]', `early return: phase=${phase} hydrated=${String(hydrated)} — восстановление ждёт чтения состояния попыток`);
      return;
    }
    if (handlingRef.current) {
      DebugLogger.warn('[ATTEMPTS-RESET]', `early return: уже идёт восстановление (handling=true), phase=${phase}`);
      return;
    }
    DebugLogger.info('[ATTEMPTS-RESET]', `вход: phase=${phase} hydrated=${String(hydrated)} hydrationTrusted=${String(callbacksRef.current.hydrationTrusted)} hasForfeitFn=${String(Boolean(callbacksRef.current.forfeitSessionRunes))}`);
    handlingRef.current = true;

    const callbacks = callbacksRef.current;
    /**
     * @param burnRunes сжигать ли заработанное за сессию.
     *
     * зачем (аудит 2026-09-03): руны сжигаются как ПЛАТА за восстановление и только когда состояние прочитано достоверно. При
     * недостоверном чтении или технической ошибке попытки всё равно возвращаем — экран обязан ожить, — но заработанное не трогаем.
     */
    const restoreAttemptsNow = async (burnRunes: boolean): Promise<void> => {
      if (!burnRunes) {
        DebugLogger.warn('[ATTEMPTS-RESET]', 'восстановление БЕЗ платы: состояние недостоверно, монеты сессии не сжигаем');
      } else {
        DebugLogger.info('[ATTEMPTS-RESET]', `сжигаем монеты сессии, hasForfeitFn=${String(Boolean(callbacks.forfeitSessionRunes))}`);
      }
      if (burnRunes) await Promise.resolve(callbacks.forfeitSessionRunes?.()).catch((reason) => {
        // The local rune buffer clears before persistence. Restore attempts even
        // if that persistence retry must be completed by the owning rune hook.
        // зачем: запрет немого catch — даже намеренно проглоченная ошибка пишет причину
        DebugLogger.warn('[ATTEMPTS-RESET]', `forfeitSessionRunes отклонён (продолжаем восстановление): ${String(reason)}`);
      });
      if (!mountedRef.current) {
        DebugLogger.warn('[ATTEMPTS-RESET]', 'early return: экран размонтирован до restoreAttempts');
        return;
      }
      callbacks.restoreAttempts();
      callbacks.onRestored?.();
      DebugLogger.info('[ATTEMPTS-RESET]', `итог: попытки восстановлены, экран разблокирован (плата монетами сессии=${String(burnRunes)})`);
    };

    void (async () => {
      try {
        await restoreAttemptsNow(callbacks.hydrationTrusted);
      } catch (error) {
        DebugLogger.error('[ATTEMPTS-RESET]', error instanceof Error ? error : new Error(String(error)), 'warning');
      } finally {
        handlingRef.current = false;
      }
    })();
  }, [hydrated, phase]);
}

export default useSessionAttemptAutoReset;
