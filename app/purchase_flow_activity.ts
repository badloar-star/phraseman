/*
 * Метка «идёт операция магазина» (покупка / восстановление) — только память процесса.
 *
 * зачем (AA S2d раунд 3, §135): фоновая проверка переноса Plus (plus_transfer.ts)
 * зовёт Purchases.syncPurchasesForResult. Параллельно с открытым потоком покупки
 * (paywall, «Управление подпиской») она бы спорила с ним за CustomerInfo и состояние
 * магазина. Пока метка стоит, проверку откладываем до следующего повода (старт,
 * возврат из фона) — попытка не тратится, Plus держится.
 * Счётчик, а не флаг: потоки могут перекрываться; закрытие идемпотентно.
 */
let activeFlows = 0;

export type PurchaseFlowSource =
  | 'paywall_purchase'
  | 'paywall_restore'
  | 'manage_subscription_upgrade'
  | 'manage_subscription_restore';

export function beginPurchaseFlow(source: PurchaseFlowSource): () => void {
  void source;
  activeFlows += 1;
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    activeFlows = Math.max(0, activeFlows - 1);
  };
}

export function isPurchaseFlowActive(): boolean {
  return activeFlows > 0;
}

/** Обёртка вызова магазина: метка снимается и при ошибке/отмене покупки. */
export async function withPurchaseFlow<T>(source: PurchaseFlowSource, operation: () => Promise<T>): Promise<T> {
  const end = beginPurchaseFlow(source);
  try {
    return await operation();
  } finally {
    end();
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
