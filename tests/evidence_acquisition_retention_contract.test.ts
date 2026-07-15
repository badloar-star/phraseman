import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('evidence acquisition, activation, and true-retention contract', () => {
  it('governs measurable onboarding and both metric definitions', () => {
    const governance = JSON.parse(read('app/product_analytics_governance.json'));
    expect(governance.events.some((event: { name: string }) => event.name === 'onboarding_complete')).toBe(true);
    expect(governance.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'activation.first_touch_funnel.v1' }),
      expect.objectContaining({ id: 'retention.firebase_first_touch.v1' }),
    ]));
  });

  it('uses Firebase first touch and exposes true cohorts beside observed-window cohorts', () => {
    const source = read('functions/src/admin_product_analytics.ts');
    expect(source).toContain('user_first_touch_timestamp');
    expect(source).toContain("'true_retention_day' AS row_kind");
    expect(source).toContain("'true_retention_summary' AS row_kind");
    expect(source).toContain("'activation_summary' AS row_kind");
    expect(source).toContain("'acquisition_channel' AS row_kind");
    expect(source).toContain('exact_returned_d14');
    expect(source).toContain('rolling_returned_d30');
    expect(source).toContain('active_day_bucket');
    expect(source).toContain('valid_first_touch_app_instances');
    expect(source).toContain('invalid_or_missing_first_touch_app_instances');
    expect(source).toContain('first_touch_coverage_rate');
    expect(source).toContain('trueRetention');
    expect(source).toContain('activation');
    expect(source).toContain('acquisition');
    expect(source).toContain('firebase_user_first_touch_timestamp_consent_observed_v1');
    expect(source).toContain("status: 'unavailable_not_configured'");
    expect(source).toContain('observedReturn');
  });

  it('does not return raw source, medium, campaign, or app-instance identifiers', () => {
    const source = read('functions/src/admin_product_analytics.ts');
    expect(source).toContain('acquisition_channel_bucket');
    expect(source).not.toContain('acquisitionRows.push({ user_pseudo_id');
    expect(source).not.toContain('raw_traffic_source');
    expect(source).not.toContain('raw_traffic_medium');
    expect(source).not.toContain('raw_traffic_campaign');
  });
});
