/**
 * Владение диалогами, купленными за руны.
 *
 * зачем (владелец, 2026-09-17, макет docs/design/runes/MAKET.html): руны
 * покупают ЯЗЫК, а не игру. Доступ к сценарию — единственный товар, ради
 * которого руны стоит копить. Роли валют при этом расходятся и перестают
 * конкурировать: руны дают ДОСТУП (какие диалоги существуют для человека),
 * Plus даёт ОБЪЁМ (сколько реплик в день), жемчужины — удобство.
 *
 * ДВА ВИДА ДОСТУПА (решение владельца, второй круг макета). Купил за руны —
 * неотчуждаемо, переживает окончание подписки. Открылось по Plus — временно,
 * исчезает вместе с ней. Поэтому в списке НЕТ слова «навсегда»: оно врало бы
 * про второй вид.
 *
 * ТЕЛЕФОН АВТОРИТЕТЕН (дословно владелец): «Сервер не принимает участия, он
 * только синхронизация! Главный телефон только, сервер не нужен». Отсюда
 * следствие, важное для UI: этих состояний НЕ существует — «идёт списание…»,
 * «отказ сервера · руны вернулись», «нет сети · покупка недоступна». Покупка
 * решается в кадре 0 и работает офлайн, синхронизация догоняет фоном.
 *
 * Риск принят осознанно (R6 в docs/work/tasks/2026-09-15-runes-buy-language-economy.md):
 * модифицированный клиент откроет себе каталог сам. Естественная страховка —
 * дневной лимит 10 реплик остаётся всегда, поэтому вскрытый каталог не даёт
 * бесконечного расхода OpenAI.
 *
 * Идемпотентность — тот же паттерн, что у докупки реплик
 * (app/ai_dialog_extra_replies_client.ts): operationId стабилен и выводится из
 * scenarioId, поэтому повторный тап и ретрай сети не спишут руны дважды.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLockWithDeadline,
  type AccountGenerationToken,
} from './account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import {
  dialogueStateStorageKey,
  resolveDialogueStudyTarget,
  type DialogueStudyTarget,
} from './dialogue_language_registry';
import { emitAppEvent } from './events';
import { mergeLevelSpinServerStars, readUnifiedLevelSpinStars } from './level_spin_star_grants';
import { withStorageLock } from './storage_mutex';

const REGION = 'us-central1';

/** Ключ владения. Своя запись, не смешивается с прогрессом прохождения. */
export function dialogOwnershipStorageKey(studyTarget: unknown, stableId: string): string | null {
  if (!stableId) return null;
  return dialogueStateStorageKey(studyTarget, `ai_dialog_owned_ids_v1:${stableId}`);
}

/** Очередь непереданных серверу покупок (переживает убийство процесса). */
export function dialogOwnershipOutboxStorageKey(studyTarget: unknown, stableId: string): string | null {
  if (!stableId) return null;
  return dialogueStateStorageKey(studyTarget, `ai_dialog_owned_outbox_v1:${stableId}`);
}

/** Стабильный id операции: один сценарий — одна трата, сколько бы раз ни жали. */
export function dialogUnlockOperationId(
  studyTarget: unknown,
  stableId: string,
  scenarioId: string,
): string | null {
  const target = resolveDialogueStudyTarget(studyTarget);
  if (!target || !stableId || !scenarioId) return null;
  return target === 'en'
    ? `dialog_unlock:${stableId}:${scenarioId}`
    : `dialog_unlock:${target}:${stableId}:${scenarioId}`;
}

function parseIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id !== ''));
  } catch (error) {
    // Немой catch запрещён: молча пустой список показал бы купленные диалоги
    // закрытыми, то есть человек «потерял» оплаченное.
    DebugLogger.error(
      'ai_dialog_ownership:parse_failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return new Set();
  }
}

