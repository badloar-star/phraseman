export interface RevenueReconciliationInput {
  dashboard: number | null;
  webhook: number | null;
  funnel: number | null;
}

export interface RevenueReconciliation extends RevenueReconciliationInput {
  webhookDelta: number | null;
  funnelCoverageRatio: number | null;
  status: 'not_comparable' | 'unavailable';
  explanation: string;
}

export function reconcileRevenue(input: RevenueReconciliationInput): RevenueReconciliation {
  return {
    ...input,
    webhookDelta: null,
    funnelCoverageRatio: null,
    status: input.dashboard === null && input.webhook === null && input.funnel === null ? 'unavailable' : 'not_comparable',
    explanation: 'RevenueCat new_customers, webhook purchase events and in-app purchase signals have different semantics; values are shown side by side and are not reconciled.',
  };
}

export class RevenueCatApiError extends Error {
  constructor(
    public readonly code: 'authentication_failed' | 'rate_limited' | 'request_failed' | 'invalid_response',
    public readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'RevenueCatApiError';
  }
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface RevenueCatChartRequest {
  apiKey: string;
  projectId: string;
  chartName: string;
  startDate: string;
  endDate: string;
  fetchImpl?: FetchLike;
}

export interface RevenueCatChartResult {
  displayName: string;
  summaryValue: number | null;
  values: unknown[];
  raw: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function fetchRevenueCatChart(input: RevenueCatChartRequest): Promise<RevenueCatChartResult> {
  if (!input.apiKey.trim() || !input.projectId.trim()) {
    throw new RevenueCatApiError('authentication_failed', false, 'RevenueCat API key and project id are required.');
  }

  const url = new URL(
    `https://api.revenuecat.com/v2/projects/${encodeURIComponent(input.projectId)}/charts/${encodeURIComponent(input.chartName)}`,
  );
  url.searchParams.set('start_date', input.startDate);
  url.searchParams.set('end_date', input.endDate);

  const response = await (input.fetchImpl ?? fetch)(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${input.apiKey}` },
  });

  if (response.status === 401 || response.status === 403) {
    throw new RevenueCatApiError('authentication_failed', false, `RevenueCat rejected the analytics credential (${response.status}).`);
  }
  if (response.status === 429) {
    throw new RevenueCatApiError('rate_limited', true, 'RevenueCat Charts API rate limit reached.');
  }
  if (!response.ok) {
    throw new RevenueCatApiError('request_failed', response.status >= 500, `RevenueCat Charts API returned HTTP ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new RevenueCatApiError('invalid_response', false, 'RevenueCat Charts API returned invalid JSON.');
  }
  const record = asRecord(payload);
  if (!record) {
    throw new RevenueCatApiError('invalid_response', false, 'RevenueCat Charts API returned a non-object payload.');
  }

  const summary = asRecord(record.summary);
  const summaryValue = typeof summary?.value === 'number' ? summary.value : null;
  return {
    displayName: typeof record.display_name === 'string' ? record.display_name : input.chartName,
    summaryValue,
    values: Array.isArray(record.values) ? record.values : [],
    raw: record,
  };
}
