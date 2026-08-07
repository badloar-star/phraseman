import { actionToastTri, emitAppEvent } from './events';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { getShardsBalance, resumePendingShardDeltas } from './shards_system';

const SHARD_PURCHASE_RECONCILE_WAIT_MS = 7_000;

export type ShardPurchaseReconcileResult = Readonly<{
  status: 'ready' | 'sync_pending' | 'stale';
  balance: number;
  pending: number;
}>;

async function readCurrentBalance(): Promise<number> {
  return getShardsBalance().catch(() => 0);
}

/**
 * Перед серверной покупкой проигрывает законные pending earn/spend операции.
 *
 * Один общий deadline относится только к replay. Если он истёк, новую wallet-
 * операцию не запускаем: сам replay продолжит работу в своём account-scoped
 * in-flight promise, а пользователь сможет безопасно повторить попытку.
 */
export async function reconcileShardsBeforePurchase(): Promise<ShardPurchaseReconcileResult> {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  const isCurrent = (): boolean => Boolean(
    ownerStableId && isCurrentAccountGeneration(accountToken, ownerStableId),
  );

  if (!isCurrent()) {
    return { status: 'stale', balance: await readCurrentBalance(), pending: 0 };
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<{ kind: 'timeout' }>((resolve) => {
    timeoutHandle = setTimeout(
      () => resolve({ kind: 'timeout' }),
      SHARD_PURCHASE_RECONCILE_WAIT_MS,
    );
  });
  const replay = resumePendingShardDeltas().then((result) => ({
    kind: 'replay' as const,
    result,
  }));

  const outcome = await Promise.race([replay, timeout]);
  if (timeoutHandle) clearTimeout(timeoutHandle);

  if (!isCurrent()) {
    return { status: 'stale', balance: 0, pending: 0 };
  }
  const balance = await readCurrentBalance();
  if (!isCurrent()) {
    return { status: 'stale', balance: 0, pending: 0 };
  }
  if (outcome.kind === 'timeout') {
    return { status: 'sync_pending', balance, pending: -1 };
  }
  if (outcome.result.pending > 0) {
    return { status: 'sync_pending', balance, pending: outcome.result.pending };
  }
  return { status: 'ready', balance, pending: 0 };
}

export function emitShardPurchaseSyncPendingToast(): void {
  emitAppEvent('action_toast', actionToastTri('info', {
    ru: 'Баланс жемчуга ещё синхронизируется. Повтори покупку через несколько секунд.',
    uk: 'Баланс перлин ще синхронізується. Повтори покупку за кілька секунд.',
    es: 'El saldo de perlas aún se está sincronizando. Inténtalo de nuevo en unos segundos.',
    'pt-BR': 'O saldo de pérolas ainda está sincronizando. Tente novamente em alguns segundos.',
    vi: 'Số dư ngọc trai vẫn đang đồng bộ. Hãy thử lại sau vài giây.',
    id: 'Saldo mutiara masih disinkronkan. Coba lagi dalam beberapa detik.',
    tr: 'İnci bakiyesi hâlâ eşitleniyor. Birkaç saniye sonra tekrar dene.',
    pl: 'Saldo pereł nadal się synchronizuje. Spróbuj ponownie za kilka sekund.',
  }));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __ShardsPurchaseReconcileRouteShim() { return null; }
