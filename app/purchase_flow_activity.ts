/*
 * Метка «идёт операция магазина» (покупка / восстановление) — только память процесса.
 *
 * зачем (AA S2d раунд 3, §135): фоновая проверка переноса Plus (plus_transfer.ts)
 * зовёт Purchases.syncPurchasesForResult. Параллельно с открытым потоком покупки
 * (paywall, «Управление подпиской») она бы спорила с ним за CustomerInfo и состояние
 * магазина. Пока метка стоит, проверку откладываем до следующего повода (старт,
 * возврат из фона) — попытка не тратится, Plus держится.
 * Каждый поток — своя запись: потоки могут перекрываться; закрытие идемпотентно.
 *
 * зачем (раунд 4, L-R3-6): зависший вызов стора (обещание, которое не завершается)
 * держал метку до перезапуска и блокировал перенос Plus. У метки есть потолок жизни
 * PURCHASE_FLOW_MAX_AGE_MS: по истечении она снимается с логом.
 */
import { identityTrace } from './identity_trace';

// зачем (ревью раунда 4, LOW-3): «Спросить разрешения» в семейном доступе и долгое
// подтверждение банка длятся дольше 10 мин — потолок 30 мин не снимает метку живой покупки.
export const PURCHASE_FLOW_MAX_AGE_MS = 30 * 60 * 1000;

export type PurchaseFlowSource =
  | 'paywall_purchase'
  | 'paywall_restore'
  | 'manage_subscription_upgrade'
  | 'manage_subscription_restore';

type ActiveFlow = Readonly<{ source: PurchaseFlowSource; startedAt: number }>;

const activeFlows = new Map<number, ActiveFlow>();
let nextFlowId = 1;

export function beginPurchaseFlow(source: PurchaseFlowSource): () => void {
  const id = nextFlowId;
  nextFlowId += 1;
  activeFlows.set(id, { source, startedAt: Date.now() });
  return () => {
    activeFlows.delete(id);
  };
}

function expireStaleFlows(now: number): void {
  for (const [id, flow] of activeFlows) {
    const ageMs = now - flow.startedAt;
    if (ageMs <= PURCHASE_FLOW_MAX_AGE_MS) continue;
    activeFlows.delete(id); // guard-ok: Map в памяти, не хранилище
    identityTrace('[PLUS-TRANSFER]', 'purchase_flow expired', { source: flow.source, ageMs }, { persist: true });
  }
}

export function isPurchaseFlowActive(): boolean {
  expireStaleFlows(Date.now());
  return activeFlows.size > 0;
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
