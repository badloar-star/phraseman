import { buildMoneyMutationPlan, parseMoneyWorkspaceInput } from './admin_money_operations';
import { csvCell, documentVersion } from './admin_native_operations';

describe('Admin native Money Operations', () => {
  it('bounds workspace input and rejects unknown capabilities', () => {
    expect(parseMoneyWorkspaceInput({ capabilityId: 'refunds', limit: 999 })).toEqual({ capabilityId: 'refunds', limit: 100, cursor: '' });
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
});
