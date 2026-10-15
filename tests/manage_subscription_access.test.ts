// зачем (координатор 15.10, Макеты ed4f4a6ff): «Plus активирован» на экране «Подписка Plus» — только при доступе. Три случая: Plus, Free, доступ неизвестен (+ план из маршрута, dev-подмена).
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';
import { MANAGE_NO_ACCESS_PAYWALL, decideManageAccess } from '../app/manage_subscription_access';

const base = { hasPremiumAccess: false, accessResolved: false, routePlanKnown: false, devPlanOverride: false };

describe('решение экрана «Подписка Plus»', () => {
  it('Plus: доступ выяснен и есть — показываем «Plus активирован»', () => {
    expect(decideManageAccess({ ...base, hasPremiumAccess: true, accessResolved: true })).toEqual({ decision: 'show', reason: 'access_resolved_plus' });
  });
  it('Free: доступ выяснен и нет — уходим на пейвол, «активирован» не показываем', () => {
    expect(decideManageAccess({ ...base, accessResolved: true })).toEqual({ decision: 'paywall', reason: 'access_resolved_free' });
    // даже если план когда-то пришёл маршрутом: правда важнее
    expect(decideManageAccess({ ...base, accessResolved: true, routePlanKnown: true }).decision).toBe('paywall');
  });
  it('доступ неизвестен: без плана — тихий скелетон; с планом из Настроек — мгновенное открытие', () => {
    expect(decideManageAccess(base)).toEqual({ decision: 'wait', reason: 'access_unresolved_no_plan' });
    expect(decideManageAccess({ ...base, routePlanKnown: true })).toEqual({ decision: 'show', reason: 'access_unresolved_route_plan_known' });
  });
  it('dev-подмена плана всегда показывает экран', () => {
    expect(decideManageAccess({ ...base, devPlanOverride: true }).decision).toBe('show');
  });
  it('человек без подписки уходит на пейвол с допустимым источником и контекстом', () => {
    expect(MANAGE_NO_ACCESS_PAYWALL.pathname).toBe('/premium_modal');
    expect(MANAGE_NO_ACCESS_PAYWALL.params).toEqual({ context: 'premium_expired', source: 'notification_premium_expiry' });
    const contract = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app/paywall_entry_contract.ts'), 'utf8'));
    expect(contract).toContain("'notification_premium_expiry'");
  });
});

describe('экран «Подписка Plus» — подключение', () => {
  const src = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app/manage_subscription.tsx'), 'utf8'));
  it('журнал [PLUS-MANAGE], переход одним replace, скелетон вместо «активирован»', () => {
    expect(src).toContain('[PLUS-MANAGE] решение=');
    expect(src).toContain("router.replace({ pathname: MANAGE_NO_ACCESS_PAYWALL.pathname");
    expect(src).toContain('manage-subscription-access-skeleton');
    expect(src.indexOf("if (manageGate.decision !== 'show')")).toBeLessThan(src.indexOf('manage-subscription-status-card'));
  });
});
