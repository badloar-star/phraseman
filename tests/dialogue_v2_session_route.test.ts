/* eslint-disable import/first */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

const h = React.createElement;
const mockFetchCatalogue = jest.fn();
const mockBuildModel = jest.fn();
const mockStartSession = jest.fn();
const mockSendTurn = jest.fn();
const mockParams = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUsePremium = jest.fn();
const mockUseStudyTarget = jest.fn();
const mockUseMyCoinRank = jest.fn();
const mockUseLang = jest.fn();
const mockConsent: jest.Mock = jest.fn(({ children }: { children: React.ReactNode }) => children);
const mockScreen: jest.Mock = jest.fn(() => null);
const mockUseVoice = jest.fn();
const mockStartVoice = jest.fn();
const mockStopVoice = jest.fn();
const mockDiscardVoice = jest.fn();
const mockPlayVoice = jest.fn();
const mockTakeVoiceAttachment = jest.fn();
const mockPlayPreparedBotVoice = jest.fn();

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', Platform: { OS: 'ios' }, StyleSheet: { flatten: (style: unknown) => style },
  Linking: { openSettings: jest.fn(async () => undefined) },
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams(),
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: mockPush }),
}));
jest.mock('../app/dialogue_v2_catalogue_client', () => ({
  fetchReleasedDialogueV2Catalogue: (...args: unknown[]) => mockFetchCatalogue(...args),
}));
jest.mock('../app/dialogue_v2_briefing_model', () => ({
  buildDialogueV2BriefingModel: (...args: unknown[]) => mockBuildModel(...args),
}));
jest.mock('../app/dialogue_v2_turn_client', () => ({
  startDialogueV2TextSession: (...args: unknown[]) => mockStartSession(...args),
}));
// зачем (D112): ход идёт через клиент разбора — с языком интерфейса и причинами отказа.
jest.mock('../app/dialogue_v2_turn_coaching_client', () => {
  class DialogueV2TurnFailureError extends Error {
    constructor(readonly reason: string, readonly quotaObservation: unknown = null) {
      super(reason);
    }
  }
  return {
    DialogueV2TurnFailureError,
    sendDialogueV2CoachedTextTurn: (...args: unknown[]) => mockSendTurn(...args),
  };
});
jest.mock('../components/PremiumContext', () => ({ usePremium: () => mockUsePremium() }));
jest.mock('../components/dialogs/glass/DialogueGlassSessionParts', () => ({
  dialogueMoodLabel: (_lang: string, mood: string) => `mood:${mood}`,
}));
jest.mock('../app/ai_dialog_daily_quota', () => ({
  readAiDialogMonthlyQuota: jest.fn(async () => ({ status: 'unknown', limit: 30 })),
  recordAiDialogMonthlyQuotaFromServer: jest.fn(async () => undefined),
  markAiDialogMonthlyQuotaExhausted: jest.fn(async () => undefined),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: 'stable-user', phase: 'active' }),
}));
jest.mock('../app/ai_dialog_consent_gate', () => ({
  __esModule: true,
  default: (props: { children: React.ReactNode }) => mockConsent(props),
}));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => mockUseStudyTarget() }));
jest.mock('../hooks/use_my_coin_rank', () => ({ useMyCoinRank: () => mockUseMyCoinRank() }));
jest.mock('../components/LangContext', () => ({ useLang: () => mockUseLang() }));
// Экран-гейт Liquid Glass (загрузка / недоступно / Plus) — простая замена для узлового теста.
jest.mock('../components/dialogs/glass/DialogueGlassKit', () => {
  const mockReact = jest.requireActual('react') as typeof React;
  return {
    useDialogueGlass: () => ({}),
    DialogueGlassGate: ({ testID, title, action }: { testID: string; title: string; action?: { label: string; onPress: () => void } }) => mockReact.createElement(
      'View',
      { testID },
      mockReact.createElement('Text', null, title),
      action ? mockReact.createElement('Pressable', { accessibilityLabel: action.label, onPress: action.onPress }, mockReact.createElement('Text', null, action.label)) : null,
    ),
  };
});
jest.mock('../components/dialogs/DialogueV2SessionScreen', () => ({
  DialogueV2SessionScreen: (props: unknown) => mockScreen(props),
}));
jest.mock('../hooks/use_dialogue_v2_voice_message', () => ({
  useDialogueV2VoiceMessage: (props: unknown) => mockUseVoice(props),
}));
jest.mock('../hooks/use_dialogue_v2_prepared_bot_voice_playback', () => ({
  useDialogueV2PreparedBotVoicePlayback: () => ({
    playingMessageId: null,
    play: mockPlayPreparedBotVoice,
    stop: jest.fn(),
  }),
}));

