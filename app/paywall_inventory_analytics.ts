export type PaywallInventoryStatus =
  | 'ready'
  | 'partial_core'
  | 'no_core_packages'
  | 'load_failed';

interface PackagePresence {
  monthly?: boolean;
  yearly?: boolean;
  lifetime?: boolean;
}

interface InventoryOptions {
  loadSucceeded: boolean;
  lifetimeExpected: boolean;
  loadAttempts: number;
}

export interface PaywallInventoryAnalytics {
  inventory_status: PaywallInventoryStatus;
  monthly_available: 0 | 1;
  yearly_available: 0 | 1;
  lifetime_available: 0 | 1;
  lifetime_expected: 0 | 1;
  load_attempts: 1 | 2;
}

export function claimInitialInventoryResolution(gate: { emitted: boolean }): boolean {
  if (gate.emitted) return false;
  gate.emitted = true;
  return true;
}

const bit = (value: unknown): 0 | 1 => value === true ? 1 : 0;

export function classifyPaywallInventory(
  packages: PackagePresence,
  options: InventoryOptions,
): PaywallInventoryAnalytics {
  const monthly = bit(packages.monthly);
  const yearly = bit(packages.yearly);
  const lifetime = bit(packages.lifetime);
  let status: PaywallInventoryStatus;
  if (!options.loadSucceeded) status = 'load_failed';
  else if (monthly && yearly) status = 'ready';
  else if (monthly || yearly) status = 'partial_core';
  else status = 'no_core_packages';
  return {
    inventory_status: status,
    monthly_available: monthly,
    yearly_available: yearly,
    lifetime_available: lifetime,
    lifetime_expected: bit(options.lifetimeExpected),
    load_attempts: Number(options.loadAttempts) >= 2 ? 2 : 1,
  };
}

export default function __RouteShim() { return null; }
