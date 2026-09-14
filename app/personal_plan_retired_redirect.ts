import { actionToastTri, emitAppEvent } from './events';
import { markNextNavigationAsReplace } from './navigation_back';
import { PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE } from './personal_plan_sunset';

type RetiredPersonalPlanRouter = {
  replace: (href: any) => void;
};

/**
 * Personal Plan is retired for acquisition. A denied grandfathered route must
 * explain that fact and return to the free course, never use Plus checkout as
 * an accidental renewal path for a product that no longer exists.
 */
export function redirectRetiredPersonalPlan(router: RetiredPersonalPlanRouter): void {
  emitAppEvent('action_toast', actionToastTri('info', {
    ru: 'Personal Plan больше не продаётся. Все 32 основных урока остаются бесплатными.',
    uk: 'Personal Plan більше не продається. Усі 32 основні уроки залишаються безкоштовними.',
    en: 'Personal Plan is no longer sold. All 32 core lessons remain free.',
    es: 'Personal Plan ya no está a la venta. Las 32 lecciones principales siguen siendo gratis.',
    'pt-BR': 'O Personal Plan não está mais à venda. As 32 lições principais continuam grátis.',
    vi: 'Personal Plan không còn được bán. Cả 32 bài học chính vẫn miễn phí.',
    id: 'Personal Plan tidak lagi dijual. Semua 32 pelajaran utama tetap gratis.',
    tr: 'Personal Plan artık satılmıyor. 32 ana dersin tamamı ücretsiz kalıyor.',
    pl: 'Personal Plan nie jest już sprzedawany. Wszystkie 32 główne lekcje pozostają bezpłatne.',
  }));
  markNextNavigationAsReplace();
  router.replace(PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE as any);
}

export default function __RouteShim() { return null; }

