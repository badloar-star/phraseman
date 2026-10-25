import { getRemoteBool } from './remote_flags';

export type PaywallControlVisibility = Readonly<{
  closeVisible: boolean;
  restoreVisible: boolean;
  promoVisible: boolean;
}>;

// ЗАМОК ВЛАДЕЛЬЦА 25.10 («Всегда видна», через координатора; docs/work/OWNER_LOCKS.md): «закрыть» и «восстановить покупки» в окне Plus видны ВСЕГДА.
// Это требование Apple и решение владельца: из «Пульта» их скрыть нельзя — флагов для них нет, значения здесь жёсткие, ничего не читается.
// Пульт управляет только промокодом; сбой чтения флага промокода = промокод скрыт (журнал [PAYWALL-CONTROLS]).
const SAFE_DEFAULT: PaywallControlVisibility = Object.freeze({ closeVisible: true, restoreVisible: true, promoVisible: false });

/**
 * «Закрыть» и «Восстановить» — всегда true (без чтения флагов). Промокод — по уже применённому снимку Remote Config:
 * paywall_promo_code_visible И promo_codes_enabled. Ни сети, ни хранилища.
 */
export function getPaywallControlVisibility(): PaywallControlVisibility {
  try {
    return Object.freeze({
      closeVisible: true,
      restoreVisible: true,
      promoVisible: getRemoteBool('paywall_promo_code_visible') && getRemoteBool('promo_codes_enabled'),
    });
  } catch (e) {
    // не глотаем молча: журнал показывает причину, а окно остаётся с крестиком и «Восстановить»
    console.warn('[PAYWALL-CONTROLS] чтение видимости промокода упало — промокод скрыт, закрыть и восстановить видны', e instanceof Error ? e.message : String(e)); // guard-ok: редкий отказ чтения настроек, нужен в релизе
    return SAFE_DEFAULT;
  }
}
