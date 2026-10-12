// ═════════════════════════════════════════════════════════════════════
// paywall_purchase_failure.ts — что показать после сбоя покупки (R1_PAYWALL_UX п.1, координатор 12.10). Чистый модуль, без зависимостей.
//
// зачем: сбой покупки раньше ВСЕГДА давал тяжёлый диалог «Статус покупки не подтверждён… не покупай снова» — даже когда оплата не начиналась (сеть пропала
// на старте, товар не загрузился). Диалог защищает от двойной оплаты и нужен ТОЛЬКО если окно оплаты магазина уже запрашивалось (там возможно списание без ответа).
// До этого — мягкий тост «Не удалось связаться с магазином». Решение вынесено сюда, чтобы тест держал обе ветки, а правило не расползлось по категориям ошибок:
// после запроса окна магазина диалог остаётся при ЛЮБОЙ категории (network_error после списания — ровно тот случай, от которого он защищает).
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

/** Что показать после сбоя (кроме отмены и «ожидает подтверждения»): тост — только до окна магазина; диалог — при ЛЮБОЙ категории после. */
export function purchaseFailureUi(phase: PurchaseFailurePhase): 'soft_store_toast' | 'unverified_dialog' {
  return phase === 'before_store_sheet' ? 'soft_store_toast' : 'unverified_dialog';
}
