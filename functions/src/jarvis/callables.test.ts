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

const buildQualitySnapshotMock = jest.fn((_input: unknown) => Promise.resolve({ generatedAtMs: 999, decisions: [] }));
jest.mock('./quality_snapshot', () => ({
  buildQualitySnapshot: (input: unknown) => buildQualitySnapshotMock(input),
}));

function request(token: Record<string, unknown> | null) {
  return { auth: token ? { uid: 'u1', token } : null, data: {} };
}

describe('jarvisGetQualitySnapshot — same permission gate as the reports center', () => {
  beforeEach(() => {
    buildQualitySnapshotMock.mockClear();
  });

  test('rejects unauthenticated callers', async () => {
    const { jarvisGetQualitySnapshot } = require('./callables');
    await expect(jarvisGetQualitySnapshot(request(null))).rejects.toThrow('Admin only');
  });

  test('rejects a caller without diagnostics.read', async () => {
    // зачем: moderator реально не имеет diagnostics.read в ROLE_PERMISSIONS
    // (admin/permissions.ts) — support имеет, поэтому не годится для этого теста.
    const { jarvisGetQualitySnapshot } = require('./callables');
    await expect(jarvisGetQualitySnapshot(request({ admin: true, adminRole: 'moderator' }))).rejects.toThrow();
  });

  test('allows an admin with diagnostics.read and returns the snapshot', async () => {
    const { jarvisGetQualitySnapshot } = require('./callables');
    const result = await jarvisGetQualitySnapshot(request({ admin: true, adminRole: 'owner' }));
    expect(result).toEqual({ ok: true, generatedAtMs: 999, decisions: [] });
    expect(buildQualitySnapshotMock).toHaveBeenCalledTimes(1);
  });

  test('every panel-triggered call is trigger=owner_request — the panel never schedules', async () => {
    const { jarvisGetQualitySnapshot } = require('./callables');
    await jarvisGetQualitySnapshot({
      auth: { uid: 'u1', token: { admin: true, adminRole: 'owner' } },
      data: { question: 'Что с крашами?' },
    });
    expect(buildQualitySnapshotMock).toHaveBeenLastCalledWith(expect.objectContaining({
      trigger: 'owner_request',
      question: 'Что с крашами?',
    }));
  });
});
