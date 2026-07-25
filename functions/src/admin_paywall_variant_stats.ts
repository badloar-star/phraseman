// ════════════════════════════════════════════════════════════════════════════
// admin_paywall_variant_stats.ts — серверная агрегация воронки пейвол-эксперимента
// для админки V2 (раздел «A/B-тест пейволов» → панель «Статистика вариантов»).
//
// Источники и честные ограничения выручки:
//   • paywall_funnel (app/paywall_funnel.ts) знает variant/plan, но НЕ знает сумму
//     покупки (поле price появилось позже и это локализованная строка, не число).
//   • revenuecat_premium_events знает реальные суммы (grossUsdMicros из вебхука
//     RevenueCat), но НЕ знает, какой вариант пейвола видел пользователь.
//   Поэтому выручка по варианту — ОЦЕНКА (revenueKind: 'estimate'):
//   покупки(variant, plan) × средняя наблюдаемая цена плана за PRICE_WINDOW_DAYS
//   дней из production-событий RevenueCat (INITIAL_PURCHASE / NON_RENEWING_PURCHASE,
//   gross > 0, без SANDBOX). Если наблюдений цены нет вообще — 'unavailable',
//   числа не выдумываются. Точная per-variant выручка невозможна без атрибуции
//   variant → transaction, которой в данных нет.
// ════════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';

const REGION = 'us-central1';
const DAY_MS = 86_400_000;
const FUNNEL_PAGE_SIZE = 1_000;
const FUNNEL_ROW_CAP = 30_000;
const PRICE_PAGE_SIZE = 500;
const PRICE_ROW_CAP = 10_000;
/** Верхняя граница строк в разрезе по ситуациям — известных контекстов ~35,
 *  запас на случай будущих/переходных значений без раздувания ответа. */
const CONTEXT_ROW_CAP = 200;

/** Окно наблюдения цен не зависит от периода отчёта: цена плана меняется редко,
 *  а за 7 дней покупок может не быть вовсе. */
export const PAYWALL_STATS_PRICE_WINDOW_DAYS = 90;
export const PAYWALL_STATS_RANGE_DAYS = [7, 30, 90] as const;
export const PAYWALL_STATS_VARIANTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const PAYWALL_STATS_PLANS = ['monthly', 'yearly', 'lifetime'] as const;

export type PaywallStatsRangeDays = (typeof PAYWALL_STATS_RANGE_DAYS)[number];
export type PaywallStatsVariant = (typeof PAYWALL_STATS_VARIANTS)[number];
export type PaywallStatsPlan = (typeof PAYWALL_STATS_PLANS)[number];
export type PaywallRevenueKind = 'estimate' | 'unavailable';

/** Сырые поля документа paywall_funnel, нужные агрегации. */
export interface PaywallVariantFunnelDoc {
  step?: unknown;
  variant?: unknown;
  plan?: unknown;
  dev?: unknown;
  context?: unknown;
}

/** Сырые поля документа revenuecat_premium_events, нужные для оценки цены. */
export interface PaywallVariantPriceRow {
  eventType?: unknown;
  environment?: unknown;
  billingCadence?: unknown;
  grossUsdMicros?: unknown;
}

export interface PaywallPlanPriceMap {
  readonly monthly: number | null;
  readonly yearly: number | null;
  readonly lifetime: number | null;
}

export interface PaywallVariantStatsRow {
  readonly variant: PaywallStatsVariant;
  readonly shown: number;
  readonly cta: number;
  readonly purchases: number;
  /** purchases / shown * 100, 1 знак после запятой; null когда показов нет. */
  readonly conversionPct: number | null;
  readonly purchasesByPlan: { readonly monthly: number; readonly yearly: number; readonly lifetime: number; readonly unknown: number };
  /** Оценка выручки в USD-микро; null когда revenueKind === 'unavailable'. */
  readonly revenueMicros: number | null;
  /** Покупки без известной цены плана (не вошли в оценку выручки). */
  readonly unpricedPurchases: number;
}

