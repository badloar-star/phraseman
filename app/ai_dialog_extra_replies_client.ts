/**
 * ai_dialog_extra_replies_client.ts — докупка +10 реплик ИИ-диалога за 300 рун.
 *
 * зачем (владелец, 2026-09-17): «сервер не принимает участия, он только
 * синхронизация! Главный телефон только». Списание рун и разрешение печатать
 * следующую реплику происходят МГНОВЕННО на телефоне, в том же кадре что и
 * тап — телефон читает локальный баланс, проверяет хватает ли, декрементирует
 * и пишет durable-запись ДО любого сетевого вызова. Сервер (functions/src/
 * ai_dialog_extra_replies.ts) синхронизируется в фоне и остаётся честным
 * кассиром для платных вызовов OpenAI: он же расширяет extraCapToday в
 * premium_dialog_quotas, которую читает enforceDailyQuota. Расход OpenAI
 * ограничен только балансом рун — покупок в день сколько угодно (решение
 * владельца 17.09).
 *
 * Идемпотентность: operationId = requestId (один на тап), durable-запись в
 * AsyncStorage переживает уход с экрана/убийство процесса — повторный вызов
 * с тем же requestId возвращает тот же результат, а не списывает повторно.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import * as Crypto from 'expo-crypto';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import { mergeLevelSpinServerStars, readUnifiedLevelSpinStars } from './level_spin_star_grants';
import { withStorageLock } from './storage_mutex';

const REGION = 'us-central1';
const ID_RE = /^[A-Za-z0-9_-]{12,96}$/;

export const DIALOG_EXTRA_REPLIES_PRICE_RUNES = 300 as const;
export const DIALOG_EXTRA_REPLIES_COUNT = 10 as const;

type PendingPurchase = Readonly<{
  requestId: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAtMs: number;
}>;

function pendingKey(stableId: string): string {
  return `ai_dialog_extra_replies_pending_v1:${stableId}`;
}

function outboxKey(stableId: string, requestId: string): string {
  return `ai_dialog_extra_replies_outbox_v1:${stableId}:${requestId}`;
}

function parsePending(raw: string | null): PendingPurchase | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as Partial<PendingPurchase>;
    if (!ID_RE.test(String(row.requestId ?? ''))
      || !Number.isFinite(row.balanceBefore) || !Number.isFinite(row.balanceAfter)
      || !Number.isFinite(row.createdAtMs)) return null;
    return {
      requestId: String(row.requestId),
      balanceBefore: Number(row.balanceBefore),
      balanceAfter: Number(row.balanceAfter),
      createdAtMs: Number(row.createdAtMs),
    };
  } catch {
    return null;
  }
}

export function makeDialogExtraRepliesRequestId(): string {
  const rand = Crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  return `der${Date.now().toString(36)}${rand}`.slice(0, 96);
}

export type DialogExtraRepliesPurchaseResult =
  | { ok: true; balance: number; repliesGranted: number }
  | { ok: false; reason: 'insufficient_runes' | 'identity_changed' | 'cloud_disabled' };

/**
 * Мгновенная локальная часть: проверяет баланс, списывает руны В ПАМЯТИ И НА
 * ДИСКЕ прямо сейчас, до какой-либо сети. Вызывающий (экран диалога) обязан
 * сразу открыть поле ввода на +10 реплик после `ok: true` — сеть уже не участвует
 * в решении "можно печатать".
 */
export async function buyDialogExtraRepliesLocally(
  token: AccountGenerationToken,
  requestId: string,
): Promise<DialogExtraRepliesPurchaseResult> {
  if (IS_EXPO_GO) return { ok: false, reason: 'cloud_disabled' };
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId) || !ID_RE.test(requestId)) {
    return { ok: false, reason: 'identity_changed' };
  }

  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) return { ok: false, reason: 'identity_changed' } as const;

    const existingRaw = await AsyncStorage.getItem(outboxKey(ownerStableId, requestId)).catch(() => null);
    const existing = parsePending(existingRaw);
    if (existing) {
      // Реплей того же тапа (например, повторный рендер до ответа сети) — не спишет дважды.
      return { ok: true, balance: existing.balanceAfter, repliesGranted: DIALOG_EXTRA_REPLIES_COUNT } as const;
    }

    const { balance } = await readUnifiedLevelSpinStars(token);
    if (balance < DIALOG_EXTRA_REPLIES_PRICE_RUNES) {
      return { ok: false, reason: 'insufficient_runes' } as const;
    }
    const balanceAfter = balance - DIALOG_EXTRA_REPLIES_PRICE_RUNES;
    const pending: PendingPurchase = {
      requestId,
      balanceBefore: balance,
      balanceAfter,
      createdAtMs: Date.now(),
    };
    await AsyncStorage.setItem(outboxKey(ownerStableId, requestId), JSON.stringify(pending));
    await AsyncStorage.setItem(pendingKey(ownerStableId), JSON.stringify(pending));
    // Мгновенное локальное зеркало баланса — та же проекция, что рисует «Руны».
    // Сервер догонит это же число фоном (mergeLevelSpinServerStars ниже), а до
    // тех пор клиент уже показывает списанные руны, как требует Optimistic UI.
    await mergeLevelSpinServerStars(token, { stars: balanceAfter });
    return { ok: true, balance: balanceAfter, repliesGranted: DIALOG_EXTRA_REPLIES_COUNT } as const;
  }));
}

function callable() {
  return httpsCallable<
    { stableId: string; requestId: string },
    { ok?: boolean; stars?: number; starsSeq?: number; repliesGranted?: number }
  >(getFunctions(getApp(), REGION), 'aiDialogBuyExtraReplies');
}

/**
 * Фоновая синхронизация: сообщает серверу о уже состоявшейся (на телефоне)
 * покупке, чтобы (а) баланс подтвердился настоящим значением из леджера и
 * (б) extraCapToday в premium_dialog_quotas реально вырос — иначе следующая
 * реплика получит отказ квоты, хотя руны уже списаны на экране.
 *
 * Вызывается фоном сразу после buyDialogExtraRepliesLocally — экран НЕ ждёт
 * этот вызов, чтобы разблокировать поле ввода.
 */
export async function syncDialogExtraRepliesPurchase(
  token: AccountGenerationToken,
): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return;

  const pending = parsePending(await AsyncStorage.getItem(pendingKey(ownerStableId)).catch(() => null));
  if (!pending) return;

  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const response = await callable()({ stableId: ownerStableId, requestId: pending.requestId });
    if (!isCurrentAccountGeneration(token, ownerStableId)) return;
    const stars = Number(response.data.stars);
    const seq = Number(response.data.starsSeq);
    await mergeLevelSpinServerStars(token, {
      ...(Number.isFinite(stars) ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
      ...(Number.isSafeInteger(seq) && seq >= 0 ? { starsSeq: seq } : {}),
    });
    const stillPending = parsePending(await AsyncStorage.getItem(pendingKey(ownerStableId)).catch(() => null));
    if (stillPending?.requestId === pending.requestId) {
      await AsyncStorage.removeItem(pendingKey(ownerStableId)).catch(() => {});
    }
  } catch (error) {
    // Немой catch запрещён (правило проекта «сперва логи») — причина обязана
    // остаться в трассировке, даже если экран уже показал +10 реплик локально.
    DebugLogger.error(
      'ai_dialog_extra_replies_client:sync_failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    // Запись остаётся в pendingKey — следующий вызов syncDialogExtraRepliesPurchase
    // (следующая покупка/следующий заход в диалог) повторит её тем же requestId.
  }
}
