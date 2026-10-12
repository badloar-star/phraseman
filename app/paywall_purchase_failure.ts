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

/**
 * Диалог «статус не подтверждён» зовёт «Проверить статус / Восстановить» — но они работают на ТЕКУЩЕМ аккаунте. Если аккаунт уже не тот, на котором шла оплата,
 * эти кнопки не помогут (и подтолкнут восстановить на чужом): нужен отдельный текст «покупка оформлена на предыдущий аккаунт — войди в него» без кнопок восстановления.
 */
export function purchaseUnverifiedUi(accountStillCurrent: boolean): 'unverified_dialog' | 'previous_account_alert' {
  return accountStillCurrent ? 'unverified_dialog' : 'previous_account_alert';
}

/** Что делать с окном покупки после сбоя пост-шага (доступ УЖЕ применён, покупка успешна). */
export type PostAccessFailureAction = 'close' | 'exit_onboarding' | 'skip';

/**
 * Ревью fa6648f02 (2) и (3): условие закрытия окна после сбоя пост-шага — чистая функция с таблицей входов.
 * Аккаунт сменился или окно уже закрыто — ничего не трогаем. Онбординг-пейвол (`onboarding`) закрывает не окно, а ЭКРАН ОНБОРДИНГА: выходим дальше по сценарию событием завершения
 * (вид онбординга не меняется). `onboarding_plan` рисует сам онбординг и закрывает себя сам. Остальные источники — закрыть окно / вернуть к уроку.
 */
export function postAccessFailureAction(args: { source: string; accountCurrent: boolean; dead: boolean }): PostAccessFailureAction {
  if (!args.accountCurrent || args.dead) return 'skip';
  if (args.source === 'onboarding') return 'exit_onboarding';
  if (args.source === 'onboarding_plan') return 'skip';
  return 'close';
}

/**
 * Ревью fa6648f02 (3): завершение онбординг-пейвола (finishOnboardingPaywallFlow) вернуло «не удалось» ПОСЛЕ включённого Plus. Событие завершения внутри него шлётся последним шагом,
 * поэтому при false оно НЕ ушло и экран остался бы висеть. Аккаунт сменился (stale) — не трогаем; ok+false на том же аккаунте — шлём событие сами; ok+true — делать нечего.
 */
export function onboardingFinishFailureAction(args: { status: 'ok' | 'stale'; value: boolean; accountCurrent: boolean }): 'emit_completed' | 'skip' {
  // зачем (третье ревью 0d76a9528, 🟡1): stale бывает и на ТОМ ЖЕ аккаунте — замок перехода не взят за 1,5 с. Прежнее «stale → ничего» оставляло человека
  // на пейволе онбординга с уже включённым Plus. Решаем по факту смены аккаунта, а не по статусу обёртки.
  if (!args.accountCurrent) return 'skip';
  return args.status === 'ok' && args.value ? 'skip' : 'emit_completed';
}
