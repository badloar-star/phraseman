import { HttpsError } from 'firebase-functions/v2/https';
import { isSafeOpaqueRef } from '../agent_office/contracts';

export const AGENT_MANAGER_SCHEMA_VERSION = 1 as const;
export const MANAGER_AGENT_ROLES = ['manager', 'analytics', 'support', 'reports', 'developer', 'qa', 'content'] as const;
export const MANAGER_ALLOWED_SCOPES = ['analysis_only', 'support_draft', 'report_triage', 'code_prepare', 'content_prepare'] as const;
export const MANAGER_TASK_STATUSES = ['draft', 'planned', 'awaiting_approval', 'queued', 'in_progress', 'needs_review', 'completed', 'archived', 'cancelled', 'failed'] as const;
export type ManagerAgentRole = (typeof MANAGER_AGENT_ROLES)[number];
export type ManagerAllowedScope = (typeof MANAGER_ALLOWED_SCOPES)[number];
export type ManagerTaskStatus = (typeof MANAGER_TASK_STATUSES)[number];
export type ManagerAgent = Readonly<{ schemaVersion: 1; agentId: string; role: ManagerAgentRole; label: string; enabled: boolean; allowedScopes: readonly ManagerAllowedScope[]; lastCheckInAtMs: number }>;
export type ManagerTaskDraft = Readonly<{ schemaVersion: 1; taskId: string; title: string; brief: string; priority: 'low' | 'normal' | 'high' | 'critical'; deadlineAtMs: number | null; allowedScope: ManagerAllowedScope; sourceLinks: readonly { readonly sourceType: 'support' | 'report' | 'analytics' | 'manual'; readonly sourceRef: string }[]; status: 'draft' }>;
export type ManagerTaskResult = Readonly<{ summary: string; outcome: 'needs_review' | 'completed' }>;

function fail(message: string): never { throw new HttpsError('invalid-argument', message); }
function row(value: unknown, label: string): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`); return value as Record<string, unknown>; }
function exact(input: Record<string, unknown>, keys: readonly string[], label: string): void { const unknown = Object.keys(input).find((key) => !keys.includes(key)); const missing = keys.find((key) => !(key in input)); if (unknown || missing) fail(`${label} fields are invalid`); }
function identifier(value: unknown, label: string): string { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value)) fail(`${label} is invalid`); return value; }
export function agentIdentifier(value: unknown, label = 'agentId'): string { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{1,159}$/.test(value)) fail(`${label} is invalid`); return value; }
function text(value: unknown, label: string, min: number, max: number): string { if (typeof value !== 'string') fail(`${label} is invalid`); const result = value.trim(); if (result.length < min || result.length > max || /[\u0000-\u001f\u007f]/.test(result)) fail(`${label} is invalid`); return result; }
function noPii(value: string, label: string): string { if (/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(value) || /\+?\d[\d\s().-]{7,}\d/.test(value) || /\b(?:sk-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|\d{8,12}:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{16,})\b/i.test(value)) fail(`${label} must be redacted`); return value; }
function choice<T extends string>(value: unknown, values: readonly T[], label: string): T { if (typeof value !== 'string' || !values.includes(value as T)) fail(`${label} is invalid`); return value as T; }

export function parseManagerTaskDraft(value: unknown): ManagerTaskDraft {
  const input = row(value, 'manager task'); exact(input, ['taskId', 'title', 'brief', 'priority', 'deadlineAtMs', 'allowedScope', 'sourceLinks'], 'manager task');
  if (!Array.isArray(input.sourceLinks) || input.sourceLinks.length > 20) fail('manager task sourceLinks is invalid');
  const links = input.sourceLinks.map((link) => {
    const item = row(link, 'manager task sourceLink'); exact(item, ['sourceType', 'sourceRef'], 'manager task sourceLink');
    const sourceType = choice(item.sourceType, ['support', 'report', 'analytics', 'manual'] as const, 'sourceType');
    const sourceRef = isSafeOpaqueRef(item.sourceRef) ? item.sourceRef : fail('sourceRef is invalid');
    if (!sourceRef.startsWith(`${sourceType}:`)) fail('sourceRef type is invalid');
    return Object.freeze({ sourceType, sourceRef });
  });
  const deadlineAtMs = input.deadlineAtMs === null ? null : typeof input.deadlineAtMs === 'number' && Number.isSafeInteger(input.deadlineAtMs) && input.deadlineAtMs >= 0 ? input.deadlineAtMs : fail('deadlineAtMs is invalid');
  return Object.freeze({ schemaVersion: AGENT_MANAGER_SCHEMA_VERSION, taskId: identifier(input.taskId, 'taskId'), title: noPii(text(input.title, 'title', 3, 140), 'title'), brief: noPii(text(input.brief, 'brief', 10, 4000), 'brief'), priority: choice(input.priority, ['low', 'normal', 'high', 'critical'] as const, 'priority'), deadlineAtMs, allowedScope: choice(input.allowedScope, MANAGER_ALLOWED_SCOPES, 'allowedScope'), sourceLinks: Object.freeze(links), status: 'draft' });
}

export function parseManagerTaskResult(value: unknown): ManagerTaskResult { const input = row(value, 'manager task result'); exact(input, ['summary', 'outcome'], 'manager task result'); return Object.freeze({ summary: noPii(text(input.summary, 'summary', 3, 2000), 'summary'), outcome: choice(input.outcome, ['needs_review', 'completed'] as const, 'outcome') }); }
export function parseManagerAgent(value: unknown): ManagerAgent { const input = row(value, 'manager agent'); exact(input, ['schemaVersion', 'agentId', 'role', 'label', 'enabled', 'allowedScopes', 'lastCheckInAtMs'], 'manager agent'); if (input.schemaVersion !== AGENT_MANAGER_SCHEMA_VERSION || typeof input.enabled !== 'boolean' || !Array.isArray(input.allowedScopes) || input.allowedScopes.length < 1 || typeof input.lastCheckInAtMs !== 'number' || !Number.isSafeInteger(input.lastCheckInAtMs) || input.lastCheckInAtMs < 0) fail('manager agent is invalid'); return Object.freeze({ schemaVersion: AGENT_MANAGER_SCHEMA_VERSION, agentId: agentIdentifier(input.agentId), role: choice(input.role, MANAGER_AGENT_ROLES, 'role'), label: text(input.label, 'label', 2, 80), enabled: input.enabled, allowedScopes: Object.freeze(input.allowedScopes.map((scope) => choice(scope, MANAGER_ALLOWED_SCOPES, 'allowedScope'))), lastCheckInAtMs: input.lastCheckInAtMs }); }
const TRANSITIONS: Readonly<Record<ManagerTaskStatus, readonly ManagerTaskStatus[]>> = Object.freeze({ draft: ['planned', 'cancelled'], planned: ['awaiting_approval', 'cancelled'], awaiting_approval: ['queued', 'cancelled'], queued: ['in_progress', 'cancelled', 'failed'], in_progress: ['needs_review', 'failed'], needs_review: ['completed', 'queued', 'cancelled'], completed: ['archived'], archived: [], cancelled: ['archived'], failed: ['queued', 'archived'] });
export function assertManagerTaskTransition(from: ManagerTaskStatus, to: ManagerTaskStatus): void { if (!TRANSITIONS[from]?.includes(to)) throw new HttpsError('failed-precondition', `manager task transition ${from} -> ${to} is invalid`); }
