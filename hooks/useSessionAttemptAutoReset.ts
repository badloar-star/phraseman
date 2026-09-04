import { useCallback, useEffect, useRef, useState } from 'react';

import { DebugLogger } from '../app/debug-logger';
import type { SessionAttemptsPhase } from '../app/session_attempts/session_attempts_domain';

type Input = Readonly<{
  phase: SessionAttemptsPhase;
  /**
   * Gift count is authoritative only after this inventory hydration gate.
   *
   * зачем необязательные: автоспасение подарком подключено пока не на всех
   * девяти экранах-хостах. Экран, который их не передаёт, ведёт себя как
   * раньше (обычное восстановление), а не падает — так фича раскатывается
   * по одному экрану, а не «всё или ничего».
   */
  hydrated?: boolean;
  giftCount?: number;
  /**
   * Достоверен ли `giftCount`.
   *
   * зачем (аудит 2026-09-03): при сбое чтения инвентаря счётчик равен нулю, но
   * это «не знаем», а не «подарка нет». Сжигать за такое «не знаем» руны
   * сессии нельзя — попытки восстанавливаем, заработанное сохраняем.
   * Значение по умолчанию `true` бережёт экраны, которые флаг не передают:
   * их поведение остаётся прежним.
   */
  inventoryTrusted?: boolean;
  /** Atomically consumes one permanent gift and grants all attempts. */
  recoverWithGift?: () => Promise<void>;
  /** Persists clearing unclaimed runes belonging only to this session. */
  forfeitSessionRunes?: () => Promise<void> | void;
  /** Restores the three hearts without a gift or wallet operation. */
  restoreAttempts: () => void;
  /** Re-enables the current card/activity after the state becomes active. */
  onRestored?: () => void;
}>;

export type SessionAttemptAutoResetPresentation = Readonly<{
  giftRescueSequence: number;
  giftRecoveryError: string | null;
  retryGiftRecovery: () => void;
}>;

/**
 * Converts the zero-heart recovery stop into one automatic recovery decision.
 *
 * A hydrated gift is consumed through the durable composite recovery and never
 * touches the session rune buffer. Confirmed absence — and only confirmed
 * absence — pays with the session runes.
 *
 * Экран оживает ВСЕГДА: технический сбой подарка и недостоверный инвентарь
 * возвращают попытки без платы, а причина остаётся в `giftRecoveryError`.
 * Раньше эти две ветки оставляли экран заблокированным (то самое зависание)
 * либо сжигали руны за «подарка нет», которого никто не проверял.
 */
