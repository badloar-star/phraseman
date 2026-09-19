// ════════════════════════════════════════════════════════════════════════════
// paywall_dev_preview.ts — плейсхолдеры пейвола для dev-сборки (DEV_IAP_BYPASS).
//
// Зачем: в dev-рантайме (Metro) RevenueCat не опрашивается (DEV_IAP_BYPASS=true в
// app/config.ts), поэтому реальных пакетов и цен нет. Без них на пейволе ИСЧЕЗАЛА
// кнопка Phraseman Pro (lifetimeAvailable=false без пакета lifetime), которая
// должна быть видна ВСЕГДА (и в dev, и в релизе).
//
// Эти строки — ТОЛЬКО для отображения в dev. В реальную покупку они НЕ уходят:
// в dev ветка DEV_IAP_BYPASS в usePaywallPurchase показывает честное preview-сообщение,
// не закрывает paywall и не вызывает Purchases API. В стор-сборке (DEV_IAP_BYPASS=false) этот модуль не используется
// вовсе — там и цены, и пакет lifetime приходят из RevenueCat как обычно.
// ════════════════════════════════════════════════════════════════════════════
import type { PurchasesPackage } from 'react-native-purchases';

/** Демо-цены для dev-превью пейвола (формат строки стора). */
export const DEV_PREVIEW_MONTHLY_PRICE = '€7,99';
export const DEV_PREVIEW_YEARLY_PRICE = '€39,99';
export const DEV_PREVIEW_YEARLY_PER_MONTH = '€3,33';
export const DEV_PREVIEW_LIFETIME_PRICE = '€99';

/**
 * Фейковый lifetime-пакет для dev-превью. Достаточно полей, которые читает UI и
 * хук (identifier, priceString, price, pricePerMonth=null — lifetime разовый).
 * Реальную покупку он не запускает: в dev срабатывает preview-ветка DEV_IAP_BYPASS.
 */
export const DEV_PREVIEW_LIFETIME_PACKAGE = {
  identifier: '$rc_lifetime',
  packageType: 'LIFETIME',
  product: {
    identifier: 'phraseman_premium_lifetime_v1',
    priceString: DEV_PREVIEW_LIFETIME_PRICE,
    price: 99,
    pricePerMonthString: null,
    pricePerMonth: null,
  },
} as unknown as PurchasesPackage;

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
