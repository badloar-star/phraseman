import { createHash } from 'node:crypto';
import type { StaffMembershipReasonCode } from './admin_staff_membership_core';

export const STAFF_INVITATION_SCHEMA_VERSION = 1 as const;
export const STAFF_INVITATION_MAX_HOURS = 168;
export type StoredInvitationStatus = 'pending' | 'revoked';
export type EffectiveInvitationStatus = StoredInvitationStatus | 'expired';

export interface CreateInvitationInput {
  readonly operationId: string;
  readonly email: string;
  readonly badge: string;
  readonly expiresInHours: number;
  readonly reasonCode: StaffMembershipReasonCode;
}

export interface RevokeInvitationInput {
  readonly operationId: string;
  readonly reservationId: string;
  readonly expectedRevision: number;
  readonly reasonCode: Extract<StaffMembershipReasonCode, 'access_revoked' | 'security_response'>;
}

export interface StoredStaffInvitation {
  readonly schemaVersion: typeof STAFF_INVITATION_SCHEMA_VERSION;
  readonly reservationId: string;
  readonly revision: number;
  readonly status: StoredInvitationStatus;
  readonly email: string;
  readonly emailMasked: string;
  readonly badge: string;
  readonly sections: Readonly<{ workspace: 'view' }>;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  readonly createdByUid: string;
  readonly revokedAtMs: number | null;
  readonly revokedByUid: string | null;
}

export interface StaffInvitationAudit {
  readonly schemaVersion: typeof STAFF_INVITATION_SCHEMA_VERSION;
  readonly operationId: string;
  readonly requestDigest: string;
  readonly actorUid: string;
  readonly reservationId: string;
  readonly action: 'reserve' | 'revoke';
  readonly resultRevision: number;
  readonly resultStatus: StoredInvitationStatus;
  readonly reasonCode: StaffMembershipReasonCode;
  readonly createdAtMs: number;
}

const ID_RE = /^[A-Za-z0-9._-]{1,160}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORED_KEYS = ['schemaVersion', 'reservationId', 'revision', 'status', 'email', 'emailMasked', 'badge',
  'sections', 'createdAtMs', 'expiresAtMs', 'createdByUid', 'revokedAtMs', 'revokedByUid'] as const;
const AUDIT_KEYS = ['schemaVersion', 'operationId', 'requestDigest', 'actorUid', 'reservationId', 'action',
  'resultRevision', 'resultStatus', 'reasonCode', 'createdAtMs'] as const;

function fail(code: string): never { throw new Error(code); }
function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
function exact(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record);
  return actual.length === keys.length && actual.every(key => keys.includes(key)) && keys.every(key => Object.prototype.hasOwnProperty.call(record, key));
}
function validId(value: unknown): value is string { return typeof value === 'string' && ID_RE.test(value); }
function validTime(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function normalizedText(value: unknown, min: number, max: number, code: string): string {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(code);
  const result = value.trim();
  if (result.length < min) fail(code);
  return result;
}

export function normalizeInvitationEmail(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254) fail('invalid_email');
  const email = value.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) fail('invalid_email');
  return email;
}

export function maskInvitationEmail(email: string): string {
  const normalized = normalizeInvitationEmail(email);
  const at = normalized.lastIndexOf('@');
  return `${normalized.slice(0, 1)}***${normalized.slice(at)}`;
}

export function invitationReservationId(email: string): string {
  return createHash('sha256').update(`staff-invitation\u0000${normalizeInvitationEmail(email)}`).digest('hex');
}

export function parseCreateInvitationInput(value: unknown): CreateInvitationInput {
  const keys = ['operationId', 'email', 'badge', 'expiresInHours', 'reasonCode'];
  if (!isPlain(value) || !exact(value, keys)) fail('invalid_request');
  if (!validId(value.operationId)) fail('invalid_identifier');
  const email = normalizeInvitationEmail(value.email);
  const badge = normalizedText(value.badge, 1, 80, 'invalid_badge');
  if (!Number.isSafeInteger(value.expiresInHours) || Number(value.expiresInHours) < 1 || Number(value.expiresInHours) > STAFF_INVITATION_MAX_HOURS) fail('invalid_expiry');
  if (value.reasonCode !== 'staff_onboarding') fail('invalid_reason_code');
  return Object.freeze({ operationId: value.operationId, email, badge, expiresInHours: value.expiresInHours as number,
    reasonCode: value.reasonCode });
}

