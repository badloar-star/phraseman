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

// зачем doc().get(): callable читает jarvis_control параллельно со снапшотом
// (чтобы показать текущий режим на панели) — без этого мок db.doc падает.
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    doc: () => ({ get: async () => ({ data: () => undefined }) }),
    collection: () => ({
      doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }),
    }),
  })),
}));

const buildAllMock = jest.fn((_input: unknown) => Promise.resolve({
  generatedAtMs: 999, appTier: 'seed', decisions: [], departmentErrors: [],
}));
jest.mock('./all_departments_snapshot', () => ({
  buildAllDepartmentsSnapshot: (input: unknown) => buildAllMock(input),
}));

function request(token: Record<string, unknown> | null) {
  return { auth: token ? { uid: 'u1', token } : null, data: {} };
}

describe('jarvisGetAllDecisions — needs quality + money + growth access all at once', () => {
  beforeEach(() => { buildAllMock.mockClear(); });

  test('rejects unauthenticated callers', async () => {
    const { jarvisGetAllDecisions } = require('./all_departments_callables');
    await expect(jarvisGetAllDecisions(request(null))).rejects.toThrow('Admin only');
  });

  test('rejects support — it lacks money.read, one of the three required permissions', async () => {
    const { jarvisGetAllDecisions } = require('./all_departments_callables');
    await expect(jarvisGetAllDecisions(request({ admin: true, adminRole: 'support' }))).rejects.toThrow();
  });

  test('allows owner, who has all three permissions', async () => {
    const { jarvisGetAllDecisions } = require('./all_departments_callables');
    const result = await jarvisGetAllDecisions(request({ admin: true, adminRole: 'owner' }));
    expect(result).toEqual({
      ok: true, generatedAtMs: 999, appTier: 'seed', mode: 'observe', decisions: [], departmentErrors: [],
    });
    expect(buildAllMock).toHaveBeenCalledTimes(1);
  });

  test('analyst also has all three and is allowed', async () => {
    const { jarvisGetAllDecisions } = require('./all_departments_callables');
    await expect(jarvisGetAllDecisions(request({ admin: true, adminRole: 'analyst' }))).resolves.toBeDefined();
  });
});

describe('jarvisGetCohortRetention — aggregate-only owner view', () => {
  test('rejects analyst even though analyst can read the combined Jarvis view', async () => {
    const { jarvisGetCohortRetention } = require('./all_departments_callables');
    await expect(jarvisGetCohortRetention(request({ admin: true, adminRole: 'analyst' }))).rejects.toThrow('Owner only');
  });

  test('allows owner and never returns a raw member identifier', async () => {
    const { jarvisGetCohortRetention } = require('./all_departments_callables');
    const result = await jarvisGetCohortRetention(request({ admin: true, adminRole: 'owner' }));

    expect(result).toMatchObject({ ok: true });
    expect(result.metrics).toHaveLength(2);
    expect(JSON.stringify(result)).not.toMatch(/uid|memberKey|stable-user/i);
  });
});