/** Купленные сценарии. Пусто при сбое чтения — но об этом пишет лог выше. */
export async function getOwnedDialogIds(studyTarget: unknown, stableId: string): Promise<Set<string>> {
  const storageKey = dialogOwnershipStorageKey(studyTarget, stableId);
  if (!storageKey) return new Set();
  const raw = await AsyncStorage.getItem(storageKey).catch((error: unknown) => {
    DebugLogger.error(
      'ai_dialog_ownership:read_failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return null;
  });
  return parseIds(raw);
}

/**
 * Сколько ждём замок хранилища, прежде чем признать его занятым.
 * 8 с — заметно больше любой честной операции с AsyncStorage (самое долгое
 * чтение баланса в логах — 452мс), но человек ещё готов ждать.
 */
const DIALOG_PURCHASE_LOCK_TIMEOUT_MS = 8000;

export type DialogPurchaseResult =
  | { ok: true; alreadyOwned: boolean; balance: number }
  | { ok: false; reason: 'insufficient_runes' | 'identity_changed' | 'invalid_scenario' | 'invalid_target' | 'storage_busy' };

/**
 * Покупка доступа к сценарию. Всё решается ЛОКАЛЬНО и мгновенно: списываем
 * руны, пишем владение, возвращаем ok — вызывающий экран открывает диалог в
 * том же кадре, не дожидаясь сети (правило Optimistic UI + прямое решение
 * владельца «телефон авторитетен»).
 *
 * Защита от двойного тапа и гонок: под одним замком хранилища проверяем
 * владение ДО списания. Второй тап по той же кнопке вернёт alreadyOwned,
 * а не спишет вторую цену.
 */
export async function buyDialogAccessLocally(
  studyTarget: unknown,
  token: AccountGenerationToken,
  scenarioId: string,
  priceRunes: number,
): Promise<DialogPurchaseResult> {
  const target = resolveDialogueStudyTarget(studyTarget);
  if (!target) {
    DebugLogger.info('[RUNES-BUY] denied', 'invalid_target');
    return { ok: false, reason: 'invalid_target' };
  }
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    DebugLogger.info('[RUNES-BUY] denied', 'identity_changed');
    return { ok: false, reason: 'identity_changed' };
  }
  if (!scenarioId || !Number.isFinite(priceRunes) || priceRunes <= 0) {
    DebugLogger.info('[RUNES-BUY] denied', `invalid_scenario id=${scenarioId} price=${priceRunes}`);
    return { ok: false, reason: 'invalid_scenario' };
  }

  /**
   * Замок берём С ДЕДЛАЙНОМ, а не навечно.
   *
   * зачем (владелец 2026-09-20, по логам 14:58:01): тап по покупке
   * дошёл сюда (`tap_buy busy=false`, баланс 5523 при цене 5000) — и функция
   * НЕ ВЕРНУЛАСЬ вообще: ни `ok`, ни `denied`, ни `buy_failed`. Следующие 6 тапов
   * ушли в `tap_ignored busy=true` — кнопка умерла до ухода с экрана.
   *
   * Причина: `withAccountTransitionLock` и `withStorageLock` — ВЕЧНЫЕ очереди
   * (`await previous` / `acquireStorageLock()` без таймаута). Любая из 304
   * других точек, взявшая замок и не отпустившая его, вешает покупку навсегда.
   *
   * Молчание не отказ: лучше честное `storage_busy` через 8 секунд, чем
   * мёртвая кнопка. Деньги при этом в безопасности: дедлайн режет ТОЛЬКО
   * ожидание В ОЧЕРЕДИ — если работа началась, она доходит до конца
   * и списание с записью владения не разорвётся пополам.
   */
  const outcome = await withAccountTransitionLockWithDeadline(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      return { ok: false, reason: 'identity_changed' } as const;
    }

    const owned = await getOwnedDialogIds(target, ownerStableId);
    if (owned.has(scenarioId)) {
      // Повторный тап/возврат на экран — не вторая трата.
      const { balance } = await readUnifiedLevelSpinStars(token);
      DebugLogger.info('[RUNES-BUY] already_owned', `scenario=${scenarioId}`);
      return { ok: true, alreadyOwned: true, balance } as const;
    }

    const { balance } = await readUnifiedLevelSpinStars(token);
    if (balance < priceRunes) {
      DebugLogger.info('[RUNES-BUY] denied', `insufficient balance=${balance} price=${priceRunes}`);
      return { ok: false, reason: 'insufficient_runes' } as const;
    }

    const balanceAfter = balance - priceRunes;
    // Иммутабельно: собираем новый набор, не мутируем прочитанный.
    const nextOwned = [...owned, scenarioId];
    const storageKey = dialogOwnershipStorageKey(target, ownerStableId);
    const pendingKey = dialogOwnershipOutboxStorageKey(target, ownerStableId);
    if (!storageKey || !pendingKey) {
      return { ok: false, reason: 'invalid_target' } as const;
    }
    await AsyncStorage.setItem(storageKey, JSON.stringify(nextOwned));

    const outbox = parseIds(await AsyncStorage.getItem(pendingKey).catch(() => null));
    if (!outbox.has(scenarioId)) {
      await AsyncStorage.setItem(pendingKey, JSON.stringify([...outbox, scenarioId]));
    }

    // Мгновенное локальное зеркало баланса — та же проекция, что рисует «Руны».
    await mergeLevelSpinServerStars(token, { stars: balanceAfter });
    emitAppEvent('dialogs_progress_changed');
    DebugLogger.info(
      '[RUNES-BUY] ok',
      `scenario=${scenarioId} price=${priceRunes} balance ${balance}→${balanceAfter}`,
    );
    return { ok: true, alreadyOwned: false, balance: balanceAfter } as const;
  }), DIALOG_PURCHASE_LOCK_TIMEOUT_MS);

  if (!outcome.completed) {
    // Немой отказ запрещён: именно он делал кнопку мёртвой.
    DebugLogger.info('[RUNES-BUY] denied', `storage_busy scenario=${scenarioId} waitedMs=${DIALOG_PURCHASE_LOCK_TIMEOUT_MS}`);
    return { ok: false, reason: 'storage_busy' };
  }
  return outcome.value;
}

