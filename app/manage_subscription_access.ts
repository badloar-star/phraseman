// ═══════════════════════════════════════════════════════════════════════════
// manage_subscription_access.ts — «Подписка Plus» показывает «Plus активирован» только при доступе.
//
// зачем (координатор 15.10, Макеты ed4f4a6ff): пуш premium_expiry_reminder ведёт в «Подписку Plus», а там строка «Plus активирован» была жёсткой, без проверки
// доступа — гость или человек с истёкшей подпиской видел неправду. Решение — чистая функция трёх исходов:
//   show    — доступ есть (или он ещё выясняется, но план пришёл маршрутом из Настроек, где кнопка «Plus активирован» существует только при доступе — мгновенное открытие);
//   wait    — доступ неизвестен и плана нет: тихий скелетон, а не «активирован» (без мигания);
//   paywall — доступ выяснен и его нет: уходим на обычный пейвол (источник notification_premium_expiry, контекст premium_expired), экран «активирован» не рисуем.
// Журнал: [PLUS-MANAGE] — доступ, источник, ветка.
// ═══════════════════════════════════════════════════════════════════════════
export type ManageAccessDecision = 'show' | 'wait' | 'paywall';

export type ManageAccessInput = Readonly<{
  hasPremiumAccess: boolean;
  accessResolved: boolean;
  /** План пришёл маршрутом (Настройки показывают эту кнопку только при доступе). */
  routePlanKnown: boolean;
  /** dev-подмена плана (только __DEV__): экран рисуется как есть. */
  devPlanOverride: boolean;
}>;

export type ManageAccessResult = Readonly<{ decision: ManageAccessDecision; reason: string }>;

export function decideManageAccess(input: ManageAccessInput): ManageAccessResult {
  if (input.devPlanOverride) return { decision: 'show', reason: 'dev_plan_override' };
  if (input.accessResolved) {
    return input.hasPremiumAccess
      ? { decision: 'show', reason: 'access_resolved_plus' }
      : { decision: 'paywall', reason: 'access_resolved_free' };
  }
  return input.routePlanKnown
    ? { decision: 'show', reason: 'access_unresolved_route_plan_known' }
    : { decision: 'wait', reason: 'access_unresolved_no_plan' };
}

/** Куда уводим человека без подписки. */
export const MANAGE_NO_ACCESS_PAYWALL = Object.freeze({
  pathname: '/premium_modal',
  params: Object.freeze({ context: 'premium_expired', source: 'notification_premium_expiry' }),
});
