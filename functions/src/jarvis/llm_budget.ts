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
 * Проверяет и АТОМАРНО резервирует оценку в обоих потолках.
 *
 * committedUsd намеренно консервативен: резервация не возвращается после
 * сетевой ошибки. Так параллельные триггеры не могут одновременно увидеть
 * один и тот же свободный остаток, а повторный шторм не тратит деньги сверх
 * капа. spentUsd рядом хранит фактический usage для аналитики.
 */
export async function checkAndReserveBudget(input: CheckAndReserveBudgetInput): Promise<BudgetVerdict> {
  try {
    const ref = input.db.doc(`${JARVIS_LLM_BUDGET_COLLECTION}/${monthKey(input.nowMs)}`);
    const day = dayKey(input.nowMs);
    return await input.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.exists ? snap.data() : undefined) as Record<string, unknown> | undefined;
      const spentUsd = typeof data?.spentUsd === 'number' ? data.spentUsd : 0;
      const dailySpent = (data?.dailySpentUsd as Record<string, number> | undefined) ?? {};
      const committedUsd = typeof data?.committedUsd === 'number' ? data.committedUsd : spentUsd;
      const dailyCommitted = {
        ...((data?.dailyCommittedUsd as Record<string, number> | undefined) ?? dailySpent),
      };
      const todayCommitted = typeof dailyCommitted[day] === 'number' ? dailyCommitted[day] : 0;

      if (committedUsd + input.estimatedCostUsd > MONTHLY_CAP_USD) return { allowed: false as const, reason: 'monthly_cap' as const };
      if (todayCommitted + input.estimatedCostUsd > dailyCapUsd()) return { allowed: false as const, reason: 'daily_cap' as const };
      dailyCommitted[day] = todayCommitted + input.estimatedCostUsd;
      tx.set(ref, {
        committedUsd: committedUsd + input.estimatedCostUsd,
        dailyCommittedUsd: dailyCommitted,
        updatedAtMs: input.nowMs,
      }, { merge: true });
      return { allowed: true as const };
    });
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
    const committedUsd = Math.max(typeof data?.committedUsd === 'number' ? data.committedUsd : 0, spentUsd);
    const dailyCommitted = { ...((data?.dailyCommittedUsd as Record<string, number> | undefined) ?? {}) };
    dailyCommitted[day] = Math.max(typeof dailyCommitted[day] === 'number' ? dailyCommitted[day] : 0, dailySpent[day]);
    tx.set(ref, {
      spentUsd,
      dailySpentUsd: dailySpent,
      committedUsd,
      dailyCommittedUsd: dailyCommitted,
      updatedAtMs: input.nowMs,
    }, { merge: true });
  });
}