function callable() {
  return httpsCallable<
    { stableId: string; purchases: readonly { scenarioId: string; priceRunes: number }[] },
    { ok?: boolean; stars?: number; starsSeq?: number }
  >(getFunctions(getApp(), REGION), 'aiDialogSyncPurchase');
}

/**
 * Фоновая синхронизация очереди покупок. Экран НЕ ждёт её: доступ уже открыт
 * локально. Задача синхронизации — подтвердить баланс из журнала и сохранить
 * покупку на случай переустановки приложения (решение владельца: «покупки
 * живут на телефоне и синхронизируются в облако»).
 *
 * зачем ОДИН вызов со списком, а не вызов на покупку: очередь обычно длиной 1,
 * но после офлайна их может накопиться несколько — N вызовов функции дали бы
 * N транзакций и N записей в Firestore на ровном месте. Сервер разбирает весь
 * список одной транзакцией, идемпотентность по-прежнему на operationId каждой
 * покупки, поэтому повтор всего батча не спишет ничего дважды.
 */
export async function syncDialogPurchases(
  studyTarget: unknown,
  token: AccountGenerationToken,
): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  const target = resolveDialogueStudyTarget(studyTarget);
  if (!target) return;
  // The existing callable contract is English-only. Non-English state stays
  // isolated in its own durable outbox until a target-aware server contract is
  // released; sending it through the English endpoint would corrupt ownership.
  if (target !== 'en') {
    DebugLogger.info('[RUNES-BUY] sync:skip', `target_not_supported target=${target}`);
    return;
  }
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return;

  const pendingKey = dialogOwnershipOutboxStorageKey(target, ownerStableId);
  if (!pendingKey) return;
  const pending = [...parseIds(await AsyncStorage.getItem(pendingKey).catch(() => null))];
  if (pending.length === 0) return;

  const { DIALOG_SCENARIOS, scenarioPriceRunes } = await import('./ai_dialog_scenarios');
  const purchases: { scenarioId: string; priceRunes: number }[] = [];
  const stale: string[] = [];
  for (const scenarioId of pending) {
    const scenario = DIALOG_SCENARIOS.find((s) => s.id === scenarioId);
    const priceRunes = scenario ? scenarioPriceRunes(scenario) : 0;
    // Сценарий пропал из каталога или стал бесплатным — из очереди убираем,
    // но владение НЕ трогаем: человек за него платил.
    if (priceRunes > 0) purchases.push({ scenarioId, priceRunes });
    else stale.push(scenarioId);
  }
  if (stale.length > 0) {
    DebugLogger.info('[RUNES-BUY] sync:skip', `stale=${stale.join(',')}`);
    await dropFromOutbox(target, ownerStableId, stale);
  }
  if (purchases.length === 0) return;

  try {
    const response = await callable()({ stableId: ownerStableId, purchases });
    if (!isCurrentAccountGeneration(token, ownerStableId)) return;
    const stars = Number(response.data.stars);
    const seq = Number(response.data.starsSeq);
    await mergeLevelSpinServerStars(token, {
      ...(Number.isFinite(stars) ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
      ...(Number.isSafeInteger(seq) && seq >= 0 ? { starsSeq: seq } : {}),
    });
    await dropFromOutbox(target, ownerStableId, purchases.map((p) => p.scenarioId));
    DebugLogger.info('[RUNES-BUY] sync:ok', `count=${purchases.length}`);
  } catch (error) {
    // Немой catch запрещён. Записи остаются в очереди — следующий заход
    // повторит их с теми же operationId, поэтому дубля списания не будет.
    DebugLogger.error(
      'ai_dialog_ownership:sync_failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
  }
}

async function dropFromOutbox(
  studyTarget: DialogueStudyTarget,
  stableId: string,
  scenarioIds: readonly string[],
): Promise<void> {
  const storageKey = dialogOwnershipOutboxStorageKey(studyTarget, stableId);
  if (!storageKey) return;
  const outbox = parseIds(await AsyncStorage.getItem(storageKey).catch(() => null));
  let changed = false;
  for (const id of scenarioIds) if (outbox.delete(id)) changed = true;
  if (!changed) return;
  await AsyncStorage.setItem(storageKey, JSON.stringify([...outbox])).catch((error: unknown) => {
    DebugLogger.error(
      'ai_dialog_ownership:outbox_write_failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
  });
}

/**
 * Слияние облачного списка владения с локальным при входе (переустановка
 * приложения не теряет купленное). Объединение, а не замена: локальные
 * покупки, ещё не дошедшие до сервера, обязаны пережить слияние.
 */
export async function mergeOwnedDialogsFromCloud(
  studyTarget: unknown,
  token: AccountGenerationToken,
  cloudIds: readonly string[],
): Promise<void> {
  const target = resolveDialogueStudyTarget(studyTarget);
  if (!target) return;
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return;
  if (!Array.isArray(cloudIds) || cloudIds.length === 0) return;

  await withStorageLock(async () => {
    const owned = await getOwnedDialogIds(target, ownerStableId);
    const before = owned.size;
    for (const id of cloudIds) if (typeof id === 'string' && id) owned.add(id);
    if (owned.size === before) return;
    const storageKey = dialogOwnershipStorageKey(target, ownerStableId);
    if (!storageKey) return;
    await AsyncStorage.setItem(storageKey, JSON.stringify([...owned]));
    emitAppEvent('dialogs_progress_changed');
    DebugLogger.info('[RUNES-BUY] cloud_merge', `${before} → ${owned.size}`);
  });
}
