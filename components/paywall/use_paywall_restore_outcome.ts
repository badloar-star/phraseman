import { useEffect, useRef, useState } from 'react';
import { onAppEvent } from '../../app/events';

type RestoreOutcome = 'idle' | 'busy' | 'restored' | 'not_found';

const LOG = '[PAYWALL-SERVER-REFUSED]';

/** Исход восстановления: идёт → (вернулся | не нашли). Событие активации приходит до конца восстановления. */
export function useRestoreOutcome(restoring: boolean, enabled = true): RestoreOutcome {
  const [outcome, setOutcome] = useState<RestoreOutcome>('idle');
  const wasRestoringRef = useRef(false);
  const activatedRef = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const subscription = onAppEvent('premium_activated', () => {
      activatedRef.current = true;
      setOutcome('restored');
      console.log(`${LOG} restore:activated`); // guard-ok: одна строка на возврат Plus
    });
    return () => subscription.remove();
  }, [enabled]);
  useEffect(() => {
    if (restoring) {
      wasRestoringRef.current = true;
      activatedRef.current = false;
      setOutcome('busy');
      return;
    }
    if (!wasRestoringRef.current) return;
    wasRestoringRef.current = false;
    const next: RestoreOutcome = activatedRef.current ? 'restored' : 'not_found';
    console.log(`${LOG} restore:finished`, JSON.stringify({ outcome: next })); // guard-ok: одна строка на конец восстановления
    setOutcome(next);
  }, [restoring]);
  return outcome;
}

