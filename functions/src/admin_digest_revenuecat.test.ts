import {
  fetchRevenueCatChart,
  reconcileRevenue,
  RevenueCatApiError,
} from './admin_digest_revenuecat';
import fs from 'node:fs';
import path from 'node:path';

describe('reconcileRevenue', () => {
  test('keeps dashboard, webhook and consented funnel values separate', () => {
    expect(reconcileRevenue({ dashboard: 60, webhook: 58, funnel: 31 })).toEqual({
      dashboard: 60,
      webhook: 58,
      funnel: 31,
      webhookDelta: null,
      funnelCoverageRatio: null,
      status: 'not_comparable',
      explanation: expect.stringContaining('different semantics'),
    });
  });

  test('does not invent ratios when dashboard data is unavailable or zero', () => {
    expect(reconcileRevenue({ dashboard: null, webhook: 5, funnel: 3 }).funnelCoverageRatio).toBeNull();
    expect(reconcileRevenue({ dashboard: 0, webhook: 0, funnel: 0 }).funnelCoverageRatio).toBeNull();
  });
});

describe('fetchRevenueCatChart', () => {
  test('uses a read-only bearer request and returns parsed chart data', async () => {
    const calls: Array<{ url: string | URL; init?: RequestInit }> = [];
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({
        object: 'chart',
        display_name: 'New Customers',
        values: [{ cohort: '2026-07-10', value: 12 }],
        summary: { value: 12 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const result = await fetchRevenueCatChart({
      apiKey: 'test-secret',
      projectId: 'proj_test',
      chartName: 'new_customers',
      startDate: '2026-07-10',
      endDate: '2026-07-11',
      fetchImpl,
    });

    expect(result.summaryValue).toBe(12);
    expect(String(calls[0].url)).toContain('/v2/projects/proj_test/charts/new_customers');
    expect(calls[0].init?.headers).toEqual({ Authorization: 'Bearer test-secret' });
    expect(calls[0].init?.method).toBe('GET');
  });

  test.each([401, 403])('classifies HTTP %s as a non-retryable configuration error', async (status) => {
    const fetchImpl = async () => new Response('{}', { status });
    await expect(fetchRevenueCatChart({
      apiKey: 'test-secret', projectId: 'proj_test', chartName: 'new_customers',
      startDate: '2026-07-10', endDate: '2026-07-11', fetchImpl,
    })).rejects.toMatchObject({ code: 'authentication_failed', retryable: false });
  });

  test('classifies HTTP 429 as retryable without hiding the source failure', async () => {
    const fetchImpl = async () => new Response('{}', { status: 429 });
    const promise = fetchRevenueCatChart({
      apiKey: 'test-secret', projectId: 'proj_test', chartName: 'new_customers',
      startDate: '2026-07-10', endDate: '2026-07-11', fetchImpl,
    });
    await expect(promise).rejects.toBeInstanceOf(RevenueCatApiError);
    await expect(promise).rejects.toMatchObject({ code: 'rate_limited', retryable: true });
  });
});

describe('admin digest RevenueCat server binding', () => {
  test('binds the secret only to the Cloud Function and keeps project id server-side', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_daily_digest.ts'), 'utf8');
    expect(source).toContain("defineSecret('REVENUECAT_ANALYTICS_API_KEY')");
    expect(source).toContain("defineString('REVENUECAT_PROJECT_ID'");
    expect(source).toContain('secrets: [OPENAI_API_KEY, REVENUECAT_ANALYTICS_API_KEY]');
    expect(source).toContain('fetchRevenueCatChart({');
  });
});
