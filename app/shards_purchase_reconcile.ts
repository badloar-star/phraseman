import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import {
  getShardsBalance,
  loadShardsFromCloud,
  resumePendingShardDeltas,
} from './shards_system';

const SHARD_PURCHASE_RECONCILE_TIMEOUT_MS = 7_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('shard_purchase_reconcile_timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Before buying a card pack with pearls, replay legitimate pending wallet
 * deltas and refresh the authoritative cloud balance. The server-side spend
 * remains the final authority; this helper only closes the UI/cloud drift
 * window that can otherwise produce a false `insufficient` result.
 */
export async function reconcileShardsBeforePurchase(): Promise<number> {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  const isCurrent = (): boolean => Boolean(
    ownerStableId && isCurrentAccountGeneration(accountToken, ownerStableId),
  );

  if (!isCurrent()) return getShardsBalance().catch(() => 0);

  try {
    await withTimeout(
      resumePendingShardDeltas(),
      SHARD_PURCHASE_RECONCILE_TIMEOUT_MS,
    );
  } catch {
    // Best effort. The spend operation still verifies the server wallet.
  }
  if (!isCurrent()) return 0;

  try {
    await withTimeout(
      loadShardsFromCloud(isCurrent),
      SHARD_PURCHASE_RECONCILE_TIMEOUT_MS,
    );
  } catch {
    // A temporary cloud read must not leave the purchase button spinning.
  }
  if (!isCurrent()) return 0;

  return getShardsBalance().catch(() => 0);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __ShardsPurchaseReconcileRouteShim() { return null; }
