// use_peak_tour_gate.ts — решает, показывать ли тур Пика: включено + есть аккаунт + ещё не показывали на этом аккаунте.
// зачем: экран Пика сам ничего не знает про хранилище; хук отдаёт visible и finish() (скрыть сразу, отметить фоном — Optimistic UI).
import { useCallback, useEffect, useState } from 'react';
import { useActiveAccountOwner } from '../../../hooks/use_active_account_owner';
import { markPeakTourSeen, peekPeakTourSeen, readPeakTourSeen } from './peak_tour_store';

export function usePeakTourGate(enabled: boolean): Readonly<{ visible: boolean; finish: () => void }> {
  const owner = useActiveAccountOwner();
  const [seen, setSeen] = useState<boolean | null>(() => (owner ? peekPeakTourSeen(owner) : null));
  useEffect(() => {
    if (!enabled || !owner) { setSeen(null); return undefined; }
    const known = peekPeakTourSeen(owner);
    if (known !== null) { setSeen(known); return undefined; }
    let alive = true;
    void readPeakTourSeen(owner).then((value) => { if (alive) setSeen(value); });
    return () => { alive = false; };
  }, [enabled, owner]);
  const finish = useCallback(() => {
    setSeen(true); // зачем: окно закрывается в тот же кадр
    if (owner) markPeakTourSeen(owner);
  }, [owner]);
  return { visible: enabled && owner !== null && seen === false, finish };
}
