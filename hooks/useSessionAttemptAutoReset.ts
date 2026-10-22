import { useEffect, useRef } from 'react';

import { DebugLogger } from '../app/debug-logger';
import type { SessionAttemptsPhase } from '../app/session_attempts/session_attempts_domain';
import { isAttemptsInputBlocked } from '../app/session_attempts/session_attempts_stop';

/** Сколько ждём обычное восстановление попыток, прежде чем страховка снимет блокировку ввода сама. */
export const INPUT_LOCK_WATCHDOG_MS = 8000;

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

  const hydratedRef = useRef(hydrated);
  hydratedRef.current = hydrated;
  /** Номер текущей блокировки и номер уже снятой: страховка и обычный путь не восстанавливают одну блокировку дважды. */
  const lockSeqRef = useRef(0);
  const resolvedLockSeqRef = useRef(0);

  // зачем (аудит кнопок 22.10, A1: «если фаза застрянет, экран мёртв»): карточки и занятие кладут поверх экрана
  // блокировщик ввода, пока фаза не active. Обычный путь снятия — восстановление ниже; если оно не завершилось (чтение
  // состояния не пришло, сжигание монет повисло), экран оставался мёртвым без единой строки в журнале. Теперь каждая
  // блокировка пишется [INPUT-LOCK], а «ждём восстановления» дольше INPUT_LOCK_WATCHDOG_MS снимается само — без платы.
  // Остановку без энергии не снимаем: у неё своё окно с выходом, правило энергии не обходим — только журнал.
  // Эффект объявлен ДО эффекта восстановления: номер блокировки должен вырасти раньше, чем обычный путь его прочитает.
  useEffect(() => {
    if (!isAttemptsInputBlocked(phase)) return undefined;
    lockSeqRef.current += 1;
    const seq = lockSeqRef.current;
    const startedAt = Date.now();
    DebugLogger.info('[INPUT-LOCK]', `ввод заблокирован: phase=${phase} lock=${seq} hydrated=${String(hydratedRef.current)} handling=${String(handlingRef.current)}`);
    const timer = setTimeout(() => {
      const context = `phase=${phase} lock=${seq} hydrated=${String(hydratedRef.current)} handling=${String(handlingRef.current)} trusted=${String(callbacksRef.current.hydrationTrusted)}`;
      if (phase !== 'awaiting_recovery') {
        DebugLogger.warn('[INPUT-LOCK]', `блокировка держится ${INPUT_LOCK_WATCHDOG_MS} мс; ${context} — выход через окно остановки, энергию не обходим`);
        return;
      }
      if (!mountedRef.current || resolvedLockSeqRef.current === seq) {
        DebugLogger.info('[INPUT-LOCK]', `страховка не нужна: mounted=${String(mountedRef.current)} resolved=${resolvedLockSeqRef.current}; ${context}`);
        return;
      }
      resolvedLockSeqRef.current = seq;
      DebugLogger.warn('[INPUT-LOCK]', `страховка: восстановление не завершилось за ${INPUT_LOCK_WATCHDOG_MS} мс — возвращаем попытки без платы; ${context}`);
      callbacksRef.current.restoreAttempts();
      callbacksRef.current.onRestored?.();
    }, INPUT_LOCK_WATCHDOG_MS);
    return () => {
      clearTimeout(timer);
      DebugLogger.info('[INPUT-LOCK]', `блокировка снята или экран закрыт: phase было ${phase} lock=${seq} держалась ${Date.now() - startedAt} мс mounted=${String(mountedRef.current)}`);
    };
  }, [phase]);

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
    const lockSeq = lockSeqRef.current;
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
      if (resolvedLockSeqRef.current === lockSeq) {
        DebugLogger.warn('[ATTEMPTS-RESET]', `early return: блокировку lock=${lockSeq} уже сняла страховка [INPUT-LOCK] — второй раз вопрос не открываем`);
        return;
      }
      resolvedLockSeqRef.current = lockSeq;
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
