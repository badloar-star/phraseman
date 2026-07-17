import { buildProductAnalyticsAggregateQuery } from './admin_product_analytics';

describe('product analytics exact reporting window', () => {
  test('filters timestamps exactly while using table suffix only as a partition buffer', () => {
    const sql = buildProductAnalyticsAggregateQuery('`project.analytics.events_*`');
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
    expect(sql).not.toContain('FROM session_facts GROUP BY id');
    expect(sql).not.toMatch(/FROM first_touch_return_flags\s+GROUP BY id/);
  });
});
