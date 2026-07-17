import { createHmac } from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export const AGENT_MANAGER_REPORT_SOURCES = ['error_reports', 'user_reports', 'community_pack_reports', 'explain_report_entries', 'app_errors'] as const;
export type AgentManagerReportSource = (typeof AGENT_MANAGER_REPORT_SOURCES)[number];

export type AgentManagerInboxRequest = Readonly<{
  sourceType: 'support' | 'report';
  sourceId: string;
  reportSource: AgentManagerReportSource | null;
}>;

function fail(message: string): never { throw new HttpsError('invalid-argument', message); }
function row(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('inbox task must be an object'); return value as Record<string, unknown>; }
function safeSourceId(value: unknown, max: number): string {
  if (typeof value !== 'string') fail('inbox sourceId is invalid');
  const result = value.trim();
  if (!result || result.length > max || result.includes('/') || /[\u0000-\u001f\u007f]/.test(result)) fail('inbox sourceId is invalid');
  return result;
}

export function parseAgentManagerInboxRequest(value: unknown): AgentManagerInboxRequest {
  const input = row(value); const keys = Object.keys(input);
  if (keys.some((key) => !['sourceType', 'sourceId', 'reportSource'].includes(key)) || !['sourceType', 'sourceId', 'reportSource'].every((key) => key in input)) fail('inbox task fields are invalid');
  if (input.sourceType === 'support') {
    if (input.reportSource !== null) fail('support intake cannot include reportSource');
    return Object.freeze({ sourceType: 'support', sourceId: safeSourceId(input.sourceId, 400), reportSource: null });
  }
  if (input.sourceType !== 'report' || typeof input.reportSource !== 'string' || !(AGENT_MANAGER_REPORT_SOURCES as readonly string[]).includes(input.reportSource)) fail('report intake source is invalid');
  return Object.freeze({ sourceType: 'report', sourceId: safeSourceId(input.sourceId, 160), reportSource: input.reportSource as AgentManagerReportSource });
}

export function inboxSourceRef(input: AgentManagerInboxRequest, hmacKey: string): string {
  if (!hmacKey || hmacKey.length < 32) throw new HttpsError('failed-precondition', 'AGENT_MANAGER_INTAKE_HMAC_KEY is not configured');
  const canonical = `${input.sourceType}\n${input.reportSource ?? ''}\n${input.sourceId}`;
  const digest = createHmac('sha256', hmacKey).update(canonical, 'utf8').digest('hex');
  return `${input.sourceType}:sha256:${digest}`;
}
