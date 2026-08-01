import { buildOperationalAggregateProjection, type OperationalAggregateCounts } from './monthly_decision_pack_firestore_sources';

function counts(scope: OperationalAggregateCounts['scope']): OperationalAggregateCounts {
  return {
    scope,
    notificationsReferrals: [{ metricId: 'referral_attributions_created', count: 12 }],
    socialFeatures: [{ metricId: 'community_pack_purchases', count: 5 }, { metricId: 'arena_rooms_created', count: 3 }],
    feedbackSupport: [{ metricId: 'error_reports_created', count: 7 }, { metricId: 'support_messages_received', count: 2 }],
  };
}

describe('monthly decision pack Firestore aggregate projection', () => {
  test('exports only aggregate counts for both scopes', () => {
    const projection = buildOperationalAggregateProjection(counts('reporting_month'), counts('baseline_12m'), 2000, 1999);
    expect(projection.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'notifications_referrals', status: 'available' }),
      expect.objectContaining({ id: 'social_features', status: 'available' }),
      expect.objectContaining({ id: 'feedback_support', status: 'available' }),
    ]));
    expect(projection.notificationsReferrals).toHaveLength(2);
    expect(projection.socialFeatures).toHaveLength(4);
    expect(projection.feedbackSupport).toHaveLength(4);
    expect(JSON.stringify(projection)).not.toMatch(/"(uid|email|message|subject|phrase|answer)":/i);
  });

  test('marks a source partial instead of converting a failed query to zero', () => {
    const month = counts('reporting_month');
    month.feedbackSupport[1] = { ...month.feedbackSupport[1], count: null };
    const projection = buildOperationalAggregateProjection(month, counts('baseline_12m'), 2000, 1999);
    expect(projection.sources).toContainEqual(expect.objectContaining({ id: 'feedback_support', status: 'partial' }));
    expect(projection.feedbackSupport.some((row) => row.scope === 'reporting_month' && row.category === 'support_messages_received')).toBe(false);
  });
});
