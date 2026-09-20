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
    ru: 'Personal Plan больше не продаётся. Первые три урока доступны бесплатно, продолжение курса — с Plus.',
    uk: 'Personal Plan більше не продається. Перші три уроки доступні безкоштовно, продовження курсу — з Plus.',
    en: 'Personal Plan is no longer sold. The first three lessons are free; continue the course with Plus.',
    es: 'Personal Plan ya no está a la venta. Las tres primeras lecciones son gratis; continúa el curso con Plus.',
    'pt-BR': 'O Personal Plan não está mais à venda. As três primeiras lições são grátis; continue o curso com o Plus.',
    vi: 'Personal Plan không còn được bán. Ba bài học đầu tiên miễn phí; hãy tiếp tục khóa học với Plus.',
    id: 'Personal Plan tidak lagi dijual. Tiga pelajaran pertama gratis; lanjutkan kursus dengan Plus.',
    tr: 'Personal Plan artık satılmıyor. İlk üç ders ücretsiz; kursa Plus ile devam et.',
    pl: 'Personal Plan nie jest już sprzedawany. Pierwsze trzy lekcje są bezpłatne; kontynuuj kurs z Plus.',
  }));
  markNextNavigationAsReplace();
  router.replace(PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE as any);
}

export default function __RouteShim() { return null; }
