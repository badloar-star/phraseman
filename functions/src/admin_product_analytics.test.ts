import {
  clampProductAnalyticsDays,
  isAnalyticsExportPendingError,
  normalizeProductAnalyticsPlatform,
  queryText,
} from './admin_product_analytics';
import fs from 'fs';
import path from 'path';

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

  it('keeps the same event id distinct across production and test soft-upsell modes', () => {
    const query = queryText('`project.dataset.events_*`');
    const duplicatePartition = query.match(/ROW_NUMBER\(\) OVER \(PARTITION BY([\s\S]*?)ORDER BY event_timestamp\)/)?.[1];
    expect(duplicatePartition).toContain("key = 'event_id'");
    expect(duplicatePartition).toContain("key = 'soft_upsell_mode'");
    expect(duplicatePartition).toContain("'__no_soft_upsell_mode__'");
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
  });
});

describe('exact soft upsell funnel contract', () => {
  it('isolates modes, rejects conflicting metadata, and exposes every commercial outcome', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
    expect(source).toContain("key = 'soft_upsell_impression_id'");
    expect(source).toContain("soft_upsell_mode IN ('production', 'test')");
    expect(source).toContain('valid_soft_chains AS');
    expect(source).toContain('GROUP BY mode, impression_id');
    expect(source).toContain('valid.mode = soft_upsell_mode AND valid.impression_id = soft_upsell_impression_id');
    expect(source).toContain('GROUP BY mode, trigger, impression_id');
    expect(source).toContain('event_name = \'purchase_pending\'');
    expect(source).toContain('event_name = \'purchase_failed\'');
    expect(source).toContain('event_name = \'purchase_cancelled\'');
    expect(source).toContain('median_impression_to_cta_ms');
    expect(source).toContain('median_impression_to_result_ms');
    expect(source).toContain('cta_to_purchase_rate');
    expect(source).toContain('eligible_to_impression_rate');
    expect(source).toContain('eligible_events');
    expect(source).toContain('eligible_app_instances');
    expect(source).toContain('paywall_reach_rate');
    expect(source).toContain('monthly_selections');
    expect(source).toContain('monthly_activations');
    expect(source).toContain('yearly_activations');
    expect(source).toContain('lifetime_activations');
    expect(source).toContain('rejected_chain_ids');
    expect(source).toContain('outcome_without_purchase_start');
    expect(source).not.toMatch(/soft_chain_facts[\s\S]*user_pseudo_id[\s\S]*GROUP BY mode, trigger, impression_id/);
  });
});
