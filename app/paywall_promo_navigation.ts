// paywall_promo_navigation.ts — «Промокод» из пейвола: экран ввода заменяет пейвол, а «закрыть» возвращает в пейвол.
//
// зачем (правило владельца «нет окна внутри окна» + «назад ведёт туда, откуда пришёл»; сторож paywall_v3_source_contract; Ревизор, Макеты, координатор 26.10):
//   • открытие — router.replace, а не push: промокод встаёт на место пейвола, второго окна над окном Plus нет;
//   • закрытие промокода, открытого ИЗ пейвола, — снова пейвол тем же replace с теми же context и source (пейвол сам вернёт человека на экран-источник);
//     куда именно вести — решает чистая проверенная по контракту функция promoCloseTarget (app/paywall_promo_close_target.ts);
//   • промокод применён — как раньше (Plus активен, итог на экране награды); открыт не из пейвола — как раньше (safeRouterBack).
// Отдельный файл, а не app/paywall_navigation.ts: тот модуль импортируют тесты с урезанным react-native, а navigation_back тянет конфиг с Platform.
import { markNextNavigationAsReplace } from './navigation_back';

type PromoRouter = { replace: (href: any) => void };

type RouteParam = string | string[] | undefined | null;

const first = (value: RouteParam): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
};

/** Вход пейвола, из которого открыт промокод: возвращаемся с ним же. */
export type PaywallEntryOrigin = Readonly<{ context?: string | null; source?: string | null }>;

export function openPromoCodeFromPaywall(router: PromoRouter, origin: PaywallEntryOrigin = {}): void {
  const context = first(origin.context ?? undefined);
  const source = first(origin.source ?? undefined);
  console.log('[PAYWALL-OPEN] промокод: replace пейвола (окно в окне запрещено)', JSON.stringify({ context, source })); // guard-ok: одна строка на тап по ссылке «Промокод»
  markNextNavigationAsReplace();
  router.replace({
    pathname: '/promo_code_entry',
    params: { source: 'paywall', ...(context ? { paywall_context: context } : {}), ...(source ? { paywall_source: source } : {}) },
  });
}
