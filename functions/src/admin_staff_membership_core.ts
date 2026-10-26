import { createHash } from 'node:crypto';
import type { SectionAccess, StaffMember } from './admin_staff_contract';

export const STAFF_MEMBERSHIP_SCHEMA_VERSION = 1 as const;
export const STAFF_SECTION_ADAPTERS = Object.freeze({
  workspace: Object.freeze(['view'] as const),
});
export const STAFF_MEMBERSHIP_REASON_CODES = Object.freeze([
  'staff_onboarding',
  'responsibilities_changed',
  'access_revoked',
  'security_response',
] as const);
export type StaffMembershipReasonCode = typeof STAFF_MEMBERSHIP_REASON_CODES[number];

export interface StoredStaffMembership extends StaffMember {
  readonly schemaVersion: typeof STAFF_MEMBERSHIP_SCHEMA_VERSION;
  readonly updatedAtMs: number;
  readonly updatedByUid: string;
}

export interface MembershipMutationInput {
  readonly operationId: string;
  readonly targetUid: string;
  readonly expectedRevision: number;
  readonly active: boolean;
  readonly badge: string;
  readonly sections: Readonly<Record<string, SectionAccess>>;
  readonly reasonCode: StaffMembershipReasonCode;
}

export interface StaffMembershipAudit {
  readonly schemaVersion: typeof STAFF_MEMBERSHIP_SCHEMA_VERSION;
  readonly operationId: string;
  readonly requestDigest: string;
  readonly actorUid: string;
  readonly targetUid: string;
  readonly expectedRevision: number;
  readonly resultRevision: number;
  readonly resultActive: boolean;
  readonly action: 'activate' | 'update' | 'revoke';
  readonly reasonCode: StaffMembershipReasonCode;
  readonly sectionModes: Readonly<Record<string, 'view'>>;
  readonly createdAtMs: number;
}

export interface RateWindow { readonly windowStartedAtMs: number; readonly count: number; }

