import * as admin from 'firebase-admin';
import type { DecisionPackSource } from './monthly_decision_pack_core';

type Scope = 'reporting_month' | 'baseline_12m';
type SourceId = 'notifications_referrals' | 'social_features' | 'feedback_support';
type CountResult = { metricId: string; count: number | null };

export interface OperationalAggregateProjection {
  sources: DecisionPackSource[];
  notificationsReferrals: Record<string, string | number | null>[];
  socialFeatures: Record<string, string | number | null>[];
  feedbackSupport: Record<string, string | number | null>[];
}

export interface OperationalAggregateCounts {
  scope: Scope;
  notificationsReferrals: CountResult[];
  socialFeatures: CountResult[];
  feedbackSupport: CountResult[];
}

type AggregateSpec = {
  source: SourceId;
  metricId: string;
  collection: string;
  timeField: string;
  timeKind: 'number' | 'timestamp';
};

const SPECS: readonly AggregateSpec[] = [
  { source: 'notifications_referrals', metricId: 'referral_attributions_created', collection: 'referral_attributions', timeField: 'createdAt', timeKind: 'timestamp' },
  { source: 'social_features', metricId: 'community_pack_purchases', collection: 'community_pack_purchases', timeField: 'createdAt', timeKind: 'number' },
  { source: 'social_features', metricId: 'arena_rooms_created', collection: 'arena_rooms_live', timeField: 'createdAt', timeKind: 'number' },
  { source: 'feedback_support', metricId: 'error_reports_created', collection: 'error_reports', timeField: 'createdAtMs', timeKind: 'number' },
  { source: 'feedback_support', metricId: 'user_reports_created', collection: 'user_reports', timeField: 'createdAtMs', timeKind: 'number' },
  { source: 'feedback_support', metricId: 'support_messages_received', collection: 'support_inbox', timeField: 'receivedAtMs', timeKind: 'number' },
  { source: 'feedback_support', metricId: 'website_contacts_received', collection: 'website_contact_inbox', timeField: 'createdAt', timeKind: 'timestamp' },
  { source: 'feedback_support', metricId: 'app_errors_created', collection: 'app_errors', timeField: 'createdAtMs', timeKind: 'number' },
] as const;

function sourceStatus(results: CountResult[]): Pick<DecisionPackSource, 'status' | 'reason'> {
  const available = results.filter((result) => result.count != null).length;
  if (available === 0) return { status: 'unavailable', reason: 'aggregate_queries_failed' };
  if (available < results.length) return { status: 'partial', reason: 'one_or_more_aggregate_queries_failed' };
  return { status: 'available', reason: 'aggregate_counts_without_raw_documents' };
}

export function buildOperationalAggregateProjection(
  month: OperationalAggregateCounts,
  baseline: OperationalAggregateCounts,
  generatedAtMs: number,
  analysisCutoffMs: number,
): OperationalAggregateProjection {
  const both = [month, baseline];
  const grouped = (source: SourceId) => both.flatMap((scope) => source === 'notifications_referrals'
    ? scope.notificationsReferrals
    : source === 'social_features'
      ? scope.socialFeatures
      : scope.feedbackSupport);
  const sources: DecisionPackSource[] = (['notifications_referrals', 'social_features', 'feedback_support'] as const).map((id) => ({
    id,
    ...sourceStatus(grouped(id)),
    analysisCutoffMs,
    queryAsOfMs: generatedAtMs,
    rowCount: grouped(id).reduce((sum, result) => sum + (result.count == null ? 0 : 1), 0),
  }));
  const status = (source: SourceId) => sources.find((item) => item.id === source)?.status ?? 'unavailable';
  return {
    sources,
    notificationsReferrals: both.flatMap((scope) => scope.notificationsReferrals.flatMap((result) => result.count == null ? [] : [{
      scope: scope.scope,
      surface: 'referrals',
      metric_id: result.metricId,
      value: result.count,
      denominator: result.count,
      status: status('notifications_referrals'),
    }])),
    socialFeatures: both.flatMap((scope) => scope.socialFeatures.flatMap((result) => result.count == null ? [] : [{
      scope: scope.scope,
      feature: result.metricId.startsWith('arena_') ? 'arena' : 'community_packs',
      metric_id: result.metricId,
      value: result.count,
      denominator: result.count,
      status: status('social_features'),
    }])),
    feedbackSupport: both.flatMap((scope) => scope.feedbackSupport.flatMap((result) => result.count == null ? [] : [{
      scope: scope.scope,
      category: result.metricId,
      reports: result.count,
      resolved: null,
      denominator: result.count,
      status: status('feedback_support'),
    }])),
  };
}

async function countSpec(
  db: FirebaseFirestore.Firestore,
  spec: AggregateSpec,
  startMs: number,
  endExclusiveMs: number,
): Promise<CountResult> {
  const lower = spec.timeKind === 'timestamp' ? admin.firestore.Timestamp.fromMillis(startMs) : startMs;
  const upper = spec.timeKind === 'timestamp' ? admin.firestore.Timestamp.fromMillis(endExclusiveMs) : endExclusiveMs;
  try {
    const snapshot = await db.collection(spec.collection)
      .where(spec.timeField, '>=', lower)
      .where(spec.timeField, '<', upper)
      .count()
      .get();
    return { metricId: spec.metricId, count: snapshot.data().count };
  } catch (error) {
    console.warn(`monthly_decision_pack: aggregate count failed for ${spec.collection}`, error);
    return { metricId: spec.metricId, count: null };
  }
}

async function loadScope(
  db: FirebaseFirestore.Firestore,
  scope: Scope,
  startMs: number,
  endExclusiveMs: number,
): Promise<OperationalAggregateCounts> {
  const results = await Promise.all(SPECS.map((spec) => countSpec(db, spec, startMs, endExclusiveMs)));
  const forSource = (source: SourceId) => SPECS.flatMap((spec, index) => spec.source === source ? [results[index]] : []);
  return {
    scope,
    notificationsReferrals: forSource('notifications_referrals'),
    socialFeatures: forSource('social_features'),
    feedbackSupport: forSource('feedback_support'),
  };
}

export async function loadOperationalAggregateProjection(input: {
  db: FirebaseFirestore.Firestore;
  monthStartMs: number;
  monthEndExclusiveMs: number;
  baselineStartMs: number;
  baselineEndExclusiveMs: number;
  generatedAtMs: number;
}): Promise<OperationalAggregateProjection> {
  const [month, baseline] = await Promise.all([
    loadScope(input.db, 'reporting_month', input.monthStartMs, input.monthEndExclusiveMs),
    loadScope(input.db, 'baseline_12m', input.baselineStartMs, input.baselineEndExclusiveMs),
  ]);
  return buildOperationalAggregateProjection(month, baseline, input.generatedAtMs, input.monthEndExclusiveMs - 1);
}
