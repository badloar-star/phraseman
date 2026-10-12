// ═════════════════════════════════════════════════════════════════════
// paywall_purchase_failure.ts — что показать после сбоя покупки / восстановления. Чистый модуль, без зависимостей.
// (R1_PAYWALL_UX п.1–3 и независимое ревью 12.10: деньги, поэтому каждая развилка — чистая функция с поведенческим тестом.)
//
// зачем: сбой покупки раньше ВСЕГДА давал тяжёлый диалог «Статус покупки не подтверждён… не покупай снова» — даже когда оплата не начиналась (сеть пропала
// на старте, товар не загрузился). Диалог защищает от двойной оплаты и нужен ТОЛЬКО если окно оплаты магазина уже запрашивалось (там возможно списание без ответа).
// До этого — мягкий тост «Не удалось связаться с магазином». Правило: после запроса окна магазина диалог остаётся при ЛЮБОЙ категории и в ЛЮБОМ источнике
// (в онбординге тоже: «Попробуй ещё раз» после возможного списания — приглашение заплатить повторно). network_error после списания — ровно тот случай, от которого он защищает.
// ═════════════════════════════════════════════════════════════════════

export type PurchaseFailurePhase = 'before_store_sheet' | 'after_store_sheet';

/** Подписи фазы для журнала `[PAYWALL] purchase:fail … phase=…`. */
export const PURCHASE_FAILURE_PHASE_LABEL: Readonly<Record<PurchaseFailurePhase, string>> = {
  before_store_sheet: 'до открытия окна магазина',
  after_store_sheet: 'после открытия окна магазина',
};

/** Окно оплаты магазина уже запрашивалось? Любая неуверенность трактуется как «да»: ложный диалог дешевле двойного списания. */
export function purchaseFailurePhase(storeSheetRequested: boolean): PurchaseFailurePhase {
  return storeSheetRequested ? 'after_store_sheet' : 'before_store_sheet';
}

export type PurchaseFailureUi = 'soft_store_toast' | 'onboarding_alert' | 'unverified_dialog';

/**
 * Что показать после сбоя (кроме отмены и «ожидает подтверждения»).
 * После запроса окна магазина — диалог «статус не подтверждён» ВСЕГДА (любая категория, любой источник, онбординг тоже).
 * До него — онбординг: прежнее инфо-окно «Не удалось оформить»; остальные: мягкий тост магазина.
 */
export function purchaseFailureUi(phase: PurchaseFailurePhase, isOnboardingSource = false): PurchaseFailureUi {
  if (phase === 'after_store_sheet') return 'unverified_dialog';
  return isOnboardingSource ? 'onboarding_alert' : 'soft_store_toast';
}

/**
 * Результат операции покупки отброшен как устаревший (аккаунт сменился вокруг неё). `purchaseInvoked` — ВЫЗВАН ли purchasePackage внутри обёртки:
 * stale приходит и ДО вызова (магазин не трогали), и ПОСЛЕ (оплата могла пройти). Вызывался — диалог «статус не подтверждён»; не вызывался — тихая подсказка.
 */
export function purchaseStaleUi(purchaseInvoked: boolean): 'unverified_dialog' | 'quiet_retry' {
  return purchaseInvoked ? 'unverified_dialog' : 'quiet_retry';
}

/**
 * Восстановление вернуло stale. «Аккаунт сменился» говорим только если он ДЕЙСТВИТЕЛЬНО сменился; stale бывает и без смены
 * (неподтянутая личность, блокировка не взята за срок) — тогда честное «не удалось, попробуй ещё раз».
 */
export function restoreStaleUi(accountStillCurrent: boolean): 'account_changed_toast' | 'retry_toast' {
  return accountStillCurrent ? 'retry_toast' : 'account_changed_toast';
}
