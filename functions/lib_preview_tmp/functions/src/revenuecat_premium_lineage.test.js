"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const revenuecat_premium_lineage_1 = require("./revenuecat_premium_lineage");
const premium_status_1 = require("./premium_status");
const NOW = 2000000;
const base = {
    id: 'evt-1',
    type: 'INITIAL_PURCHASE',
    app_id: 'app.phraseman',
    environment: 'PRODUCTION',
    store: 'APP_STORE',
    original_transaction_id: 'original-1',
    transaction_id: 'transaction-1',
    product_id: 'phraseman_premium_yearly',
    event_timestamp_ms: 1000000,
    expiration_at_ms: 4000000,
};
function normalized(overrides = {}) {
    const result = (0, revenuecat_premium_lineage_1.normalizePremiumLineageEvent)({ ...base, ...overrides });
    if (result.status !== 'ok')
        throw new Error(`unexpected quarantine: ${result.reason}`);
    return result.event;
}
function apply(current, overrides = {}) {
    return (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(current, normalized(overrides));
}
describe('RevenueCat canonical premium lineage reducer', () => {
    it('is order-safe: old expiration cannot revoke newer renewal', () => {
        const renewal = apply(null, {
            id: 'evt-renew', type: 'RENEWAL', event_timestamp_ms: 3000000, expiration_at_ms: 5000000,
        });
        expect(renewal.status).toBe('applied');
        const expiration = apply(renewal.state, {
            id: 'evt-expire-old', type: 'EXPIRATION', event_timestamp_ms: 2000000, expiration_at_ms: 2000000,
        });
        expect(expiration).toMatchObject({ status: 'stale', state: { revoked: false, activeThroughMs: 5000000 } });
    });
    it('is order-safe: old renewal cannot resurrect a newer refund', () => {
        const active = apply(null, { id: 'evt-active', type: 'RENEWAL', event_timestamp_ms: 2000000 });
        const refunded = apply(active.state, { id: 'evt-refund', type: 'REFUND', event_timestamp_ms: 4000000 });
        const oldRenewal = apply(refunded.state, { id: 'evt-old', type: 'RENEWAL', event_timestamp_ms: 3000000 });
        expect(oldRenewal).toMatchObject({ status: 'stale', state: { revoked: true } });
    });
    it('uses semantic rank at the same millisecond so a refund wins regardless of opaque ids or delivery order', () => {
        const renewal = normalized({ id: 'zzz-renewal', type: 'RENEWAL', event_timestamp_ms: 3000000 });
        const refund = normalized({ id: 'aaa-refund', type: 'REFUND', event_timestamp_ms: 3000000 });
        const renewalThenRefund = (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)((0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(null, renewal).state, refund).state;
        const refundThenRenewal = (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)((0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(null, refund).state, renewal).state;
        expect(renewalThenRefund).toMatchObject({ revoked: true, lastEventType: 'REFUND' });
        expect(refundThenRenewal).toMatchObject({ revoked: true, lastEventType: 'REFUND' });
    });
    it('keeps same-ms terminal transitions monotonic for lifetime and recurring lineages', () => {
        for (const product of ['premium_lifetime', 'premium_yearly']) {
            const purchase = apply(null, {
                id: `purchase-${product}`, type: product.includes('lifetime') ? 'NON_RENEWING_PURCHASE' : 'RENEWAL',
                product_id: product, event_timestamp_ms: 2000000,
                expiration_at_ms: product.includes('lifetime') ? undefined : 9000000,
            }).state;
            const terminalEvents = [
                normalized({ id: 'zzz-expiration', type: 'EXPIRATION', product_id: product, event_timestamp_ms: 3000000 }),
                normalized({ id: 'aaa-support', type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT', product_id: product, event_timestamp_ms: 3000000 }),
                normalized({ id: '000-refund', type: 'REFUND', product_id: product, event_timestamp_ms: 3000000 }),
            ];
            for (const order of [terminalEvents, [...terminalEvents].reverse()]) {
                const state = order.reduce((current, event) => (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(current, event).state, purchase);
                expect(state).toMatchObject({ revoked: true, lastEventType: 'REFUND' });
            }
        }
    });
    it('accepts exact event replay and rejects same-id different fingerprint without mutation', () => {
        const event = normalized();
        expect((0, revenuecat_premium_lineage_1.receiptReplayDecision)({ eventId: event.eventId, fingerprint: event.fingerprint }, event))
            .toBe('duplicate');
        const conflict = normalized({ product_id: 'phraseman_premium_monthly' });
        expect((0, revenuecat_premium_lineage_1.receiptReplayDecision)({ eventId: event.eventId, fingerprint: event.fingerprint }, conflict))
            .toBe('conflict');
    });
    it('derives a canonical bounded lineage and quarantines missing durable identity/time', () => {
        const a = (0, revenuecat_premium_lineage_1.canonicalPremiumLineageHash)(base);
        const b = (0, revenuecat_premium_lineage_1.canonicalPremiumLineageHash)({
            ...base,
            app_id: ' app.phraseman ', environment: 'production', store: 'app_store',
        });
        expect(a).toEqual(b);
        expect(a).toMatch(/^[a-f0-9]{64}$/);
        for (const field of ['id', 'app_id', 'environment', 'store', 'original_transaction_id', 'event_timestamp_ms']) {
            expect((0, revenuecat_premium_lineage_1.normalizePremiumLineageEvent)({ ...base, [field]: undefined })).toMatchObject({ status: 'quarantine' });
        }
        expect((0, revenuecat_premium_lineage_1.normalizePremiumLineageEvent)({ ...base, id: 'x'.repeat(257) })).toMatchObject({ status: 'quarantine' });
    });
    it('treats PRODUCT_CHANGE as metadata-only and never as a grant', () => {
        const productChange = apply(null, {
            id: 'evt-product', type: 'PRODUCT_CHANGE', event_timestamp_ms: 3000000,
            product_id: 'phraseman_premium_monthly', expiration_at_ms: 9000000,
        });
        expect(productChange).toMatchObject({ status: 'applied', state: { revoked: true, activeThroughMs: null } });
        const legacy = {
            premium_plan: 'yearly', premium_expiry: '0', premium_rc_product_id: 'premium_yearly',
            premium_rc_store: 'APP_STORE', premium_rc_event_type: 'RENEWAL',
        };
        expect((0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([productChange.state], legacy, NOW)).toMatchObject({
            status: 'ambiguous',
            progressPatch: { premium_plan: 'yearly', premium_rc_reconcile_needed: 'true' },
        });
    });
    it('keeps metadata and access ordering independent when PRODUCT_CHANGE arrives before an older activation', () => {
        const activation = normalized({ id: 'evt-renew-t2', type: 'RENEWAL', event_timestamp_ms: 2000000 });
        const metadata = normalized({
            id: 'evt-product-t3', type: 'PRODUCT_CHANGE', event_timestamp_ms: 3000000,
            product_id: 'phraseman_premium_monthly', expiration_at_ms: 9000000,
        });
        const activationThenMetadata = (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)((0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(null, activation).state, metadata).state;
        const metadataThenActivation = (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)((0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(null, metadata).state, activation).state;
        expect(activationThenMetadata).toMatchObject({ revoked: false, plan: 'yearly', productId: 'phraseman_premium_monthly' });
        expect(metadataThenActivation).toMatchObject({ revoked: false, plan: 'yearly', productId: 'phraseman_premium_monthly' });
    });
    it.each([
        ['CANCELLATION', { cancel_reason: 'UNSUBSCRIBE' }],
        ['BILLING_ISSUE', {}],
    ])('does not let newer metadata-only %s block a delayed first activation', (type, extra) => {
        const activation = normalized({ id: 'activation-t2', type: 'RENEWAL', event_timestamp_ms: 2000000 });
        const metadata = normalized({ id: `metadata-${type}`, type, event_timestamp_ms: 3000000, ...extra });
        const first = (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)((0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(null, activation).state, metadata).state;
        const second = (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)((0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(null, metadata).state, activation).state;
        expect(first).toMatchObject({ revoked: false, activeThroughMs: 4000000 });
        expect(second).toMatchObject({ revoked: false, activeThroughMs: 4000000 });
    });
    it('converges same-ms future support cancellation and recurring expiration to revoked', () => {
        const purchase = apply(null, { id: 'purchase', type: 'RENEWAL', event_timestamp_ms: 2000000 }).state;
        const support = normalized({
            id: 'zzz-support', type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT',
            event_timestamp_ms: 3000000, expiration_at_ms: 3500000,
        });
        const expiration = normalized({
            id: 'aaa-expiration', type: 'EXPIRATION', event_timestamp_ms: 3000000, expiration_at_ms: 3000000,
        });
        for (const order of [[support, expiration], [expiration, support]]) {
            const state = order.reduce((current, event) => (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(current, event).state, purchase);
            expect(state).toMatchObject({ revoked: true, lastAccessEventRank: 90 });
        }
    });
    it('chooses the tighter same-ms support expiry independent of opaque ids and order', () => {
        const purchase = apply(null, { id: 'purchase', type: 'RENEWAL', event_timestamp_ms: 2000000 }).state;
        const loose = normalized({
            id: 'zzz-loose', type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT',
            event_timestamp_ms: 3000000, expiration_at_ms: 3900000,
        });
        const tight = normalized({
            id: 'aaa-tight', type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT',
            event_timestamp_ms: 3000000, expiration_at_ms: 3500000,
        });
        for (const order of [[loose, tight], [tight, loose]]) {
            const state = order.reduce((current, event) => (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(current, event).state, purchase);
            expect(state).toMatchObject({ revoked: false, activeThroughMs: 3500000 });
        }
    });
    it('does not let an older future-support bound shorten a newer renewal regardless of delivery order', () => {
        const support = normalized({
            id: 'support-t2', type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT',
            event_timestamp_ms: 2000000, expiration_at_ms: 4000000,
        });
        const renewal = normalized({
            id: 'renewal-t3', type: 'RENEWAL', event_timestamp_ms: 3000000, expiration_at_ms: 5000000,
        });
        for (const order of [[support, renewal], [renewal, support]]) {
            const state = order.reduce((current, event) => (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(current, event).state, null);
            expect(state).toMatchObject({ revoked: false, activeThroughMs: 5000000 });
        }
    });
    it('never lets lifetime EXPIRATION grant or resurrect access', () => {
        const expiration = normalized({
            id: 'life-expire', type: 'EXPIRATION', product_id: 'premium_lifetime',
            event_timestamp_ms: 4000000, expiration_at_ms: undefined,
        });
        expect((0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(null, expiration).state).toMatchObject({ revoked: true });
        const purchase = apply(null, {
            id: 'life-buy', type: 'NON_RENEWING_PURCHASE', product_id: 'premium_lifetime',
            event_timestamp_ms: 2000000, expiration_at_ms: undefined,
        }).state;
        const refund = apply(purchase, {
            id: 'life-refund', type: 'REFUND', product_id: 'premium_lifetime',
            event_timestamp_ms: 3000000, expiration_at_ms: undefined,
        }).state;
        expect((0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(refund, expiration).state).toMatchObject({ revoked: true });
    });
    it('applies cancellation reason only to the exact lineage', () => {
        const active = apply(null, { id: 'evt-active', type: 'RENEWAL', event_timestamp_ms: 2000000 });
        const unsubscribe = apply(active.state, {
            id: 'evt-unsub', type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE', event_timestamp_ms: 2500000,
        });
        expect(unsubscribe.state).toMatchObject({ revoked: false, activeThroughMs: 4000000 });
        const support = apply(unsubscribe.state, {
            id: 'evt-support', type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT', event_timestamp_ms: 3000000,
            expiration_at_ms: 3500000,
        });
        expect(support.state).toMatchObject({ revoked: false, activeThroughMs: 3500000 });
        const lifetime = apply(null, {
            id: 'evt-life', type: 'NON_RENEWING_PURCHASE', product_id: 'premium_lifetime',
            event_timestamp_ms: 2000000, expiration_at_ms: undefined,
        });
        const lifetimeSupport = apply(lifetime.state, {
            id: 'evt-life-cancel', type: 'CANCELLATION', product_id: 'premium_lifetime',
            cancel_reason: 'CUSTOMER_SUPPORT', event_timestamp_ms: 3000000, expiration_at_ms: undefined,
        });
        expect(lifetimeSupport.state).toMatchObject({ revoked: true, activeThroughMs: null });
    });
    it('keeps lifetime active on EXPIRATION but revokes it on REFUND', () => {
        const lifetime = apply(null, {
            id: 'evt-life', type: 'NON_RENEWING_PURCHASE', product_id: 'premium_lifetime',
            event_timestamp_ms: 2000000, expiration_at_ms: undefined,
        }).state;
        const expired = apply(lifetime, {
            id: 'evt-life-expire', type: 'EXPIRATION', product_id: 'premium_lifetime',
            event_timestamp_ms: 3000000, expiration_at_ms: undefined,
        });
        expect(expired.state).toMatchObject({ revoked: false, plan: 'lifetime', activeThroughMs: null });
        const refunded = apply(expired.state, {
            id: 'evt-life-refund', type: 'REFUND', product_id: 'premium_lifetime',
            event_timestamp_ms: 4000000, expiration_at_ms: undefined,
        });
        expect(refunded.state).toMatchObject({ revoked: true, plan: 'lifetime' });
    });
    it('restores only the exact lineage on authoritative REFUND_REVERSED evidence and fences old reversal', () => {
        const purchase = apply(null, { id: 'buy', type: 'RENEWAL', event_timestamp_ms: 2000000 }).state;
        const refund = apply(purchase, { id: 'refund', type: 'REFUND', event_timestamp_ms: 3000000 }).state;
        const restored = apply(refund, {
            id: 'reversed', type: 'REFUND_REVERSED', event_timestamp_ms: 4000000, expiration_at_ms: 9000000,
        });
        expect(restored.state).toMatchObject({ revoked: false, activeThroughMs: 9000000 });
        const oldReversal = apply(refund, {
            id: 'old-reversed', type: 'REFUND_REVERSED', event_timestamp_ms: 2500000, expiration_at_ms: 9000000,
        });
        expect(oldReversal).toMatchObject({ status: 'stale', state: { revoked: true } });
        const lifetime = apply(null, {
            id: 'life-buy', type: 'NON_RENEWING_PURCHASE', product_id: 'premium_lifetime',
            event_timestamp_ms: 2000000, expiration_at_ms: undefined,
        }).state;
        const lifetimeRefund = apply(lifetime, {
            id: 'life-refund', type: 'REFUND', product_id: 'premium_lifetime',
            event_timestamp_ms: 3000000, expiration_at_ms: undefined,
        }).state;
        expect(apply(lifetimeRefund, {
            id: 'life-reversed', type: 'REFUND_REVERSED', product_id: 'premium_lifetime',
            event_timestamp_ms: 4000000, expiration_at_ms: undefined,
        }).state).toMatchObject({ revoked: false, plan: 'lifetime', activeThroughMs: null });
    });
    it.each([
        ['REFUND', {}],
        ['CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT' }],
    ])('lets an authoritative same-ms REFUND_REVERSED supersede %s in either delivery order', (terminalType, extra) => {
        const purchase = apply(null, { id: 'same-ms-buy', type: 'RENEWAL', event_timestamp_ms: 2000000 }).state;
        const terminal = normalized({
            id: `same-ms-${terminalType}`, type: terminalType, event_timestamp_ms: 3000000,
            expiration_at_ms: terminalType === 'CANCELLATION' ? 3000000 : undefined,
            ...extra,
        });
        const reversal = normalized({
            id: 'same-ms-reversal', type: 'REFUND_REVERSED', event_timestamp_ms: 3000000,
            expiration_at_ms: 9000000,
        });
        for (const order of [[terminal, reversal], [reversal, terminal]]) {
            const state = order.reduce((current, event) => (0, revenuecat_premium_lineage_1.applyPremiumLineageEvent)(current, event).state, purchase);
            expect(state).toMatchObject({ revoked: false, activeThroughMs: 9000000, lastEventType: 'REFUND_REVERSED' });
        }
    });
    it('refunds only one lineage and aggregates the other active lineage', () => {
        const first = apply(null, { id: 'evt-a', original_transaction_id: 'original-a' }).state;
        const second = apply(null, { id: 'evt-b', original_transaction_id: 'original-b', expiration_at_ms: 6000000 }).state;
        const firstRefunded = apply(first, {
            id: 'evt-a-refund', type: 'REFUND', original_transaction_id: 'original-a', event_timestamp_ms: 3000000,
        }).state;
        const aggregate = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([firstRefunded, second], {}, NOW);
        expect(aggregate).toMatchObject({ status: 'project', winnerLineageHash: second.lineageHash });
        expect(aggregate.progressPatch).toMatchObject({
            premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: '6000000',
        });
    });
    it.each([
        ['yearly', 'REFUND'],
        ['lifetime', 'REFUND'],
        ['yearly', 'EXPIRATION'],
    ])('clears a sole canonical %s projection after %s', (plan, terminalType) => {
        const productId = plan === 'lifetime' ? 'premium_lifetime' : 'premium_yearly';
        const purchase = apply(null, {
            id: `purchase-${plan}`, type: plan === 'lifetime' ? 'NON_RENEWING_PURCHASE' : 'RENEWAL',
            product_id: productId, event_timestamp_ms: 2000000,
            expiration_at_ms: plan === 'lifetime' ? undefined : 9000000,
        }).state;
        const granted = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([purchase], {}, 3000000);
        expect(granted.progressPatch).toMatchObject({ premium_plan: plan, premium_rc_store: 'APP_STORE' });
        const terminal = apply(purchase, {
            id: `terminal-${plan}`, type: terminalType, product_id: productId, event_timestamp_ms: 4000000,
            expiration_at_ms: terminalType === 'EXPIRATION' ? 4000000 : undefined,
        }).state;
        const cleared = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([terminal], granted.progressPatch, 4000000);
        expect(cleared).toMatchObject({ status: 'project', progressPatch: { premium_plan: '', premium_expiry: '4000000' } });
    });
    it('uses deterministic lifetime-first aggregate and preserves non-RC access fields', () => {
        const yearly = apply(null, { id: 'evt-year', expiration_at_ms: 9000000 }).state;
        const lifetime = apply(null, {
            id: 'evt-life', original_transaction_id: 'original-life', product_id: 'premium_lifetime',
            type: 'NON_RENEWING_PURCHASE', expiration_at_ms: undefined,
        }).state;
        const existing = {
            admin_premium_override: 'true', vip_active: 'true', premium_gift_until: '9999999', manual_access_note: 'keep',
        };
        const aggregate = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([yearly, lifetime], existing, NOW);
        expect(aggregate).toMatchObject({ status: 'project', winnerLineageHash: lifetime.lineageHash });
        expect(aggregate.progressPatch).toMatchObject({
            premium_plan: 'lifetime', premium_expiry: '0',
            admin_premium_override: 'false', vip_active: 'true',
            premium_gift_until: '9999999', manual_access_note: 'keep',
        });
    });
    it.each(['9000000', '0'])('migrates finite/lifetime legacy admin authority to VIP while projecting RC (expiry=%s)', (adminExpiry) => {
        const admin = {
            premium_plan: 'admin_grant', premium_expiry: adminExpiry, admin_premium_override: 'true',
            premium_admin_grant_at: '123456', manual_access_note: 'keep',
        };
        const rc = apply(null).state;
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([rc], admin, NOW).progressPatch;
        expect(projected).toMatchObject({
            premium_plan: 'yearly', premium_expiry: '0', admin_premium_override: 'false',
            vip_active: 'true', vip_plan: 'admin_vip', vip_from: '123456', vip_until: adminExpiry,
            vip_admin_override: 'true', vip_admin_grant_at: '123456',
            vip_migrated_from_admin_grant_at: String(NOW), manual_access_note: 'keep',
        });
        const refunded = apply(rc, { id: 'refund-admin', type: 'REFUND', event_timestamp_ms: 3000000 }).state;
        expect((0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([refunded], projected, NOW).progressPatch).toMatchObject({
            premium_plan: '', admin_premium_override: 'false', vip_active: 'true', vip_until: adminExpiry,
            manual_access_note: 'keep',
        });
    });
    it('projects active RC when a legacy admin marker is already expired', () => {
        const rc = apply(null, { expiration_at_ms: 6000000 }).state;
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([rc], {
            premium_plan: 'admin_grant', premium_expiry: String(NOW - 1), admin_premium_override: 'true',
            premium_admin_grant_at: '123456',
        }, NOW).progressPatch;
        expect(projected).toMatchObject({
            premium_plan: 'yearly', premium_expiry: '0', admin_premium_override: 'false',
            vip_active: 'false', vip_plan: '', vip_until: String(NOW - 1), vip_admin_override: 'false',
            premium_rc_expiry_ms: '6000000',
        });
        expect((0, premium_status_1.isPremiumAccessActive)(projected, NOW + 1)).toBe(true);
    });
    it('keeps canonical RC access after a migrated finite admin grant expires', () => {
        const rc = apply(null, { expiration_at_ms: 8000000 }).state;
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([rc], {
            premium_plan: 'admin_grant', premium_expiry: String(NOW + 1000), admin_premium_override: 'true',
            premium_admin_grant_at: '123456',
        }, NOW).progressPatch;
        expect(projected).toMatchObject({
            premium_plan: 'yearly', premium_expiry: '0', admin_premium_override: 'false',
            vip_active: 'true', vip_until: String(NOW + 1000), premium_rc_expiry_ms: '8000000',
        });
        expect((0, premium_status_1.isPremiumAccessActive)(projected, NOW + 2000)).toBe(true);
    });
    it('treats an expired Timestamp-like admin window as expired instead of lifetime', () => {
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([apply(null).state], {
            premium_plan: 'admin_grant',
            premium_expiry: { toMillis: () => NOW - 1 },
            admin_premium_override: 'true',
        }, NOW).progressPatch;
        expect(projected).toMatchObject({
            premium_plan: 'yearly', admin_premium_override: 'false',
            vip_active: 'false', vip_until: String(NOW - 1),
        });
    });
    it('preserves a stronger Timestamp-like VIP window over a finite admin grant', () => {
        const vipUntil = NOW + 10000;
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([apply(null).state], {
            premium_plan: 'admin_grant', premium_expiry: { seconds: (NOW + 1000) / 1000 },
            admin_premium_override: 'true', premium_admin_grant_at: '123456',
            vip_active: 'true', vip_plan: 'referral_vip', vip_until: { toMillis: () => vipUntil },
            vip_admin_override: 'true',
        }, NOW).progressPatch;
        expect(projected).toMatchObject({
            premium_plan: 'yearly', admin_premium_override: 'false',
            vip_active: 'true', vip_plan: 'referral_vip',
        });
        expect(projected.vip_until).toEqual({ toMillis: expect.any(Function) });
    });
    it('preserves an existing VIP representation while retiring the legacy admin marker', () => {
        const rc = apply(null).state;
        const existingVip = {
            vip_active: 'true', vip_plan: 'referral_vip', vip_from: '111', vip_until: '9999999',
            vip_admin_override: 'true', vip_admin_grant_at: '222',
        };
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([rc], {
            premium_plan: 'admin_grant', premium_expiry: '9000000', admin_premium_override: 'true',
            ...existingVip,
        }, NOW).progressPatch;
        expect(projected).toMatchObject({
            ...existingVip,
            premium_plan: 'yearly', premium_expiry: '0', admin_premium_override: 'false',
        });
    });
    it.each([
        ['0', '3000000'],
        ['9000000', '3000000'],
    ])('keeps the stronger legacy admin window when an existing VIP is shorter (admin=%s, vip=%s)', (adminExpiry, vipUntil) => {
        const rc = apply(null).state;
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([rc], {
            premium_plan: 'admin_grant', premium_expiry: adminExpiry, admin_premium_override: 'true',
            premium_admin_grant_at: '123456',
            vip_active: 'true', vip_plan: 'referral_vip', vip_from: '111', vip_until: vipUntil,
            vip_admin_override: 'true', vip_admin_grant_at: '222',
        }, NOW).progressPatch;
        expect(projected).toMatchObject({
            premium_plan: 'yearly', admin_premium_override: 'false',
            vip_active: 'true', vip_plan: 'admin_vip', vip_from: '123456', vip_until: adminExpiry,
        });
        const refunded = apply(rc, { id: `refund-${adminExpiry}`, type: 'REFUND', event_timestamp_ms: 3000000 }).state;
        const afterRefund = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([refunded], projected, 4000000).progressPatch;
        expect((0, premium_status_1.isPremiumAccessActive)(afterRefund, 4000000)).toBe(true);
    });
    it('does not resurrect an explicitly revoked legacy admin grant while projecting RC', () => {
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([apply(null).state], {
            premium_plan: 'admin_grant', premium_expiry: '0', admin_premium_override: 'false',
            premium_admin_grant_at: '123456',
        }, NOW).progressPatch;
        expect(projected).toMatchObject({
            premium_plan: 'yearly', premium_expiry: '0', admin_premium_override: 'false',
            premium_rc_expiry_ms: '4000000',
        });
        expect(projected).not.toHaveProperty('vip_active');
        expect(projected).not.toHaveProperty('vip_admin_override');
    });
    it.each([
        [String(NOW - 1), 'false'],
        [String(NOW + 1000), 'true'],
    ])('retires override-only legacy authority and projects RC (admin expiry=%s)', (adminExpiry, expectedVipActive) => {
        const projected = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([apply(null, { expiration_at_ms: 8000000 }).state], {
            premium_plan: 'yearly', premium_expiry: adminExpiry, admin_premium_override: 'true',
            premium_admin_grant_at: '123456',
        }, NOW).progressPatch;
        expect(projected).toMatchObject({
            premium_plan: 'yearly', premium_expiry: '0', admin_premium_override: 'false',
            vip_active: expectedVipActive, premium_rc_expiry_ms: '8000000',
        });
        expect((0, premium_status_1.isPremiumAccessActive)(projected, NOW + 2000)).toBe(true);
    });
    it('uses yearly before monthly when activeThrough is equal, then lineage hash only as the final tie-break', () => {
        const monthly = apply(null, {
            id: 'evt-month', original_transaction_id: 'original-month', product_id: 'premium_monthly',
            expiration_at_ms: 9000000,
        }).state;
        const yearly = apply(null, {
            id: 'evt-year', original_transaction_id: 'original-year', product_id: 'premium_yearly',
            expiration_at_ms: 9000000,
        }).state;
        expect((0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([monthly, yearly], {}, NOW).winnerLineageHash).toBe(yearly.lineageHash);
        expect((0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([yearly, monthly], {}, NOW).winnerLineageHash).toBe(yearly.lineageHash);
    });
    it('fails closed on owner-candidate overflow instead of silently truncating identities', () => {
        expect((0, revenuecat_premium_lineage_1.boundPremiumOwnerCandidates)(Array.from({ length: 16 }, (_, index) => `owner-${index}`)))
            .toMatchObject({ status: 'ok' });
        expect((0, revenuecat_premium_lineage_1.boundPremiumOwnerCandidates)(Array.from({ length: 17 }, (_, index) => `owner-${index}`)))
            .toEqual({ status: 'quarantine', reason: 'owner_candidate_overflow' });
    });
    it('bounds aggregate input and only clears a strict legacy RC sentinel', () => {
        const active = apply(null).state;
        expect((0, revenuecat_premium_lineage_1.aggregatePremiumLineages)(Array.from({ length: 65 }, () => active), {}, NOW))
            .toMatchObject({ status: 'ambiguous' });
        const ambiguous = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([], { premium_plan: 'yearly' }, NOW);
        expect(ambiguous).toMatchObject({ status: 'ambiguous', progressPatch: { premium_plan: 'yearly', premium_rc_reconcile_needed: 'true' } });
        const strict = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([], {
            premium_plan: 'yearly',
            premium_rc_product_id: 'phraseman_premium_yearly',
            premium_rc_store: 'APP_STORE',
            premium_rc_event_type: 'RENEWAL',
        }, NOW);
        expect(strict).toMatchObject({ status: 'project', progressPatch: { premium_plan: '', premium_expiry: String(NOW) } });
    });
    it('preserves the existing 72-hour RC expiry grace seam during billing issue metadata', () => {
        const active = apply(null, {
            id: 'renew', type: 'RENEWAL', event_timestamp_ms: 2000000, expiration_at_ms: 4000000,
        }).state;
        const billing = apply(active, {
            id: 'billing', type: 'BILLING_ISSUE', event_timestamp_ms: 4500000, expiration_at_ms: 4000000,
        }).state;
        const withinGrace = (0, revenuecat_premium_lineage_1.aggregatePremiumLineages)([billing], {}, 4000000 + (71 * 60 * 60 * 1000));
        expect(withinGrace.progressPatch).toMatchObject({
            premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: '4000000',
        });
    });
});
//# sourceMappingURL=revenuecat_premium_lineage.test.js.map