export function useSessionAttemptAutoReset({
  phase,
  // Нет данных о подарках — считаем, что подарка нет: спасение не сработает,
  // но и руны не сгорят молча, экран пойдёт обычным путём восстановления.
  hydrated = false,
  giftCount = 0,
  inventoryTrusted = true,
  recoverWithGift,
  forfeitSessionRunes,
  restoreAttempts,
  onRestored,
}: Input): SessionAttemptAutoResetPresentation {
  const handlingRef = useRef(false);
  const mountedRef = useRef(true);
  const [giftRescueSequence, setGiftRescueSequence] = useState(0);
  const [giftRecoveryError, setGiftRecoveryError] = useState<string | null>(null);
  const [retrySequence, setRetrySequence] = useState(0);
  const callbacksRef = useRef({
    giftCount,
    inventoryTrusted,
    recoverWithGift,
    forfeitSessionRunes,
    restoreAttempts,
    onRestored,
  });
  callbacksRef.current = {
    giftCount,
    inventoryTrusted,
    recoverWithGift,
    forfeitSessionRunes,
    restoreAttempts,
    onRestored,
  };

  useEffect(() => () => { mountedRef.current = false; }, []);

  const retryGiftRecovery = useCallback(() => {
    setGiftRecoveryError(null);
    setRetrySequence((current) => current + 1);
  }, []);

  useEffect(() => {
    // зачем (2026-09-03): КАЖДЫЙ ранний выход обязан назвать причину. Именно
    // немой выход по `hydrated === false` делал экран мёртвым: сердца кончались,
    // блокировщик ввода ложился поверх, а восстановление молча не запускалось.
    if (phase !== 'awaiting_recovery') return;
    if (!hydrated) {
      DebugLogger.warn('[ATTEMPTS-RESET]', `early return: phase=${phase} hydrated=${String(hydrated)} giftCount=${String(giftCount)} — восстановление НЕ запущено, экран останется заблокированным`);
      return;
    }
    if (handlingRef.current) {
      DebugLogger.warn('[ATTEMPTS-RESET]', `early return: уже идёт восстановление (handling=true), phase=${phase}`);
      return;
    }
    DebugLogger.info('[ATTEMPTS-RESET]', `вход: phase=${phase} hydrated=${String(hydrated)} giftCount=${String(giftCount)} hasGiftFn=${String(Boolean(recoverWithGift))} retrySeq=${String(retrySequence)}`);
    handlingRef.current = true;

    const callbacks = callbacksRef.current;
    /**
     * @param burnRunes сжигать ли заработанное за сессию.
     *
     * зачем (аудит 2026-09-03): руны сжигаются как ПЛАТА за восстановление, и
     * брать её можно только когда точно известно, что подарка нет. При
     * недостоверном инвентаре (сбой чтения) или технической ошибке подарка
     * попытки всё равно возвращаем — экран обязан ожить, — но заработанное
     * не трогаем: «не знаем» не равно «подарка нет».
     */
    const restoreAttemptsNow = async (burnRunes: boolean): Promise<void> => {
      if (!burnRunes) {
        DebugLogger.warn('[ATTEMPTS-RESET]', 'восстановление БЕЗ платы: инвентарь недостоверен, руны сессии сохраняем');
      } else {
        DebugLogger.info('[ATTEMPTS-RESET]', `путь без подарка: сжигаем руны сессии, hasForfeitFn=${String(Boolean(callbacks.forfeitSessionRunes))}`);
      }
      if (burnRunes) await Promise.resolve(callbacks.forfeitSessionRunes?.()).catch((reason) => {
        // The local rune buffer clears before persistence. Restore attempts even
        // if that persistence retry must be completed by the owning rune hook.
        // зачем: запрет немого catch — даже намеренно проглоченная ошибка пишет причину.
        DebugLogger.warn('[ATTEMPTS-RESET]', `forfeitSessionRunes отклонён (продолжаем восстановление): ${String(reason)}`);
      });
      if (!mountedRef.current) {
        DebugLogger.warn('[ATTEMPTS-RESET]', 'early return: экран размонтирован до restoreAttempts');
        return;
      }
      callbacks.restoreAttempts();
      callbacks.onRestored?.();
      DebugLogger.info('[ATTEMPTS-RESET]', `итог: попытки восстановлены, экран разблокирован (плата рунами=${String(burnRunes)})`);
    };

    void (async () => {
      try {
        // Спасение подарком возможно, только если экран его подключил:
        // без recoverWithGift идём обычным путём, а не падаем на undefined.
        // Недостоверный инвентарь: подарок не трогаем (его состояние неизвестно),
        // но и руны не сжигаем — просто возвращаем попытки.
        if (!callbacks.inventoryTrusted) {
          DebugLogger.warn('[ATTEMPTS-RESET]', `инвентарь недостоверен (giftCount=${String(callbacks.giftCount)} мог не прочитаться) — восстанавливаем без платы`);
          await restoreAttemptsNow(false);
          return;
        }
        if (callbacks.giftCount > 0 && callbacks.recoverWithGift) {
          DebugLogger.info('[ATTEMPTS-RESET]', `путь с подарком: giftCount=${String(callbacks.giftCount)}`);
          await callbacks.recoverWithGift();
          if (!mountedRef.current) {
            DebugLogger.warn('[ATTEMPTS-RESET]', 'early return: экран размонтирован после подарка');
            return;
          }
          setGiftRecoveryError(null);
          setGiftRescueSequence((current) => current + 1);
          callbacks.onRestored?.();
          DebugLogger.info('[ATTEMPTS-RESET]', 'итог: попытки восстановлены подарком, экран разблокирован');
          return;
        }
        await restoreAttemptsNow(true);
      } catch (error) {
        const code = error instanceof Error
          ? error.message
          : 'session_attempt_recovery_failed';
        if (code === 'attempt_restore_gift_unavailable') {
          DebugLogger.warn('[ATTEMPTS-RESET]', 'подарок недоступен — уходим на путь без подарка (с платой)');
          await restoreAttemptsNow(true);
        } else if (mountedRef.current) {
          /*
           * зачем (аудит 2026-09-03): раньше здесь экран ОСТАВАЛСЯ заблокирован
           * до явного повтора — то есть техническая ошибка подарка давала ровно
           * то зависание, ради которого всё и чинилось. Теперь попытки
           * возвращаем всегда, но БЕЗ платы рунами: подарок мог не потратиться,
           * и брать за него плату нечестно. Причина остаётся в giftRecoveryError.
           */
          DebugLogger.error('[ATTEMPTS-RESET]', `подарок не сработал (${code}) — восстанавливаем без платы, экран не оставляем мёртвым`, 'critical');
          setGiftRecoveryError(code);
          await restoreAttemptsNow(false);
        } else {
          DebugLogger.warn('[ATTEMPTS-RESET]', `ошибка на мёртвом экране: ${code}`);
        }
      } finally {
        handlingRef.current = false;
      }
    })();

  }, [hydrated, phase, retrySequence]);

  return {
    giftRescueSequence,
    giftRecoveryError,
    retryGiftRecovery,
  };
}

export default useSessionAttemptAutoReset;
