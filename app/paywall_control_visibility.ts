import { getRemoteBool } from './remote_flags';

export type PaywallControlVisibility = Readonly<{
  closeVisible: boolean;
  restoreVisible: boolean;
  promoVisible: boolean;
}>;

// зачем (владелец/координатор 25.10, требование Apple): если настройка не пришла или чтение упало — «закрыть» и «восстановить» видны ВСЕГДА, промокод скрыт
const SAFE_DEFAULT: PaywallControlVisibility = Object.freeze({ closeVisible: true, restoreVisible: true, promoVisible: false });

/**
 * Resolves the three admin-controlled paywall actions from the already-applied
 * Remote Config snapshot. This performs no storage or network read.
 */
export function getPaywallControlVisibility(): PaywallControlVisibility {
  try {
    return Object.freeze({
      closeVisible: getRemoteBool('paywall_close_visible'),
      restoreVisible: getRemoteBool('paywall_restore_visible'),
      promoVisible: getRemoteBool('paywall_promo_code_visible') && getRemoteBool('promo_codes_enabled'),
    });
  } catch (e) {
    // не глотаем молча: журнал [PAYWALL-CONTROLS] показывает причину, а окно остаётся с крестиком и «Восстановить»
    console.warn('[PAYWALL-CONTROLS] чтение видимости упало — показываю закрыть и восстановить', e instanceof Error ? e.message : String(e)); // guard-ok: редкий отказ чтения настроек, нужен в релизе
    return SAFE_DEFAULT;
  }
}
