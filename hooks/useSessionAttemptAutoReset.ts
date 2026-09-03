import { useCallback, useEffect, useRef, useState } from 'react';

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
 * touches the session rune buffer. Confirmed absence keeps the local
 * rune-forfeit retry. Technical gift errors stay fail-closed until explicit
 * retry, so they cannot masquerade as a missing gift and destroy earned runes.
 */
export function useSessionAttemptAutoReset({
  phase,
  // Нет данных о подарках — считаем, что подарка нет: спасение не сработает,
  // но и руны не сгорят молча, экран пойдёт обычным путём восстановления.
  hydrated = false,
  giftCount = 0,
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
    recoverWithGift,
    forfeitSessionRunes,
    restoreAttempts,
    onRestored,
  });
  callbacksRef.current = {
    giftCount,
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
    if (phase !== 'awaiting_recovery' || !hydrated || handlingRef.current) return;
    handlingRef.current = true;

    const callbacks = callbacksRef.current;
    const restoreWithoutGift = async (): Promise<void> => {
      await Promise.resolve(callbacks.forfeitSessionRunes?.()).catch(() => {
        // The local rune buffer clears before persistence. Restore attempts even
        // if that persistence retry must be completed by the owning rune hook.
      });
      if (!mountedRef.current) return;
      callbacks.restoreAttempts();
      callbacks.onRestored?.();
    };

    void (async () => {
      try {
        // Спасение подарком возможно, только если экран его подключил:
        // без recoverWithGift идём обычным путём, а не падаем на undefined.
        if (callbacks.giftCount > 0 && callbacks.recoverWithGift) {
          await callbacks.recoverWithGift();
          if (!mountedRef.current) return;
          setGiftRecoveryError(null);
          setGiftRescueSequence((current) => current + 1);
          callbacks.onRestored?.();
          return;
        }
        await restoreWithoutGift();
      } catch (error) {
        const code = error instanceof Error
          ? error.message
          : 'session_attempt_recovery_failed';
        if (code === 'attempt_restore_gift_unavailable') {
          await restoreWithoutGift();
        } else if (mountedRef.current) {
          setGiftRecoveryError(code);
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
