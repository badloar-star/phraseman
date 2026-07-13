import { buildMoneyMutationPlan, buildTelegramVipProgress, parseMoneyWorkspaceInput } from './admin_money_operations';
import { csvCell, documentVersion } from './admin_native_operations';

describe('Admin native Money Operations', () => {
  it('bounds workspace input and rejects unknown capabilities', () => {
    expect(parseMoneyWorkspaceInput({ capabilityId: 'refunds', limit: 999 })).toEqual({ capabilityId: 'refunds', limit: 100, cursor: '', query: '', status: '' });
    expect(() => parseMoneyWorkspaceInput({ capabilityId: 'unknown' })).toThrow('invalid_money_capability');
  });

  it('keeps provider refunds read-only', () => {
    expect(() => buildMoneyMutationPlan('provider-refund', 'row', {}, {})).toThrow('provider-owned');
  });

  it('builds bounded plans from canonical records', () => {
    const plan = buildMoneyMutationPlan('web-order-close', 'order-1', { status: 'paid' }, {});
    expect(plan.collection).toBe('web_premium_orders');
    expect(plan.requiredPermission).toBe('money.payment_orders.write');
    expect(plan.consequence).toContain('activated');
  });

  it('produces stable versions and safe CSV cells', () => {
    expect(documentVersion('a', { x: 1 })).toBe(documentVersion('a', { x: 1 }));
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
  });

  it('extends Telegram-paid VIP from an existing future expiry without marking it revoked', () => {
    expect(buildTelegramVipProgress(1_700_000_000_000, 3, 1_800_000_000_000)).toEqual({
      vip_active: 'true',
      vip_plan: 'telegram_paid',
      vip_from: '1700000000000',
      vip_until: '1807776000000',
      vip_admin_override: 'true',
      vip_admin_grant_at: '1700000000000',
    });
  });
});
