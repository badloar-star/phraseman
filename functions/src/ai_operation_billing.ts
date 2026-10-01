// PM-231 (A3): единая запись usage платных ИИ-вызовов «по operation» для админских
// функций (перевод, дайджесты, ответы на репорты, идеи, фидбэк, разбор видео-документа).
//
// зачем: дашборд openAiBudgetDashboard видел только фичи со своей billing-коллекцией;
// админские вызовы платили OpenAI, но в сумме не светились — «расходы видны по
// operation» было выполнено наполовину. Здесь одна общая коллекция
// ai_operation_billing: одна строка на вызов {operation, model, токены}.
//
// Firebase-экономия: одна запись на вызов (админские вызовы редкие), без чтений;
// поле expireAt — под TTL-политику Firestore (fieldOverrides в firestore.indexes.json, 90 дней; деплой индексов — владелец),
// чтобы коллекция не росла вечно (PM-228 purge).
// Запись НЕ блокирует и НЕ ломает основной путь: сбой логируется с префиксом
// [PM-231-BILLING] и не пробрасывается (правило «нет немых catch»).
import * as admin from 'firebase-admin';
import { logExpireAt } from './log_ttl';

export const AI_OPERATION_BILLING_COLLECTION = 'ai_operation_billing';
export const AI_OPERATION_BILLING_PREFIX = '[PM-231-BILLING]';
const MAX_OPERATION_CHARS = 64;
const MAX_MODEL_CHARS = 80;

export interface AiOperationUsage {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}

function tokens(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Чистая сборка строки (без Firestore) — проверяется тестом. */
export function buildAiOperationBillingRow(
  operation: string,
  usage: AiOperationUsage,
  nowMs: number,
  uid = '',
): Record<string, unknown> {
  const promptTokens = tokens(usage.promptTokens);
  const completionTokens = tokens(usage.completionTokens);
  return {
    operation: String(operation || 'unknown').trim().slice(0, MAX_OPERATION_CHARS) || 'unknown',
    model: String(usage.model || 'gpt-4o-mini').trim().slice(0, MAX_MODEL_CHARS),
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    uid: String(uid || '').slice(0, 128),
    createdAtMs: nowMs,
    expireAt: logExpireAt(nowMs), // 90 дней, общий срок журналов (log_ttl.ts)
  };
}

export async function recordAiOperationUsage(
  operation: string,
  usage: AiOperationUsage,
  uid = '',
  nowMs: number = Date.now(),
): Promise<boolean> {
  try {
    const row = buildAiOperationBillingRow(operation, usage, nowMs, uid);
    await admin.firestore().collection(AI_OPERATION_BILLING_COLLECTION).add(row);
    return true;
  } catch (error) {
    console.error(`${AI_OPERATION_BILLING_PREFIX} write failed`, {
      operation,
      reason: String((error as Error)?.message ?? error).slice(0, 200),
    });
    return false;
  }
}

/**
 * Колбэк для openAiChat({ onUsage }): `onUsage: aiOperationUsageSink('admin_translate', model)`.
 * Fire-and-forget: ответ админу не ждёт запись usage.
 */
export function aiOperationUsageSink(
  operation: string,
  model: string,
  uid = '',
): (usage: { promptTokens: number; completionTokens: number }) => void {
  return (usage) => {
    void recordAiOperationUsage(operation, { model, ...usage }, uid);
  };
}