import DialogueV2SessionRoute from '../app/dialogue_v2_session';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockCrypto = require('expo-crypto') as { getRandomBytesAsync: jest.Mock; __reset: () => void };

const envelope = Object.freeze({ ok: true, packets: Object.freeze([{ scenario: { id: 'work_01' } }]) });
const model = Object.freeze({
  title: 'Согласовать время', cefr: 'A1', briefing: 'Уточни время встречи в чате.', rankRequired: 1,
  unlocked: true,
  objectives: Object.freeze([{ id: 'goal_1', label: 'Поздороваться.' }]),
  participants: Object.freeze([{ id: 'host', displayName: 'Анна', styleNote: 'Пишет кратко.' }]),
});

describe('Dialogue V2 session route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ scenarioId: 'work_01' });
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'de' });
    mockUseMyCoinRank.mockReturnValue(3);
    mockUseLang.mockReturnValue({ lang: 'ru' });
    mockFetchCatalogue.mockResolvedValue(envelope);
    mockBuildModel.mockReturnValue(model);
    mockCrypto.__reset();
    mockStartSession.mockResolvedValue({ ok: true, sessionId: `d2s_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) });
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: false });
    mockSendTurn.mockResolvedValue({
      kind: 'reply',
      replies: [{ personaId: 'host', text: 'Guten Tag!' }],
      replayed: false,
      preparedBotVoiceSelection: null,
      quota: { remaining: 29, resetAtMs: Date.UTC(2026, 9, 1), quotaVersion: 3 },
      coaching: null,
    });
    mockTakeVoiceAttachment.mockReturnValue(null);
    mockUseVoice.mockReturnValue({
      status: 'idle', voiceDraft: null, playingVoiceUri: null,
      start: mockStartVoice, stop: mockStopVoice, discard: mockDiscardVoice,
      play: mockPlayVoice, takeVoiceAttachment: mockTakeVoiceAttachment,
    });
  });

  it('loads a verified ID-only V2 session inside the existing consent gate', async () => {
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));

    expect(mockConsent).toHaveBeenCalledTimes(1);
    expect(mockFetchCatalogue).toHaveBeenCalledWith('de');
    expect(mockBuildModel).toHaveBeenCalledWith({
      packets: envelope.packets, studyTarget: 'de', scenarioId: 'work_01', localCoinRank: 3,
    });
    expect(mockStartSession).toHaveBeenCalledWith({ studyTarget: 'de', scenarioId: 'work_01' });
    expect(mockScreen.mock.calls[0][0]).toEqual(expect.objectContaining({
      title: 'Согласовать время', messages: [], sending: false,
    }));
  });

  it('keeps the loading surface visible until the server session is confirmed or rejected', async () => {
    let resolveStart!: (value: { sessionId: string; expiresAtMs: number } | null) => void;
    mockStartSession.mockImplementationOnce(() => new Promise((resolve) => {
      resolveStart = resolve;
    }));

    const screen = await render(h(DialogueV2SessionRoute));
    await expect(screen.findByTestId('dialogue-v2-session-loading')).resolves.toBeTruthy();
    expect(screen.queryByTestId('dialogue-v2-session-unavailable')).toBeNull();

    await act(async () => {
      resolveStart({ sessionId: `d2s_${'b'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) });
    });
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
  });

  it('sends only the exact bounded turn request and appends verified reply bubbles', async () => {
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten Tag!'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });

    expect(mockSendTurn).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: `d2s_${'a'.repeat(32)}`,
      turnId: expect.stringMatching(/^d2t_[a-f0-9]{36}$/),
      studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Guten Tag!', interfaceLang: 'ru',
    }));
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([
      { id: 'learner_1', author: 'learner', text: 'Guten Tag!' },
      { id: 'persona_2', author: 'persona', authorLabel: 'Анна', text: 'Guten Tag!' },
    ]));
  });

  it('sends a voice message as local audio plus the existing server-compatible text turn only', async () => {
    const voice = { uri: 'file:///cache/dialogue-v2-voice.wav', transcript: 'Guten Tag!' };
    mockUseVoice.mockReturnValue({
      status: 'idle', voiceDraft: voice, playingVoiceUri: null,
      start: mockStartVoice, stop: mockStopVoice, discard: mockDiscardVoice,
      play: mockPlayVoice, takeVoiceAttachment: mockTakeVoiceAttachment,
    });
    mockTakeVoiceAttachment.mockReturnValue(voice);
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));

    await act(async () => {
      mockUseVoice.mock.calls.at(-1)[0].onTranscript('Guten Tag!');
    });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });

    expect(mockSendTurn).toHaveBeenCalledWith({
      sessionId: `d2s_${'a'.repeat(32)}`,
      turnId: expect.stringMatching(/^d2t_[a-f0-9]{36}$/),
      studyTarget: 'de', scenarioId: 'work_01', userMessage: 'Guten Tag!', interfaceLang: 'ru',
    });
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].messages[0]).toEqual({
      id: 'learner_1', author: 'learner', text: 'Guten Tag!',
      voice: { uri: 'file:///cache/dialogue-v2-voice.wav' },
    }));
    expect(mockScreen.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
      voiceDraft: voice,
      onStartVoice: mockStartVoice,
      onStopVoice: mockStopVoice,
      onDiscardVoice: mockDiscardVoice,
      onPlayVoice: mockPlayVoice,
    }));
    expect(mockTakeVoiceAttachment).toHaveBeenCalledWith('Guten Tag!');
  });

  it('keeps send unavailable while local capture is still active', async () => {
    mockUseVoice.mockReturnValue({
      status: 'recording', voiceDraft: null, playingVoiceUri: null,
      start: mockStartVoice, stop: mockStopVoice, discard: mockDiscardVoice,
      play: mockPlayVoice, takeVoiceAttachment: mockTakeVoiceAttachment,
    });
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten Tag!'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });

    expect(mockTakeVoiceAttachment).not.toHaveBeenCalled();
    expect(mockSendTurn).not.toHaveBeenCalled();
  });

  it('ends the writable chat by navigating with IDs only to the terminal debrief', async () => {
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onComplete(); });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/dialogue_v2_completion',
      params: { sessionId: `d2s_${'a'.repeat(32)}`, scenarioId: 'work_01', endedBy: 'manual', learnerTurns: '0', title: 'Согласовать время' },
    });
  });

  it('fails closed before fetch for invalid route data and after an unavailable turn', async () => {
    mockParams.mockReturnValue({ scenarioId: ['work_01'] });
    const invalid = await render(h(DialogueV2SessionRoute));
    await expect(invalid.findByText('Диалоги недоступны')).resolves.toBeTruthy();
    expect(mockFetchCatalogue).not.toHaveBeenCalled();

    await invalid.unmount();
    mockParams.mockReturnValue({ scenarioId: 'work_01' });
    mockSendTurn.mockRejectedValue(new Error('internal detail'));
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten Tag!'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    // Макет C18: неудачный ход — плашка «Повторить» в ленте, разговор остаётся на экране.
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].turnError).toBe(true));
  });

  it('does not invoke a text turn when starting the server session fails', async () => {
    mockStartSession.mockRejectedValue(new Error('internal detail'));
    const screen = await render(h(DialogueV2SessionRoute));
    await expect(screen.findByText('Диалоги недоступны')).resolves.toBeTruthy();
    expect(mockSendTurn).not.toHaveBeenCalled();
  });

  it('retries the same pending turn without creating another session', async () => {
    mockSendTurn.mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce({
      kind: 'silence', replayed: false,
    });
    const screen = await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten Tag!'); });
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onSend(); });
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].turnError).toBe(true));
    expect(screen.queryByTestId('dialogue-v2-session-unavailable')).toBeNull();
    const firstRequest = mockSendTurn.mock.calls[0][0];

    await act(async () => { mockScreen.mock.calls.at(-1)[0].onRetry(); });
    await waitFor(() => expect(mockSendTurn).toHaveBeenCalledTimes(2));
    expect(mockSendTurn.mock.calls[1][0]).toEqual(firstRequest);
    expect(mockStartSession).toHaveBeenCalledTimes(1);
  });

  it('creates one pending turn when send is tapped twice before secure ID generation settles', async () => {
    let resolveBytes!: (value: Uint8Array) => void;
    mockCrypto.getRandomBytesAsync.mockImplementationOnce(() => new Promise<Uint8Array>((resolve) => {
      resolveBytes = resolve;
    }));
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten Tag!'); });
    await act(async () => {
      mockScreen.mock.calls.at(-1)[0].onSend();
      mockScreen.mock.calls.at(-1)[0].onSend();
    });
    expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledTimes(1);
    expect(mockSendTurn).not.toHaveBeenCalled();

    await act(async () => { resolveBytes(Uint8Array.from({ length: 18 }, () => 7)); });
    await waitFor(() => expect(mockSendTurn).toHaveBeenCalledTimes(1));
  });

  it('shows the turn coaching: translation, why, better phrasing, mood and the monthly remainder (D111/D112)', async () => {
    mockSendTurn.mockResolvedValueOnce({
      kind: 'reply',
      replies: [{ personaId: 'host', text: 'Welche Größe?' }],
      replayed: false,
      preparedBotVoiceSelection: null,
      quota: { remaining: 12, resetAtMs: Date.UTC(2026, 9, 1), quotaVersion: 4 },
      coaching: {
        replyTranslations: ['Какой размер?'],
        replyExplanations: ['Короткий вопрос о размере.'],
        betterPhrasing: 'Ich hätte gern einen Kaffee.',
        hint: 'Назови размер.',
        mood: 'smile',
        activeObjectiveId: 'goal_1',
        dialogueEnded: false,
      },
    });
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Kaffee.'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });

    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([
      { id: 'learner_1', author: 'learner', text: 'Kaffee.', betterPhrasing: 'Ich hätte gern einen Kaffee.' },
      {
        id: 'persona_2', author: 'persona', authorLabel: 'Анна', text: 'Welche Größe?',
        translation: 'Какой размер?', explanation: 'Короткий вопрос о размере.',
      },
    ]));
    const props = mockScreen.mock.calls.at(-1)[0];
    expect(props.headerMood).toEqual({ mood: 'smile', label: 'mood:smile' });
    expect(props.quotaPill.text).toBe('12/30');
    expect(props.hintText).toBe('Назови размер.');
    expect(props.goal.label).toBe('Поздороваться.');
    expect(props.bottom).toBe('input');

    await act(async () => { props.onToggleTranslation('persona_2'); });
    expect(mockScreen.mock.calls.at(-1)[0].translatedIds.has('persona_2')).toBe(true);
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onOpenWhy('persona_2'); });
    expect(mockScreen.mock.calls.at(-1)[0].whyTarget).toEqual(expect.objectContaining({
      messageId: 'persona_2', note: 'Короткий вопрос о размере.', translation: 'Какой размер?',
    }));
  });

  it('rolls back the optimistic bubble and shows the monthly wall when the free quota is exhausted', async () => {
    const { DialogueV2TurnFailureError } = jest.requireMock('../app/dialogue_v2_turn_coaching_client') as {
      DialogueV2TurnFailureError: new (reason: string, observation?: unknown) => Error;
    };
    mockSendTurn.mockRejectedValueOnce(new DialogueV2TurnFailureError('quota_exhausted', null));
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Hallo'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });

    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].bottom).toBe('wall'));
    expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([]);
    expect(mockScreen.mock.calls.at(-1)[0].turnError).toBe(false);
  });

  it('closes the scene when the persona ends it and opens the summary over the chat', async () => {
    mockSendTurn.mockResolvedValueOnce({
      kind: 'reply',
      replies: [{ personaId: 'host', text: 'Tschüss!' }],
      replayed: false,
      preparedBotVoiceSelection: null,
      quota: null,
      coaching: {
        replyTranslations: null, replyExplanations: null, betterPhrasing: null, hint: null,
        mood: 'happy', activeObjectiveId: null, dialogueEnded: true,
      },
    });
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Danke!'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].bottom).toBe('ended'));

    await act(async () => { mockScreen.mock.calls.at(-1)[0].onOpenSummary(); });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/dialogue_v2_completion',
      params: {
        sessionId: `d2s_${'a'.repeat(32)}`, scenarioId: 'work_01', endedBy: 'bot', learnerTurns: '1', title: 'Согласовать время', mood: 'happy',
      },
    });
    expect(mockScreen.mock.calls.at(-1)[0].bottom).toBe('summary');
  });

  it('shows the paused gate when the server reports the dialogue section switched off', async () => {
    const { DialogueV2TurnFailureError } = jest.requireMock('../app/dialogue_v2_turn_coaching_client') as {
      DialogueV2TurnFailureError: new (reason: string) => Error;
    };
    mockSendTurn.mockRejectedValueOnce(new DialogueV2TurnFailureError('paused'));
    const screen = await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Hallo'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    await expect(screen.findByTestId('dialogue-v2-session-paused')).resolves.toBeTruthy();
  });

  it('hides the monthly remainder and why-limit for Plus', async () => {
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: true });
    await render(h(DialogueV2SessionRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Hallo'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].messages).toHaveLength(2));
    expect(mockScreen.mock.calls.at(-1)[0].quotaPill).toBeNull();
  });
});
