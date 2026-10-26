import { createHash } from 'node:crypto';

/** Pure domain policy. Storage adapters must call transitions inside a transaction.
 * This module does not grant claims, invoke legacy handlers or perform side effects. */
export interface StaffIdentity { readonly uid: string; readonly emailVerified: boolean; }
/** Must be constructed from server-owned configuration, never callable input. */
export interface OwnerAuthority { readonly uid: string; }
export interface DeliveryReceipt { readonly requestId:string; readonly digest:string; readonly ownerUid:string; readonly deliveredAtMs:number; readonly messageId:string; }
export type SectionAccess = 'hidden' | 'view' | 'request';
export interface StaffMember {
  readonly uid: string;
  readonly active: boolean;
  readonly revision: number;
  readonly badge: string;
  readonly sections: Readonly<Record<string, SectionAccess>>;
}
export interface StaffCommand { readonly section: string; readonly action: string; readonly enabled: boolean; }
type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export interface RequestInput {
  readonly id: string; readonly section: string; readonly action: string; readonly targetId: string;
  readonly reason: string; readonly payload: Readonly<Record<string, Json>>;
  readonly beforeVersion: string; readonly expiresAtMs: number;
}
export interface StaffRequest extends RequestInput {
  readonly actorUid: string; readonly memberRevision: number; readonly createdAtMs: number;
  readonly digest: string; readonly state: 'pending' | 'approved' | 'rejected' | 'needs_changes' | 'executing';
  readonly decision?: { readonly ownerUid: string; readonly atMs: number; readonly comment: string };
  readonly executionStartedAtMs?: number;
}
function deny(code: string): never { throw new Error(code); }
function validId(value: unknown): value is string { return typeof value === 'string' && /^[A-Za-z0-9._-]{1,160}$/.test(value); }
function validNow(value: number): void { if (!Number.isSafeInteger(value) || value < 0) deny('invalid_time'); }
export function assertOwner(identity: StaffIdentity | null, ownerUid: string): asserts identity is StaffIdentity {
  if (!validId(ownerUid) || !identity?.emailVerified || identity.uid !== ownerUid) deny('owner_required');
}
export function canReadSection(member: StaffMember | null, section: string): boolean {
  if (!member?.active || !validId(section) || !Object.prototype.hasOwnProperty.call(member.sections, section)) return false;
  return member.sections[section] === 'view' || member.sections[section] === 'request';
}
export function canRequestChange(member: StaffMember | null, section: string): boolean {
  return canReadSection(member, section) && member?.sections[section] === 'request';
}
function canonical(value: Json, depth = 0): string {
  if (depth > 15) deny('payload_too_deep');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') { if (!Number.isFinite(value)) deny('invalid_number'); return JSON.stringify(value); }
  if (Array.isArray(value)) return '[' + value.map(v => canonical(v, depth + 1)).join(',') + ']';
  if (typeof value !== 'object' || !value || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) deny('invalid_payload');
  const record = value as { readonly [key: string]: Json };
  return '{' + Object.keys(record).sort().map(key => {
    if (['__proto__','constructor','prototype'].includes(key)) deny('invalid_key');
    return JSON.stringify(key) + ':' + canonical(record[key], depth + 1);
  }).join(',') + '}';
}
function digest(input: RequestInput, actorUid: string, memberRevision: number, createdAtMs: number): string {
  const encoded = canonical({id:input.id, section:input.section, action:input.action, targetId:input.targetId,
    reason:input.reason, payload:input.payload, beforeVersion:input.beforeVersion, expiresAtMs:input.expiresAtMs,
    actorUid, memberRevision, createdAtMs});
  if (Buffer.byteLength(encoded, 'utf8') > 32_768) deny('payload_too_large');
  return createHash('sha256').update(encoded).digest('hex');
}
function verifyRequest(request: StaffRequest, nowMs: number): void {
  validNow(nowMs);
  if (nowMs >= request.expiresAtMs) deny('request_expired');
  if (request.digest !== digest(request, request.actorUid, request.memberRevision, request.createdAtMs)) deny('request_changed');
}
export function makeRequest(identity: StaffIdentity, member: StaffMember, command: StaffCommand, input: RequestInput, nowMs: number): StaffRequest {
  validNow(nowMs);
  if (!identity?.emailVerified || identity.uid !== member.uid || !validId(identity.uid)) deny('member_required');
  if (!Number.isSafeInteger(member.revision) || member.revision < 1 || !canRequestChange(member, input.section)) deny('request_forbidden');
  if (!command.enabled || command.section !== input.section || command.action !== input.action) deny('command_unavailable');
  if (![input.id,input.section,input.action,input.targetId].every(validId)) deny('invalid_identifier');
  if (typeof input.reason !== 'string' || input.reason.trim().length < 5 || input.reason.length > 2000) deny('reason_required');
  if (typeof input.beforeVersion !== 'string' || !input.beforeVersion.trim() || input.beforeVersion.length > 200) deny('target_version_required');
  if (!Number.isSafeInteger(input.expiresAtMs) || input.expiresAtMs <= nowMs || input.expiresAtMs - nowMs > 7 * 86400000) deny('invalid_expiry');
  // Clone at the trust boundary so a caller cannot mutate the original payload reference.
  const normalized = {...input, reason:input.reason.trim(), payload:JSON.parse(canonical(input.payload)) as RequestInput['payload']};
  return {...normalized, actorUid:identity.uid, memberRevision:member.revision, createdAtMs:nowMs,
    digest:digest(normalized, identity.uid, member.revision, nowMs), state:'pending'};
}
export function decideRequest(identity: StaffIdentity | null, ownerUid: string, request: StaffRequest,
  decision: 'approve' | 'reject' | 'return', comment: string, nowMs: number): StaffRequest {
  assertOwner(identity, ownerUid); verifyRequest(request, nowMs);
  if (request.actorUid === ownerUid) deny('self_approval_forbidden');
  if (request.state !== 'pending') deny('already_decided');
  if (!['approve','reject','return'].includes(decision)) deny('invalid_decision');
  if (typeof comment !== 'string' || comment.length > 2000 || (decision !== 'approve' && !comment.trim())) deny('decision_reason_required');
  return {...request, state:decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'needs_changes',
    decision:{ownerUid:identity.uid, atMs:nowMs, comment:comment.trim()}};
}
export function beginExecution(request: StaffRequest, currentMember: StaffMember, command: StaffCommand,
  currentTargetVersion: string, notification: DeliveryReceipt | null, nowMs: number, authority: OwnerAuthority): StaffRequest {
  verifyRequest(request, nowMs);
  if (!validId(authority.uid) || request.state !== 'approved' || !request.decision || request.decision.ownerUid !== authority.uid || request.decision.ownerUid === request.actorUid) deny('approval_required');
  if (!notification || notification.requestId !== request.id || notification.digest !== request.digest || notification.ownerUid !== authority.uid || !notification.messageId || !Number.isSafeInteger(notification.deliveredAtMs) || notification.deliveredAtMs < request.createdAtMs || notification.deliveredAtMs > nowMs) deny('notification_required');
  if (currentMember.uid !== request.actorUid || currentMember.revision !== request.memberRevision || !canRequestChange(currentMember, request.section)) deny('access_changed');
  if (!command.enabled || command.section !== request.section || command.action !== request.action) deny('command_unavailable');
  if (currentTargetVersion !== request.beforeVersion) deny('target_changed');
  return {...request, state:'executing', executionStartedAtMs:nowMs};
}
/** localDate is computed server-side using the task's configured IANA timezone. */
export function taskOccurrenceId(templateId: string, assigneeUid: string, localDate: string): string {
  if (!validId(templateId) || !validId(assigneeUid) || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) deny('invalid_occurrence');
  const date = new Date(localDate + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== localDate) deny('invalid_date');
  return createHash('sha256').update(JSON.stringify([templateId,assigneeUid,localDate])).digest('hex');
}