export function parseRevokeInvitationInput(value: unknown): RevokeInvitationInput {
  const keys = ['operationId', 'reservationId', 'expectedRevision', 'reasonCode'];
  if (!isPlain(value) || !exact(value, keys)) fail('invalid_request');
  if (!validId(value.operationId) || !validId(value.reservationId)) fail('invalid_identifier');
  if (!Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 1) fail('invalid_revision');
  if (value.reasonCode !== 'access_revoked' && value.reasonCode !== 'security_response') fail('invalid_reason_code');
  return Object.freeze({ operationId: value.operationId, reservationId: value.reservationId,
    expectedRevision: value.expectedRevision as number, reasonCode: value.reasonCode });
}

export function parseStoredInvitation(value: unknown, expectedId: string, nowMs: number): StoredStaffInvitation & { readonly effectiveStatus: EffectiveInvitationStatus } {
  if (!validId(expectedId) || !validTime(nowMs) || !isPlain(value) || !exact(value, STORED_KEYS)) fail('invalid_invitation');
  if (value.schemaVersion !== 1 || value.reservationId !== expectedId || !validId(value.reservationId) ||
      !Number.isSafeInteger(value.revision) || Number(value.revision) < 1 ||
      (value.status !== 'pending' && value.status !== 'revoked') || !validTime(value.createdAtMs) || !validTime(value.expiresAtMs) ||
      Number(value.expiresAtMs) <= Number(value.createdAtMs) || !validId(value.createdByUid)) fail('invalid_invitation');
  const email = normalizeInvitationEmail(value.email);
  if (value.emailMasked !== maskInvitationEmail(email)) fail('invalid_invitation');
  const badge = normalizedText(value.badge, 1, 80, 'invalid_invitation');
  if (!isPlain(value.sections) || !exact(value.sections, ['workspace']) || value.sections.workspace !== 'view') fail('invalid_invitation');
  if (value.status === 'pending' && (value.revokedAtMs !== null || value.revokedByUid !== null)) fail('invalid_invitation');
  if (value.status === 'revoked' && (!validTime(value.revokedAtMs) || !validId(value.revokedByUid))) fail('invalid_invitation');
  const effectiveStatus: EffectiveInvitationStatus = value.status === 'pending' && nowMs >= Number(value.expiresAtMs) ? 'expired' : value.status;
  return Object.freeze({ schemaVersion: 1, reservationId: value.reservationId, revision: value.revision as number,
    status: value.status, email, emailMasked: value.emailMasked, badge, sections: Object.freeze({ workspace: 'view' }),
    createdAtMs: value.createdAtMs as number, expiresAtMs: value.expiresAtMs as number, createdByUid: value.createdByUid,
    revokedAtMs: value.revokedAtMs as number | null, revokedByUid: value.revokedByUid as string | null, effectiveStatus });
}

export function parseStaffInvitationAudit(value: unknown, expectedOperationId: string): StaffInvitationAudit {
  if (!validId(expectedOperationId) || !isPlain(value) || !exact(value, AUDIT_KEYS)) fail('invalid_audit');
  if (value.schemaVersion !== 1 || value.operationId !== expectedOperationId || !validId(value.operationId) ||
      typeof value.requestDigest !== 'string' || !/^[a-f0-9]{64}$/.test(value.requestDigest) ||
      !validId(value.actorUid) || !validId(value.reservationId) ||
      (value.action !== 'reserve' && value.action !== 'revoke') ||
      !Number.isSafeInteger(value.resultRevision) || Number(value.resultRevision) < 1 ||
      (value.resultStatus !== 'pending' && value.resultStatus !== 'revoked') ||
      typeof value.reasonCode !== 'string' || !validTime(value.createdAtMs)) fail('invalid_audit');
  if ((value.action === 'reserve' && (value.resultStatus !== 'pending' || value.reasonCode !== 'staff_onboarding')) ||
      (value.action === 'revoke' && (value.resultStatus !== 'revoked' ||
        (value.reasonCode !== 'access_revoked' && value.reasonCode !== 'security_response')))) fail('invalid_audit');
  const reasonCode: StaffMembershipReasonCode = value.action === 'reserve'
    ? 'staff_onboarding'
    : value.reasonCode === 'access_revoked' ? 'access_revoked' : 'security_response';
  return Object.freeze({ schemaVersion: 1, operationId: value.operationId, requestDigest: value.requestDigest,
    actorUid: value.actorUid, reservationId: value.reservationId, action: value.action,
    resultRevision: value.resultRevision as number, resultStatus: value.resultStatus,
    reasonCode, createdAtMs: value.createdAtMs as number });
}

