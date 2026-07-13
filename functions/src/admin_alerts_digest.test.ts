export {};

let currentDb: any = null;
jest.mock('firebase-admin', () => ({
  apps: [{}], initializeApp: jest.fn(),
  firestore: Object.assign(() => currentDb, { FieldValue: { delete: () => ({ __delete: true }) } }),
}));

const { claimContentReportDigest, finalizeContentReportDigestClaim } = require('./admin_alerts');

function makeDb(initial: Record<string, any>) {
  const state = { ...initial };
  const ref = { path: 'admin_config/alerts' };
  const snapshot = () => ({ exists: true, data: () => ({ ...state }) });
  currentDb = {
    doc: () => ref,
    runTransaction: async (worker: (tx: any) => Promise<any>) => worker({
      get: async () => snapshot(),
      set: (_ref: any, patch: Record<string, any>) => {
        for (const [key, value] of Object.entries(patch)) {
          if ((value as any)?.__delete) delete state[key]; else state[key] = value;
        }
      },
    }),
  };
  return state;
}

describe('Telegram content report digest claim', () => {
  test('allows one live claim, preserves pending on rejection, and decrements only after provider acceptance', async () => {
    const state = makeDb({ enabled: true, types: { contentReportDigest: true }, pendingContentReports: 7 });
    await expect(claimContentReportDigest(currentDb, 'claim-1', 1_000)).resolves.toEqual({ id: 'claim-1', pending: 7 });
    await expect(claimContentReportDigest(currentDb, 'claim-2', 1_001)).resolves.toBeNull();
    await finalizeContentReportDigestClaim(currentDb, { id: 'claim-1', pending: 7 }, false);
    expect(state.pendingContentReports).toBe(7);
    expect(state.contentReportDigestClaim).toBeUndefined();
    const accepted = await claimContentReportDigest(currentDb, 'claim-3', 2_000);
    await finalizeContentReportDigestClaim(currentDb, accepted, true);
    expect(state.pendingContentReports).toBe(0);
    expect(state.contentReportDigestClaim).toBeUndefined();
  });
});
