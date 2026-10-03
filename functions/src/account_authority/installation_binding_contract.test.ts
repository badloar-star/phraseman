import {
  createInstallationBinding,
  type InstallationBindingRecord,
  type InstallationBindingStorePort,
} from './installation_binding_contract';

function memoryStore(): InstallationBindingStorePort & {
  read(bindingKey: string): InstallationBindingRecord | null;
} {
  const records = new Map<string, InstallationBindingRecord>();
  return {
    read: (bindingKey) => records.get(bindingKey) ?? null,
    async transact(bindingKey, transition) {
      const result = transition(records.get(bindingKey) ?? null);
      records.set(bindingKey, result.record);
      return result.response;
    },
  };
}

function harness() {
  const store = memoryStore();
  const hash = jest.fn((value: string) => `hash(${value})`);
  let tokenSequence = 0;
  let deviceSequence = 0;
  return {
    store,
    hash,
    ports: {
      hash: { digest: hash },
      ids: {
        issueBindingToken: () => `binding-token-${++tokenSequence}`,
        issueDeviceBindingId: () => `device-binding-${++deviceSequence}`,
      },
      clock: { nowMs: () => 1_000 },
      store,
    },
  };
}

describe('server-issued installation binding contract', () => {
  test('accepts only an exact canonical random installationId request', async () => {
    const test = harness();

    await expect(createInstallationBinding(test.ports, 'firebase-user-a', {
      installationId: '550e8400-e29b-41d4-a716-446655440000',
      deviceId: 'client-owned-device',
    } as never)).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'account_authority_installation_request_invalid',
    });

    await expect(createInstallationBinding(test.ports, 'firebase-user-a', {
      installationId: 'person@example.com',
    })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'account_authority_installation_request_invalid',
    });
    expect(test.hash).not.toHaveBeenCalled();
  });

  test('persists no raw auth uid, installation id, or binding token', async () => {
    const test = harness();
    const installationId = '550e8400-e29b-41d4-a716-446655440000';

    const response = await createInstallationBinding(
      test.ports,
      'firebase-user-a',
      { installationId },
    );

    expect(response).toEqual({
      bindingToken: 'binding-token-1',
      deviceBindingId: 'device-binding-1',
    });
    const bindingKey = 'hash(account-authority-installation-key.v1\u0000firebase-user-a\u0000550e8400-e29b-41d4-a716-446655440000)';
    const record = test.store.read(bindingKey);
    expect(record).toEqual({
      schemaVersion: 'account-authority-installation-binding-record.v1',
      authUidHash: 'hash(account-authority-auth-uid.v1\u0000firebase-user-a)',
      installationIdHash: 'hash(account-authority-installation-id.v1\u0000550e8400-e29b-41d4-a716-446655440000)',
      bindingTokenHash: 'hash(account-authority-binding-token.v1\u0000binding-token-1)',
      deviceBindingId: 'device-binding-1',
      createdAtMs: 1_000,
      rotatedAtMs: 1_000,
      revokedAtMs: null,
    });
    expect(JSON.stringify(record)).not.toContain('firebase-user-a');
    expect(JSON.stringify(record)).not.toContain(installationId);
    expect(JSON.stringify(record)).not.toContain('binding-token-1');
  });

  test('keeps the server device binding stable while rotating the opaque token', async () => {
    const test = harness();
    const request = { installationId: '550e8400-e29b-41d4-a716-446655440000' } as const;
    const first = await createInstallationBinding(test.ports, 'firebase-user-a', request);
    const second = await createInstallationBinding(test.ports, 'firebase-user-a', request);

    expect(second.deviceBindingId).toBe(first.deviceBindingId);
    expect(second.bindingToken).not.toBe(first.bindingToken);
    expect(second).toEqual({
      bindingToken: 'binding-token-2',
      deviceBindingId: 'device-binding-1',
    });
  });

  test('fails closed when the rotation clock moves behind the current binding', async () => {
    const test = harness();
    const request = { installationId: '550e8400-e29b-41d4-a716-446655440000' } as const;
    await createInstallationBinding(test.ports, 'firebase-user-a', request);
    const bindingKey = 'hash(account-authority-installation-key.v1\u0000firebase-user-a\u0000550e8400-e29b-41d4-a716-446655440000)';
    const original = test.store.read(bindingKey);

    await expect(createInstallationBinding(
      { ...test.ports, clock: { nowMs: () => 999 } },
      'firebase-user-a',
      request,
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_installation_binding_invalid',
    });
    expect(test.store.read(bindingKey)).toBe(original);
  });

  test('fails closed when a newly issued token hashes to the current token hash', async () => {
    const test = harness();
    const request = { installationId: '550e8400-e29b-41d4-a716-446655440000' } as const;
    await createInstallationBinding(test.ports, 'firebase-user-a', request);
    const bindingKey = 'hash(account-authority-installation-key.v1\u0000firebase-user-a\u0000550e8400-e29b-41d4-a716-446655440000)';
    const original = test.store.read(bindingKey);
    const collidingHash = jest.fn((value: string) => (
      value === 'account-authority-binding-token.v1\u0000binding-token-2'
        ? 'hash(account-authority-binding-token.v1\u0000binding-token-1)'
        : `hash(${value})`
    ));

    await expect(createInstallationBinding(
      { ...test.ports, hash: { digest: collidingHash } },
      'firebase-user-a',
      request,
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_installation_binding_invalid',
    });
    expect(test.store.read(bindingKey)).toBe(original);
  });

  test('fails closed when a hashed document contains a mismatched principal', async () => {
    const test = harness();
    const request = { installationId: '550e8400-e29b-41d4-a716-446655440000' } as const;
    await createInstallationBinding(test.ports, 'firebase-user-a', request);
    const bindingKey = 'hash(account-authority-installation-key.v1\u0000firebase-user-a\u0000550e8400-e29b-41d4-a716-446655440000)';
    const original = test.store.read(bindingKey)!;
    const corruptedStore: InstallationBindingStorePort = {
      async transact(key, transition) {
        expect(key).toBe(bindingKey);
        return transition({ ...original, authUidHash: 'hash(other-user)' }).response;
      },
    };

    await expect(createInstallationBinding(
      { ...test.ports, store: corruptedStore },
      'firebase-user-a',
      request,
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_installation_binding_invalid',
    });
  });

  test.each([
    ['empty token hash', { bindingTokenHash: '' }],
    ['whitespace token hash', { bindingTokenHash: '   ' }],
    ['non-string token hash', { bindingTokenHash: { length: 1 } as unknown as string }],
    ['negative rotation timestamp', { rotatedAtMs: -1 }],
    ['rotation before creation', { rotatedAtMs: 999 }],
    ['unsafe rotation timestamp', { rotatedAtMs: Number.MAX_SAFE_INTEGER + 1 }],
  ])('fails closed before overwriting a record with a corrupt %s', async (_name, corruption) => {
    const test = harness();
    const request = { installationId: '550e8400-e29b-41d4-a716-446655440000' } as const;
    await createInstallationBinding(test.ports, 'firebase-user-a', request);
    const bindingKey = 'hash(account-authority-installation-key.v1\u0000firebase-user-a\u0000550e8400-e29b-41d4-a716-446655440000)';
    const original = test.store.read(bindingKey)!;
    let overwriteReached = false;
    const corruptedStore: InstallationBindingStorePort = {
      async transact(key, transition) {
        expect(key).toBe(bindingKey);
        const result = transition({ ...original, ...corruption });
        overwriteReached = true;
        return result.response;
      },
    };

    await expect(createInstallationBinding(
      { ...test.ports, store: corruptedStore },
      'firebase-user-a',
      request,
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'account_authority_installation_binding_invalid',
    });
    expect(overwriteReached).toBe(false);
  });
});
