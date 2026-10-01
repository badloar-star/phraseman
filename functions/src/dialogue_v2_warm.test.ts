import { HttpsError } from 'firebase-functions/v2/https';

import { DIALOGUE_V2_WARM_RESPONSE, isDialogueV2WarmRequest } from './dialogue_v2_warm';
import { createDialogueV2SessionStartHandler } from './dialogue_v2_session_start_callable';
import {
  createDialogueV2SessionTextTurnHandler,
  type DialogueV2SessionTurnRuntime,
} from './dialogue_v2_turn_production_callable';

/**
 * Владелец 01.10: диалоги «ДОЛЖНЫ» прогреваться. { warm: true } отвечает сразу и
 * ничего не делает: ни личности, ни лимитов, ни выпуска, ни ledger, ни OpenAI.
 * Любая другая форма не считается прогревом и проходит обычную строгую проверку.
 */
function startDependencies() {
  return {
    resolveStableAccountId: jest.fn(async () => 'stable-user'),
    acquireStartPermit: jest.fn(async () => undefined),
    resolveRelease: jest.fn(async () => null),
    createSession: jest.fn(async () => ({ sessionId: `d2s_${'A'.repeat(32)}`, expiresAtMs: 1 })),
  };
}

function turnRuntime(): DialogueV2SessionTurnRuntime & Record<string, jest.Mock> {
  return {
    resolveStableAccountId: jest.fn(async () => 'stable-user'),
    createCoreDependencies: jest.fn(),
    runSessionTurn: jest.fn(),
    selectPreparedBotVoiceAfterCommit: jest.fn(async () => null),
  } as unknown as DialogueV2SessionTurnRuntime & Record<string, jest.Mock>;
}

describe('Dialogue V2 warm-up', () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => log.mockRestore());

  it('accepts only the exact { warm: true } shape', () => {
    expect(isDialogueV2WarmRequest({ warm: true })).toBe(true);
    expect(isDialogueV2WarmRequest(Object.assign(Object.create(null), { warm: true }))).toBe(true);
    for (const value of [
      null, undefined, true, 'warm', [], [true], {}, { warm: 'true' }, { warm: 1 }, { warm: false },
      { warm: true, studyTarget: 'en' }, { warm: true, scenarioId: 'social_01' },
      Object.defineProperty({}, 'warm', { get: () => true, enumerable: true }),
      new Proxy({ warm: true }, {}),
      Object.assign(Object.create({ inherited: 1 }), { warm: true }),
    ]) {
      expect(isDialogueV2WarmRequest(value)).toBe(false);
    }
  });

  it('session start: warm answers instantly and touches nothing, even without auth', async () => {
    const deps = startDependencies();
    const handler = createDialogueV2SessionStartHandler(deps);
    await expect(handler({ data: { warm: true } })).resolves.toEqual(DIALOGUE_V2_WARM_RESPONSE);
    await expect(handler({ auth: { uid: 'auth-user' }, data: { warm: true } })).resolves.toEqual({ ok: true, warm: true });
    for (const dependency of Object.values(deps)) expect(dependency).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('[DIALOGUE-V2] warm', JSON.stringify({ fn: 'sessionStart' }));
  });

  it('session start: a warm flag mixed into a real selection is rejected by the strict validator', async () => {
    const deps = startDependencies();
    const handler = createDialogueV2SessionStartHandler(deps);
    await expect(handler({ auth: { uid: 'auth-user' }, data: { warm: true, studyTarget: 'en', scenarioId: 'social_01' } }))
      .rejects.toEqual(new HttpsError('invalid-argument', 'dialogue_v2_session_request_invalid'));
    await expect(handler({ data: { warm: 'true' } })).rejects.toEqual(new HttpsError('unauthenticated', 'auth_required'));
    for (const dependency of Object.values(deps)) expect(dependency).not.toHaveBeenCalled();
  });

  it('text turn: warm answers instantly without identity, ledger, quota or provider work', async () => {
    const runtime = turnRuntime();
    const handler = createDialogueV2SessionTextTurnHandler(runtime);
    await expect(handler({ data: { warm: true } })).resolves.toEqual({ ok: true, warm: true });
    expect(runtime.resolveStableAccountId).not.toHaveBeenCalled();
    expect(runtime.createCoreDependencies).not.toHaveBeenCalled();
    expect(runtime.runSessionTurn).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('[DIALOGUE-V2] warm', JSON.stringify({ fn: 'textTurn' }));
  });

  it('text turn: a warm flag inside a real turn request is rejected, never treated as warm', async () => {
    const runtime = turnRuntime();
    const handler = createDialogueV2SessionTextTurnHandler(runtime);
    await expect(handler({
      auth: { uid: 'auth-user' },
      data: {
        warm: true,
        sessionId: `d2s_${'S'.repeat(32)}`,
        turnId: `d2t_${'T'.repeat(16)}`,
        studyTarget: 'en',
        scenarioId: 'social_01',
        userMessage: 'Hi!',
      },
    })).rejects.toEqual(new HttpsError('invalid-argument', 'dialogue_v2_turn_request_invalid'));
    expect(runtime.runSessionTurn).not.toHaveBeenCalled();
  });
});
