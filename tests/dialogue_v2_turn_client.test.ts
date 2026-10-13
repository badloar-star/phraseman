/* eslint-disable import/first */
const mockGetApp = jest.fn(() => ({ name: 'app' }));
const mockGetFunctions = jest.fn(() => ({ region: 'us-central1' }));
const mockCallableRun = jest.fn();
const mockHttpsCallable = jest.fn(() => mockCallableRun);

jest.mock('@react-native-firebase/app', () => ({ getApp: mockGetApp }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: mockGetFunctions,
  httpsCallable: mockHttpsCallable,
}));

import {
  DialogueV2TextTurnUnavailableError,
  startDialogueV2TextSession,
  sendDialogueV2TextTurn,
} from '../app/dialogue_v2_turn_client';

const replyEnvelope = Object.freeze({
  ok: true,
  kind: 'reply',
  replies: [{ personaId: 'host', text: 'Guten Tag!' }],
  replayed: false,
  quota: {
    period: 'calendar_month',
    remaining: 29,
    resetAtMs: Date.UTC(2026, 9, 1),
  },
});

const serverSelection = Object.freeze({
  contractVersion: 'dialogue_v2_prepared_bot_voice_selection.v2',
  sessionId: `d2s_${'a'.repeat(32)}`,
  turnId: `d2t_${'b'.repeat(16)}`,
  replyIndex: 0,
  studyTarget: 'de',
  scenarioId: 'work_01',
  voiceCatalogReleaseId: 'dialogue_v2_voice_2026_09_27_01',
  contentManifestSha256: 'a'.repeat(64),
  contentPackSha256: 'b'.repeat(64),
  personaId: 'host',
  preparedResponseId: 'work_01_host_milestone_01',
  replyTextSha256: 'c'.repeat(64),
  responseKind: 'milestone',
  groupPosition: 'direct',
  dayKey: '2026-09-27',
  operationFingerprint: 'd'.repeat(64),
});

