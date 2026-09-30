/**
 * PM-231 (A3): учёт расходов OpenAI для Dialogue V2.
 *
 * зачем: freeform-, text-ход и итог занятия V2 платили OpenAI, но ни одной
 * строки usage не писали — дашборд бюджета их не видел. Пишем в общую
 * premium_dialog_billing (дашборд уже её читает) с отдельным mode.
 *
 * Приватность: только токены, модель и идентификатор аккаунта. Ни текста
 * ученика, ни промпта, ни ответа модели.
 *
 * Надёжность: запись биллинга НИКОГДА не роняет ход ученика — сбой логируется
 * с префиксом [AI-BILLING] и проглатывается осознанно.
 */
import * as admin from 'firebase-admin';

export const DIALOGUE_V2_BILLING_COLLECTION = 'premium_dialog_billing';

export type DialogueV2BillingMode = 'v2_freeform' | 'v2_text' | 'v2_complete';

export type DialogueV2ProviderUsage = Readonly<{
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}>;

/** Отчёт о расходе из провайдерного слоя; реализация обязана не бросать. */
export type DialogueV2UsageReporter = (usage: DialogueV2ProviderUsage) => Promise<void>;

function tokenCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.NaN;
  return Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000 ? n : 0;
}

/** Достаёт usage из JSON ответа OpenAI без доверия к форме. */
export function extractOpenAiUsage(payload: unknown, model: string): DialogueV2ProviderUsage | null {
  try {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const usage = (payload as { usage?: unknown }).usage;
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;
    const record = usage as Record<string, unknown>;
    const promptTokens = tokenCount(record.prompt_tokens);
    const completionTokens = tokenCount(record.completion_tokens);
    const totalTokens = tokenCount(record.total_tokens) || promptTokens + completionTokens;
    return Object.freeze({ model: String(model).slice(0, 80), promptTokens, completionTokens, totalTokens });
  } catch (error) {
    console.warn('[AI-BILLING] dialogue_v2 usage unreadable', {
      reason: String((error as Error)?.message ?? error).slice(0, 120),
    });
    return null;
  }
}

/**
 * Вызывается провайдерным слоем сразу после разбора JSON ответа (токены уже
 * оплачены, даже если ответ дальше будет отвергнут). Никогда не бросает.
 */
export async function reportDialogueV2Usage(
  reporter: DialogueV2UsageReporter | undefined,
  payload: unknown,
  model: string,
  mode: DialogueV2BillingMode,
): Promise<void> {
  if (!reporter) return;
  const usage = extractOpenAiUsage(payload, model);
  if (!usage) {
    console.warn('[AI-BILLING] dialogue_v2 usage missing in provider response', { mode, model });
    return;
  }
  try {
    await reporter(usage);
  } catch (error) {
    console.error('[AI-BILLING] dialogue_v2 usage reporter threw', {
      mode,
      reason: String((error as Error)?.message ?? error).slice(0, 200),
    });
  }
}

/** Строка биллинга в premium_dialog_billing. Никогда не бросает. */
export async function recordDialogueV2Billing(
  input: Readonly<{
    mode: DialogueV2BillingMode;
    usage: DialogueV2ProviderUsage;
    authUid?: string;
    stableUid?: string;
  }>,
  db: FirebaseFirestore.Firestore = admin.firestore(),
): Promise<void> {
  try {
    await db.collection(DIALOGUE_V2_BILLING_COLLECTION).doc().set({
      ...(input.stableUid ? { uid: input.stableUid } : {}),
      ...(input.authUid ? { authUid: input.authUid } : {}),
      mode: input.mode,
      model: input.usage.model,
      promptTokens: input.usage.promptTokens,
      completionTokens: input.usage.completionTokens,
      totalTokens: input.usage.totalTokens,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    });
  } catch (error) {
    console.error('[AI-BILLING] dialogue_v2 billing write failed', {
      mode: input.mode,
      model: input.usage.model,
      totalTokens: input.usage.totalTokens,
      reason: String((error as Error)?.message ?? error).slice(0, 200),
    });
  }
}
