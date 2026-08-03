/**
 * Технический потолок трат на LLM-обогатитель Джарвиса.
 *
 * зачем не полагаться на «логический» лимит в промпте или в коде вызывающего:
 * владелец разрешил конкретную сумму денег (€50/мес), и это обещание должно
 * быть невозможно нарушить программной ошибкой, а не держаться на том, что
 * никто не забудет проверку. Firestore-счётчик — единственное место правды,
 * читается ДО каждого запроса и обновляется транзакцией.
 *
 * Дневной кап = месячный/28, а не /30 или /31: одна дорогая ночь не должна
 * иметь возможность съесть весь месячный бюджет разом, и худший месяц
 * (февраль, 28 дней) не должен получить завышенный дневной кап только
 * потому, что в нём меньше дней.
 */

export const JARVIS_LLM_BUDGET_COLLECTION = 'jarvis_llm_budget';

/** Бюджет, который владелец явно одобрил 2026-08-03. Смена суммы — только по его слову. */
export const MONTHLY_CAP_USD = 50;

export function dailyCapUsd(): number {
  return MONTHLY_CAP_USD / 28;
}

function monthKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dayKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export type BudgetRejectReason = 'monthly_cap' | 'daily_cap' | 'storage_error';

export type BudgetVerdict =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: BudgetRejectReason };

export interface CheckAndReserveBudgetInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly nowMs: number;
  /** Оценка стоимости ДО вызова — по максимальной длине входа/выхода. */
  readonly estimatedCostUsd: number;
}

/**
 * Проверяет, укладывается ли планируемый вызов в оба потолка.
 *
 * зачем "reserve" в имени, хоть это read-only: вызывающий обязан проверить
 * ЭТО перед запросом к OpenAI, а не после — иначе проверка ничего не защищает.
 * Сама денежная резервация (инкремент) происходит отдельно, в
 * recordActualSpend, по факту реального usage из ответа API — оценка нужна
 * только чтобы не начинать вызов, который заведомо пробьёт потолок.
 */
export async function checkAndReserveBudget(input: CheckAndReserveBudgetInput): Promise<BudgetVerdict> {
  try {
    const ref = input.db.doc(`${JARVIS_LLM_BUDGET_COLLECTION}/${monthKey(input.nowMs)}`);
    const snap = await ref.get();
    const data = (snap.exists ? snap.data() : undefined) as Record<string, unknown> | undefined;
    const spentUsd = typeof data?.spentUsd === 'number' ? data.spentUsd : 0;
    const dailySpent = (data?.dailySpentUsd as Record<string, number> | undefined) ?? {};
    const todaySpent = typeof dailySpent[dayKey(input.nowMs)] === 'number' ? dailySpent[dayKey(input.nowMs)] : 0;

    if (spentUsd + input.estimatedCostUsd > MONTHLY_CAP_USD) return { allowed: false, reason: 'monthly_cap' };
    if (todaySpent + input.estimatedCostUsd > dailyCapUsd()) return { allowed: false, reason: 'daily_cap' };
    return { allowed: true };
  } catch {
    // Недоступный счётчик — отказ, а не молчаливое разрешение тратить.
    return { allowed: false, reason: 'storage_error' };
  }
}

export interface RecordActualSpendInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly nowMs: number;
  readonly actualCostUsd: number;
}

/**
 * Пишет РЕАЛЬНО потраченное (из usage ответа), не оценку.
 *
 * зачем транзакция: два параллельных вызова (крон + ручная кнопка) не должны
 * потерять инкремент друг друга при одновременной записи.
 */
export async function recordActualSpend(input: RecordActualSpendInput): Promise<void> {
  const ref = input.db.doc(`${JARVIS_LLM_BUDGET_COLLECTION}/${monthKey(input.nowMs)}`);
  const day = dayKey(input.nowMs);
  await input.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as Record<string, unknown> | undefined) : undefined;
    const spentUsd = (typeof data?.spentUsd === 'number' ? data.spentUsd : 0) + input.actualCostUsd;
    const dailySpent = { ...((data?.dailySpentUsd as Record<string, number> | undefined) ?? {}) };
    dailySpent[day] = (typeof dailySpent[day] === 'number' ? dailySpent[day] : 0) + input.actualCostUsd;
    tx.set(ref, { spentUsd, dailySpentUsd: dailySpent, updatedAtMs: input.nowMs }, { merge: true });
  });
}
