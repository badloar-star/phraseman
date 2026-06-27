// ════════════════════════════════════════════════════════════════════════════
// paywall_dev_preview.ts — плейсхолдеры пейвола для dev-сборки (DEV_IAP_BYPASS).
//
// Зачем: в dev-рантайме (Metro) RevenueCat не опрашивается (DEV_IAP_BYPASS=true в
// app/config.ts), поэтому реальных пакетов и цен нет. Без них на пейволе ИСЧЕЗАЛИ
// два элемента, которые должны быть видны ВСЕГДА (и в dev, и в релизе):
//   • таймер «старой цены» (PaywallPriceUrgency скрыт при пустой currentPrice);
//   • кнопка «Навсегда» (lifetimeAvailable=false без пакета lifetime).
//
// Эти строки — ТОЛЬКО для отображения в dev. В реальную покупку они НЕ уходят:
// в dev покупка идёт по ветке DEV_IAP_BYPASS в usePaywallPurchase (Purchases API
// не вызывается). В стор-сборке (DEV_IAP_BYPASS=false) этот модуль не используется
// вовсе — там и цены, и пакет lifetime приходят из RevenueCat как обычно.
// ════════════════════════════════════════════════════════════════════════════
import type { PurchasesPackage } from 'react-native-purchases';
import type { UrgencyState } from './paywall_urgency';

/**
 * Активное urgency-состояние для dev-превью: фиксированный таймер «осталось ~76:00:00».
 * PaywallPriceUrgency считает живой тик локально от remainingMs; storage/state
 * проверяется только при истечении окна, поэтому dev-блок таймера остаётся лёгким.
 */
export const DEV_PREVIEW_URGENCY: UrgencyState = {
  isActive: true,
  remainingMs: 76 * 60 * 60 * 1000,
  remainingFormatted: '76:00:00',
};

/** Демо-цены для dev-превью пейвола (формат строки стора). */
export const DEV_PREVIEW_MONTHLY_PRICE = '€5,99';
export const DEV_PREVIEW_YEARLY_PRICE = '€34,99';
export const DEV_PREVIEW_YEARLY_PER_MONTH = '€2,92';
export const DEV_PREVIEW_LIFETIME_PRICE = '€99';

/**
 * Фейковый lifetime-пакет для dev-превью. Достаточно полей, которые читает UI и
 * хук (identifier, priceString, price, pricePerMonth=null — lifetime разовый).
 * Реальную покупку он не запускает: в dev срабатывает ветка DEV_IAP_BYPASS.
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
