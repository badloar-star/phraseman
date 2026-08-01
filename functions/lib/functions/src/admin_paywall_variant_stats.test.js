"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FakeHttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
    onCall: (optsOrHandler, maybeHandler) => typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));
const store = new Map();
function tsMillis(value) {
    if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    return Number(value);
}
function fakeQuery(name, filters, cursorId) {
    return {
        where(field, op, value) {
            if (op !== '>=')
                throw new Error(`fake query supports only >=, got ${op}`);
            return fakeQuery(name, [...filters, { field, value }], cursorId);
        },
        orderBy(field, dir) {
            return {
                limit(count) {
                    return {
                        startAfter(cursor) {
                            return fakeQuery(name, filters, cursor.id).orderBy(field, dir).limit(count);
                        },
                        get: async () => {
                            let rows = (store.get(name) ?? [])
                                .filter((doc) => filters.every((filter) => tsMillis(doc.data[filter.field]) >= tsMillis(filter.value)))
                                .sort((a, b) => tsMillis(b.data[field]) - tsMillis(a.data[field]));
                            if (cursorId != null) {
                                const cursorIndex = rows.findIndex((doc) => doc.id === cursorId);
                                rows = cursorIndex >= 0 ? rows.slice(cursorIndex + 1) : rows;
                            }
                            const page = rows.slice(0, count);
                            return {
                                empty: page.length === 0,
                                size: page.length,
                                docs: page.map((doc) => ({ id: doc.id, exists: true, data: () => doc.data })),
                            };
                        },
                    };
                },
            };
        },
    };
}
function fakeDb() {
    return { collection: (name) => fakeQuery(name, [], null) };
}
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => fakeDb());
    firestore.Timestamp = {
        fromMillis: (ms) => ({ toMillis: () => ms }),
    };
    return { firestore };
});
const ADMIN_AUTH = { uid: 'admin-1', token: { admin: true, adminRole: 'owner' } };
function seed(collection, id, data) {
    const docs = store.get(collection) ?? [];
    docs.push({ id, data });
    store.set(collection, docs);
}
function funnelDoc(overrides = {}) {
    return { step: 'shown', variant: 'A', context: 'generic', plan: null, ts: 1, dev: false, ...overrides };
}
function priceEvent(overrides = {}) {
    return {
        eventType: 'INITIAL_PURCHASE',
        environment: 'PRODUCTION',
        billingCadence: 'yearly',
        grossUsdMicros: 20000000,
        createdAt: { toMillis: () => 1 },
        ...overrides,
    };
}
function loadModule() {
    return require('./admin_paywall_variant_stats');
}
beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
    store.clear();
});
afterEach(() => {
    jest.useRealTimers();
});
// ── parsePaywallVariantStatsRange ────────────────────────────────────────────
describe('parsePaywallVariantStatsRange', () => {
    it('accepts 7, 30 and 90 and defaults to 30', () => {
        const { parsePaywallVariantStatsRange } = loadModule();
        expect(parsePaywallVariantStatsRange({ rangeDays: 7 })).toBe(7);
        expect(parsePaywallVariantStatsRange({ rangeDays: 30 })).toBe(30);
        expect(parsePaywallVariantStatsRange({ rangeDays: 90 })).toBe(90);
        expect(parsePaywallVariantStatsRange(undefined)).toBe(30);
        expect(parsePaywallVariantStatsRange({})).toBe(30);
    });
    it('rejects unsupported ranges', () => {
        const { parsePaywallVariantStatsRange } = loadModule();
        for (const rangeDays of [0, 1, 28, 365, '30', Number.NaN]) {
            expect(() => parsePaywallVariantStatsRange({ rangeDays })).toThrow(FakeHttpsError);
        }
        try {
            parsePaywallVariantStatsRange({ rangeDays: 28 });
        }
        catch (error) {
            expect(error.code).toBe('invalid-argument');
        }
    });
});
// ── averagePlanPricesUsdMicros ───────────────────────────────────────────────
describe('averagePlanPricesUsdMicros', () => {
    it('averages only production origin purchases with positive gross per cadence', () => {
        const { averagePlanPricesUsdMicros } = loadModule();
        const result = averagePlanPricesUsdMicros([
            { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 5000000 },
            { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 7000000 },
            { eventType: 'NON_RENEWING_PURCHASE', environment: 'PRODUCTION', billingCadence: 'lifetime', grossUsdMicros: 50000000 },
            // исключаются:
            { eventType: 'RENEWAL', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 100000000 },
            { eventType: 'REFUND', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: -5000000 },
            { eventType: 'INITIAL_PURCHASE', environment: 'SANDBOX', billingCadence: 'monthly', grossUsdMicros: 1000000 },
            { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'unknown', grossUsdMicros: 1000000 },
            { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 0 },
            { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 'oops' },
        ]);
        expect(result.planPricesMicros).toEqual({ monthly: 6000000, yearly: null, lifetime: 50000000 });
        expect(result.priceObservations).toEqual({ monthly: 2, yearly: 0, lifetime: 1 });
    });
    it('returns nulls when there are no usable observations', () => {
        const { averagePlanPricesUsdMicros } = loadModule();
        const result = averagePlanPricesUsdMicros([]);
        expect(result.planPricesMicros).toEqual({ monthly: null, yearly: null, lifetime: null });
    });
});
// ── buildPaywallVariantStatsReport ───────────────────────────────────────────
describe('buildPaywallVariantStatsReport', () => {
    function build(funnelDocs, priceRows, overrides = {}) {
        const { buildPaywallVariantStatsReport } = loadModule();
        return buildPaywallVariantStatsReport({
            funnelDocs,
            priceRows,
            rangeDays: 30,
            fromMs: 100,
            generatedAtMs: 1000,
            ...overrides,
        });
    }
    it('aggregates shown/cta/purchases per variant with conversion and revenue estimate', () => {
        const report = build([
            funnelDoc({ variant: 'A', step: 'shown' }),
            funnelDoc({ variant: 'A', step: 'shown' }),
            funnelDoc({ variant: 'A', step: 'cta_click' }),
            funnelDoc({ variant: 'A', step: 'purchase_completed', plan: 'yearly' }),
            funnelDoc({ variant: 'A', step: 'purchase_completed', plan: 'monthly' }),
            funnelDoc({ variant: 'B', step: 'shown' }),
            funnelDoc({ variant: 'B', step: 'purchase_completed', plan: 'mystery' }),
            // dev-события и legacy-варианты не считаются:
            funnelDoc({ variant: 'A', step: 'shown', dev: true }),
            funnelDoc({ variant: 'A', step: 'purchase_completed', plan: 'yearly', dev: true }),
            funnelDoc({ variant: 'v1', step: 'shown' }),
            funnelDoc({ variant: 'v2', step: 'purchase_completed', plan: 'yearly' }),
            funnelDoc({ variant: 'A', step: 'close' }),
        ], [
            priceEvent({ billingCadence: 'yearly', grossUsdMicros: 20000000 }),
            priceEvent({ billingCadence: 'monthly', grossUsdMicros: 5000000 }),
        ]);
        const a = report.variants.find((row) => row.variant === 'A');
        expect(a).toMatchObject({
            shown: 2, cta: 1, purchases: 2, conversionPct: 100,
            purchasesByPlan: { monthly: 1, yearly: 1, lifetime: 0, unknown: 0 },
            revenueMicros: 25000000, unpricedPurchases: 0,
        });
        const b = report.variants.find((row) => row.variant === 'B');
        expect(b).toMatchObject({ shown: 1, purchases: 1, conversionPct: 100, revenueMicros: 0, unpricedPurchases: 1 });
        const g = report.variants.find((row) => row.variant === 'G');
        expect(g).toMatchObject({ shown: 0, purchases: 0, conversionPct: null, revenueMicros: 0 });
        expect(report.variants).toHaveLength(7);
        expect(report.revenue).toMatchObject({ kind: 'estimate', currency: 'USD' });
        expect(report.totals).toMatchObject({
            shown: 3, cta: 1, purchases: 3, conversionPct: 100,
            revenueMicros: 25000000, unpricedPurchases: 1,
        });
        expect(report.funnelDocsScanned).toBe(12);
    });
    it('marks revenue unavailable when no price observations exist and never invents numbers', () => {
        const report = build([funnelDoc({ variant: 'C', step: 'purchase_completed', plan: 'yearly' })], []);
        const c = report.variants.find((row) => row.variant === 'C');
        expect(report.revenue.kind).toBe('unavailable');
        expect(c.revenueMicros).toBeNull();
        expect(c.unpricedPurchases).toBe(1);
        expect(report.totals.revenueMicros).toBeNull();
    });
    it('keeps estimate partial when only some plans have prices', () => {
        const report = build([
            funnelDoc({ variant: 'D', step: 'purchase_completed', plan: 'monthly' }),
            funnelDoc({ variant: 'D', step: 'purchase_completed', plan: 'lifetime' }),
        ], [priceEvent({ billingCadence: 'monthly', grossUsdMicros: 4000000 })]);
        const d = report.variants.find((row) => row.variant === 'D');
        expect(report.revenue.kind).toBe('estimate');
        expect(d.revenueMicros).toBe(4000000);
        expect(d.unpricedPurchases).toBe(1);
    });
    it('returns an all-zero report for an empty range', () => {
        const report = build([], []);
        expect(report.variants).toHaveLength(7);
        expect(report.totals).toMatchObject({
            shown: 0, cta: 0, purchases: 0, conversionPct: null, revenueMicros: null, unpricedPurchases: 0,
        });
        expect(report.revenue.kind).toBe('unavailable');
        expect(report.truncated).toBe(false);
    });
    it('passes through the truncated flag and scanned counters', () => {
        const report = build([funnelDoc()], [priceEvent()], { truncated: true, priceRowsScanned: 1 });
        expect(report.truncated).toBe(true);
        expect(report.priceRowsScanned).toBe(1);
        expect(report.funnelDocsScanned).toBe(1);
    });
    it('aggregates a per-context breakdown alongside per-variant stats', () => {
        const report = build([
            funnelDoc({ variant: 'A', context: 'no_energy', step: 'shown' }),
            funnelDoc({ variant: 'A', context: 'no_energy', step: 'shown' }),
            funnelDoc({ variant: 'A', context: 'no_energy', step: 'cta_click' }),
            funnelDoc({ variant: 'A', context: 'no_energy', step: 'purchase_completed', plan: 'yearly' }),
            funnelDoc({ variant: 'B', context: 'no_energy', step: 'shown' }),
            funnelDoc({ variant: 'B', context: 'no_energy', step: 'purchase_completed', plan: 'monthly' }),
            funnelDoc({ variant: 'C', context: 'streak', step: 'shown' }),
            // dev/close/legacy variant не должны попадать в разрез:
            funnelDoc({ variant: 'A', context: 'no_energy', step: 'shown', dev: true }),
            funnelDoc({ variant: 'A', context: 'no_energy', step: 'close' }),
            funnelDoc({ variant: 'v1', context: 'no_energy', step: 'shown' }),
            // пустой/отсутствующий context схлопывается в generic:
            funnelDoc({ variant: 'D', context: undefined, step: 'shown' }),
        ], []);
        expect(report.contexts).toHaveLength(3);
        const noEnergy = report.contexts.find((row) => row.context === 'no_energy');
        expect(noEnergy).toMatchObject({ shown: 3, cta: 1, purchases: 2, conversionPct: 66.7 });
        expect(noEnergy.purchasesByVariant).toMatchObject({ A: 1, B: 1, C: 0 });
        const streak = report.contexts.find((row) => row.context === 'streak');
        expect(streak).toMatchObject({ shown: 1, cta: 0, purchases: 0, conversionPct: 0 });
        const generic = report.contexts.find((row) => row.context === 'generic');
        expect(generic).toMatchObject({ shown: 1 });
        // Отсортировано по показам, самое частое — первым.
        expect(report.contexts[0].context).toBe('no_energy');
    });
    it('truncates context labels to 40 chars, same limit the client already enforces', () => {
        const longCtx = 'x'.repeat(60);
        const report = build([funnelDoc({ variant: 'A', context: longCtx, step: 'shown' })], []);
        expect(report.contexts[0].context).toHaveLength(40);
    });
});
// ── adminGetPaywallVariantStats callable ─────────────────────────────────────
describe('adminGetPaywallVariantStats', () => {
    async function callStats(data = { rangeDays: 30 }, auth = ADMIN_AUTH) {
        const { adminGetPaywallVariantStats } = loadModule();
        const callable = adminGetPaywallVariantStats;
        return callable({ auth, data });
    }
    it('denies callers without admin claim or money.read role', async () => {
        await expect(callStats({ rangeDays: 30 }, null)).rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callStats({ rangeDays: 30 }, { uid: 'x', token: { admin: false, adminRole: 'owner' } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callStats({ rangeDays: 30 }, { uid: 'x', token: { admin: true, adminRole: 'support' } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callStats({ rangeDays: 30 }, { uid: 'x', token: { admin: true } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
    });
    it('allows the read-only analyst role (money.read)', async () => {
        const result = await callStats({ rangeDays: 7 }, { uid: 'a', token: { admin: true, adminRole: 'analyst' } });
        expect(result).toMatchObject({ ok: true, rangeDays: 7 });
    });
    it('rejects an unsupported range before any read', async () => {
        await expect(callStats({ rangeDays: 14 })).rejects.toMatchObject({ code: 'invalid-argument' });
    });
    it('aggregates fixture docs end-to-end through the fake firestore queries', async () => {
        const nowMs = Date.now();
        seed('paywall_funnel', 'f1', funnelDoc({ variant: 'E', step: 'shown', ts: nowMs - 1000 }));
        seed('paywall_funnel', 'f2', funnelDoc({ variant: 'E', step: 'purchase_completed', plan: 'yearly', ts: nowMs - 900 }));
        seed('paywall_funnel', 'f3', funnelDoc({ variant: 'E', step: 'shown', ts: nowMs - 800, dev: true }));
        seed('paywall_funnel', 'f4', funnelDoc({ variant: 'F', step: 'shown', ts: nowMs - 40 * 86400000 })); // вне окна 30д
        seed('revenuecat_premium_events', 'p1', priceEvent({ billingCadence: 'yearly', grossUsdMicros: 30000000, createdAt: { toMillis: () => nowMs - 10000 } }));
        seed('revenuecat_premium_events', 'p2', priceEvent({ billingCadence: 'yearly', grossUsdMicros: 10000000, createdAt: { toMillis: () => nowMs - 20000 } }));
        seed('revenuecat_premium_events', 'p3', priceEvent({ eventType: 'RENEWAL', billingCadence: 'yearly', grossUsdMicros: 999000000, createdAt: { toMillis: () => nowMs - 30000 } }));
        const result = await callStats({ rangeDays: 30 });
        expect(result).toMatchObject({ ok: true, rangeDays: 30, truncated: false, funnelDocsScanned: 3 });
        const e = result.variants.find((row) => row.variant === 'E');
        expect(e).toMatchObject({ shown: 1, purchases: 1, conversionPct: 100, revenueMicros: 20000000 });
        const f = result.variants.find((row) => row.variant === 'F');
        expect(f.shown).toBe(0);
        expect(result.revenue).toMatchObject({ kind: 'estimate', priceObservations: { yearly: 2 } });
        expect(result.revenue.planPricesMicros.yearly).toBe(20000000);
    });
    it('returns an empty all-zero report when nothing is stored', async () => {
        const result = await callStats({ rangeDays: 90 });
        expect(result).toMatchObject({ ok: true, rangeDays: 90 });
        expect(result.variants).toHaveLength(7);
        expect(result.totals).toMatchObject({ shown: 0, purchases: 0, conversionPct: null, revenueMicros: null });
        expect(result.revenue.kind).toBe('unavailable');
    });
});
//# sourceMappingURL=admin_paywall_variant_stats.test.js.map