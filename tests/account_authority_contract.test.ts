import {
  AccountAuthorityIdError,
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseProviderSubject,
  parseSessionId,
  type FirebaseAuthUid,
} from '../modules/account-authority-v2/account_authority_ids';
import {
  accountAuthorityGeneration,
  freezeAccountAuthorityCommand,
  freezeAccountAuthorityResult,
  freezeAccountAuthorityState,
  type AccountAuthorityResult,
} from '../modules/account-authority-v2/account_authority_contract';

describe('Account Authority 2.0 typed contract', () => {
  test.each([
    ['account_id', parseAccountId, 'acct_01HX9'],
    ['firebase_auth_uid', parseFirebaseAuthUid, 'firebase:uid-01'],
    ['provider_subject', parseProviderSubject, 'google:subject-01'],
    ['device_id', parseDeviceId, 'device-01'],
    ['session_id', parseSessionId, 'session-01'],
    ['operation_id', parseOperationId, 'operation-01'],
  ] as const)('creates a frozen %s without erasing its kind', (kind, parse, raw) => {
    const id = parse(raw);

    expect(id).toEqual({ kind, value: raw });
    expect(Object.isFrozen(id)).toBe(true);
  });

  test.each([
    '',
    '   ',
    '../account',
    'account/child',
    'account\\child',
    'account..child',
    '%2e%2e%2faccount',
    ' account',
    'account ',
  ])('rejects an empty or path-unsafe identifier: %j', (raw) => {
    expect(() => parseAccountId(raw)).toThrow(AccountAuthorityIdError);
  });

  test('Firebase UID and provider subject stay distinct at compile time and runtime boundaries', () => {
    const firebaseUid = parseFirebaseAuthUid('shared-lexical-value');
    const providerSubject = parseProviderSubject('shared-lexical-value');

    expect(firebaseUid.kind).toBe('firebase_auth_uid');
    expect(providerSubject.kind).toBe('provider_subject');
    expect(firebaseUid).not.toEqual(providerSubject);
    expect(() => parseFirebaseAuthUid(providerSubject)).toThrow(
      expect.objectContaining({ code: 'cross_kind', expectedKind: 'firebase_auth_uid' }),
    );

    const acceptsFirebaseUid = (_uid: FirebaseAuthUid): true => true;
    expect(acceptsFirebaseUid(firebaseUid)).toBe(true);
    if (false) {
      // @ts-expect-error A provider subject must never satisfy a Firebase UID port.
      acceptsFirebaseUid(providerSubject);
    }
  });

  test('same-kind object input is revalidated and copied into a fresh frozen id', () => {
    const forged = { kind: 'account_id', value: '../users/victim' } as unknown;
    expect(() => parseAccountId(forged)).toThrow(
      expect.objectContaining({ code: 'unsafe' }),
    );

    const mutable = { kind: 'account_id', value: 'account-safe' } as unknown;
    const parsed = parseAccountId(mutable);
    expect(parsed).toEqual({ kind: 'account_id', value: 'account-safe' });
    expect(parsed).not.toBe(mutable);
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  test('commands, results, and states keep explicit frozen discriminants', () => {
    const deviceId = parseDeviceId('device-01');
    const operationId = parseOperationId('operation-01');
    const accountId = parseAccountId('account-01');
    const sessionId = parseSessionId('session-01');
    const generation = accountAuthorityGeneration(3);

    const command = freezeAccountAuthorityCommand({
      type: 'commit_preserved_domain',
      operationId,
      accountId,
      sessionId,
      expectedGeneration: generation,
      domain: 'flashcards_srs',
    });
    const result = freezeAccountAuthorityResult({
      type: 'rejected',
      operationId,
      reason: 'stale_generation',
    });
    const state = freezeAccountAuthorityState({
      phase: 'signed_out',
      deviceId,
      generation,
    });

    expect(command.type).toBe('commit_preserved_domain');
    expect(result.type).toBe('rejected');
    expect(state.phase).toBe('signed_out');
    expect([command, result, state].every(Object.isFrozen)).toBe(true);

    const describeResult = (value: AccountAuthorityResult): string => {
      switch (value.type) {
        case 'authenticated': return 'authenticated';
        case 'signed_out': return 'signed_out';
        case 'device_taken_over': return 'device_taken_over';
        case 'local_deleted': return 'local_deleted';
        case 'committed': return 'committed';
        case 'cancelled': return 'cancelled';
        case 'rejected': return value.reason;
      }
    };
    expect(describeResult(result)).toBe('stale_generation');
  });

  test('phase-safe state rejects missing ownership and stale ownership fields', () => {
    const deviceId = parseDeviceId('device-01');
    const generation = accountAuthorityGeneration(0);
    expect(() => freezeAccountAuthorityState({
      phase: 'authenticated', deviceId, generation,
    } as never)).toThrow('account_authority_authenticated_identity_missing');
    expect(() => freezeAccountAuthorityState({
      phase: 'signed_out', deviceId, generation,
      accountId: parseAccountId('account-01'),
    } as never)).toThrow('account_authority_state_stale_ownership');
  });

  test('state boundary rejects structurally forged generations', () => {
    expect(() => freezeAccountAuthorityState({
      phase: 'signed_out',
      deviceId: parseDeviceId('device-01'),
      generation: { value: -1 },
    } as never)).toThrow('invalid_account_authority_generation');
  });

  test('command contract includes every authority transition, not only commits', () => {
    const deviceId = parseDeviceId('device-01');
    const accountId = parseAccountId('account-01');
    const sessionId = parseSessionId('session-01');
    const attemptId = parseOperationId('attempt-01');
    const generation = accountAuthorityGeneration(0);
    const commands = [
      { type: 'boot', deviceId },
      { type: 'authentication_started', attemptId },
      { type: 'authenticated', accountId, sessionId, expectedGeneration: generation, expectedAttemptId: attemptId },
      { type: 'provider_cancelled', attemptId },
      { type: 'device_taken_over', revokedSessionId: sessionId, expectedGeneration: generation },
      { type: 'signed_out' },
      { type: 'delete_account', accountId, sessionId },
    ] as const;
    for (const command of commands) {
      expect(freezeAccountAuthorityCommand(command)).toMatchObject({ type: command.type });
    }
  });

  test.each([-1, 1.25, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid authority generation %p',
    (value) => {
      expect(() => accountAuthorityGeneration(value)).toThrow('invalid_account_authority_generation');
    },
  );
});
