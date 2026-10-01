// ════════════════════════════════════════════════════════════════════════════
// shards_system.ts — остаток удалённой валюты «жемчуг» (осколки).
//
// зачем (PM-289, D70/D78/D84): жемчуг удалён у пользователей вместе с остатками и
// без компенсации. Начисления, траты, разовые награды, серия 7/30, прогрев памяти,
// повтор дельт на сервер и легаси-загрузка из облака УДАЛЕНЫ (этап 2).
//
// Здесь осталось ровно то, что ещё вызывают:
// - getShardsBalance — обнуление остатка (pearl_retire_d70, его зовёт _layout);
// - loadShardsFromCloud / forceSyncShardsToCloud / preparePendingShardDeltasForAccountSwitch —
//   вход и выход из аккаунта в app/auth_provider.ts (файл правит другая сессия;
//   снимаются на этапе 3 вместе с pearl_retire_d70, см. PM-289 в реестре).
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import { getCanonicalUserId } from './user_id_policy';
import { readShardDeltaQueue, removeShardDeltas } from './shards_delta_queue';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import {
  hasClientShardLedgerState,
  initializeClientShardLedgerOpeningBalance,
  recoverPreparedClientShardOperation,
} from './economy/client_shard_operation_ledger';

const LOG = '[PEARL-CORE]';
const STORAGE_KEY = 'shards_balance';

const parseShardBalance = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
};

// ── Получить баланс (проекция журнала на устройстве) ──────────────────────
export const getShardsBalance = async (): Promise<number> => {
  const accountToken = captureAccountGeneration();
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
      console.warn(`${LOG} getBalance:exit account_changed`);
      return 0;
    }
    return parseShardBalance(val) ?? 0;
  } catch (e) {
    DebugLogger.error('shards_system:getShardsBalance', e instanceof Error ? e : new Error(String(e)), 'warning');
    return 0;
  }
};

/**
 * Поставить журнал жемчуга в очередь синхронизации PhoneState. Без чтений/записей
 * Firestore — только планирование. Best-effort: ошибка не пробрасывается.
 */
export const forceSyncShardsToCloud = async (): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const { syncClientShardOperationJournalToCloud } = await import(
      './economy/client_shard_operation_sync'
    );
    await syncClientShardOperationJournalToCloud();
  } catch (e) {
    DebugLogger.error('shards_system:forceSyncShardsToCloud', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
};

// ── Старая офлайн-очередь дельт ────────────────────────────────────────────
// Строки очереди уже применены локально (конституция экономики, 2026-08-15):
// их снимают без сервера. Новых строк больше не появляется — начисления и траты
// жемчуга удалены. Нужна только перед выходом из аккаунта (auth_provider).
const scopedShardReplayInFlight = new Map<
  string,
  Promise<{ resolved: number; pending: number }>
>();

export const resumePendingShardDeltas = async (): Promise<{ resolved: number; pending: number }> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  if (
    IS_EXPO_GO
    || !CLOUD_SYNC_ENABLED
    || !ownerStableId
    || !isCurrentAccountGeneration(accountToken, ownerStableId)
  ) {
    return { resolved: 0, pending: 0 };
  }
  const replayKey = `${accountToken.generation}:${ownerStableId}`;
  const existing = scopedShardReplayInFlight.get(replayKey);
  if (existing) return existing;
  const isCurrent = (): boolean => isCurrentAccountGeneration(accountToken, ownerStableId);

  const replay = (async (): Promise<{ resolved: number; pending: number }> => {
    let queueLength = 0;
    try {
      const queue = await readShardDeltaQueue(ownerStableId);
      queueLength = queue.length;
      if (!isCurrent()) return { resolved: 0, pending: queue.length };
      if (queue.length === 0) return { resolved: 0, pending: 0 };
      const removed = await removeShardDeltas(ownerStableId, queue.map((entry) => entry.opId));
      if (!removed) console.warn(`${LOG} resumeDeltas:remove_failed rows=${queue.length}`);
      return removed
        ? { resolved: queue.length, pending: 0 }
        : { resolved: 0, pending: queue.length };
    } catch (error) {
      DebugLogger.error('shards_system.ts:resumePendingShardDeltas', error, 'warning');
      return { resolved: 0, pending: queueLength };
    } finally {
      scopedShardReplayInFlight.delete(replayKey);
    }
  })();
  scopedShardReplayInFlight.set(replayKey, replay);
  return replay;
};

