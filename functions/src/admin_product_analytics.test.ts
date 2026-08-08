import {
  buildProductAnalyticsPurchaseFailureQuery,
  clampProductAnalyticsDays,
  isAnalyticsExportPendingError,
  normalizeProductAnalyticsPlatform,
  parseProductAnalyticsPayload,
  type ProductAnalyticsQueryRow,
} from './admin_product_analytics';
import fs from 'fs';
import path from 'path';

describe('parseProductAnalyticsPayload', () => {
  it('returns only parsed JSON records and never throws for invalid warehouse rows', () => {
    expect(parseProductAnalyticsPayload({ payload: '{"events":2}' })).toEqual({ events: 2 });
    expect(parseProductAnalyticsPayload({ payload: '{malformed' })).toBeNull();
    expect(parseProductAnalyticsPayload({ payload: '[{"events":2}]' })).toBeNull();
    expect(parseProductAnalyticsPayload({ payload: '"raw string"' })).toBeNull();
    expect(parseProductAnalyticsPayload({ payload: 'null' })).toBeNull();
    expect(parseProductAnalyticsPayload({})).toBeNull();
    expect(parseProductAnalyticsPayload({ payload: { events: 2 } } as unknown as ProductAnalyticsQueryRow))
      .toBeNull();
  });
});

describe('admin product analytics input contract', () => {
  it('requires the server-side money.read permission', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
    expect(source).toContain("hasClaimedPermission(request.auth?.token, 'money.read')");
  });

  it('limits the query window to supported periods', () => {
    expect(clampProductAnalyticsDays(7)).toBe(7);
    expect(clampProductAnalyticsDays(28)).toBe(28);
    expect(clampProductAnalyticsDays(90)).toBe(90);
    expect(clampProductAnalyticsDays(999)).toBe(28);
  });

  it('accepts only aggregate platform filters', () => {
    expect(normalizeProductAnalyticsPlatform('ios')).toBe('ios');
    expect(normalizeProductAnalyticsPlatform('android')).toBe('android');
    expect(normalizeProductAnalyticsPlatform('anything')).toBe('all');
  });

  it('returns an honest empty state while the first daily export is pending', () => {
    expect(isAnalyticsExportPendingError({ code: 404, message: 'Not found: Dataset' })).toBe(true);
    expect(isAnalyticsExportPendingError({ message: 'Wildcard table does not match any table' })).toBe(true);
    expect(isAnalyticsExportPendingError({ code: 403, message: 'Access denied' })).toBe(false);
  });
});

describe('admin product session analytics contract', () => {
  it('returns observed session aggregates without raw session identifiers', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
    expect(source).toContain('session_facts');
    expect(source).toContain('withoutStartInWindow');
    expect(source).toContain('p50ObservedDurationMs');
    expect(source).toContain('lastObservedScreens');
    expect(source).toContain("'<1m'");
    expect(source).not.toContain('sessions.push(payload)');
  });
});

describe('admin lesson drop-off analytics contract', () => {
  it('aggregates phrase checkpoints, answer errors, and historical coverage', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
    expect(source).toContain("'lesson_answer'");
    expect(source).toContain("key = 'total_phrases'");
    expect(source).toContain("key = 'correct'");
    expect(source).toContain("'learning_checkpoint' AS row_kind");
    expect(source).toContain('answer_error_rate');
    expect(source).toContain('checkpoint_coverage_rate');
    expect(source).toContain('learningDropoff');
    expect(source).toContain("key = 'lesson_attempt_id'");
    expect(source).toContain('distinct_started_attempts');
    expect(source).toContain('lesson_attempt_id_coverage_rate');
  });
});

