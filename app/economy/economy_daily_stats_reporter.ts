// ════════════════════════════════════════════════════════════════════════════
// economy_daily_stats_reporter.ts — обезличенный дневной агрегат экономики.
//
// зачем: коллекции client_economy_* мертвы навсегда (чекпойнт 96c32bb97 снёс
// писателя; сторож jarvis_data_contract_guard теперь ТРЕБУЕТ, чтобы они
// оставались мёртвыми), а личный журнал PhoneState читать Джарвису запрещено
// приватностью (personal_sync_segments — только владелец; план 2026-08-20
// прямо запрещает бизнес-метрики из личных payload'ов). Решение владельца
// 2026-08-27: если метрика нужна — только отдельный ОБЕЗЛИЧЕННЫЙ агрегат.
//
// Это он и есть: один документ economy_daily_stats/{YYYY-MM-DD} на день,
// только числовые инкременты — счётчики операций и АНОМАЛИЙ. Ни uid, ни
// причин, ни балансов конкретного человека здесь нет и быть не может.
// Проверку непрерывности (revision/balance цепочка) делает САМ КЛИЕНТ по
// своему локальному хвосту — наружу уходит только «есть разрыв: +1».
//
// Firebase-экономия: одна запись merge+increment на экономическую операцию
// (покупка/награда — редкие события, не тапы). Отказ записи никогда не
// трогает саму операцию и всегда пишет причину (запрет немого catch).
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { DebugLogger } from '../debug-logger';

type LikeOperation = Readonly<{
  ownerStableId: string;
  direction: 'debit' | 'credit';
  amount: number;
  delta: number;
  revision: number;
  balanceBefore: number;
  balanceAfter: number;
}>;

type TailByOwner = Readonly<{ revision: number; balanceAfter: number }>;

const TAIL_KEY_PREFIX = 'economy_daily_stats_tail_v1:';
const tailCache = new Map<string, TailByOwner>();

function dayKeyUtc(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

async function readTail(ownerStableId: string): Promise<TailByOwner | null> {
  const cached = tailCache.get(ownerStableId);
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(TAIL_KEY_PREFIX + ownerStableId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TailByOwner>;
    if (!Number.isSafeInteger(parsed.revision) || !Number.isSafeInteger(parsed.balanceAfter)) return null;
    const tail = { revision: Number(parsed.revision), balanceAfter: Number(parsed.balanceAfter) };
    tailCache.set(ownerStableId, tail);
    return tail;
  } catch (e) {
    // Хвост — только для локальной сверки; его потеря не ошибка данных.
    DebugLogger.warn('economy_daily_stats:read_tail', String((e as Error)?.message ?? e));
    return null;
  }
}

async function writeTail(ownerStableId: string, tail: TailByOwner): Promise<void> {
  tailCache.set(ownerStableId, tail);
  try {
    await AsyncStorage.setItem(TAIL_KEY_PREFIX + ownerStableId, JSON.stringify(tail));
  } catch (e) {
    DebugLogger.warn('economy_daily_stats:write_tail', String((e as Error)?.message ?? e));
  }
}

/**
 * Одна операция → инкременты дневного агрегата. Fire-and-forget: вызывающий
 * НЕ ждёт сеть, операция уже необратимо закоммичена локально.
 */
export function reportEconomyOperationApplied(operation: LikeOperation): void {
  void reportInner(operation).catch((e: unknown) => {
    // зачем: сам репортёр не имеет права уронить экономику, но и молчать не
    // смеет — иначе агрегат умрёт так же тихо, как умер его предшественник.
    DebugLogger.error(
      'economy_daily_stats:report_failed',
      e instanceof Error ? e : new Error(String(e)),
      'warning',
    );
  });
}

async function reportInner(operation: LikeOperation): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
  const nowMs = Date.now();

  // Локальная проверка непрерывности — единственное место, где личная
  // цепочка используется; наружу уходят только счётчики.
  const tail = await readTail(operation.ownerStableId);
  let revisionGap = 0;
  let balanceGap = 0;
  if (tail) {
    if (operation.revision !== tail.revision + 1) revisionGap = 1;
    if (operation.balanceBefore !== tail.balanceAfter) balanceGap = 1;
  }
  const invalidOp = (
    !Number.isSafeInteger(operation.amount) || operation.amount < 0
    || operation.delta !== (operation.direction === 'debit' ? -operation.amount : operation.amount)
    || operation.balanceAfter !== operation.balanceBefore + operation.delta
  ) ? 1 : 0;
  await writeTail(operation.ownerStableId, {
    revision: operation.revision,
    balanceAfter: operation.balanceAfter,
  });

  // Ленивая загрузка firestore — модуль не должен тянуть Firebase в бандл
  // раньше времени (холодный старт: экономика стартует после первого кадра).
  const { getApp } = await import('@react-native-firebase/app');
  const { getFirestore, doc, setDoc, increment, serverTimestamp } = await import('@react-native-firebase/firestore');
  const db = getFirestore(getApp());
  const day = dayKeyUtc(nowMs);
  await setDoc(doc(db, 'economy_daily_stats', day), {
    day,
    // createdAtMs = начало дня: ложится в существующий шаблон запросов
    // Джарвиса «где createdAtMs в окне» без нового индекса.
    createdAtMs: Date.parse(day + 'T00:00:00.000Z'),
    ops: increment(1),
    ...(operation.direction === 'credit'
      ? { grants: increment(1), amountGranted: increment(operation.amount) }
      : { spends: increment(1), amountSpent: increment(operation.amount) }),
    ...(invalidOp ? { invalidOps: increment(1) } : {}),
    ...(revisionGap ? { revisionGaps: increment(1) } : {}),
    ...(balanceGap ? { balanceGaps: increment(1) } : {}),
    updatedAtMs: nowMs,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** Только для тестов. */
export function resetEconomyDailyStatsTailForTests(): void {
  tailCache.clear();
}
