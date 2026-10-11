/**
 * «Магазин недоступен на этом устройстве» — отдельная причина сбоя загрузки цен.
 *
 * зачем (владелец 11.10: «РАЗБЕРИСЬ ПОЧЕМУ ЦЕНЫ НЕ ПОКАЗЫВАЮТСЯ В ПРИЛОЖЕНИИ»; лог [PAYWALL] координатора): на устройстве
 * без Google Play (эмулятор google_apis, Huawei, урезанные прошивки) RevenueCat отвечает PurchaseNotAllowedError /
 * BILLING_UNAVAILABLE. Повторять такой отказ бессмысленно — окно ждало 17–22 с ради заведомого «нет». Тайм-ауты и сеть
 * по-прежнему повторяются.
 */

/** Код RevenueCat PURCHASE_NOT_ALLOWED_ERROR (react-native-purchases PURCHASES_ERROR_CODE). */
const PURCHASE_NOT_ALLOWED_CODE = '3';
const BILLING_TEXT = /BILLING_UNAVAILABLE|Billing service unavailable|PurchaseNotAllowed|not allowed to make the purchase/i;

export type StoreUnavailableReason = 'billing_unavailable' | 'network';

/** Отказ магазина «биллинг недоступен» — по коду, читаемому коду или тексту ошибки RevenueCat. */
export function isStoreBillingUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return typeof error === 'string' && BILLING_TEXT.test(error);
  const e = error as Record<string, unknown>;
  const userInfo = (e.userInfo && typeof e.userInfo === 'object' ? e.userInfo : {}) as Record<string, unknown>;
  if (String(e.code ?? '') === PURCHASE_NOT_ALLOWED_CODE) return true;
  const texts = [e.message, e.readableErrorCode, e.underlyingErrorMessage, userInfo.readableErrorCode, userInfo.underlyingErrorMessage]
    .map((value) => String(value ?? ''));
  return texts.some((text) => BILLING_TEXT.test(text));
}

/**
 * Предпросмотр цен вместо пустых плиток — ТОЛЬКО в dev-сборке и только когда магазина на устройстве нет.
 * В стор-сборке ветки нет: человек видит честное «Магазин недоступен на этом устройстве».
 */
export function shouldUseDevPricePreview(input: Readonly<{
  isDev: boolean;
  isStoreRelease: boolean;
  reason: StoreUnavailableReason | null;
}>): boolean {
  return input.isDev && !input.isStoreRelease && input.reason === 'billing_unavailable';
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __PaywallBillingUnavailableRouteShim() { return null; }
