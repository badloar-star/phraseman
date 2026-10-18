/**
 * Аварийный выключатель платных функций по бюджету Cloud Billing (слой 3 потолка расходов).
 *
 * зачем (владелец 18.10 через координатора: «не больше 20 $ в день в принципе»): счётчик spend_cap.ts считает ОЦЕНКИ наших вызовов.
 * Бюджет Cloud Billing считает ФАКТ всего проекта (OpenAI сюда не входит, но Firestore, функции, Storage, исходящий трафик — да).
 * Когда бюджет присылает уведомление о достижении ≥100 %, эта функция ставит тот же флаг paidDisabled — все платные функции
 * отвечают «на сегодня всё». Снимает флаг владелец (поле paidDisabled в spend_cap_config/global → false), не автоматика:
 * иначе перерасход повторился бы на следующие сутки.
 *
 * Тему и бюджет создаёт владелец в консоли — docs/work/tasks/spend-cap-billing-budget-setup-2026-10-18.md. Имя темы: billing-budget-alerts.
 * Журнал: [SPEND-CAP] step=billing_alert.
 */
import * as admin from 'firebase-admin';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { setPaidDisabled } from './spend_cap';

export const BILLING_BUDGET_TOPIC = 'billing-budget-alerts';

export type BillingBudgetNotice = Readonly<{
  costAmount: number;
  budgetAmount: number;
  alertThresholdExceeded: number | null;
  budgetDisplayName: string;
}>;

/** Разбор JSON уведомления бюджета (Cloud Billing → Pub/Sub). Некорректное сообщение → null. */
export function parseBillingBudgetNotice(json: unknown): BillingBudgetNotice | null {
  const d = (json ?? {}) as Record<string, unknown>;
  const cost = Number(d.costAmount);
  const budget = Number(d.budgetAmount);
  if (!Number.isFinite(cost) || !Number.isFinite(budget) || budget <= 0) return null;
  const threshold = Number(d.alertThresholdExceeded);
  return Object.freeze({
    costAmount: cost,
    budgetAmount: budget,
    alertThresholdExceeded: Number.isFinite(threshold) ? threshold : null,
    budgetDisplayName: typeof d.budgetDisplayName === 'string' ? d.budgetDisplayName.slice(0, 80) : '',
  });
}

/** Выключать ли платное: расход достиг бюджета (≥100 %) — по сумме или по сработавшему порогу ≥ 1.0. */
export function shouldDisablePaid(notice: BillingBudgetNotice): boolean {
  return notice.costAmount >= notice.budgetAmount || (notice.alertThresholdExceeded !== null && notice.alertThresholdExceeded >= 1);
}

export const spendCapBillingKillSwitch = onMessagePublished({ topic: BILLING_BUDGET_TOPIC, region: 'us-central1', retry: false }, async (event) => {
  const notice = parseBillingBudgetNotice(event.data.message.json);
  if (!notice) {
    console.warn('[SPEND-CAP]', JSON.stringify({ step: 'billing_alert', decision: 'ignored', reason: 'message_invalid' }));
    return;
  }
  const disable = shouldDisablePaid(notice);
  console.warn('[SPEND-CAP]', JSON.stringify({ step: 'billing_alert', budget: notice.budgetDisplayName, cost: notice.costAmount, limit: notice.budgetAmount, threshold: notice.alertThresholdExceeded, decision: disable ? 'paid_disabled' : 'below_limit' }));
  if (!disable) return;
  await setPaidDisabled(admin.firestore(), true, `billing_budget ${notice.budgetDisplayName} ${notice.costAmount}/${notice.budgetAmount}`);
});