function fail(code: string): never { throw new Error(code); }
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
function exactKeys(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = Object.keys(record);
  return keys.length === allowed.length && keys.every(key => allowed.includes(key)) && allowed.every(key => hasOwn(record, key));
}
function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,160}$/.test(value);
}
function validTime(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function validRevision(value: unknown, allowZero: boolean): value is number {
  return Number.isSafeInteger(value) && Number(value) >= (allowZero ? 0 : 1);
}
function normalizedText(value: unknown, min: number, max: number, code: string): string {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(code);
  const normalized = value.trim();
  if (normalized.length < min) fail(code);
  return normalized;
}
function normalizeSections(value: unknown, code: 'invalid_membership' | 'invalid_sections'): Readonly<Record<string, 'view'>> {
  if (!isPlainRecord(value)) fail(code);
  const normalized: Record<string, 'view'> = {};
  for (const [section, rawMode] of Object.entries(value)) {
    if (!hasOwn(value, section)) fail(code);
    if (!hasOwn(STAFF_SECTION_ADAPTERS as unknown as Record<string, unknown>, section)) fail(code === 'invalid_membership' ? code : 'unsupported_section');
    if (!['hidden', 'view', 'request'].includes(String(rawMode))) fail(code);
    if (rawMode === 'hidden') continue;
    const allowed = STAFF_SECTION_ADAPTERS[section as keyof typeof STAFF_SECTION_ADAPTERS] as readonly string[];
    if (!allowed.includes(String(rawMode))) fail(code === 'invalid_membership' ? code : 'unsupported_mode');
    normalized[section] = 'view';
  }
  return Object.freeze({ ...normalized });
}

export function parseMembershipMutationInput(value: unknown): MembershipMutationInput {
  if (!isPlainRecord(value) || !exactKeys(value, ['operationId', 'targetUid', 'expectedRevision', 'active', 'badge', 'sections', 'reasonCode'])) fail('invalid_request');
  if (!validId(value.operationId) || !validId(value.targetUid)) fail('invalid_identifier');
  if (!validRevision(value.expectedRevision, true)) fail('invalid_revision');
  if (typeof value.active !== 'boolean') fail('invalid_active');
  const badge = normalizedText(value.badge, 1, 80, 'invalid_badge');
  if (typeof value.reasonCode !== 'string' || !(STAFF_MEMBERSHIP_REASON_CODES as readonly string[]).includes(value.reasonCode)) fail('invalid_reason_code');
  const reasonCode = value.reasonCode as StaffMembershipReasonCode;
  const requestedSections = normalizeSections(value.sections, 'invalid_sections');
  const sections = value.active ? requestedSections : Object.freeze({});
  return Object.freeze({ operationId: value.operationId, targetUid: value.targetUid,
    expectedRevision: value.expectedRevision, active: value.active, badge, sections, reasonCode });
}

export function parseStoredMembership(value: unknown, expectedUid: string): StoredStaffMembership {
  if (!validId(expectedUid) || !isPlainRecord(value) || !exactKeys(value,
    ['schemaVersion', 'uid', 'active', 'revision', 'badge', 'sections', 'updatedAtMs', 'updatedByUid'])) fail('invalid_membership');
  if (value.schemaVersion !== STAFF_MEMBERSHIP_SCHEMA_VERSION || value.uid !== expectedUid || !validId(value.uid) ||
      typeof value.active !== 'boolean' || !validRevision(value.revision, false) || !validId(value.updatedByUid) || !validTime(value.updatedAtMs)) fail('invalid_membership');
  const badge = normalizedText(value.badge, 1, 80, 'invalid_membership');
  const sections = normalizeSections(value.sections, 'invalid_membership');
  if (!value.active && Object.keys(sections).length) fail('invalid_membership');
  return Object.freeze({ schemaVersion: 1, uid: value.uid, active: value.active, revision: value.revision,
    badge, sections, updatedAtMs: value.updatedAtMs, updatedByUid: value.updatedByUid });
}

export function membershipMutationDigest(actorUid: string, input: MembershipMutationInput): string {
  const canonical = JSON.stringify({ actorUid, operationId: input.operationId, targetUid: input.targetUid,
    expectedRevision: input.expectedRevision, active: input.active, badge: input.badge,
    sections: Object.fromEntries(Object.entries(input.sections).sort(([a], [b]) => a.localeCompare(b))), reasonCode: input.reasonCode });
  return createHash('sha256').update(canonical).digest('hex');
}

export function buildMembershipMutation(args: Readonly<{
  actorUid: string;
  ownerUid: string;
  input: MembershipMutationInput;
  current: StoredStaffMembership | null;
  nowMs: number;
}>): Readonly<{ member: StoredStaffMembership; audit: StaffMembershipAudit }> {
  if (!validId(args.ownerUid) || args.actorUid !== args.ownerUid) fail('owner_required');
  if (!validTime(args.nowMs)) fail('invalid_time');
  const input = parseMembershipMutationInput(args.input);
  if (input.targetUid === args.ownerUid) fail('owner_membership_forbidden');
  const current = args.current === null ? null : parseStoredMembership(args.current, input.targetUid);
  const revision = current?.revision ?? 0;
  if (revision !== input.expectedRevision) fail('revision_conflict');
  if (!current && !input.active) fail('cannot_create_inactive');
  const nextRevision = revision + 1;
  const member: StoredStaffMembership = Object.freeze({
    schemaVersion: 1, uid: input.targetUid, active: input.active, revision: nextRevision,
    badge: input.badge, sections: input.active ? input.sections : Object.freeze({}),
    updatedAtMs: args.nowMs, updatedByUid: args.ownerUid,
  });
  const action = input.active ? (current?.active ? 'update' : 'activate') : 'revoke';
  const audit: StaffMembershipAudit = Object.freeze({
    schemaVersion: 1, operationId: input.operationId, requestDigest: membershipMutationDigest(args.actorUid, input),
    actorUid: args.actorUid, targetUid: input.targetUid, expectedRevision: input.expectedRevision,
    resultRevision: nextRevision, resultActive: input.active, action, reasonCode: input.reasonCode,
    sectionModes: member.sections as Readonly<Record<string, 'view'>>, createdAtMs: args.nowMs,
  });
  return Object.freeze({ member, audit });
}

export function consumeRateWindow(current: RateWindow | null, nowMs: number, limit: number, windowMs: number): RateWindow {
  if (!validTime(nowMs) || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1000) fail('invalid_rate_policy');
  if (current === null) return Object.freeze({ windowStartedAtMs: nowMs, count: 1 });
  if (!validTime(current.windowStartedAtMs) || !Number.isSafeInteger(current.count) || current.count < 0 || nowMs < current.windowStartedAtMs) fail('invalid_rate_state');
  if (nowMs >= current.windowStartedAtMs + windowMs) return Object.freeze({ windowStartedAtMs: nowMs, count: 1 });
  if (current.count >= limit) fail('rate_limited');
  return Object.freeze({ windowStartedAtMs: current.windowStartedAtMs, count: current.count + 1 });
}
