// ════════════════════════════════════════════════════════════════════════════
// shards_delta_queue.ts — офлайн-очередь атомарных дельт осколков (K3).
//
// Осколки применяются серверным callable shardsApplyDelta (runTransaction +
// идемпотентность по opId). Если вызов не дошёл (офлайн / таймаут / регион с
// заблокированным Firebase), дельта уже применена ЛОКАЛЬНО (оптимистично), а
// серверная сверка кладётся сюда и повторяется при следующем старте / возврате
// в сеть. opId стабилен между попытками → сервер не удвоит дельту (тот же
// маркер reward_claims/shard_op_{opId}).
//
// Формат записи в AsyncStorage: один JSON-массив под SHARD_DELTA_QUEUE_KEY.
// Осколков-операций в очереди единицы (только неотправленные) — массив дешевле
// множества ключей.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { withStorageLock } from './storage_mutex';
import { DebugLogger } from './debug-logger';

const SHARD_DELTA_QUEUE_KEY = 'shards_delta_queue_v1';
// Больше 50 неотправленных дельт — почти наверняка баг/бесконечный офлайн; режем
// хвост, чтобы очередь не пухла бесконечно. Теряется лишь серверная сверка —
// локальный баланс уже применён, а loadShardsFromCloud до-сверит при связи.
const MAX_QUEUE_LEN = 50;

export type PendingShardDelta = {
  opId: string;
  delta: number; // положительная величина
  type: 'earn' | 'spend';
  reason: string;
  createdAtMs: number;
};

export function newShardOpId(): string {
  // Совпадает с OP_ID_RE на сервере ([A-Za-z0-9_-]{8,80}); UUID подходит.
  return Crypto.randomUUID();
}

function parseQueue(raw: string | null): PendingShardDelta[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingShardDelta =>
      item != null &&
      typeof item.opId === 'string' &&
      Number.isFinite(item.delta) &&
      (item.type === 'earn' || item.type === 'spend') &&
      typeof item.reason === 'string',
    );
  } catch {
    return [];
  }
}

export async function readShardDeltaQueue(): Promise<PendingShardDelta[]> {
  try {
    return parseQueue(await AsyncStorage.getItem(SHARD_DELTA_QUEUE_KEY));
  } catch {
    return [];
  }
}

/** Поставить неотправленную дельту в очередь для последующей серверной сверки. */
export async function enqueueShardDelta(entry: PendingShardDelta): Promise<void> {
  try {
    await withStorageLock(async () => {
      const queue = parseQueue(await AsyncStorage.getItem(SHARD_DELTA_QUEUE_KEY));
      if (queue.some((q) => q.opId === entry.opId)) return; // идемпотентно
      const next = [...queue, entry];
      const trimmed = next.length > MAX_QUEUE_LEN ? next.slice(next.length - MAX_QUEUE_LEN) : next;
      await AsyncStorage.setItem(SHARD_DELTA_QUEUE_KEY, JSON.stringify(trimmed));
    });
  } catch (error) {
    DebugLogger.error('shards_delta_queue.ts:enqueueShardDelta', error, 'warning');
  }
}

/** Убрать успешно подтверждённые серверные дельты из очереди. */
export async function removeShardDeltas(opIds: readonly string[]): Promise<void> {
  if (opIds.length === 0) return;
  const drop = new Set(opIds);
  try {
    await withStorageLock(async () => {
      const queue = parseQueue(await AsyncStorage.getItem(SHARD_DELTA_QUEUE_KEY));
      const next = queue.filter((q) => !drop.has(q.opId));
      if (next.length === queue.length) return;
      await AsyncStorage.setItem(SHARD_DELTA_QUEUE_KEY, JSON.stringify(next));
    });
  } catch (error) {
    DebugLogger.error('shards_delta_queue.ts:removeShardDeltas', error, 'warning');
  }
}
