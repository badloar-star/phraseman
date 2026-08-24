import AsyncStorage from '@react-native-async-storage/async-storage';

export const phoneStateRecoveryCopyRu = 'Освобождаем место и восстанавливаем сохранение…';

export type PhoneStateDurabilityRecoverySnapshot = Readonly<{
  visible: boolean;
  automaticRetry: true;
  failedAttempts: number;
}>;

export type PhoneStateDurabilityRecovery = Readonly<{
  commit(action: () => Promise<void>): Promise<boolean>;
  retryPending(): Promise<boolean>;
  getSnapshot(): PhoneStateDurabilityRecoverySnapshot;
  subscribe(listener: () => void): () => void;
}>;

type RecoveryDependencies = Readonly<{
  cleanupReproducibleCaches(): Promise<void>;
}>;

const INITIAL_SNAPSHOT: PhoneStateDurabilityRecoverySnapshot = Object.freeze({
  visible: false,
  automaticRetry: true,
  failedAttempts: 0,
});

export function createPhoneStateDurabilityRecovery(
  dependencies: RecoveryDependencies,
): PhoneStateDurabilityRecovery {
  let snapshot = INITIAL_SNAPSHOT;
  let pendingAction: (() => Promise<void>) | null = null;
  let retryInFlight: Promise<boolean> | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: PhoneStateDurabilityRecoverySnapshot): void => {
    snapshot = Object.freeze(next);
    for (const listener of listeners) listener();
  };

  const retryPending = async (): Promise<boolean> => {
    if (retryInFlight) return retryInFlight;
    const action = pendingAction;
    if (!action) return true;
    retryInFlight = (async () => {
      try {
        await action();
        pendingAction = null;
        publish(INITIAL_SNAPSHOT);
        return true;
      } catch {
        publish({
          visible: true,
          automaticRetry: true,
          failedAttempts: snapshot.failedAttempts + 1,
        });
        return false;
      } finally {
        retryInFlight = null;
      }
    })();
    return retryInFlight;
  };

  const commit = async (action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch {
      try { await dependencies.cleanupReproducibleCaches(); } catch { /* retry still proceeds */ }
      try {
        await action();
        return true;
      } catch {
        pendingAction = action;
        publish({ visible: true, automaticRetry: true, failedAttempts: 2 });
        return false;
      }
    }
  };

  return Object.freeze({
    commit,
    retryPending,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

const REPRODUCIBLE_CACHE_KEYS = Object.freeze([
  'global_lb_cache_v4',
  'top_helpers_snapshot_v2',
  'friend_profiles_cache_v1',
  'friends_tab_swr_v1',
  'leaderboard_stats_cache_v2',
  'cosmetic_asset_catalog_cache_v1',
]);

export const phoneStateDurabilityRecovery = createPhoneStateDurabilityRecovery({
  cleanupReproducibleCaches: () => AsyncStorage.multiRemove([...REPRODUCIBLE_CACHE_KEYS]),
});

export function commitPhoneStateDurableAction(action: () => Promise<void>): Promise<boolean> {
  return phoneStateDurabilityRecovery.commit(action);
}
