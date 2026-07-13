import * as admin from 'firebase-admin';
import {
  adminApplyMoneyMutation, adminApproveMoneyMutation, adminPreviewMoneyMutation, adminRequestMoneyApproval,
} from './admin_money_operations';
import { documentVersion } from './admin_native_operations';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'phraseman-ea0b3';
const runIfEmulator = EMULATOR ? describe : describe.skip;
type Row = Record<string, unknown>;
function request(data: Row, uid: string) { return { data, auth: { uid, token: { admin: true, adminRole: 'admin' } }, app: { appId: 'admin-native-test' }, rawRequest: {} } as never; }
async function clear() { await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' }); }
async function approveAndApply(preview: Row, key: string) { await adminRequestMoneyApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one')); await adminApproveMoneyMutation.run(request({ previewId: preview.previewId, reason: 'Second administrator verified canonical state' }, 'admin-two')); return adminApplyMoneyMutation.run(request({ previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: key }, 'admin-one')); }

runIfEmulator('Admin Money Operations transactions', () => {
  beforeEach(clear);
  afterAll(async () => Promise.all(admin.apps.filter(Boolean).map((app) => app!.delete())));

  it('refunds atomically, requires a second admin, rejects stale state and replays idempotently', async () => {
    const db = admin.firestore(); const purchase = { status: 'completed', buyerStableId: 'buyer-1', priceShards: 25, packId: 'pack-1' };
    await Promise.all([db.collection('community_pack_purchases').doc('purchase-1').set(purchase), db.collection('users').doc('buyer-1').set({ shards: 10, progress: { user_name: 'Buyer' } })]);
    const preview = await adminPreviewMoneyMutation.run(request({ action: 'ugc-refund', targetId: 'purchase-1', reason: 'Verified duplicate purchase', expectedVersion: documentVersion('purchase-1', purchase), payload: { note: 'duplicate' } }, 'admin-one')) as unknown as Row;
    await adminRequestMoneyApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one'));
    await expect(adminApproveMoneyMutation.run(request({ previewId: preview.previewId, reason: 'Independent evidence review' }, 'admin-one'))).rejects.toMatchObject({ code: 'permission-denied' });
    await adminApproveMoneyMutation.run(request({ previewId: preview.previewId, reason: 'Independent evidence review' }, 'admin-two'));
    const input = { previewId: preview.previewId, confirmation: preview.confirmation, idempotencyKey: 'money-refund-1' };
    const first = await adminApplyMoneyMutation.run(request(input, 'admin-one')) as unknown as Row;
    const replay = await adminApplyMoneyMutation.run(request(input, 'admin-one')) as unknown as Row;
    expect(first).toMatchObject({ ok: true, replayed: false }); expect(replay).toMatchObject({ ok: true, replayed: true });
    await expect(adminApplyMoneyMutation.run(request(input, 'admin-three'))).rejects.toMatchObject({ code: 'already-exists' });
    expect((await db.collection('community_pack_purchases').doc('purchase-1').get()).data()).toMatchObject({ status: 'refunded' });
    expect((await db.collection('users').doc('buyer-1').get()).data()).toMatchObject({ shards: 35 });
    expect((await db.collection('admin_log').get()).size).toBe(1); expect((await db.collection('users').doc('buyer-1').collection('shard_log').get()).size).toBe(1);
  });

  it('does not approve or apply an expired preview', async () => {
    const db = admin.firestore(); const order = { status: 'paid', plan: 'month' }; await db.collection('web_premium_orders').doc('web-1').set(order);
    const preview = await adminPreviewMoneyMutation.run(request({ action: 'web-order-close', targetId: 'web-1', reason: 'Paid order verified', expectedVersion: documentVersion('web-1', order), payload: {} }, 'admin-one')) as unknown as Row;
    await adminRequestMoneyApproval.run(request({ previewId: preview.previewId, confirmation: preview.confirmation }, 'admin-one'));
    await Promise.all([db.collection('admin_native_operation_previews').doc(String(preview.previewId)).update({ expiresAtMs: 1 }), db.collection('admin_native_operation_approvals').doc(String(preview.previewId)).update({ expiresAtMs: 1 })]);
    await expect(adminApproveMoneyMutation.run(request({ previewId: preview.previewId, reason: 'Late approval' }, 'admin-two'))).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('activates a paid Telegram order by extending existing Plus and preserving unrelated progress', async () => {
    const db = admin.firestore(); const future = Date.now() + 90 * 86_400_000; const order = { status: 'paid', planDuration: '3_months', stableUid: 'telegram-user' }; const progress = { vip_active: 'true', vip_until: String(future), lesson_count: '44', premium_rc_product_id: 'store-kept' };
    await Promise.all([db.collection('telegram_premium_orders').doc('tg-1').set(order), db.collection('users').doc('telegram-user').set({ progress })]);
    const preview = await adminPreviewMoneyMutation.run(request({ action: 'telegram-activate', targetId: 'tg-1', reason: 'Paid Stars order reconciled', expectedVersion: documentVersion('tg-1', order), payload: {} }, 'admin-one')) as unknown as Row;
    await approveAndApply(preview, 'money-telegram-1'); const user = (await db.collection('users').doc('telegram-user').get()).data() as Row; const next = user.progress as Row;
    expect(Number(next.vip_until)).toBeGreaterThan(future); expect(next).toMatchObject({ lesson_count: '44', premium_rc_product_id: 'store-kept', vip_plan: 'telegram_paid' }); expect((await db.collection('telegram_premium_orders').doc('tg-1').get()).data()).toMatchObject({ status: 'vip_activated', activatedUserId: 'telegram-user' });
  });

  it('closes a paid web order and updates the complete three-plan checkout config', async () => {
    const db = admin.firestore(); const order = { status: 'paid_pending_manual_activation', plan: 'yearly' }; await db.collection('web_premium_orders').doc('web-2').set(order);
    const orderPreview = await adminPreviewMoneyMutation.run(request({ action: 'web-order-close', targetId: 'web-2', reason: 'Manual activation verified', expectedVersion: documentVersion('web-2', order), payload: {} }, 'admin-one')) as unknown as Row; await approveAndApply(orderPreview, 'money-web-order-2');
    expect((await db.collection('web_premium_orders').doc('web-2').get()).data()).toMatchObject({ status: 'activated' });
    const configPreview = await adminPreviewMoneyMutation.run(request({ action: 'web-checkout-config', targetId: 'config', reason: 'Approved pricing revision', expectedVersion: 'missing', payload: { priceCents: { monthly: 1099, yearly: 5099, lifetime: 10099 }, currency: 'eur', paypalLive: false } }, 'admin-one')) as unknown as Row; await approveAndApply(configPreview, 'money-web-config-1');
    expect((await db.collection('web_checkout').doc('config').get()).data()).toMatchObject({ priceCents: { monthly: 1099, yearly: 5099, lifetime: 10099 }, currency: 'eur', paypalLive: false });
  });
});