/**
 * Одна ситуация показа пейвола (premium context, см. app/premium_context.ts):
 * агрегат по всем вариантам вместе (для рейтинга «какая ситуация конвертит
 * лучше») + покупки в разбивке по варианту (кто выигрывает именно в этой
 * ситуации). НЕ полная матрица 7×33+ на верхнем уровне — это была бы лишняя
 * нагрузка на ответ ради ячеек, которые почти всегда нулевые (контекст
 * показывается на всех вариантах, но большинство пар variant×context за
 * короткий период просто не набирают трафика).
 */
export interface PaywallContextStatsRow {
  readonly context: string;
  readonly shown: number;
  readonly cta: number;
  readonly purchases: number;
  readonly conversionPct: number | null;
  /** Покупки этой ситуации по вариантам — какой экран выигрывает именно здесь. */
  readonly purchasesByVariant: Readonly<Record<PaywallStatsVariant, number>>;
}

export interface PaywallVariantStatsReport {
  readonly ok: true;
  readonly rangeDays: PaywallStatsRangeDays;
  readonly fromMs: number;
  readonly generatedAtMs: number;
  readonly priceWindowDays: number;
  readonly truncated: boolean;
  readonly funnelDocsScanned: number;
  readonly priceRowsScanned: number;
  readonly revenue: {
    readonly kind: PaywallRevenueKind;
    readonly currency: 'USD';
    readonly planPricesMicros: PaywallPlanPriceMap;
    readonly priceObservations: { readonly monthly: number; readonly yearly: number; readonly lifetime: number };
  };
  readonly variants: readonly PaywallVariantStatsRow[];
  /** Ситуации показа, отсортированы по числу показов (самые частые — первые). */
  readonly contexts: readonly PaywallContextStatsRow[];
  readonly totals: {
    readonly shown: number;
    readonly cta: number;
    readonly purchases: number;
    readonly conversionPct: number | null;
    readonly revenueMicros: number | null;
    readonly unpricedPurchases: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePaywallVariantStatsRange(data: unknown): PaywallStatsRangeDays {
  if (data === undefined || data === null) return 30;
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request body must be an object');
  if (data.rangeDays === undefined || data.rangeDays === null) return 30;
  if (typeof data.rangeDays !== 'number' || !(PAYWALL_STATS_RANGE_DAYS as readonly number[]).includes(data.rangeDays)) {
    throw new HttpsError('invalid-argument', 'rangeDays must be one of 7, 30, 90');
  }
  return data.rangeDays as PaywallStatsRangeDays;
}

function resolveRole(token: Record<string, unknown>): AdminRole | null {
  const claimed = token.adminRole;
  return hasAdminRole(claimed) ? claimed : null;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * Средняя наблюдаемая gross-цена (USD-микро) по каждому плану из событий RevenueCat.
 * Берём только origin-покупки (INITIAL_PURCHASE / NON_RENEWING_PURCHASE) с gross > 0
 * из production: RENEWAL — не цена конверсии пейвола, REFUND — отрицательный.
 */
export function averagePlanPricesUsdMicros(priceRows: readonly PaywallVariantPriceRow[]): {
  planPricesMicros: PaywallPlanPriceMap;
  priceObservations: { monthly: number; yearly: number; lifetime: number };
} {
  const sums: Record<PaywallStatsPlan, number> = { monthly: 0, yearly: 0, lifetime: 0 };
  const counts: Record<PaywallStatsPlan, number> = { monthly: 0, yearly: 0, lifetime: 0 };
  for (const row of priceRows) {
    const eventType = text(row.eventType).toUpperCase();
    if (eventType !== 'INITIAL_PURCHASE' && eventType !== 'NON_RENEWING_PURCHASE') continue;
    if (text(row.environment).toUpperCase() === 'SANDBOX') continue;
    const cadence = text(row.billingCadence).toLowerCase();
    if (cadence !== 'monthly' && cadence !== 'yearly' && cadence !== 'lifetime') continue;
    const gross = Number(row.grossUsdMicros);
    if (!Number.isSafeInteger(gross) || gross <= 0) continue;
    sums[cadence] += gross;
    counts[cadence] += 1;
  }
  const avg = (plan: PaywallStatsPlan): number | null => (counts[plan] > 0 ? Math.round(sums[plan] / counts[plan]) : null);
  return {
    planPricesMicros: { monthly: avg('monthly'), yearly: avg('yearly'), lifetime: avg('lifetime') },
    priceObservations: { monthly: counts.monthly, yearly: counts.yearly, lifetime: counts.lifetime },
  };
}

function normalizeVariant(value: unknown): PaywallStatsVariant | null {
  const letter = text(value).toUpperCase();
  return (PAYWALL_STATS_VARIANTS as readonly string[]).includes(letter) ? (letter as PaywallStatsVariant) : null;
}

function normalizePlan(value: unknown): PaywallStatsPlan | 'unknown' {
  const plan = text(value).toLowerCase();
  return (PAYWALL_STATS_PLANS as readonly string[]).includes(plan) ? (plan as PaywallStatsPlan) : 'unknown';
}

function conversionPct(purchases: number, shown: number): number | null {
  if (shown <= 0) return null;
  return Math.round((purchases / shown) * 1000) / 10;
}

export interface BuildPaywallVariantStatsInput {
  readonly funnelDocs: readonly PaywallVariantFunnelDoc[];
  readonly priceRows: readonly PaywallVariantPriceRow[];
  readonly rangeDays: PaywallStatsRangeDays;
  readonly fromMs: number;
  readonly generatedAtMs: number;
  readonly truncated?: boolean;
  readonly priceRowsScanned?: number;
}

// зачем: 40 символов — тот же лимит, что paywall_funnel.ts кладёт в context
// на клиенте (String(...).slice(0, 40)); держим агрегатор синхронным с ним.
const CONTEXT_MAX_LEN = 40;

function normalizeContext(value: unknown): string {
  const raw = text(value);
  return (raw || 'generic').slice(0, CONTEXT_MAX_LEN);
}

interface ContextBucket {
  shown: number;
  cta: number;
  purchasesByVariant: Record<PaywallStatsVariant, number>;
}

function emptyContextBucket(): ContextBucket {
  const purchasesByVariant = {} as Record<PaywallStatsVariant, number>;
  for (const variant of PAYWALL_STATS_VARIANTS) purchasesByVariant[variant] = 0;
  return { shown: 0, cta: 0, purchasesByVariant };
}

export function buildPaywallVariantStatsReport(input: BuildPaywallVariantStatsInput): PaywallVariantStatsReport {
  const shown = new Map<PaywallStatsVariant, number>();
  const cta = new Map<PaywallStatsVariant, number>();
  const purchases = new Map<PaywallStatsVariant, { monthly: number; yearly: number; lifetime: number; unknown: number }>();
  for (const variant of PAYWALL_STATS_VARIANTS) {
    shown.set(variant, 0);
    cta.set(variant, 0);
    purchases.set(variant, { monthly: 0, yearly: 0, lifetime: 0, unknown: 0 });
  }
  const contexts = new Map<string, ContextBucket>();

  for (const doc of input.funnelDocs) {
    if (doc.dev === true) continue; // дев-сборки не считаем, как и в продуктовой воронке
    const variant = normalizeVariant(doc.variant);
    if (!variant) continue; // legacy v1/v2 и мусор не входят в сравнение A–G
    const step = text(doc.step);
    if (step === 'shown') shown.set(variant, (shown.get(variant) ?? 0) + 1);
    else if (step === 'cta_click') cta.set(variant, (cta.get(variant) ?? 0) + 1);
    else if (step === 'purchase_completed') {
      const bucket = purchases.get(variant)!;
      bucket[normalizePlan(doc.plan)] += 1;
    }

    // Разрез «какая ситуация показа конвертит лучше» — тот же проход, без
    // повторного скана 30k документов. Не покупки-по-плану — контексту это
    // не нужно, только показ/клик/покупка на ситуацию + кто выиграл.
    if (step === 'shown' || step === 'cta_click' || step === 'purchase_completed') {
      const ctxKey = normalizeContext(doc.context);
      const ctxBucket = contexts.get(ctxKey) ?? emptyContextBucket();
      if (step === 'shown') ctxBucket.shown += 1;
      else if (step === 'cta_click') ctxBucket.cta += 1;
      else ctxBucket.purchasesByVariant[variant] += 1;
      contexts.set(ctxKey, ctxBucket);
    }
  }

  const { planPricesMicros, priceObservations } = averagePlanPricesUsdMicros(input.priceRows);
  const anyPriceKnown = planPricesMicros.monthly != null || planPricesMicros.yearly != null || planPricesMicros.lifetime != null;
  const revenueKind: PaywallRevenueKind = anyPriceKnown ? 'estimate' : 'unavailable';

  const variants: PaywallVariantStatsRow[] = PAYWALL_STATS_VARIANTS.map((variant) => {
    const byPlan = purchases.get(variant)!;
    const variantPurchases = byPlan.monthly + byPlan.yearly + byPlan.lifetime + byPlan.unknown;
    const variantShown = shown.get(variant) ?? 0;
    let revenueMicros = 0;
    let unpricedPurchases = byPlan.unknown;
    for (const plan of PAYWALL_STATS_PLANS) {
      const price = planPricesMicros[plan];
      if (price != null) revenueMicros += byPlan[plan] * price;
      else unpricedPurchases += byPlan[plan];
    }
    return {
      variant,
      shown: variantShown,
      cta: cta.get(variant) ?? 0,
      purchases: variantPurchases,
      conversionPct: conversionPct(variantPurchases, variantShown),
      purchasesByPlan: Object.freeze({ ...byPlan }),
      revenueMicros: revenueKind === 'estimate' ? revenueMicros : null,
      unpricedPurchases,
    };
  });

  const totalsShown = variants.reduce((sum, row) => sum + row.shown, 0);
  const totalsCta = variants.reduce((sum, row) => sum + row.cta, 0);
  const totalsPurchases = variants.reduce((sum, row) => sum + row.purchases, 0);
  const totalsUnpriced = variants.reduce((sum, row) => sum + row.unpricedPurchases, 0);
  const totalsRevenue = revenueKind === 'estimate'
    ? variants.reduce((sum, row) => sum + (row.revenueMicros ?? 0), 0)
    : null;

  // Сортировка по показам (самые частые ситуации сверху) — тот же принцип, что
  // и у вариантов. CONTEXT_ROW_CAP страхует от раздутого ответа, если в базу
  // когда-нибудь попадёт мусорный/произвольный context (лимит 40 символов на
  // клиенте это не исключает — строк может быть много вариантов написания).
  const contextRows: PaywallContextStatsRow[] = Array.from(contexts.entries())
    .map(([context, bucket]) => {
      const purchasesTotal = PAYWALL_STATS_VARIANTS.reduce((sum, v) => sum + bucket.purchasesByVariant[v], 0);
      return {
        context,
        shown: bucket.shown,
        cta: bucket.cta,
        purchases: purchasesTotal,
        conversionPct: conversionPct(purchasesTotal, bucket.shown),
        purchasesByVariant: Object.freeze({ ...bucket.purchasesByVariant }),
      };
    })
    .sort((a, b) => b.shown - a.shown)
    .slice(0, CONTEXT_ROW_CAP);

  return {
    ok: true,
    rangeDays: input.rangeDays,
    fromMs: input.fromMs,
    generatedAtMs: input.generatedAtMs,
    priceWindowDays: PAYWALL_STATS_PRICE_WINDOW_DAYS,
    truncated: input.truncated === true,
    funnelDocsScanned: input.funnelDocs.length,
    priceRowsScanned: input.priceRowsScanned ?? input.priceRows.length,
    revenue: { kind: revenueKind, currency: 'USD', planPricesMicros, priceObservations },
    variants: Object.freeze(variants),
    contexts: Object.freeze(contextRows),
    totals: {
      shown: totalsShown,
      cta: totalsCta,
      purchases: totalsPurchases,
      conversionPct: conversionPct(totalsPurchases, totalsShown),
      revenueMicros: totalsRevenue,
      unpricedPurchases: totalsUnpriced,
    },
  };
}

interface FunnelLoadResult {
  docs: PaywallVariantFunnelDoc[];
  truncated: boolean;
}

async function loadFunnelDocs(db: FirebaseFirestore.Firestore, fromMs: number): Promise<FunnelLoadResult> {
  const docs: PaywallVariantFunnelDoc[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let truncated = false;
  while (docs.length < FUNNEL_ROW_CAP) {
    const pageLimit = Math.min(FUNNEL_PAGE_SIZE, FUNNEL_ROW_CAP - docs.length);
    let query: FirebaseFirestore.Query = db.collection('paywall_funnel')
      .where('ts', '>=', fromMs)
      .orderBy('ts', 'desc')
      .limit(pageLimit);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    for (const doc of snapshot.docs) docs.push(doc.data() as PaywallVariantFunnelDoc);
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageLimit) break;
  }
  if (docs.length >= FUNNEL_ROW_CAP) truncated = true;
  return { docs, truncated };
}

interface PriceLoadResult {
  rows: PaywallVariantPriceRow[];
  scanned: number;
  truncated: boolean;
}

async function loadPriceRows(db: FirebaseFirestore.Firestore, priceFromMs: number): Promise<PriceLoadResult> {
  const rows: PaywallVariantPriceRow[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let truncated = false;
  while (rows.length < PRICE_ROW_CAP) {
    let query: FirebaseFirestore.Query = db.collection('revenuecat_premium_events')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(priceFromMs))
      .orderBy('createdAt', 'desc')
      .limit(Math.min(PRICE_PAGE_SIZE, PRICE_ROW_CAP - rows.length));
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      rows.push({
        eventType: data.eventType,
        environment: data.environment,
        billingCadence: data.billingCadence,
        grossUsdMicros: data.grossUsdMicros,
      });
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < PRICE_PAGE_SIZE) break;
  }
  if (rows.length >= PRICE_ROW_CAP) truncated = true;
  return { rows, scanned: rows.length, truncated };
}

export const adminGetPaywallVariantStats = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request): Promise<PaywallVariantStatsReport> => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = resolveRole(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'money.read')) {
      throw new HttpsError('permission-denied', 'Role cannot read paywall variant revenue stats');
    }
    const rangeDays = parsePaywallVariantStatsRange(request.data);
    const generatedAtMs = Date.now();
    const fromMs = generatedAtMs - rangeDays * DAY_MS;
    const priceFromMs = generatedAtMs - PAYWALL_STATS_PRICE_WINDOW_DAYS * DAY_MS;
    const db = admin.firestore();
    const [funnel, prices] = await Promise.all([
      loadFunnelDocs(db, fromMs),
      loadPriceRows(db, priceFromMs),
    ]);
    return buildPaywallVariantStatsReport({
      funnelDocs: funnel.docs,
      priceRows: prices.rows,
      priceRowsScanned: prices.scanned,
      rangeDays,
      fromMs,
      generatedAtMs,
      truncated: funnel.truncated || prices.truncated,
    });
  },
);
