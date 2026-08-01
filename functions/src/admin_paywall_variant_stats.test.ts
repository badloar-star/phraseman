export {};

// ════════════════════════════════════════════════════════════════════════════
// admin_paywall_variant_stats.test.ts — агрегация воронки пейвол-вариантов:
//   • чистая математика (averagePlanPricesUsdMicros / buildPaywallVariantStatsReport)
//   • парсинг rangeDays
//   • callable: permission-гейты + happy path на фейковом Firestore с запросами
// ════════════════════════════════════════════════════════════════════════════

type DocData = Record<string, unknown>;

class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

// ── Фейковый Firestore с минимальной поддержкой query-цепочек ────────────────

type FakeDoc = { id: string; data: DocData };
const store = new Map<string, FakeDoc[]>();

function tsMillis(value: unknown): number {
  if (value && typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis(): number }).toMillis();
  }
  return Number(value);
}

function fakeQuery(name: string, filters: Array<{ field: string; value: unknown }>, cursorId: string | null) {
  return {
    where(field: string, op: string, value: unknown) {
      if (op !== '>=') throw new Error(`fake query supports only >=, got ${op}`);
      return fakeQuery(name, [...filters, { field, value }], cursorId);
    },
    orderBy(field: string, dir: string) {
      return {
        limit(count: number) {
          return {
            startAfter(cursor: { id: string }) {
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
  return { collection: (name: string) => fakeQuery(name, [], null) };
}

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { Timestamp: Record<string, unknown> }).Timestamp = {
    fromMillis: (ms: number) => ({ toMillis: () => ms }),
  };
  return { firestore };
});

const ADMIN_AUTH = { uid: 'admin-1', token: { admin: true, adminRole: 'owner' } };

function seed(collection: string, id: string, data: DocData) {
  const docs = store.get(collection) ?? [];
  docs.push({ id, data });
  store.set(collection, docs);
}

function funnelDoc(overrides: DocData = {}): DocData {
  return { step: 'shown', variant: 'A', context: 'generic', plan: null, ts: 1, dev: false, ...overrides };
}

function priceEvent(overrides: DocData = {}): DocData {
  return {
    eventType: 'INITIAL_PURCHASE',
    environment: 'PRODUCTION',
    billingCadence: 'yearly',
    grossUsdMicros: 20_000_000,
    createdAt: { toMillis: () => 1 },
    ...overrides,
  };
}

function loadModule() {
  return require('./admin_paywall_variant_stats') as typeof import('./admin_paywall_variant_stats');
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
    } catch (error) {
      expect((error as InstanceType<typeof FakeHttpsError>).code).toBe('invalid-argument');
    }
  });
});

// ── averagePlanPricesUsdMicros ───────────────────────────────────────────────

