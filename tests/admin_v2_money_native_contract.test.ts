import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string): string => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';

describe('Admin v2 native Money Operations', () => {
  test('ships isolated state, controller, view and six guarded callables', () => {
    const state = read('admin/v2/scripts/admin-money-operations-state.js');
    const controller = read('admin/v2/scripts/admin-money-operations-controller.js');
    const view = read('admin/v2/scripts/admin-money-operations-view.js');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    expect(state).toContain('createMoneyOperationsState');
    expect(controller).toContain('createMoneyOperationsController');
    expect(view).toContain('renderMoneyOperationsWorkspace');
    for (const callable of [
      'adminGetMoneyOperationsWorkspace', 'adminGetMoneyOperationDetail', 'adminPreviewMoneyMutation',
      'adminRequestMoneyApproval', 'adminApproveMoneyMutation', 'adminApplyMoneyMutation',
    ]) expect(firebase).toContain(callable);
  });

  test('covers all five legacy capabilities with bounded, permission-aware views', () => {
    const state = read('admin/v2/scripts/admin-money-operations-state.js');
    const view = read('admin/v2/scripts/admin-money-operations-view.js');
    for (const id of ['ugc-purchases', 'refunds', 'referrals', 'telegram-payments', 'website-payments']) {
      expect(`${state}\n${view}`).toContain(id);
    }
    expect(view).toContain('money.read');
    expect(view).toContain('sourceHealth');
    expect(view).toContain('truncated');
    expect(view).toContain('data-money-mobile-view');
  });

  test('makes provider refunds read-only and protects every local money mutation', () => {
    const controller = read('admin/v2/scripts/admin-money-operations-controller.js');
    const view = read('admin/v2/scripts/admin-money-operations-view.js');
    expect(`${controller}\n${view}`).toContain('provider-owned');
    for (const permission of ['money.refunds.write', 'money.payment_orders.write', 'money.payment_config.write', 'money.approve']) {
      expect(`${controller}\n${view}`).toContain(permission);
    }
    for (const field of ['reason', 'confirmation', 'idempotencyKey', 'expectedVersion']) {
      expect(controller).toContain(field);
    }
  });
});