describe('Dialogue V2 text turn Firebase client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallableRun.mockResolvedValue({ data: replyEnvelope });
  });

  it('starts a bounded server session before text turns', async () => {
    mockCallableRun.mockResolvedValueOnce({ data: {
      ok: true, sessionId: `d2s_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1),
    } });
    await expect(startDialogueV2TextSession({ studyTarget: 'de', scenarioId: 'work_01' })).resolves.toEqual({
      ok: true, sessionId: `d2s_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1),
    });
    // аудит «пропала сеть» 13.10: свой потолок вызова старта (сервер — до 20 с)
    expect(mockHttpsCallable).toHaveBeenCalledWith({ region: 'us-central1' }, 'dialogueV2SessionStart', { timeout: 22_000 });
    expect(mockCallableRun).toHaveBeenCalledWith({ studyTarget: 'de', scenarioId: 'work_01' });
  });

  it('sends only the session-bound text-turn request', async () => {
    const sessionId = `d2s_${'a'.repeat(32)}`;
    const turnId = `d2t_${'b'.repeat(16)}`;
    await expect(sendDialogueV2TextTurn({
      sessionId, turnId, studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Guten Tag!',
    })).resolves.toEqual(replyEnvelope);

    expect(mockGetFunctions).toHaveBeenCalledWith({ name: 'app' }, 'us-central1');
    expect(mockHttpsCallable).toHaveBeenCalledWith({ region: 'us-central1' }, 'dialogueV2TextTurn');
    expect(mockCallableRun).toHaveBeenCalledWith({
      sessionId, turnId, studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Guten Tag!',
    });
  });

  it.each([
    { sessionId: 'bad', turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'pt-BR', scenarioId: 'work_01', userMessage: 'Olá' },
    { sessionId: 'bad', turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: '../work_01', userMessage: 'Hallo' },
    { sessionId: 'bad', turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: 'work_01', userMessage: ' hello ' },
    { sessionId: 'bad', turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: 'work_01', userMessage: '' },
    { sessionId: 'bad', turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: 'work_01', userMessage: 'x'.repeat(2001) },
    { sessionId: `d2s_${'a'.repeat(32)}`, turnId: 'bad', studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Hallo' },
    { sessionId: `d2s_${'a'.repeat(32)}`, turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Hallo', role: 'system' },
    { sessionId: `d2s_${'a'.repeat(32)}`, turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Hallo', history: [] },
  ])('does not contact Firebase for invalid or caller-authored authority', async (request) => {
    await expect(sendDialogueV2TextTurn(request as never)).resolves.toBeNull();

    expect(mockCallableRun).not.toHaveBeenCalled();
  });

  it.each([
    { ok: true, kind: 'reply', replies: [{ personaId: 'host', text: 'Hallo' }] },
    { ok: true, kind: 'reply', replies: [{ personaId: 'host', text: 'Hallo' }], quota: {
      period: 'daily', remaining: 29, resetAtMs: 1,
    } },
    { ok: true, kind: 'reply', replies: [{ personaId: 'host', text: 'Hallo', style: 'bad' }], quota: {
      period: 'calendar_month', remaining: 29, resetAtMs: 1,
    } },
    { ok: true, kind: 'reply', replies: [{ personaId: 'host', text: 'Hallo' }], quota: {
      period: 'calendar_month', remaining: 29, resetAtMs: 1,
    }, release: 'internal' },
  ])('rejects a callable response outside the safe public turn envelope', async (data) => {
    mockCallableRun.mockResolvedValue({ data });

    await expect(sendDialogueV2TextTurn({ sessionId: `d2s_${'a'.repeat(32)}`, turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Hallo!' })).resolves.toBeNull();
  });

  it('accepts an exact quota-free replay response without extra fields', async () => {
    mockCallableRun.mockResolvedValue({ data: { ok: true, kind: 'silence', replies: [], replayed: true } });

    await expect(sendDialogueV2TextTurn({ sessionId: `d2s_${'a'.repeat(32)}`, turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: 'social_01', userMessage: 'Okay.' })).resolves.toEqual({ ok: true, kind: 'silence', replies: [], replayed: true });
  });

  it('accepts an exact server-provided prepared-voice selection while never sending one', async () => {
    const data = { ...replyEnvelope, preparedBotVoiceSelection: serverSelection };
    mockCallableRun.mockResolvedValue({ data });

    await expect(sendDialogueV2TextTurn({
      sessionId: serverSelection.sessionId,
      turnId: serverSelection.turnId,
      studyTarget: 'de',
      scenarioId: 'work_01',
      userMessage: 'Guten Tag!',
    })).resolves.toEqual(data);
    expect(mockCallableRun).toHaveBeenCalledWith({
      sessionId: serverSelection.sessionId,
      turnId: serverSelection.turnId,
      studyTarget: 'de',
      scenarioId: 'work_01',
      userMessage: 'Guten Tag!',
    });
  });

  it('accepts server-valid digit-leading prepared voice identifiers', async () => {
    const digitLeadingSelection = {
      ...serverSelection,
      voiceCatalogReleaseId: '2026_voice',
      preparedResponseId: '1st_reply',
    };
    const data = { ...replyEnvelope, preparedBotVoiceSelection: digitLeadingSelection };
    mockCallableRun.mockResolvedValue({ data });

    await expect(sendDialogueV2TextTurn({
      sessionId: serverSelection.sessionId,
      turnId: serverSelection.turnId,
      studyTarget: 'de',
      scenarioId: 'work_01',
      userMessage: 'Guten Tag!',
    })).resolves.toEqual(data);
  });

  it.each([
    ['malformed day key', { ...serverSelection, dayKey: 'not-a-day' }],
    ['impossible calendar day', { ...serverSelection, dayKey: '2026-02-31' }],
    ['unknown selection field', { ...serverSelection, localUri: 'file:///forged.m4a' }],
    ['selection for another turn', { ...serverSelection, turnId: `d2t_${'c'.repeat(16)}` }],
  ])('drops %s without suppressing a valid committed text reply', async (_name, invalidSelection) => {
    mockCallableRun.mockResolvedValue({ data: {
      ...replyEnvelope,
      preparedBotVoiceSelection: invalidSelection,
    } });

    await expect(sendDialogueV2TextTurn({
      sessionId: serverSelection.sessionId,
      turnId: serverSelection.turnId,
      studyTarget: 'de',
      scenarioId: 'work_01',
      userMessage: 'Guten Tag!',
    })).resolves.toEqual(replyEnvelope);
  });

  it('does not expose callable failure details', async () => {
    mockCallableRun.mockRejectedValue(new Error('permission-denied: provider response invalid'));

    await expect(sendDialogueV2TextTurn({ sessionId: `d2s_${'a'.repeat(32)}`, turnId: `d2t_${'b'.repeat(16)}`, studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Hallo!' })).rejects.toEqual(new DialogueV2TextTurnUnavailableError('dialogue_turn_unavailable'));
  });
});
