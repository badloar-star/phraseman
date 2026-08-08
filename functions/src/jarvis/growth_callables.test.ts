export {};

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

const buildGrowthSnapshotMock = jest.fn((_input: unknown) => Promise.resolve({ generatedAtMs: 999, decisions: [] }));
jest.mock('./growth_snapshot', () => ({
  buildGrowthSnapshot: (input: unknown) => buildGrowthSnapshotMock(input),
}));

function request(token: Record<string, unknown> | null) {
  return { auth: token ? { uid: 'u1', token } : null, data: {} };
}

describe('jarvisGetGrowthSnapshot — gated by users.read', () => {
  beforeEach(() => { buildGrowthSnapshotMock.mockClear(); });

  test('rejects unauthenticated callers', async () => {
    const { jarvisGetGrowthSnapshot } = require('./growth_callables');
    await expect(jarvisGetGrowthSnapshot(request(null))).rejects.toThrow('Admin only');
  });

  test('rejects a caller without users.read (content_editor has neither)', async () => {
    const { jarvisGetGrowthSnapshot } = require('./growth_callables');
    await expect(jarvisGetGrowthSnapshot(request({ admin: true, adminRole: 'content_editor' }))).rejects.toThrow();
  });

  test('allows an admin with users.read and returns the snapshot', async () => {
    const { jarvisGetGrowthSnapshot } = require('./growth_callables');
    const result = await jarvisGetGrowthSnapshot(request({ admin: true, adminRole: 'owner' }));
    expect(result).toEqual({ ok: true, generatedAtMs: 999, decisions: [] });
    expect(buildGrowthSnapshotMock).toHaveBeenCalledTimes(1);
  });

  test('every panel-triggered call is trigger=owner_request', async () => {
    const { jarvisGetGrowthSnapshot } = require('./growth_callables');
    await jarvisGetGrowthSnapshot({ auth: { uid: 'u1', token: { admin: true, adminRole: 'owner' } }, data: { question: 'Сколько новых?' } });
    expect(buildGrowthSnapshotMock).toHaveBeenLastCalledWith(expect.objectContaining({ trigger: 'owner_request', question: 'Сколько новых?' }));
  });
});
