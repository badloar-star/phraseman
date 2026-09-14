import { canonicalAdminAlertType, type AdminAlertType } from './admin_alert_catalog';
import { type AdminAlertSafePayload } from './admin_alert_privacy';
import { type EnqueueAdminAlertInput } from './admin_alert_outbox';

export type LegacyAdminAlertType =
  | 'userReport'
  | 'ideaReport'
  | 'criticalError'
  | 'contentReportDigest'
  | 'cancelRefundSpike'
  | 'safetyFlag'
  | 'authFailureSpike'
  | 'serialRefunder'
  | 'explanationRetired';

const SOURCE_BY_TYPE: Readonly<Record<LegacyAdminAlertType, string>> = Object.freeze({
  userReport: 'legacy.user_report',
  ideaReport: 'legacy.idea_report',
  criticalError: 'legacy.critical_error',
  contentReportDigest: 'legacy.content_report',
  cancelRefundSpike: 'legacy.refund_spike',
  safetyFlag: 'legacy.safety_flag',
  authFailureSpike: 'legacy.auth_spike',
  serialRefunder: 'legacy.serial_refunder',
  explanationRetired: 'legacy.explanation_retired',
});

const ROUTE_BY_TYPE: Readonly<Record<LegacyAdminAlertType, string>> = Object.freeze({
  userReport: '#user-reports',
  ideaReport: '#ideas',
  criticalError: '#app-health',
  contentReportDigest: '#reports',
  cancelRefundSpike: '#refunds',
  safetyFlag: '#safety-flags',
  authFailureSpike: '#app-health',
  serialRefunder: '#refunds',
  explanationRetired: '#explain-reports',
});

function isLegacyAdminAlertType(value: string): value is LegacyAdminAlertType {
  return Object.prototype.hasOwnProperty.call(SOURCE_BY_TYPE, value);
}

function last4(value: unknown): string | undefined {
  const compact = String(value ?? '').replace(/[^A-Za-z0-9]/g, '');
  return compact ? compact.slice(-4) : undefined;
}

function finiteCount(value: unknown): number | undefined {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
}

function payloadFor(
  type: LegacyAdminAlertType,
  data: Readonly<Record<string, unknown>>,
): AdminAlertSafePayload {
  const route = ROUTE_BY_TYPE[type];
  if (type === 'userReport') {
    return {
      category: String(data.category ?? '').trim() || undefined,
      uidLast4: last4(data.reportedUid),
      route,
    };
  }
  if (type === 'criticalError') {
    return {
      category: String(data.feature ?? '').trim() || undefined,
      severity: String(data.severity ?? 'critical').trim(),
      platform: String(data.platform ?? '').trim() || undefined,
      appVersion: String(data.appVersion ?? '').trim() || undefined,
      nickname: String(data.userName ?? '').trim() || undefined,
      route,
    };
  }
  if (type === 'contentReportDigest') {
    return {
      category: String(data.category ?? '').trim() || undefined,
      severity: String(data.severity ?? '').trim() || undefined,
      uidLast4: last4(data.uid),
      count: finiteCount(data.count),
      route,
    };
  }
  if (type === 'cancelRefundSpike' || type === 'serialRefunder' || type === 'authFailureSpike') {
    return {
      category: String(data.category ?? '').trim() || undefined,
      count: finiteCount(data.count),
      route,
    };
  }
  return {
    category: String(data.category ?? data.status ?? '').trim() || undefined,
    severity: String(data.severity ?? '').trim() || undefined,
    uidLast4: last4(data.uid),
    route,
  };
}

export function legacyAdminAlertEvent(input: {
  readonly legacyType: string;
  readonly sourceId: string;
  readonly occurredAtMs: number;
  readonly data: Readonly<Record<string, unknown>>;
}): EnqueueAdminAlertInput {
  if (!isLegacyAdminAlertType(input.legacyType)) throw new Error('unknown_legacy_admin_alert_type');
  const eventType = canonicalAdminAlertType(input.legacyType);
  if (!eventType) throw new Error('unknown_legacy_admin_alert_type');
  return {
    eventType: eventType as AdminAlertType,
    source: SOURCE_BY_TYPE[input.legacyType],
    sourceId: input.sourceId,
    occurredAtMs: input.occurredAtMs,
    payload: payloadFor(input.legacyType, input.data),
  };
}
