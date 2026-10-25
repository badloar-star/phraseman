// paywall_promo_navigation.ts — «Промокод» из пейвола: экран ввода заменяет пейвол, а не ложится поверх него.
//
// зачем (правило владельца «нет окна внутри окна», сторож paywall_v3_source_contract; Ревизор + координатор 26.10): ссылка «Промокод» в пейволе открывала ввод через router.push —
// второе окно над окном Plus. Теперь replace: человек видит ввод кода на месте пейвола, «закрыть» возвращает на экран, откуда пришли (пейвол лежал поверх него),
// удачный код закрывает экран сам. Сторож не ослаблен — в файлах пейвола router.push по-прежнему запрещён.
// Отдельный файл, а не app/paywall_navigation.ts: тот модуль импортируют тесты с урезанным react-native, а navigation_back тянет конфиг с Platform.
import { markNextNavigationAsReplace } from './navigation_back';

type PromoRouter = { replace: (href: any) => void };

export function openPromoCodeFromPaywall(router: PromoRouter): void {
  console.log('[PAYWALL-OPEN] промокод: replace пейвола (окно в окне запрещено)'); // guard-ok: одна строка на тап по ссылке «Промокод»
  markNextNavigationAsReplace();
  router.replace({ pathname: '/promo_code_entry', params: { source: 'paywall' } });
}