export function invitationCreateDigest(actorUid: string, input: CreateInvitationInput): string {
  if (!validId(actorUid)) fail('invalid_identifier');
  const parsed = parseCreateInvitationInput(input);
  return createHash('sha256').update(JSON.stringify({ actorUid, operationId: parsed.operationId,
    emailHash: createHash('sha256').update(parsed.email).digest('hex'), badge: parsed.badge,
    expiresInHours: parsed.expiresInHours, reasonCode: parsed.reasonCode })).digest('hex');
}

export function invitationRevokeDigest(actorUid: string, input: RevokeInvitationInput): string {
  if (!validId(actorUid)) fail('invalid_identifier');
  const parsed = parseRevokeInvitationInput(input);
  return createHash('sha256').update(JSON.stringify({ actorUid, ...parsed })).digest('hex');
}

export function buildInvitationCreate(args: Readonly<{ actorUid: string; ownerUid: string; reservationId: string;
  input: CreateInvitationInput; nowMs: number; current?: unknown | null }>): Readonly<{ invitation: StoredStaffInvitation; audit: StaffInvitationAudit }> {
  if (!validId(args.ownerUid) || args.actorUid !== args.ownerUid) fail('owner_required');
  if (!validId(args.reservationId) || !validTime(args.nowMs)) fail('invalid_invitation');
  const input = parseCreateInvitationInput(args.input);
  const current = args.current ? parseStoredInvitation(args.current, args.reservationId, args.nowMs) : null;
  if (current?.effectiveStatus === 'pending') fail('invitation_already_pending');
  const revision = (current?.revision ?? 0) + 1;
  const expiresAtMs = args.nowMs + input.expiresInHours * 60 * 60 * 1000;
  if (!Number.isSafeInteger(expiresAtMs)) fail('invalid_expiry');
  const invitation: StoredStaffInvitation = Object.freeze({ schemaVersion: 1, reservationId: args.reservationId, revision,
    status: 'pending', email: input.email, emailMasked: maskInvitationEmail(input.email), badge: input.badge,
    sections: Object.freeze({ workspace: 'view' }), createdAtMs: args.nowMs, expiresAtMs,
    createdByUid: args.ownerUid, revokedAtMs: null, revokedByUid: null });
  const audit: StaffInvitationAudit = Object.freeze({ schemaVersion: 1, operationId: input.operationId,
    requestDigest: invitationCreateDigest(args.actorUid, input), actorUid: args.actorUid,
    reservationId: args.reservationId, action: 'reserve', resultRevision: revision, resultStatus: 'pending',
    reasonCode: input.reasonCode, createdAtMs: args.nowMs });
  return Object.freeze({ invitation, audit });
}

export function buildInvitationRevoke(args: Readonly<{ actorUid: string; ownerUid: string; current: unknown;
  input: RevokeInvitationInput; nowMs: number }>): Readonly<{ invitation: StoredStaffInvitation; audit: StaffInvitationAudit }> {
  if (!validId(args.ownerUid) || args.actorUid !== args.ownerUid || !validTime(args.nowMs)) fail('owner_required');
  const input = parseRevokeInvitationInput(args.input);
  const current = parseStoredInvitation(args.current, input.reservationId, args.nowMs);
  if (current.revision !== input.expectedRevision) fail('revision_conflict');
  if (current.effectiveStatus === 'expired') fail('invitation_expired');
  if (current.status !== 'pending') fail('invitation_not_pending');
  const invitation: StoredStaffInvitation = Object.freeze({ schemaVersion: 1, reservationId: current.reservationId,
    revision: current.revision + 1, status: 'revoked', email: current.email, emailMasked: current.emailMasked,
    badge: current.badge, sections: current.sections, createdAtMs: current.createdAtMs, expiresAtMs: current.expiresAtMs,
    createdByUid: current.createdByUid, revokedAtMs: args.nowMs, revokedByUid: args.ownerUid });
  const audit: StaffInvitationAudit = Object.freeze({ schemaVersion: 1, operationId: input.operationId,
    requestDigest: invitationRevokeDigest(args.actorUid, input), actorUid: args.actorUid,
    reservationId: input.reservationId, action: 'revoke', resultRevision: invitation.revision, resultStatus: 'revoked',
    reasonCode: input.reasonCode, createdAtMs: args.nowMs });
  return Object.freeze({ invitation, audit });
}
