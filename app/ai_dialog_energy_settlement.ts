import { useEffect, useRef, type MutableRefObject } from 'react';

import type { EnergyStartResult } from '../components/energy_start_confirmation';

export type DialogEnergyStartResult = EnergyStartResult;

/** A component-instance lifetime guard: dependency churn must not mark a live session stale. */
export function useMountedInstanceRef(): MutableRefObject<boolean> {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return mounted;
}

export function settleDialogEnergyStart(input: {
  result: DialogEnergyStartResult;
  mounted: boolean;
  acknowledge(): void;
  navigateBack(): void;
  showNoEnergy(): void;
}): void {
  // The spend is already durable. A remount must not leave an orphan debit.
  if (input.result === 'spent') input.acknowledge();
  if (!input.mounted) return;
  if (input.result === 'insufficient') input.showNoEnergy();
  if (input.result === 'cancelled') input.navigateBack();
}
