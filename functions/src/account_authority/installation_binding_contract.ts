export type InstallationBindingErrorCode = 'invalid-argument' | 'failed-precondition';

export class InstallationBindingError extends Error {
  readonly code: InstallationBindingErrorCode;

  constructor(code: InstallationBindingErrorCode, message: string) {
    super(message);
    this.name = 'InstallationBindingError';
    this.code = code;
  }
}

export type InstallationBindingRecord = Readonly<{
  schemaVersion: 'account-authority-installation-binding-record.v1';
  authUidHash: string;
  installationIdHash: string;
  bindingTokenHash: string;
  deviceBindingId: string;
  createdAtMs: number;
  rotatedAtMs: number;
  revokedAtMs: number | null;
}>;

export type InstallationBindingResponse = Readonly<{
  bindingToken: string;
  deviceBindingId: string;
}>;

type InstallationBindingTransition = Readonly<{
  record: InstallationBindingRecord;
  response: InstallationBindingResponse;
}>;

export interface InstallationBindingStorePort {
  transact(
    bindingKey: string,
    transition: (current: InstallationBindingRecord | null) => InstallationBindingTransition,
  ): Promise<InstallationBindingResponse>;
}

export type InstallationBindingPorts = Readonly<{
  hash: Readonly<{ digest(value: string): string }>;
  ids: Readonly<{
    issueBindingToken(): string;
    issueDeviceBindingId(): string;
  }>;
  clock: Readonly<{ nowMs(): number }>;
  store: InstallationBindingStorePort;
}>;

export type InstallationBindingRequest = Readonly<{ installationId: string }>;

const INSTALLATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function invalidRequest(): InstallationBindingError {
  return new InstallationBindingError(
    'invalid-argument',
    'account_authority_installation_request_invalid',
  );
}

function parseRequest(value: unknown): InstallationBindingRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidRequest();
  }
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 1 || !Object.prototype.hasOwnProperty.call(data, 'installationId')) {
    throw invalidRequest();
  }
  if (typeof data.installationId !== 'string' || !INSTALLATION_ID_PATTERN.test(data.installationId)) {
    throw invalidRequest();
  }
  return Object.freeze({ installationId: data.installationId });
}

function validIssuedId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 1
    && value.length <= 512
    && value.trim() === value;
}

function assertExistingRecord(
  current: InstallationBindingRecord,
  authUidHash: string,
  installationIdHash: string,
): void {
  if (
    current.schemaVersion !== 'account-authority-installation-binding-record.v1'
    || current.authUidHash !== authUidHash
    || current.installationIdHash !== installationIdHash
    || current.revokedAtMs !== null
    || !validIssuedId(current.bindingTokenHash)
    || !validIssuedId(current.deviceBindingId)
    || !Number.isSafeInteger(current.createdAtMs)
    || current.createdAtMs < 0
    || !Number.isSafeInteger(current.rotatedAtMs)
    || current.rotatedAtMs < 0
    || current.rotatedAtMs < current.createdAtMs
  ) {
    throw new InstallationBindingError(
      'failed-precondition',
      'account_authority_installation_binding_invalid',
    );
  }
}

export async function createInstallationBinding(
  ports: InstallationBindingPorts,
  firebaseAuthUid: string,
  input: unknown,
): Promise<InstallationBindingResponse> {
  const request = parseRequest(input);
  if (typeof firebaseAuthUid !== 'string' || firebaseAuthUid.length < 1 || firebaseAuthUid.length > 256) {
    throw invalidRequest();
  }

  const bindingKey = ports.hash.digest(
    `account-authority-installation-key.v1\u0000${firebaseAuthUid}\u0000${request.installationId}`,
  );
  const authUidHash = ports.hash.digest(`account-authority-auth-uid.v1\u0000${firebaseAuthUid}`);
  const installationIdHash = ports.hash.digest(
    `account-authority-installation-id.v1\u0000${request.installationId}`,
  );

  return ports.store.transact(bindingKey, (current) => {
    const nowMs = ports.clock.nowMs();
    const bindingToken = ports.ids.issueBindingToken();
    if (!Number.isSafeInteger(nowMs) || nowMs < 0 || !validIssuedId(bindingToken)) {
      throw new InstallationBindingError(
        'failed-precondition',
        'account_authority_installation_binding_invalid',
      );
    }
    const bindingTokenHash = ports.hash.digest(
      `account-authority-binding-token.v1\u0000${bindingToken}`,
    );

    let deviceBindingId: string;
    let createdAtMs: number;
    if (current === null) {
      deviceBindingId = ports.ids.issueDeviceBindingId();
      createdAtMs = nowMs;
      if (!validIssuedId(deviceBindingId)) {
        throw new InstallationBindingError(
          'failed-precondition',
          'account_authority_installation_binding_invalid',
        );
      }
    } else {
      assertExistingRecord(current, authUidHash, installationIdHash);
      if (nowMs < current.rotatedAtMs || bindingTokenHash === current.bindingTokenHash) {
        throw new InstallationBindingError(
          'failed-precondition',
          'account_authority_installation_binding_invalid',
        );
      }
      deviceBindingId = current.deviceBindingId;
      createdAtMs = current.createdAtMs;
    }

    const record: InstallationBindingRecord = {
      schemaVersion: 'account-authority-installation-binding-record.v1',
      authUidHash,
      installationIdHash,
      bindingTokenHash,
      deviceBindingId,
      createdAtMs,
      rotatedAtMs: nowMs,
      revokedAtMs: null,
    };
    Object.defineProperty(record, 'toJSON', {
      enumerable: false,
      value: () => ({
        schemaVersion: record.schemaVersion,
        authUidHash: '[redacted]',
        installationIdHash: '[redacted]',
        bindingTokenHash: '[redacted]',
        deviceBindingId: record.deviceBindingId,
        createdAtMs: record.createdAtMs,
        rotatedAtMs: record.rotatedAtMs,
        revokedAtMs: record.revokedAtMs,
      }),
    });
    Object.freeze(record);
    const response: InstallationBindingResponse = Object.freeze({
      bindingToken,
      deviceBindingId,
    });
    return Object.freeze({ record, response });
  });
}