export const preparePendingShardDeltasForAccountSwitch = async (): Promise<{
  resolved: number;
  pending: number;
  pendingEarn: number;
  pendingSpend: number;
  ownerStableId: string | null;
  stale: boolean;
}> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  if (!ownerStableId || !isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: 0,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  const replay = await resumePendingShardDeltas();
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: replay.pending,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  const remaining = await readShardDeltaQueue(ownerStableId);
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: remaining.length,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  return {
    resolved: replay.resolved,
    pending: remaining.length,
    pendingEarn: remaining.filter((entry) => entry.type === 'earn').length,
    pendingSpend: remaining.filter((entry) => entry.type === 'spend').length,
    ownerStableId,
    stale: false,
  };
};

const scheduleJournalSync = (): void => {
  void import('./economy/client_shard_operation_sync')
    .then(({ syncClientShardOperationJournalToCloud }) => syncClientShardOperationJournalToCloud())
    .catch((e: unknown) => {
      DebugLogger.error('shards_system:scheduleJournalSync', e instanceof Error ? e : new Error(String(e)), 'warning');
    });
};

/**
 * Открыть журнал жемчуга при входе (его затем обнуляет pearl_retire_d70).
 *
 * Остаётся, пока auth_provider зовёт его на входе (этап 3 PM-289). Легаси-ветка
 * «облако новее локали» была мёртвой с 2026-08-15 (конституция экономики всегда
 * включена) и удалена.
 */
export const loadShardsFromCloud = async (isCallerCurrent: () => boolean = () => true): Promise<void> => {
  const accountToken = captureAccountGeneration();
  let expectedOwnerStableId = '';
  const isCurrent = (): boolean => isCallerCurrent()
    && (!expectedOwnerStableId
      || (accountToken.stableId === expectedOwnerStableId
        && isCurrentAccountGeneration(accountToken, expectedOwnerStableId)));
  try {
    const uid = await getCanonicalUserId();
    expectedOwnerStableId = String(uid ?? '').trim();
    if (!isCurrent()) { console.warn(`${LOG} load:exit stale_after_uid`); return; }
    if (!uid) { console.warn(`${LOG} load:exit no_uid`); return; }
    const recovered = await recoverPreparedClientShardOperation();
    if (!isCurrent() || recovered?.status === 'failed') {
      console.warn(`${LOG} load:exit after_recover stale=${String(!isCurrent())} status=${String(recovered?.status)}`);
      return;
    }
    if (await hasClientShardLedgerState(uid)) {
      // Журнал уже открыт: облако — только хранилище, ничего не перезаписываем.
      if (!isCurrent()) return;
      scheduleJournalSync();
      return;
    }
    let openingOverride: number | undefined;
    if (!IS_EXPO_GO && CLOUD_SYNC_ENABLED) {
      const db = firestore();
      const [legacySnap, openingSnap] = await Promise.all([
        db.collection('users').doc(uid).get().catch((e: unknown) => { // guard-ok: один документ users/{uid}, не коллекция
          console.warn(`${LOG} load:legacy_read_failed`, e instanceof Error ? e.message : String(e));
          return null;
        }),
        db.collection('users').doc(uid).collection('client_economy_opening').doc('v1').get().catch((e: unknown) => { // guard-ok: один документ
          console.warn(`${LOG} load:opening_read_failed`, e instanceof Error ? e.message : String(e));
          return null;
        }),
      ]);
      if (!isCurrent()) { console.warn(`${LOG} load:exit stale_after_cloud_read`); return; }
      const immutableOpening = openingSnap?.exists
        ? parseShardBalance(openingSnap.data?.()?.openingBalance)
        : null;
      const legacyStoredCandidate = legacySnap?.exists
        ? parseShardBalance(legacySnap.data?.()?.shards)
        : null;
      const localCandidate = await getShardsBalance();
      if (!isCurrent()) return;
      openingOverride = immutableOpening
        ?? Math.max(localCandidate, legacyStoredCandidate ?? 0);
    }
    if (!isCurrent()) { console.warn(`${LOG} load:exit stale_before_opening`); return; }
    await initializeClientShardLedgerOpeningBalance(openingOverride, uid);
    if (!isCurrent()) return;
    scheduleJournalSync();
  } catch (e) {
    DebugLogger.error('shards_system:loadFromCloud', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