describe('admin conversion and observed-return analytics contract', () => {
  it('keeps behavioral paywall analytics separate and reports bounded return cohorts', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
    expect(source).toContain("'paywall_view'");
    expect(source).toContain("'conversion_context' AS row_kind");
    expect(source).toContain('impression_purchase_per_store_start_rate');
    expect(source).toContain("'retention_day' AS row_kind");
    expect(source).toContain('eligible_d28');
    expect(source).toContain('observedReturn');
    expect(source).toContain('behavioralConversion');
    expect(source).toContain("COUNTIF(event_name = 'paywall_shown') AS views");
    expect(source).toContain("COUNTIF(event_name = 'purchase_started') AS store_starts");
    expect(source).toContain("COUNTIF(event_name = 'purchase_completed') AS purchases");
    expect(source).toContain("'paywall_exit_offer_shown'");
    expect(source).toMatch(/THEN paywall_source\s+ELSE 'unknown'/);
    expect(source).not.toContain("COUNTIF(event_name IN ('paywall_cta_click', 'purchase_started')) AS cta_clicks");
    expect(source).toContain("key = 'paywall_impression_id'");
    expect(source).toContain('distinct_paywall_impressions');
    expect(source).toContain('paywall_impression_id_coverage_rate');
    expect(source).toContain('p50_time_to_cta_ms');
    expect(source).toContain('p90_time_to_result_ms');
    expect(source).toContain('impression_facts AS');
    expect(source).toContain('GROUP BY context_bucket, source_bucket, paywall_impression_id');
    expect(source).toContain("MIN(IF(event_name = 'paywall_cta_click', time_since_impression_ms, NULL)) AS time_to_cta_ms");
    expect(source).toContain('impression_cta_rate');
    expect(source).toContain('impression_purchase_per_store_start_rate');
    expect(source).not.toContain("SAFE_DIVIDE(COUNTIF(event_name = 'paywall_cta_click'), COUNTIF(event_name = 'paywall_shown')) AS cta_per_view_rate");
    expect(source).toContain("'paywall_inventory_resolved'");
    expect(source).toContain('inventory_resolution_facts AS');
    expect(source).toContain('selected_plan_facts AS');
    expect(source).toContain("'conversion_inventory' AS row_kind");
    expect(source).toContain('inventory_resolution_coverage_rate');
    expect(source).toContain('default_cta_blocked_impressions');
    expect(source).toContain('selected_plan_missing_impressions');
    expect(source).toContain('lifetime_expected_missing_impressions');
    expect(source).toContain('p90_inventory_resolution_ms');
    expect(source).toContain('inventoryReadiness');
    expect(source).toContain('failureReasons: conversionFailures.sort');
  });
});

describe('bounded purchase-failure aggregate query', () => {
  it('queries only deduplicated purchase failures and returns at most ten governed groups', () => {
    const query = buildProductAnalyticsPurchaseFailureQuery('`safe_dataset.events_*`');
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');

    expect(query).toContain("event_name = 'purchase_failed'");
    expect(query).toContain("key = 'event_id'");
    expect(query).toContain("CONCAT(event_name, ':', user_pseudo_id, ':', CAST(event_timestamp AS STRING))");
    expect(query).toContain('ROW_NUMBER() OVER');
    expect(query).toContain('duplicate_rank = 1');
    for (const reason of [
      'identity_sync', 'no_active_entitlement_after_purchase', 'payment_pending',
      'network_error', 'payment_error', 'store_error', 'configuration_error',
      'sdk_other', 'unknown', 'legacy_or_other',
    ]) expect(query).toContain(`'${reason}'`);
    expect(query).toContain("'conversion_failure' AS row_kind");
    expect(query).toMatch(/LIMIT\s+10\s*$/);
    expect(query).not.toMatch(/UNION ALL|daily_kpi|screen_rows|lesson_rows|retention_/);
    expect(source).toContain('loadProductAnalyticsPurchaseFailureRows');
    expect(source).toContain('maxResults: 10');
    expect(source).toContain("maximumBytesBilled: input.maximumBytesBilled ?? '5000000000'");
    expect(source).toContain('.filter((row) => row.row_kind === \'conversion_failure\')');
    expect(source).toContain('.slice(0, 10)');
  });
});
