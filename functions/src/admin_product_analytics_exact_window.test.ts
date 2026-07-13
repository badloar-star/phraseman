import { buildProductAnalyticsAggregateQuery } from './admin_product_analytics';

describe('product analytics exact reporting window', () => {
  test('filters timestamps exactly while using table suffix only as a partition buffer', () => {
    const sql = buildProductAnalyticsAggregateQuery('`project.analytics.events_*`');
    expect(sql).toContain('CREATE TEMP TABLE raw_base AS');
    expect(sql).toContain('CREATE TEMP TABLE base AS');
    expect(sql).toContain('WITH session_facts AS (');
    expect(sql).toContain('event_timestamp >= @fromMicros');
    expect(sql).toContain('event_timestamp < @toMicrosExclusive');
    expect(sql).toContain('DATE(TIMESTAMP_MICROS(event_timestamp), @reportingTimezone)');
    expect(sql).toContain("cohort_date BETWEEN PARSE_DATE('%Y-%m-%d', @reportFromDate) AND PARSE_DATE('%Y-%m-%d', @reportToDate)");
    expect(sql).toContain("'daily_kpi' AS row_kind");
  });

  test('never groups by aliases declared only inside a STRUCT expression', () => {
    const sql = buildProductAnalyticsAggregateQuery('`project.analytics.events_*`');
    expect(sql).toContain('session_bucket_facts AS (');
    expect(sql).toContain('FROM session_bucket_facts GROUP BY id');
    expect(sql).toContain('active_day_bucket_facts AS (');
    expect(sql).toMatch(/FROM active_day_bucket_facts\s+GROUP BY id/);
    expect(sql).toContain('conversion_failure_facts AS (');
    expect(sql).toMatch(/FROM conversion_failure_facts\s+GROUP BY reason/);
    for (const [facts, alias] of [
      ['acquisition_channel_facts', 'channel'],
      ['review_delay_facts', 'delay_bucket'],
      ['mastery_transition_facts', 'transition'],
      ['experiment_exposure_facts', 'experiment_id, definition_version, variant_id, control_variant_id, surface, config_revision'],
      ['release_adoption_facts', 'app_version, build_number, platform'],
      ['operation_failure_facts', 'app_version, build_number, platform, feature, operation, failure_code, retryable'],
      ['daily_kpi_facts', 'local_date'],
    ] as const) {
      expect(sql).toContain(`${facts} AS (`);
      expect(sql).toMatch(new RegExp(`FROM ${facts}\\s+GROUP BY ${alias}`));
    }
    expect(sql).not.toContain('FROM session_facts GROUP BY id');
    expect(sql).not.toMatch(/FROM first_touch_return_flags\s+GROUP BY id/);
    expect(sql).not.toMatch(/FROM conversion_events\s+WHERE event_name = 'purchase_failed'\s+GROUP BY reason/);
  });
});
