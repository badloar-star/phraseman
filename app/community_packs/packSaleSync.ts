/**
 * Догонка продажи набора: руны получает АВТОР набора.
 *
 * зачем (владелец, 2026-09-21, дословно): «начисление должно быть юзеры чьи
 * наборы покупаются, а не блять приложению». Покупка за руны списывала их у
 * покупателя и на этом заканчивалась — автору не доставалось ничего.
 *
 * Телефон авторитетен ТОЛЬКО для покупателя: списание и открытие набора
 * происходят в кадре 0 (`buyCommunityPackLocally`), и этот файл на них не
 * влияет вообще. Автор — другой человек, его баланс меняет только сервер.
 *
 * ПОЧЕМУ ОЧЕРЕДЬ, А НЕ ПРЯМОЙ ВЫЗОВ: покупка проходит и без сети. Без durable
 * очереди продажа, совершённая в офлайне, не дошла бы до автора НИКОГДА —
 * ровно тот класс бага «механизм есть, а данных не дали», который в этом
 * проекте повторялся многократно. Очередь хранит id наборов, за которые автору
 * ещё не начислено, и разбирается при следующем заходе в раздел.
 *
 * ⚠️ Очередь НЕ является «долгом на показ»: она хранит факт сделки, а не
 * обещание анимации (правило «празднование не ставится в durable-очередь»).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { isCurrentAccountGeneration, type AccountGenerationToken } from '../account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { DebugLogger } from '../debug-logger';

const REGION = 'us-central1';
/** Потолок на разбор за один заход: очередь реально короткая, это защита от мусора. */
const MAX_SALES_PER_RUN = 25;

function outboxKey(stableId: string): string {
  return `community_pack_sale_outbox_v1:${stableId}`;
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id !== '');
  } catch (error) {
    // Немой catch запрещён: пустая очередь означала бы, что автор молча не
    // получил руны за уже совершённую покупку.
    DebugLogger.error(
      'packSaleSync:parse',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return [];
  }
}

/**
 * Поставить продажу в очередь. Вызывается СРАЗУ после успешного локального
 * списания у покупателя — до всякой сети.
 */
export async function enqueuePackSaleForAuthor(stableId: string, packId: string): Promise<void> {
  if (!stableId || !packId) return;
  try {
    const key = outboxKey(stableId);
    const current = parseIds(await AsyncStorage.getItem(key));
    if (current.includes(packId)) return;
    // Иммутабельно: новый список, не мутация существующего.
    await AsyncStorage.setItem(key, JSON.stringify([...current, packId]));
    DebugLogger.info('[PACK-SALE] queued', `pack=${packId}`);
  } catch (error) {
    DebugLogger.error(
      'packSaleSync:enqueue',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
  }
}

async function dropFromOutbox(stableId: string, packIds: readonly string[]): Promise<void> {
  if (packIds.length === 0) return;
  try {
    const key = outboxKey(stableId);
    const current = parseIds(await AsyncStorage.getItem(key));
    const done = new Set(packIds);
    await AsyncStorage.setItem(key, JSON.stringify(current.filter((id) => !done.has(id))));
  } catch (error) {
    DebugLogger.error(
      'packSaleSync:drop',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
  }
}

function callable() {
  return httpsCallable<
    { buyerStableId: string; packId: string },
    { ok?: boolean; applied?: number; authorNetRunes?: number }
  >(getFunctions(getApp(), REGION), 'communitySyncPackRuneSale');
}

/**
 * Разобрать очередь: начислить авторам за покупки, совершённые этим человеком.
 * Экран НИЧЕГО не ждёт — набор у покупателя уже открыт.
 */
export async function syncPendingPackSales(token: AccountGenerationToken): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    DebugLogger.info('[PACK-SALE] sync:skip', `cloud_disabled expoGo=${IS_EXPO_GO}`);
    return;
  }
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    DebugLogger.info('[PACK-SALE] sync:skip', 'identity_changed');
    return;
  }

  const pending = parseIds(await AsyncStorage.getItem(outboxKey(ownerStableId)).catch((error: unknown) => {
    DebugLogger.error(
      'packSaleSync:read',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return null;
  })).slice(0, MAX_SALES_PER_RUN);
  if (pending.length === 0) return;

  const settled: string[] = [];
  for (const packId of pending) {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      DebugLogger.info('[PACK-SALE] sync:abort', `identity_changed pack=${packId}`);
      return;
    }
    try {
      const response = await callable()({ buyerStableId: ownerStableId, packId });
      settled.push(packId);
      DebugLogger.info(
        '[PACK-SALE] sync:ok',
        `pack=${packId} applied=${String(response.data?.applied)} net=${String(response.data?.authorNetRunes)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Отказы, которые НЕ пройдут и в следующий раз, снимаем с очереди — иначе
      // она будет биться о них вечно на каждом заходе в раздел.
      const permanent = /cannot_buy_own_pack|pack_not_found|pack_is_not_paid|pack_not_published|author_not_found|author_net_is_zero/.test(message);
      DebugLogger.info(
        '[PACK-SALE] sync:fail',
        `pack=${packId} permanent=${permanent} reason=${message}`,
      );
      if (permanent) settled.push(packId);
      // Временный отказ (нет сети) — оставляем в очереди, попробуем при
      // следующем заходе. Прерываем цикл: остальные вызовы упадут так же.
      else break;
    }
  }

  if (settled.length > 0) await dropFromOutbox(ownerStableId, settled);
}
