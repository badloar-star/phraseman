class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-admin', () => ({ firestore: jest.fn() }));

const buildMoneySnapshotMock = jest.fn((_input: unknown) => Promise.resolve({ generatedAtMs: 999, decisions: [] }));
jest.mock('./money_snapshot', () => ({
  buildMoneySnapshot: (input: unknown) => buildMoneySnapshotMock(input),
}));

function request(token: Record<string, unknown> | null) {
  return { auth: token ? { uid: 'u1', token } : null, data: {} };
}

describe('jarvisGetMoneySnapshot — gated by money.read, not diagnostics.read', () => {
  beforeEach(() => {
    buildMoneySnapshotMock.mockClear();
  });

  test('rejects unauthenticated callers', async () => {
    const { jarvisGetMoneySnapshot } = require('./money_callables');
    await expect(jarvisGetMoneySnapshot(request(null))).rejects.toThrow('Admin only');
  });

  test('rejects a caller without money.read (content_editor has neither money nor diagnostics)', async () => {
    const { jarvisGetMoneySnapshot } = require('./money_callables');
    await expect(jarvisGetMoneySnapshot(request({ admin: true, adminRole: 'content_editor' }))).rejects.toThrow();
  });

  test('allows an admin with money.read and returns the snapshot', async () => {
    const { jarvisGetMoneySnapshot } = require('./money_callables');
    const result = await jarvisGetMoneySnapshot(request({ admin: true, adminRole: 'owner' }));
    expect(result).toEqual({ ok: true, generatedAtMs: 999, decisions: [] });
    expect(buildMoneySnapshotMock).toHaveBeenCalledTimes(1);
  });

  test('analyst also has money.read and is allowed', async () => {
    const { jarvisGetMoneySnapshot } = require('./money_callables');
    await expect(jarvisGetMoneySnapshot(request({ admin: true, adminRole: 'analyst' }))).resolves.toBeDefined();
  });

  test('every panel-triggered call is trigger=owner_request', async () => {
    const { jarvisGetMoneySnapshot } = require('./money_callables');
    await jarvisGetMoneySnapshot({ auth: { uid: 'u1', token: { admin: true, adminRole: 'owner' } }, data: { question: 'Растут ли возвраты?' } });
    expect(buildMoneySnapshotMock).toHaveBeenLastCalledWith(expect.objectContaining({ trigger: 'owner_request', question: 'Растут ли возвраты?' }));
  });
});
