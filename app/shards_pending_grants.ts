/**
 * Pending shard grants — резерв на случай долгого/упавшего вебхука RevenueCat.
 *
 * Контекст: при покупке осколков `shards_shop.tsx` сразу после успешного
 * `Purchases.purchasePackage` запускает `waitForServerShardGrant`, который 8 раз
 * с интервалом ~2.5с опрашивает облако (~18.7с в сумме). Если за это время
 * вебхук RevenueCat ещё не успел записать осколки в Firestore (или упал и был
 * переотправлен позже), функция молча возвращает старый баланс — пользователь
 * видит «оплата принята, осколки придут через пару минут», но никакой
 * автоматической дозагрузки нет. После закрытия экрана грант теряется из UI.
 *
 * Этот модуль:
 *  - сохраняет ожидаемые начисления в AsyncStorage перед опросом;
 *  - удаляет запись, когда баланс облака приходит в ожидаемое состояние;
 *  - предоставляет `resumePendingShardGrants` для вызова при возврате на экран —
 *    делает контрольный опрос облака и снимает закрытые записи, эмитит уведомление
 *    «осколки начислены» через events.ts; устаревшие (старше TTL) пишет в лог и
 *    снимает, чтобы не висели вечно.
 *
 * Pending хранится локально per-устройство; идемпотентность сервера обеспечивает
 * сам вебхук (`revenuecat_shard_transactions/{transactionId}` существует один раз).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withStorageLock } from './storage_mutex';
import { getShardsBalance, loadShardsFromCloud, getShardAchievementEligibleBalance } from './shards_system';
import { emitAppEvent } from './events';
import { BRAND_SHARDS_ES } from '../constants/terms_es';
import { DebugLogger } from './debug-logger';

const STORAGE_KEY = 'pending_shard_grants_v1';
const PENDING_TTL_MS = 24 * 60 * 60 * 1000; // 24ч: после этого вебхук точно либо пришёл, либо потерян безвозвратно.

export interface PendingShardGrant {
  /** RC product_id (для логов/телеметрии). */
  productId: string;
  /** RC transaction_id или fallback из самого вызова. Источник идемпотентности. */
  transactionId: string;
  /** Сколько осколков ожидаем получить (то, что обещал каталог). */
  expectedShards: number;
  /** Локальный баланс перед покупкой (для расчёта «дошло ли начисление»). */
  beforeBalance: number;
  /** Когда запись создана (ms epoch). */
  createdAtMs: number;
}

async function readPendingRaw(): Promise<PendingShardGrant[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Жёсткая фильтрация по форме: чужие/битые записи отбрасываем без падения.
    return parsed.filter((p): p is PendingShardGrant => {
      if (!p || typeof p !== 'object') return false;
      const r = p as Record<string, unknown>;
      return (
        typeof r.productId === 'string'
        && typeof r.transactionId === 'string'
        && typeof r.expectedShards === 'number'
        && typeof r.beforeBalance === 'number'
        && typeof r.createdAtMs === 'number'
      );
    });
  } catch {
    return [];
  }
}

async function writePending(list: PendingShardGrant[]): Promise<void> {
  if (list.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
}

/** Записать ожидаемое начисление. Вызывать СРАЗУ после Purchases.purchasePackage. */
export async function recordPendingShardGrant(grant: PendingShardGrant): Promise<void> {
  await withStorageLock(async () => {
    const list = await readPendingRaw();
    // Дедуп по transactionId (повторный запуск той же покупки не должен плодить).
    const filtered = list.filter((g) => g.transactionId !== grant.transactionId);
    filtered.push(grant);
    await writePending(filtered);
  });
}

/** Снять закрытую запись (баланс пришёл к ожидаемому). */
export async function clearPendingShardGrant(transactionId: string): Promise<void> {
  await withStorageLock(async () => {
    const list = await readPendingRaw();
    const filtered = list.filter((g) => g.transactionId !== transactionId);
    if (filtered.length !== list.length) await writePending(filtered);
  });
}

/** Прочитать текущий список (для UI/диагностики). */
export async function listPendingShardGrants(): Promise<PendingShardGrant[]> {
  return readPendingRaw();
}

/**
 * Дотянуть pending-grant: спросить облако, для каждой записи проверить, дошёл ли
 * баланс до ожидаемого. Дошёл — снимаем + эмитим toast/balance_updated; устарела
 * (старше TTL) — снимаем и логируем (вебхук потерян, нужна ручная проверка).
 *
 * Вызывать при монтировании экрана баланса (`shards_shop`, home), при возврате из
 * фона на active, после успешного `loadShardsFromCloud()` в других местах.
 *
 * Идемпотентно: повторный вызов не задвоит начисление (мы только проверяем
 * фактический баланс из Firestore, ничего сами не пишем).
 */
export async function resumePendingShardGrants(): Promise<{ resolved: number; stillPending: number; expired: number }> {
  const list = await readPendingRaw();
  if (list.length === 0) return { resolved: 0, stillPending: 0, expired: 0 };

  try {
    await loadShardsFromCloud();
  } catch (e) {
    DebugLogger.error('shards_pending_grants:loadShardsFromCloud', e, 'warning');
    return { resolved: 0, stillPending: list.length, expired: 0 };
  }

  const cloudBalance = await getShardsBalance().catch(() => 0);
  const now = Date.now();
  const remaining: PendingShardGrant[] = [];
  let resolved = 0;
  let expired = 0;

  for (const grant of list) {
    const expectedAfter = grant.beforeBalance + grant.expectedShards;
    if (cloudBalance >= expectedAfter) {
      resolved += 1;
      emitAppEvent('shards_balance_updated', {
        balance: cloudBalance,
        op: 'earn',
        reason: 'shards_store_purchase',
        eligibleAchievementBalance: await getShardAchievementEligibleBalance(cloudBalance).catch(() => cloudBalance),
      });
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: `Готово: +${grant.expectedShards} осколков`,
        messageUk: `Готово: +${grant.expectedShards} уламків`,
        messageEs: `Listo: +${grant.expectedShards} ${BRAND_SHARDS_ES.toLowerCase()}`,
        messagePtBr: `Pronto: +${grant.expectedShards} fragmentos`,
        messageVi: `Xong: +${grant.expectedShards} mảnh`,
        messageId: `Selesai: +${grant.expectedShards} shard`,
        messageTr: `Tamam: +${grant.expectedShards} parça`,
        messagePl: `Gotowe: +${grant.expectedShards} odłamków`,
      });
      continue;
    }
    if (now - grant.createdAtMs > PENDING_TTL_MS) {
      expired += 1;
      DebugLogger.error(
        'shards_pending_grants:expired',
        new Error(
          `productId=${grant.productId} tx=${grant.transactionId} expected=${grant.expectedShards} before=${grant.beforeBalance} cloudNow=${cloudBalance} ageMs=${now - grant.createdAtMs}`,
        ),
        'critical',
      );
      continue;
    }
    remaining.push(grant);
  }

  if (remaining.length !== list.length) {
    await withStorageLock(() => writePending(remaining));
  }

  return { resolved, stillPending: remaining.length, expired };
}

export const __testOnly = { STORAGE_KEY, PENDING_TTL_MS };

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
