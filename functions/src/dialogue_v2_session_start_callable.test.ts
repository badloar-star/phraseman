import { HttpsError } from 'firebase-functions/v2/https';
import * as fs from 'node:fs';
import * as path from 'node:path';

const mockAuthorizePacket = jest.fn();
jest.mock('./dialogue_v2_server_authorization', () => ({
  authorizeDialogueV2ServerPacket: (...args: unknown[]) => mockAuthorizePacket(...args),
}));

// eslint-disable-next-line import/first
import {
  DIALOGUE_V2_SESSION_START_OPTIONS,
  createDialogueV2SessionStartHandler,
} from './dialogue_v2_session_start_callable';

function dependencies() {
  return {
    resolveStableAccountId: jest.fn(async () => 'stable-user'),
    acquireStartPermit: jest.fn(async () => undefined),
    resolveRelease: jest.fn(async () => ({ approved: true })),
    createSession: jest.fn(async () => ({
      sessionId: `d2s_${'S'.repeat(32)}`,
      expiresAtMs: Date.UTC(2026, 8, 28, 12, 0, 0),
    })),
  };
}

describe('Dialogue V2 session start callable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthorizePacket.mockReturnValue({ studyTarget: 'de', scenario: { id: 'work_01' } });
  });

  it('requires auth and exact selection before identity or release work', async () => {
    const deps = dependencies();
    const handler = createDialogueV2SessionStartHandler(deps);

    await expect(handler({ data: { studyTarget: 'de', scenarioId: 'work_01' } }))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    for (const data of [
      null,
      {},
      { studyTarget: 'de', scenarioId: 'work_01', history: [] },
      { studyTarget: 'de', scenarioId: 'work_01', rank: 99 },
      { studyTarget: 'it', scenarioId: 'work_01' },
      { studyTarget: 'de', scenarioId: '../work_01' },
      new Proxy({ studyTarget: 'de', scenarioId: 'work_01' }, {}),
    ]) {
      await expect(handler({ auth: { uid: 'auth-user' }, data }))
        .rejects.toMatchObject({ code: 'invalid-argument' });
    }
    expect(deps.resolveStableAccountId).not.toHaveBeenCalled();
    expect(deps.resolveRelease).not.toHaveBeenCalled();
    expect(deps.createSession).not.toHaveBeenCalled();
  });

  it('authorizes the fully approved active packet before creating the bound session', async () => {
    const deps = dependencies();
    const handler = createDialogueV2SessionStartHandler(deps);

    await expect(handler({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de', scenarioId: 'work_01' },
    })).resolves.toEqual({
      ok: true,
      sessionId: `d2s_${'S'.repeat(32)}`,
      expiresAtMs: Date.UTC(2026, 8, 28, 12, 0, 0),
    });

    expect(deps.resolveStableAccountId).toHaveBeenCalledWith('auth-user');
    expect(deps.acquireStartPermit).toHaveBeenCalledWith('auth-user', 'stable-user');
    expect(deps.acquireStartPermit.mock.invocationCallOrder[0])
      .toBeLessThan(deps.resolveRelease.mock.invocationCallOrder[0]);
    expect(mockAuthorizePacket).toHaveBeenCalledWith(
      { studyTarget: 'de', scenarioId: 'work_01' },
      { approved: true },
    );
    expect(deps.createSession).toHaveBeenCalledWith(
      { authUid: 'auth-user', stableAccountId: 'stable-user' },
      { studyTarget: 'de', scenarioId: 'work_01' },
    );
  });

  it('rate-limits repeated starts before costly release reads or new session documents', async () => {
    const deps = dependencies();
    deps.acquireStartPermit
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new HttpsError('resource-exhausted', 'dialogue_v2_session_start_rate_limited'));
    const handler = createDialogueV2SessionStartHandler(deps);
    const request = {
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de', scenarioId: 'work_01' },
    };

    await expect(handler(request)).resolves.toMatchObject({ ok: true });
    await expect(handler(request)).resolves.toMatchObject({ ok: true });
    await expect(handler(request)).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'dialogue_v2_session_start_rate_limited',
    });
    await expect(handler(request)).rejects.toMatchObject({ code: 'resource-exhausted' });
    await expect(handler(request)).rejects.toMatchObject({ code: 'resource-exhausted' });

    expect(deps.acquireStartPermit).toHaveBeenCalledTimes(5);
    expect(deps.resolveRelease).toHaveBeenCalledTimes(2);
    expect(deps.createSession).toHaveBeenCalledTimes(2);
  });

  it('fails closed when release or packet authorization is unavailable', async () => {
    const missing = dependencies();
    missing.resolveRelease.mockResolvedValueOnce(null as never);
    await expect(createDialogueV2SessionStartHandler(missing)({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de', scenarioId: 'work_01' },
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(missing.createSession).not.toHaveBeenCalled();

    const rejected = dependencies();
    mockAuthorizePacket.mockReturnValueOnce(null);
    await expect(createDialogueV2SessionStartHandler(rejected)({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'de', scenarioId: 'work_01' },
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(rejected.createSession).not.toHaveBeenCalled();
  });

  it('uses a bounded callable surface and declares server-only rules plus TTL config', () => {
    expect(DIALOGUE_V2_SESSION_START_OPTIONS).toMatchObject({
      region: 'us-central1',
      enforceAppCheck: false,
      timeoutSeconds: 20,
      memory: '256MiB',
      minInstances: 0,
      maxInstances: 20,
    });

    const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toContain(
      'const { dialogueV2SessionStart } = require("./dialogue_v2_session_start_callable")',
    );
    expect(indexSource).toContain('exports.dialogueV2SessionStart = dialogueV2SessionStart;');

    const rules = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
    expect(rules).toMatch(/match \/dialogue_v2_sessions\/\{sessionId\}[\s\S]*allow read, write: if false;/);
    const browserAdminCatchAll = rules.match(
      /match \/\{collection\}\/\{document=\*\*\} \{([\s\S]*?)\n    \}/,
    )?.[1];
    expect(browserAdminCatchAll).toBeDefined();
    expect(browserAdminCatchAll).toContain("&& collection != 'dialogue_v2_sessions'");

    const indexes = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../../firestore.indexes.json'),
      'utf8',
    ));
    expect(indexes.fieldOverrides).toContainEqual(expect.objectContaining({
      collectionGroup: 'dialogue_v2_sessions',
      fieldPath: 'expiresAt',
      ttl: true,
    }));
  });

  it('maps storage failures to one public-safe unavailable error', async () => {
    const deps = dependencies();
    deps.createSession.mockRejectedValueOnce(new Error('private firestore detail'));
    const handler = createDialogueV2SessionStartHandler(deps);

    try {
      await handler({
        auth: { uid: 'auth-user' },
        data: { studyTarget: 'de', scenarioId: 'work_01' },
      });
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpsError);
      expect((error as HttpsError).code).toBe('unavailable');
      expect((error as Error).message).toBe('dialogue_v2_session_unavailable');
      expect(JSON.stringify(error)).not.toContain('private firestore detail');
    }
  });
});
