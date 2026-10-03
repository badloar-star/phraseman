/**
 * Account Authority 2.0 identity boundary.
 *
 * These values intentionally remain separate even when two providers happen
 * to return the same lexical string.  A Firebase Auth UID is not an account
 * owner, a provider subject is not a Firebase UID, and a device/session token
 * is never a replacement for the server-owned account id.
 */

export type AccountAuthorityIdKind =
  | 'account_id'
  | 'firebase_auth_uid'
  | 'provider_subject'
  | 'device_id'
  | 'session_id'
  | 'operation_id';

declare const ACCOUNT_AUTHORITY_ID_BRAND: unique symbol;

export type AccountAuthorityId<K extends AccountAuthorityIdKind = AccountAuthorityIdKind> = Readonly<{
  kind: K;
  value: string;
  readonly [ACCOUNT_AUTHORITY_ID_BRAND]: K;
}>;

export type AccountId = AccountAuthorityId<'account_id'>;
export type FirebaseAuthUid = AccountAuthorityId<'firebase_auth_uid'>;
export type ProviderSubject = AccountAuthorityId<'provider_subject'>;
export type DeviceId = AccountAuthorityId<'device_id'>;
export type SessionId = AccountAuthorityId<'session_id'>;
export type OperationId = AccountAuthorityId<'operation_id'>;

export class AccountAuthorityIdError extends Error {
  readonly code: 'empty' | 'unsafe' | 'cross_kind' | 'too_long';
  readonly expectedKind?: AccountAuthorityIdKind;

  constructor(
    code: AccountAuthorityIdError['code'],
    message: string,
    expectedKind?: AccountAuthorityIdKind,
  ) {
    super(message);
    this.name = 'AccountAuthorityIdError';
    this.code = code;
    this.expectedKind = expectedKind;
  }
}

type IdInput = unknown;

function validateRaw(kind: AccountAuthorityIdKind, input: IdInput): string {
  if (typeof input !== 'string') {
    if (
      typeof input !== 'object'
      || input === null
      || !('kind' in input)
      || !('value' in input)
      || (input as { kind?: unknown }).kind !== kind
    ) {
      throw new AccountAuthorityIdError(
        'cross_kind',
        `account_authority_id_kind_mismatch:${String((input as { kind?: unknown } | null)?.kind)}:${kind}`,
        kind,
      );
    }
    const value = (input as { value?: unknown }).value;
    if (typeof value !== 'string') {
      throw new AccountAuthorityIdError('unsafe', `account_authority_id_value_invalid:${kind}`, kind);
    }
    // Re-enter the string validator.  Never trust or return a caller-owned
    // object merely because its visible kind matches.
    return validateRaw(kind, value);
  }

  if (input.length === 0 || input.trim().length === 0) {
    throw new AccountAuthorityIdError('empty', `account_authority_id_empty:${kind}`, kind);
  }
  if (input.length > 256) {
    throw new AccountAuthorityIdError('too_long', `account_authority_id_too_long:${kind}`, kind);
  }
  // IDs are used in Firestore path segments and logs.  Reject whitespace,
  // traversal, separators, control characters, and encoded traversal rather
  // than trying to normalize an ambiguous value.
  if (
    input.trim() !== input
    || /[\\/\u0000-\u001f\u007f]/.test(input)
    || input.includes('..')
    || /%2e|%2f|%5c/i.test(input)
  ) {
    throw new AccountAuthorityIdError('unsafe', `account_authority_id_unsafe:${kind}`, kind);
  }
  return input;
}

function parse<K extends AccountAuthorityIdKind>(kind: K, input: IdInput): AccountAuthorityId<K> {
  const value = validateRaw(kind, input);
  return Object.freeze({ kind, value }) as AccountAuthorityId<K>;
}

export function parseAccountId(input: IdInput): AccountId {
  return parse('account_id', input);
}

export function parseFirebaseAuthUid(input: IdInput): FirebaseAuthUid {
  return parse('firebase_auth_uid', input);
}

export function parseProviderSubject(input: IdInput): ProviderSubject {
  return parse('provider_subject', input);
}

export function parseDeviceId(input: IdInput): DeviceId {
  return parse('device_id', input);
}

export function parseSessionId(input: IdInput): SessionId {
  return parse('session_id', input);
}

export function parseOperationId(input: IdInput): OperationId {
  return parse('operation_id', input);
}
