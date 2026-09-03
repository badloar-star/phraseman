import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'functions/src/web_checkout.ts'), 'utf8');
const exportsSource = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');
const liveAdmin = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const jarvisContract = fs.readFileSync(path.join(root, 'functions/src/jarvis/jarvis_data_contract_guard.test.ts'), 'utf8');

describe('live admin Stripe renewal cancellation contract', () => {
  test('server action is authenticated, money-authorized, idempotent and period-end only', () => {
    expect(server).toContain("import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';");
    expect(server).toContain('export const adminCancelStripeSubscriptionRenewal = onCall(');
    expect(server).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(server).toContain("secrets: [STRIPE_SECRET_KEY]");
    expect(server).toContain("hasClaimedPermission(auth.token, 'money.manual_access.write')");
    expect(server).toContain("form.set('cancel_at_period_end', 'true')");
    expect(server).toContain("'Idempotency-Key': operationId");
    expect(server).toContain('assertStripeSubscriptionOrderBinding(');
    expect(server).toContain('metadata.orderId');
    expect(server).not.toContain("form.set('cancel_at_period_end', 'false')");
    expect(server).not.toContain('stripe.subscriptions.del');
    expect(exportsSource).toContain('adminCancelStripeSubscriptionRenewal');
  });

  test('result is audited immutably and browser cannot spoof cancellation projection fields', () => {
    expect(server).toContain("tx.create(auditRef");
    expect(server).toContain("action: 'stripe_subscription_cancel_at_period_end'");
    expect(server).toContain("tx.update(orderRef");
    expect(rules).toContain("'stripeCancelAtPeriodEnd'");
    expect(rules).toContain("'stripeCancellationOperationId'");
    expect(jarvisContract).toContain("collection: 'web_premium_orders'");
    expect(jarvisContract).toContain("fields: ['stripeCancelAtPeriodEnd', 'stripeCancellationOperationId', 'stripeAccessEndsAtMs', 'stripeCancellationRequestedAtMs']");
  });

  test('the only live admin source provides lookup, explicit confirmation and visible states', () => {
    const start = liveAdmin.indexOf('<div id="tab-site-admin"');
    const end = liveAdmin.indexOf('<!-- REPORTS TAB -->', start);
    const section = liveAdmin.slice(start, end);
    expect(section).toContain('id="stripe-cancel-lookup"');
    expect(section).toContain('id="stripe-cancel-search"');
    expect(section).toContain('id="stripe-cancel-results"');
    expect(section).toContain('adminCancelStripeSubscriptionRenewal');
    expect(section).toContain('Остановить автопродление');
    expect(section).toContain('Доступ останется до конца уже оплаченного периода');
    expect(section).toContain('aria-live="polite"');
    expect(section).toContain('aria-busy');
    expect(section).not.toContain('api.stripe.com');
    const runtimeStart = liveAdmin.indexOf('let _fnAdminCancelStripeSubscriptionRenewal');
    const runtimeEnd = liveAdmin.indexOf('// Reusable Phase-1 primitives.', runtimeStart);
    const runtime = liveAdmin.slice(runtimeStart, runtimeEnd);
    expect(runtime).toContain("createAdminAuthCallable('adminCancelStripeSubscriptionRenewal')");
    expect(runtime).toContain('crypto.randomUUID()');
    expect(runtime).not.toContain('button.disabled = alreadyCancelled');
    expect(runtime).not.toContain('updateDoc(');
    expect(runtime).not.toContain('setDoc(');
    expect(runtime).not.toContain('deleteDoc(');
  });
});
