export const DIGEST_SCHEMA_VERSION = 2;
export const FIRST_DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface DigestWindow {
  startMs: number;
  endMs: number;
}

export interface DigestWindows {
  current: DigestWindow;
  previous: DigestWindow;
  reason: 'last_successful_digest' | 'first_run_fallback';
}

export interface MetricComparison {
  current: number;
  previous: number;
  absoluteDelta: number;
  percentDelta: number | null;
}

export type DigestMetricSource = 'revenuecat_api' | 'revenuecat_webhook' | 'paywall_funnel';

export interface DigestMetricDefinition {
  id: string;
  label: string;
  unit: 'events' | 'users' | 'subscriptions';
  sourceOfTruth: DigestMetricSource;
  formula: string;
  caveat: string;
}

export const REVENUE_METRIC_REGISTRY: readonly DigestMetricDefinition[] = [
  {
    id: 'initial_paid_purchases',
    label: 'Новые платные покупки',
    unit: 'events',
    sourceOfTruth: 'revenuecat_api',
    formula: 'RevenueCat new paid transactions excluding trial starts',
    caveat: 'Не включает бесплатный старт trial и не равен числу активных подписок.',
  },
  {
    id: 'trial_starts',
    label: 'Начатые пробные периоды',
    unit: 'events',
    sourceOfTruth: 'revenuecat_api',
    formula: 'RevenueCat trial starts in the reporting window',
    caveat: 'Старт trial ещё не является платной конверсией.',
  },
  {
    id: 'trial_conversions',
    label: 'Конверсии trial в оплату',
    unit: 'events',
    sourceOfTruth: 'revenuecat_api',
    formula: 'RevenueCat trial conversions in the reporting window',
    caveat: 'Относится к trial-когорте, начавшейся раньше или внутри окна.',
  },
  {
    id: 'renewals',
    label: 'Продления',
    unit: 'events',
    sourceOfTruth: 'revenuecat_api',
    formula: 'RevenueCat renewal transactions in the reporting window',
    caveat: 'Продление не является новым клиентом.',
  },
  {
    id: 'cancellations',
    label: 'Отмены автопродления',
    unit: 'events',
    sourceOfTruth: 'revenuecat_webhook',
    formula: 'CANCELLATION webhook events deduplicated by RevenueCat event id',
    caveat: 'Отмена автопродления не всегда означает немедленную потерю доступа.',
  },
  {
    id: 'expirations',
    label: 'Истёкшие подписки',
    unit: 'events',
    sourceOfTruth: 'revenuecat_webhook',
    formula: 'EXPIRATION webhook events deduplicated by RevenueCat event id',
    caveat: 'Показывает окончание доступа, а не момент отмены автопродления.',
  },
  {
    id: 'refunds',
    label: 'Возвраты',
    unit: 'events',
    sourceOfTruth: 'revenuecat_api',
    formula: 'RevenueCat refunded transactions in the reporting window',
    caveat: 'Сумма возврата и количество событий — разные метрики.',
  },
  {
    id: 'active_subscriptions',
    label: 'Активные подписки на конец периода',
    unit: 'subscriptions',
    sourceOfTruth: 'revenuecat_api',
    formula: 'RevenueCat active subscriptions snapshot at window end',
    caveat: 'Это snapshot состояния, а не число событий за период.',
  },
  {
    id: 'unique_payers',
    label: 'Уникальные плательщики',
    unit: 'users',
    sourceOfTruth: 'revenuecat_api',
    formula: 'Distinct RevenueCat customers with a paid transaction in the window',
    caveat: 'Один пользователь может создать несколько платёжных событий.',
  },
  {
    id: 'paywall_impressions',
    label: 'Показы paywall',
    unit: 'events',
    sourceOfTruth: 'paywall_funnel',
    formula: 'paywall_funnel events with step=shown and dev=false',
    caveat: 'Только пользователи с согласием на продуктовую аналитику.',
  },
  {
    id: 'paywall_cta',
    label: 'Нажатия кнопки подписки',
    unit: 'events',
    sourceOfTruth: 'paywall_funnel',
    formula: 'paywall_funnel events with step=cta_click and dev=false',
    caveat: 'Нажатие не доказывает завершённую оплату.',
  },
  {
    id: 'paywall_purchase_signals',
    label: 'Сигналы покупки в приложении',
    unit: 'events',
    sourceOfTruth: 'paywall_funnel',
    formula: 'paywall_funnel events with step=purchase_completed and dev=false',
    caveat: 'Это продуктовый сигнал с неполным покрытием, не денежный источник истины.',
  },
] as const;

export function resolveDigestWindows(nowMs: number, lastSuccessfulEndMs?: number): DigestWindows {
  const hasLastSuccess = Number.isFinite(lastSuccessfulEndMs);
  const startMs = hasLastSuccess ? Number(lastSuccessfulEndMs) : nowMs - FIRST_DIGEST_WINDOW_MS;
  const durationMs = nowMs - startMs;

  if (!Number.isFinite(nowMs) || durationMs <= 0) {
    throw new Error('Digest window must have a finite positive duration.');
  }

  return {
    current: { startMs, endMs: nowMs },
    previous: { startMs: startMs - durationMs, endMs: startMs },
    reason: hasLastSuccess ? 'last_successful_digest' : 'first_run_fallback',
  };
}

export function compareMetric(current: number, previous: number): MetricComparison {
  const absoluteDelta = current - previous;
  return {
    current,
    previous,
    absoluteDelta,
    percentDelta: previous === 0 ? null : (absoluteDelta / previous) * 100,
  };
}

export function readLastSuccessfulEndMs(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const state = value as { status?: unknown; windowEndMs?: unknown };
  if (state.status !== 'succeeded' || typeof state.windowEndMs !== 'number' || !Number.isFinite(state.windowEndMs)) {
    return undefined;
  }
  return state.windowEndMs;
}
