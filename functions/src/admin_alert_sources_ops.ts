import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { enqueueAdminAlert, type EnqueueAdminAlertInput } from './admin_alert_outbox';

const REGION = 'us-central1';
type Row = Readonly<Record<string, unknown>>;

function token(value: unknown): string {
  return String(value ?? '').trim().split('_').join(' ').slice(0, 64);
}

function timeMs(value: unknown, fallback: number): number {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Math.floor(fallback);
}

export function paymentWebhookAlertFromCreate(id: string, data: Row, nowMs: number): EnqueueAdminAlertInput | null {
  if (!id || data.feature !== 'payments' || data.errorName !== 'PaymentWebhookFailure') return null;
  return {
    eventType: 'paymentWebhookFailure', source: 'payment.webhook_failure', sourceId: id,
    occurredAtMs: timeMs(data.createdAtMs ?? data.createdAt, nowMs),
    payload: {
      category: token(data.context) || 'payment webhook', severity: 'critical',
      environment: 'server', status: 'failed', route: '#app-health',
    },
  };
}

export function adminAuditAlertFromCreate(id: string, data: Row, nowMs: number): EnqueueAdminAlertInput | null {
  if (!id) return null;
  return {
    eventType: 'adminAudit', source: 'admin.audit', sourceId: id,
    occurredAtMs: timeMs(data.timestamp ?? data.ts ?? data.createdAtMs, nowMs),
    payload: { category: token(data.action) || 'admin change', status: 'completed', route: '#audit' },
  };
}

export function pushAlertFromWrite(id: string, before: Row | null, after: Row | null, nowMs: number): EnqueueAdminAlertInput | null {
  if (!id || !after) return null;
  const status = String(after.status ?? '').toLowerCase();
  if ((status !== 'done' && status !== 'error') || String(before?.status ?? '').toLowerCase() === status) return null;
  const count = Math.max(0, Math.floor(Number(after.sentCount ?? after.targetCount) || 0));
  return {
    eventType: 'pushJob', source: 'push.job_terminal', sourceId: `${id}:${status}`,
    occurredAtMs: timeMs(after.finishedAtMs ?? after.updatedAtMs, nowMs),
    payload: { category: 'Push', status, count, route: '#push-notify' },
  };
}

export function appMessageAlertFromWrite(id: string, before: Row | null, after: Row | null, nowMs: number): EnqueueAdminAlertInput | null {
  if (!id || !after || after.active !== true || before?.active === true) return null;
  return {
    eventType: 'appMessagePublished', source: 'app_message.published', sourceId: `${id}:published`,
    occurredAtMs: timeMs(after.publishedAtMs ?? after.updatedAtMs ?? after.createdAtMs, nowMs),
    payload: { category: token(after.kind) || 'App Message', status: 'published', route: '#app-messages' },
  };
}

export function complianceAlertFromWrite(id: string, before: Row | null, after: Row | null, nowMs: number): EnqueueAdminAlertInput | null {
  if (!id || !after) return null;
  const status = String(after.status ?? '').toLowerCase();
  if ((status !== 'failed' && status !== 'blocked') || String(before?.status ?? '').toLowerCase() === status) return null;
  return {
    eventType: 'complianceRisk', source: 'compliance.control', sourceId: `${id}:${status}:${token(after.lastRunId) || timeMs(after.updatedAt, nowMs)}`,
    occurredAtMs: timeMs(after.updatedAt ?? after.collectedAt, nowMs),
    payload: { category: token(after.controlId) || token(id), severity: status === 'failed' ? 'critical' : 'high', status, route: '#soc2-readiness' },
  };
}

function hasHighRiskOption(data: Row): boolean {
  return Array.isArray(data.options) && data.options.some((option) => option && typeof option === 'object' && (option as Row).risk === 'high');
}

export function jarvisAlertFromWrite(id: string, before: Row | null, after: Row | null, nowMs: number): EnqueueAdminAlertInput | null {
  if (!id || !after || after.status !== 'open' || !hasHighRiskOption(after)) return null;
  if (before && before.contentHash === after.contentHash) return null;
  return {
    eventType: 'jarvisCritical', source: 'jarvis.critical_plan', sourceId: `${id}:${token(after.contentHash) || timeMs(after.updatedAtMs, nowMs)}`,
    occurredAtMs: timeMs(after.updatedAtMs ?? after.createdAtMs, nowMs),
    payload: { category: token(after.department) || 'Jarvis', severity: 'critical', status: 'open', route: '#jarvis-plans' },
  };
}

async function put(alert: EnqueueAdminAlertInput | null): Promise<void> {
  if (alert) await enqueueAdminAlert(admin.firestore(), alert);
}

function eventNowMs(event: { readonly time?: unknown }): number {
  return timeMs(event.time, Date.now());
}

export const adminAlertOnAdminAuditCreated = onDocumentCreated(
  { document: 'admin_log/{auditId}', region: REGION, retry: true },
  async (event) => put(event.data ? adminAuditAlertFromCreate(String(event.params.auditId ?? ''), event.data.data() as Row, eventNowMs(event)) : null),
);
export const adminAlertOnPushJobWritten = onDocumentWritten(
  { document: 'admin_push_jobs/{jobId}', region: REGION, retry: true },
  async (event) => put(pushAlertFromWrite(String(event.params.jobId ?? ''), event.data?.before?.exists ? event.data.before.data() as Row : null, event.data?.after?.exists ? event.data.after.data() as Row : null, eventNowMs(event))),
);
export const adminAlertOnAppMessageWritten = onDocumentWritten(
  { document: 'app_messages/{messageId}', region: REGION, retry: true },
  async (event) => put(appMessageAlertFromWrite(String(event.params.messageId ?? ''), event.data?.before?.exists ? event.data.before.data() as Row : null, event.data?.after?.exists ? event.data.after.data() as Row : null, eventNowMs(event))),
);
export const adminAlertOnComplianceControlWritten = onDocumentWritten(
  { document: 'soc2_automated_control_projection/{controlId}', region: REGION, retry: true },
  async (event) => put(complianceAlertFromWrite(String(event.params.controlId ?? ''), event.data?.before?.exists ? event.data.before.data() as Row : null, event.data?.after?.exists ? event.data.after.data() as Row : null, eventNowMs(event))),
);
export const adminAlertOnJarvisPlanWritten = onDocumentWritten(
  { document: 'jarvis_plans/{planId}', region: REGION, retry: true },
  async (event) => put(jarvisAlertFromWrite(String(event.params.planId ?? ''), event.data?.before?.exists ? event.data.before.data() as Row : null, event.data?.after?.exists ? event.data.after.data() as Row : null, eventNowMs(event))),
);
