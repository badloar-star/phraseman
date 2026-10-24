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
  DialogueV2FreeformUnavailableError,
  requestDialogueV2FreeformPreparedBotVoice,
  startDialogueV2FreeformSession,
  sendDialogueV2FreeformTurn,
} from '../app/dialogue_v2_freeform_client';

describe('Dialogue V2 freeform callable client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts the separate Plus freeform session with only the chosen language contour', async () => {
    mockCallableRun.mockResolvedValueOnce({ data: {
      ok: true, sessionId: `d2fs_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1),
    } });

    await expect(startDialogueV2FreeformSession({ studyTarget: 'de' })).resolves.toEqual({
      ok: true, sessionId: `d2fs_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1),
    });
    expect(mockHttpsCallable).toHaveBeenCalledWith(
      { region: 'us-central1' },
      'dialogueV2FreeformSessionStart',
      { timeout: 22000 }, // потолок вызова (сервер + запас)
    );
    expect(mockCallableRun).toHaveBeenCalledWith({ studyTarget: 'de' });
  });

  it('sends an exact freeform turn and returns only the bounded assistant message', async () => {
    const request = {
      sessionId: `d2fs_${'a'.repeat(32)}`,
      turnId: `d2ft_${'b'.repeat(16)}`,
      studyTarget: 'de' as const,
      userMessage: 'Guten Tag!',
    };
    mockCallableRun.mockResolvedValueOnce({ data: {
      ok: true,
      assistantMessage: 'Hallo! Wie geht es dir?',
      sessionId: request.sessionId,
      expiresAtMs: Date.UTC(2026, 9, 1),
    } });

    await expect(sendDialogueV2FreeformTurn(request)).resolves.toEqual({
      ok: true,
      assistantMessage: 'Hallo! Wie geht es dir?',
      sessionId: request.sessionId,
      expiresAtMs: Date.UTC(2026, 9, 1),
    });
    expect(mockHttpsCallable).toHaveBeenCalledWith(
      { region: 'us-central1' },
      'dialogueV2FreeformSessionTurn',
      { timeout: 32000 }, // потолок вызова (сервер + запас)
    );
    expect(mockCallableRun).toHaveBeenCalledWith(request);
  });

  it('asks the inert Stage 4 voice boundary with only freeform identifiers and accepts only text-only', async () => {
    const request = {
      sessionId: `d2fs_${'a'.repeat(32)}`,
      turnId: `d2ft_${'b'.repeat(16)}`,
      studyTarget: 'de' as const,
    };
    mockCallableRun.mockResolvedValueOnce({ data: { selection: null } });

    await expect(requestDialogueV2FreeformPreparedBotVoice(request)).resolves.toEqual({ selection: null });
    expect(mockHttpsCallable).toHaveBeenCalledWith(
      { region: 'us-central1' },
      'dialogueV2FreeformPreparedBotVoiceResolve',
    );
    expect(mockCallableRun).toHaveBeenCalledWith(request);
    expect(mockCallableRun.mock.calls[0][0]).not.toHaveProperty('scenarioId');
    expect(mockCallableRun.mock.calls[0][0]).not.toHaveProperty('assetKey');

    mockCallableRun.mockResolvedValueOnce({ data: { selection: { assetKey: 'forbidden' } } });
    await expect(requestDialogueV2FreeformPreparedBotVoice(request)).resolves.toBeNull();
  });

  it.each([
    { studyTarget: 'pt-BR' },
    { studyTarget: 'de', scenarioId: 'work_01' },
  ])('does not call Firebase for invalid or scenario-shaped start input', async (input) => {
    await expect(startDialogueV2FreeformSession(input as never)).resolves.toBeNull();
    expect(mockCallableRun).not.toHaveBeenCalled();
  });

  it('drops malformed assistant responses and keeps callable details private', async () => {
    mockCallableRun.mockResolvedValueOnce({ data: {
      ok: true,
      assistantMessage: 'Hallo!',
      sessionId: `d2fs_${'a'.repeat(32)}`,
      expiresAtMs: Date.UTC(2026, 9, 1),
      provider: 'internal',
    } });
    await expect(sendDialogueV2FreeformTurn({
      sessionId: `d2fs_${'a'.repeat(32)}`,
      turnId: `d2ft_${'b'.repeat(16)}`,
      studyTarget: 'de',
      userMessage: 'Guten Tag!',
    })).resolves.toBeNull();

    mockCallableRun.mockRejectedValueOnce(new Error('permission-denied: model detail'));
    await expect(sendDialogueV2FreeformTurn({
      sessionId: `d2fs_${'a'.repeat(32)}`,
      turnId: `d2ft_${'c'.repeat(16)}`,
      studyTarget: 'de',
      userMessage: 'Noch einmal.',
    })).rejects.toEqual(new DialogueV2FreeformUnavailableError());
  });
});
