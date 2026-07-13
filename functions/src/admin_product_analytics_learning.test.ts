import { buildProductAnalyticsAggregateQuery } from './admin_product_analytics';

process.env.ANALYTICS_BIGQUERY_DATASET = 'phraseman-ea0b3.analytics_532376954';

describe('product analytics learning outcome warehouse contract', () => {
  const sql = buildProductAnalyticsAggregateQuery();

  it('warehouses every governed review lifecycle event', () => {
    expect(sql).toContain("'learning_review_session_start'");
    expect(sql).toContain("'learning_review_answer'");
    expect(sql).toContain("'learning_review_session_complete'");
    expect(sql).toContain("'learning_review_session_abandoned'");
    expect(sql).toContain("STARTS_WITH(event_name, 'learning_review_') OR STARTS_WITH(event_name, 'product_')");
  });

  it('returns delayed recall, mastery, session, content and WEL row kinds', () => {
    for (const rowKind of [
      'review_summary',
      'review_delay',
      'mastery_transition',
      'review_content',
      'review_session_summary',
      'weekly_effective_learner',
    ]) {
      expect(sql).toContain(`'${rowKind}' AS row_kind`);
      expect(sql).toContain(`UNION ALL SELECT * FROM ${rowKind === 'review_delay' ? 'review_delay_rows' : rowKind === 'mastery_transition' ? 'mastery_transition_rows' : rowKind === 'review_content' ? 'review_content_rows' : rowKind === 'weekly_effective_learner' ? 'weekly_effective_learner_rows' : `${rowKind}_row`}`);
    }
  });

  it('pairs review lifecycle events by app instance and review session', () => {
    expect(sql).toContain('review_session_facts AS');
    expect(sql).toContain('GROUP BY user_pseudo_id, review_session_id');
    expect(sql).toContain('COUNTIF(has_start AND has_complete) AS completes');
    expect(sql).toContain('SAFE_DIVIDE(COUNTIF(has_start AND has_complete), COUNTIF(has_start))');
  });

  it('defines WEL as two UTC learning days plus a correct delayed recall', () => {
    expect(sql).toContain('DATE_TRUNC(activity_date, WEEK(MONDAY))');
    expect(sql).toContain('meaningful_learning_days >= 2');
    expect(sql).toContain('correct_delayed_reviews >= 1');
    expect(sql).toContain("actual_delay_bucket IN ('d1_to_d6', 'd7_to_d29', 'd30_plus')");
  });

  it('suppresses content diagnostics below five consented app instances', () => {
    expect(sql).toContain('app_instances >= 5');
    expect(sql).toContain('suppressed_small_sample');
    expect(sql).toContain('COUNT(DISTINCT user_pseudo_id) AS app_instances');
  });

  it('marks only full UTC weeks entirely covered by the range and watermark', () => {
    expect(sql).toContain("week_start_utc >= PARSE_DATE('%Y%m%d', @fromSuffix)");
    expect(sql).toContain('data_through_date >= DATE_ADD(week_start_utc, INTERVAL 7 DAY)');
    expect(sql).toContain('AS is_complete_week');
  });

  it('never projects item UUIDs or raw content into aggregate payloads', () => {
    const aggregateSql = sql.slice(sql.indexOf('review_summary_row AS'));
    expect(aggregateSql).not.toContain('analytics_item_id');
    expect(sql).not.toMatch(/key = '(phrase|answer|translation|error_word)'/);
  });
});