describe('averagePlanPricesUsdMicros', () => {
  it('averages only production origin purchases with positive gross per cadence', () => {
    const { averagePlanPricesUsdMicros } = loadModule();
    const result = averagePlanPricesUsdMicros([
      { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 5_000_000 },
      { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 7_000_000 },
      { eventType: 'NON_RENEWING_PURCHASE', environment: 'PRODUCTION', billingCadence: 'lifetime', grossUsdMicros: 50_000_000 },
      // исключаются:
      { eventType: 'RENEWAL', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 100_000_000 },
      { eventType: 'REFUND', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: -5_000_000 },
      { eventType: 'INITIAL_PURCHASE', environment: 'SANDBOX', billingCadence: 'monthly', grossUsdMicros: 1_000_000 },
      { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'unknown', grossUsdMicros: 1_000_000 },
      { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 0 },
      { eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', billingCadence: 'monthly', grossUsdMicros: 'oops' },
    ]);
    expect(result.planPricesMicros).toEqual({ monthly: 6_000_000, yearly: null, lifetime: 50_000_000 });
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
  function build(funnelDocs: DocData[], priceRows: DocData[], overrides: DocData = {}) {
    const { buildPaywallVariantStatsReport } = loadModule();
    return buildPaywallVariantStatsReport({
      funnelDocs,
      priceRows,
      rangeDays: 30,
      fromMs: 100,
      generatedAtMs: 1_000,
      ...overrides,
    });
  }

  it('aggregates shown/cta/purchases per variant with conversion and revenue estimate', () => {
    const report = build(
      [
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
      ],
      [
        priceEvent({ billingCadence: 'yearly', grossUsdMicros: 20_000_000 }),
        priceEvent({ billingCadence: 'monthly', grossUsdMicros: 5_000_000 }),
      ],
    );

    const a = report.variants.find((row) => row.variant === 'A')!;
    expect(a).toMatchObject({
      shown: 2, cta: 1, purchases: 2, conversionPct: 100,
      purchasesByPlan: { monthly: 1, yearly: 1, lifetime: 0, unknown: 0 },
      revenueMicros: 25_000_000, unpricedPurchases: 0,
    });
    const b = report.variants.find((row) => row.variant === 'B')!;
    expect(b).toMatchObject({ shown: 1, purchases: 1, conversionPct: 100, revenueMicros: 0, unpricedPurchases: 1 });
    const g = report.variants.find((row) => row.variant === 'G')!;
    expect(g).toMatchObject({ shown: 0, purchases: 0, conversionPct: null, revenueMicros: 0 });
    expect(report.variants).toHaveLength(7);
    expect(report.revenue).toMatchObject({ kind: 'estimate', currency: 'USD' });
    expect(report.totals).toMatchObject({
      shown: 3, cta: 1, purchases: 3, conversionPct: 100,
      revenueMicros: 25_000_000, unpricedPurchases: 1,
    });
    expect(report.funnelDocsScanned).toBe(12);
  });

  it('marks revenue unavailable when no price observations exist and never invents numbers', () => {
    const report = build(
      [funnelDoc({ variant: 'C', step: 'purchase_completed', plan: 'yearly' })],
      [],
    );
    const c = report.variants.find((row) => row.variant === 'C')!;
    expect(report.revenue.kind).toBe('unavailable');
    expect(c.revenueMicros).toBeNull();
    expect(c.unpricedPurchases).toBe(1);
    expect(report.totals.revenueMicros).toBeNull();
  });

  it('keeps estimate partial when only some plans have prices', () => {
    const report = build(
      [
        funnelDoc({ variant: 'D', step: 'purchase_completed', plan: 'monthly' }),
        funnelDoc({ variant: 'D', step: 'purchase_completed', plan: 'lifetime' }),
      ],
      [priceEvent({ billingCadence: 'monthly', grossUsdMicros: 4_000_000 })],
    );
    const d = report.variants.find((row) => row.variant === 'D')!;
    expect(report.revenue.kind).toBe('estimate');
    expect(d.revenueMicros).toBe(4_000_000);
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
    const noEnergy = report.contexts.find((row) => row.context === 'no_energy')!;
    expect(noEnergy).toMatchObject({ shown: 3, cta: 1, purchases: 2, conversionPct: 66.7 });
    expect(noEnergy.purchasesByVariant).toMatchObject({ A: 1, B: 1, C: 0 });
    const streak = report.contexts.find((row) => row.context === 'streak')!;
    expect(streak).toMatchObject({ shown: 1, cta: 0, purchases: 0, conversionPct: 0 });
    const generic = report.contexts.find((row) => row.context === 'generic')!;
    expect(generic).toMatchObject({ shown: 1 });
    // Отсортировано по показам, самое частое — первым.
    expect(report.contexts[0].context).toBe('no_energy');
  });

  it('truncates context labels to 40 chars, same limit the client already enforces', () => {
    const longCtx = 'x'.repeat(60);
    const report = build([funnelDoc({ variant: 'A', context: longCtx, step: 'shown' })], []);
    expect(report.contexts[0].context).toHaveLength(40);
  });

  // зачем: админка помечала «🏆 лидер» первую строку сортировки ПО АБСОЛЮТНЫМ
  // покупкам и без всякого порога значимости. Это давало два ложных вывода:
  // вариант с большей долей показов выигрывал при худшей конверсии, а 3 покупки
  // из 20 показов выглядели таким же надёжным результатом, как 300 из 2000.
  // Владелец выбрал метрику «платящие на показ» — вердикт считаем по ней и
  // только когда разница переживает двухпропорциональный z-тест.
  describe('significance verdict', () => {
    function shows(variant: string, shown: number, purchases: number): DocData[] {
      return [
        ...Array.from({ length: shown }, () => funnelDoc({ variant, step: 'shown' })),
        ...Array.from({ length: purchases }, () => funnelDoc({ variant, step: 'purchase_completed', plan: 'yearly' })),
      ];
    }

    it('refuses to crown a winner while the sample is still tiny', () => {
      // B конвертит вдвое лучше A, но на таких числах это шум.
      const report = build([...shows('A', 20, 1), ...shows('B', 20, 2)], []);

      expect(report.verdict).toMatchObject({
        decision: 'insufficient_data',
        winner: null,
      });
    });

    it('never lets raw purchase volume beat a better conversion rate', () => {
      // A: 60 покупок на 6000 показов = 1%. B: 40 покупок на 1000 = 4%.
      // По абсолютным покупкам «лидер» был бы A — и это была бы ошибка.
      const report = build([...shows('A', 6000, 60), ...shows('B', 1000, 40)], []);

      expect(report.verdict.winner).toBe('B');
      expect(report.verdict.decision).toBe('significant');
    });

    it('reports a real difference as significant with its p-value and lift', () => {
      const report = build([...shows('A', 4000, 80), ...shows('B', 4000, 200)], []);

      expect(report.verdict.decision).toBe('significant');
      expect(report.verdict.winner).toBe('B');
      expect(report.verdict.pValue).toBeLessThan(0.05);
      // 5% против 2% — подъём втрое.
      expect(report.verdict.liftPct).toBeGreaterThan(100);
    });

    it('stays undecided when two big variants perform the same', () => {
      const report = build([...shows('A', 5000, 100), ...shows('B', 5000, 102)], []);

      expect(report.verdict.decision).toBe('not_significant');
      expect(report.verdict.pValue).toBeGreaterThan(0.05);
    });

    it('gives an all-zero range an honest empty verdict instead of a fake leader', () => {
      const report = build([], []);
      expect(report.verdict).toMatchObject({
        decision: 'insufficient_data',
        winner: null,
        pValue: null,
      });
    });
  });
});

// ── adminGetPaywallVariantStats callable ─────────────────────────────────────

describe('adminGetPaywallVariantStats', () => {
  async function callStats(data: unknown = { rangeDays: 30 }, auth: unknown = ADMIN_AUTH) {
    const { adminGetPaywallVariantStats } = loadModule();
    const callable = adminGetPaywallVariantStats as unknown as (
      request: { auth: unknown; data: unknown },
    ) => Promise<import('./admin_paywall_variant_stats').PaywallVariantStatsReport>;
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
    seed('paywall_funnel', 'f1', funnelDoc({ variant: 'E', step: 'shown', ts: nowMs - 1_000 }));
    seed('paywall_funnel', 'f2', funnelDoc({ variant: 'E', step: 'purchase_completed', plan: 'yearly', ts: nowMs - 900 }));
    seed('paywall_funnel', 'f3', funnelDoc({ variant: 'E', step: 'shown', ts: nowMs - 800, dev: true }));
    seed('paywall_funnel', 'f4', funnelDoc({ variant: 'F', step: 'shown', ts: nowMs - 40 * 86_400_000 })); // вне окна 30д
    seed('revenuecat_premium_events', 'p1', priceEvent({ billingCadence: 'yearly', grossUsdMicros: 30_000_000, createdAt: { toMillis: () => nowMs - 10_000 } }));
    seed('revenuecat_premium_events', 'p2', priceEvent({ billingCadence: 'yearly', grossUsdMicros: 10_000_000, createdAt: { toMillis: () => nowMs - 20_000 } }));
    seed('revenuecat_premium_events', 'p3', priceEvent({ eventType: 'RENEWAL', billingCadence: 'yearly', grossUsdMicros: 999_000_000, createdAt: { toMillis: () => nowMs - 30_000 } }));

    const result = await callStats({ rangeDays: 30 });
    expect(result).toMatchObject({ ok: true, rangeDays: 30, truncated: false, funnelDocsScanned: 3 });
    const e = result.variants.find((row) => row.variant === 'E')!;
    expect(e).toMatchObject({ shown: 1, purchases: 1, conversionPct: 100, revenueMicros: 20_000_000 });
    const f = result.variants.find((row) => row.variant === 'F')!;
    expect(f.shown).toBe(0);
    expect(result.revenue).toMatchObject({ kind: 'estimate', priceObservations: { yearly: 2 } });
    expect(result.revenue.planPricesMicros.yearly).toBe(20_000_000);
  });

  it('returns an empty all-zero report when nothing is stored', async () => {
    const result = await callStats({ rangeDays: 90 });
    expect(result).toMatchObject({ ok: true, rangeDays: 90 });
    expect(result.variants).toHaveLength(7);
    expect(result.totals).toMatchObject({ shown: 0, purchases: 0, conversionPct: null, revenueMicros: null });
    expect(result.revenue.kind).toBe('unavailable');
  });
});
