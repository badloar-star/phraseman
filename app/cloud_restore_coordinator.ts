import type { CloudRestoreResult } from './cloud_sync';

export type BootCloudRestoreOutcome = {
  status: CloudRestoreResult;
  hasLocalAccountData: boolean;
  shouldSync: boolean;
};

type BootCloudRestoreDependencies = {
  restore: () => Promise<CloudRestoreResult>;
  hasLocalAccountData: () => Promise<boolean>;
  onHydrated: () => void;
};

export function createBootCloudRestoreCoordinator(deps: BootCloudRestoreDependencies) {
  let inFlight: Promise<BootCloudRestoreOutcome> | null = null;
  let hydrationEmitted = false;

  const run = (): Promise<BootCloudRestoreOutcome> => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      let status: CloudRestoreResult = 'failed';
      try {
        status = await deps.restore();
      } catch {
        status = 'failed';
      }
      const hasLocalAccountData = await deps.hasLocalAccountData().catch(() => false);
      if (status === 'restored' && !hydrationEmitted) {
        hydrationEmitted = true;
        try { deps.onHydrated(); } catch { /* hydration notification is best-effort */ }
      }
      return {
        status,
        hasLocalAccountData,
        shouldSync: status !== 'failed' && hasLocalAccountData,
      };
    })();
    return inFlight;
  };

  return { run };
}
