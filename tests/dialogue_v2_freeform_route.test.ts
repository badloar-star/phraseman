/* eslint-disable import/first */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const h = React.createElement;
const mockStart = jest.fn();
const mockTurn = jest.fn();
const mockPreparedBotVoiceRequest = jest.fn();
const mockResolveCurrentPreparedBotVoice = jest.fn();
const mockUseStudyTarget = jest.fn();
const mockUsePremium = jest.fn();
const mockUseLang = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockScreen: jest.Mock = jest.fn(() => null);
// зачем: открывающая фраза (данные Ядра) по умолчанию выключена — старые проверки ленты про ходы;
// отдельный тест ниже проверяет, что она стоит в первом кадре.
const mockOpening: jest.Mock = jest.fn((): string | null => null);
const mockVoice = {
  status: 'idle' as const,
  voiceDraft: null as { uri: string; transcript: string } | null,
  playingVoiceUri: null as string | null,
  start: jest.fn(async () => undefined),
  stop: jest.fn(),
  discard: jest.fn(),
  play: jest.fn(),
  takeVoiceAttachment: jest.fn(() => null as { uri: string; transcript: string } | null),
};

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', Platform: { OS: 'ios' },
  StyleSheet: { flatten: (style: unknown) => style },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }) }));
jest.mock('../app/dialogue_v2_freeform_client', () => ({
  startDialogueV2FreeformSession: (...args: unknown[]) => mockStart(...args),
  sendDialogueV2FreeformTurn: (...args: unknown[]) => mockTurn(...args),
  requestDialogueV2FreeformPreparedBotVoice: (...args: unknown[]) => mockPreparedBotVoiceRequest(...args),
}));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => mockUseStudyTarget() }));
jest.mock('../components/PremiumContext', () => ({ usePremium: () => mockUsePremium() }));
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
jest.mock('../components/dialogs/DialogueV2FreeformScreen', () => ({
  DialogueV2FreeformScreen: (props: unknown) => mockScreen(props),
}));
jest.mock('../hooks/use_dialogue_v2_voice_message', () => ({
  useDialogueV2VoiceMessage: () => mockVoice,
}));
jest.mock('../app/dialogue_v2_freeform_prepared_bot_voice_runtime', () => ({
  resolveCurrentDialogueV2FreeformPreparedBotVoice: (...args: unknown[]) => mockResolveCurrentPreparedBotVoice(...args),
}));
jest.mock('../app/dialogue_v2_freeform_prepared_bot_voice_asset_registry', () => ({
  resolveBundledDialogueV2FreeformPreparedBotVoiceAsset: jest.fn(async () => null),
}));

jest.mock('../app/dialogue_v2_freeform_opening', () => ({ dialogueV2FreeformOpening: (target: unknown) => mockOpening(target) }));
// зачем (координатор 12.10): в стенде тихий повтор старта идёт через mockRetryDelay мс вместо 4 с — число попыток то же.
let mockRetryDelay = 1;
jest.mock('../app/dialogue_v2_freeform_start_retry', () => {
  const actual = jest.requireActual('../app/dialogue_v2_freeform_start_retry');
  return { ...actual, planFreeformStartRetry: (attempt: number) => actual.planFreeformStartRetry(attempt, mockRetryDelay) };
});
const failStartTimes = (times: number, how: 'null' | 'reject' = 'reject') => {
  for (let i = 0; i < times; i += 1) {
    if (how === 'null') mockStart.mockResolvedValueOnce(null);
    else mockStart.mockRejectedValueOnce(new Error('start failed'));
  }
};

import DialogueV2FreeformRoute from '../app/dialogue_v2_freeform';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockCrypto = require('expo-crypto') as { getRandomBytesAsync: jest.Mock; __reset: () => void };

describe('Dialogue V2 freeform route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'de' });
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: true });
    mockUseLang.mockReturnValue({ lang: 'ru' });
    mockOpening.mockImplementation(() => null);
    mockStart.mockResolvedValue({ ok: true, sessionId: `d2fs_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) });
    mockTurn.mockResolvedValue({
      ok: true,
      assistantMessage: 'Hallo! Woran möchtest du heute arbeiten?',
      sessionId: `d2fs_${'a'.repeat(32)}`,
      expiresAtMs: Date.UTC(2026, 9, 1),
    });
    mockPreparedBotVoiceRequest.mockResolvedValue({ selection: null });
    mockResolveCurrentPreparedBotVoice.mockResolvedValue(null);
    mockCrypto.__reset();
    mockVoice.status = 'idle';
    mockVoice.voiceDraft = null;
    mockVoice.playingVoiceUri = null;
    mockVoice.takeVoiceAttachment.mockReturnValue(null);
    mockRetryDelay = 1;
  });

  // зачем (аудит кнопок R52, 15.10): сбой ХОДА — плашка «Повторить» под лентой (проп turnError экрана), а не весь экран «недоступно»
  const turnRetry = () => mockScreen.mock.calls.at(-1)[0].turnError as { retryLabel: string; onRetry: () => void } | null;
  const waitTurnRetry = () => waitFor(() => expect(turnRetry()?.retryLabel).toBe('Повторить'));

  it('starts its own Plus-only session and sends a bounded freeform turn with stable message IDs', async () => {
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    expect(mockStart).toHaveBeenCalledWith({ studyTarget: 'de' });

    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten Tag!'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });

    expect(mockTurn).toHaveBeenCalledWith({
      sessionId: `d2fs_${'a'.repeat(32)}`,
      turnId: expect.stringMatching(/^d2ft_[a-f0-9]{36}$/),
      studyTarget: 'de',
      userMessage: 'Guten Tag!',
    });
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([
      { id: 'learner_1', author: 'learner', text: 'Guten Tag!' },
      { id: 'assistant_2', author: 'assistant', text: 'Hallo! Woran möchtest du heute arbeiten?' },
    ]));
    expect(mockResolveCurrentPreparedBotVoice).toHaveBeenCalledWith(expect.objectContaining({
      response: {
        sessionId: `d2fs_${'a'.repeat(32)}`,
        turnId: expect.stringMatching(/^d2ft_[a-f0-9]{36}$/),
        studyTarget: 'de',
        text: 'Hallo! Woran möchtest du heute arbeiten?',
      },
    }));
    expect(mockPreparedBotVoiceRequest).not.toHaveBeenCalled();
  });

  it('keeps learner voice local while transporting only the canonical transcript text', async () => {
    const localVoice = { uri: 'file:///cache/freeform-voice.m4a', transcript: 'Guten Tag!' };
    mockVoice.voiceDraft = localVoice;
    mockVoice.takeVoiceAttachment.mockReturnValue(localVoice);
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта

    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten   Tag!'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });

    expect(mockVoice.takeVoiceAttachment).toHaveBeenCalledWith('Guten   Tag!');
    expect(mockTurn).toHaveBeenCalledWith(expect.objectContaining({
      userMessage: 'Guten   Tag!',
    }));
    expect(mockTurn.mock.calls[0][0]).not.toHaveProperty('voice');
    expect(mockTurn.mock.calls[0][0]).not.toHaveProperty('uri');
    expect(mockScreen.mock.calls.at(-1)[0].messages[0]).toEqual({
      id: 'learner_1', author: 'learner', text: 'Guten   Tag!', voice: { uri: localVoice.uri },
    });
  });

  it('renders text only when the local voice transcript does not match the canonical sent text', async () => {
    mockVoice.voiceDraft = { uri: 'file:///cache/mismatched-freeform-voice.m4a', transcript: 'Guten Morgen!' };
    mockVoice.takeVoiceAttachment.mockReturnValue(null);
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта

    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten Abend!'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });

    expect(mockVoice.takeVoiceAttachment).toHaveBeenCalledWith('Guten Abend!');
    expect(mockScreen.mock.calls.at(-1)[0].messages[0]).toEqual({
      id: 'learner_1', author: 'learner', text: 'Guten Abend!',
    });
    expect(mockScreen.mock.calls.at(-1)[0].messages[0]).not.toHaveProperty('voice');
  });

  it('discards a locally recorded voice draft before resetting a changed language contour', async () => {
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'en' });
    await screen.rerender(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ studyTarget: 'en' }));
    expect(mockVoice.discard).toHaveBeenCalled();
  });

  it('shows a client Plus gate without treating it as server authority', async () => {
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: false });
    const screen = await render(h(DialogueV2FreeformRoute));
    await expect(screen.findByText('Свободный разговор доступен в Plus')).resolves.toBeTruthy();
    expect(mockStart).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Открыть Plus'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogue_v2_freeform' },
    });
  });

  it('keeps a non-leaking retry state and reuses the same pending turn ID', async () => {
    mockTurn.mockRejectedValueOnce(new Error('provider detail')).mockResolvedValueOnce({
      ok: true, assistantMessage: 'Alles klar.', sessionId: `d2fs_${'a'.repeat(32)}`,
      expiresAtMs: Date.UTC(2026, 9, 1),
    });
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Noch einmal.'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    await waitTurnRetry();
    expect(screen.queryByTestId('dialogue-v2-freeform-unavailable')).toBeNull(); // лента не заменена экраном ошибки
    const initial = mockTurn.mock.calls[0][0];
    await act(async () => { turnRetry()!.onRetry(); });
    await waitFor(() => expect(mockTurn).toHaveBeenCalledTimes(2));
    expect(mockTurn.mock.calls[1][0]).toEqual(initial);
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/provider detail/i)).toBeNull();
  });

  it('shows the same neutral retry state when client turn-ID generation fails', async () => {
    mockCrypto.getRandomBytesAsync.mockRejectedValueOnce(new Error('native entropy detail'));
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Hallo.'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    await waitTurnRetry();
    expect(screen.queryByText(/entropy detail/i)).toBeNull();
    expect(mockTurn).not.toHaveBeenCalled();
  });

  it('does not retry a failed prior-language turn against a newly started session', async () => {
    let rejectOldTurn!: (reason: Error) => void;
    mockStart
      .mockResolvedValueOnce({ ok: true, sessionId: `d2fs_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) })
      .mockResolvedValueOnce({ ok: true, sessionId: `d2fs_${'b'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) });
    mockTurn.mockImplementationOnce(() => new Promise((_, reject) => { rejectOldTurn = reject; }));
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Alte Nachricht.'); });
    void mockScreen.mock.calls.at(-1)[0].onSend();
    await waitFor(() => expect(mockTurn).toHaveBeenCalledTimes(1));

    mockUseStudyTarget.mockReturnValue({ studyTarget: 'en' });
    await screen.rerender(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ studyTarget: 'en' }));
    await act(async () => { rejectOldTurn(new Error('old failure')); });

    expect(screen.queryByLabelText('Повторить')).toBeNull();
    expect(turnRetry()).toBeNull();
    expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([]);
    expect(mockTurn).toHaveBeenCalledTimes(1);
  });

  it('ignores a delayed prior-language success after the target switches', async () => {
    let resolveOldTurn!: (value: unknown) => void;
    mockStart
      .mockResolvedValueOnce({ ok: true, sessionId: `d2fs_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) })
      .mockResolvedValueOnce({ ok: true, sessionId: `d2fs_${'b'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) });
    mockTurn.mockImplementationOnce(() => new Promise((resolve) => { resolveOldTurn = resolve; }));
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Alte Nachricht.'); });
    void mockScreen.mock.calls.at(-1)[0].onSend();
    await waitFor(() => expect(mockTurn).toHaveBeenCalledTimes(1));

    mockUseStudyTarget.mockReturnValue({ studyTarget: 'en' });
    await screen.rerender(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ studyTarget: 'en' }));
    await act(async () => { resolveOldTurn({
      ok: true, assistantMessage: 'Veraltete Antwort.', sessionId: `d2fs_${'a'.repeat(32)}`,
      expiresAtMs: Date.UTC(2026, 9, 1),
    }); });

    expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([]);
  });

  it('clears already-rendered messages when the language contour changes', async () => {
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Guten Tag!'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].messages).toHaveLength(2));

    mockUseStudyTarget.mockReturnValue({ studyTarget: 'en' });
    await screen.rerender(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ studyTarget: 'en' }));
    expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([]);
  });

  // 18.10 (владелец: экранов-ошибок нигде): старт не удался и после тихих повторов — без «Не удалось продолжить» + «Повторить»,
  // тихий уход в хаб Диалогов; новых стартов после ухода нет.
  it('returns to the dialogs hub after the start fails even after silent retries, without an error screen', async () => {
    failStartTimes(6);
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/ai_dialog_home'));
    expect(mockStart).toHaveBeenCalledTimes(6);
    expect(screen.queryByLabelText('Повторить')).toBeNull();
    expect(screen.queryByText('Не удалось продолжить разговор')).toBeNull();
  });

  it('rejects a 2048-code-unit four-byte draft before optimistic append or callable transport', async () => {
    const oversizedUtf8Draft = '😀'.repeat(1024);
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft(oversizedUtf8Draft); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    expect(mockTurn).not.toHaveBeenCalled();
    expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([]);
  });

  it.each([
    ['NFD text', 'Cafe\u0301'],
    ['CRLF text', 'Hallo\r\nnoch'],
  ])('does not optimistically append or transport non-canonical %s', async (_name, draft) => {
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); }); // экран открыт сразу (без загрузки); ждём ответ старта
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft(draft); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    expect(mockTurn).not.toHaveBeenCalled();
    expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([]);
  });
  it('shows the persona opening line in the very first frame, before the session starts', async () => {
    mockOpening.mockImplementation(() => 'Hallo! Worüber möchtest du heute sprechen?');
    mockStart.mockImplementation(() => new Promise(() => undefined));
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    expect(mockScreen.mock.calls[0][0].messages).toEqual([
      { id: 'assistant_opening', author: 'assistant', text: 'Hallo! Worüber möchtest du heute sprechen?' },
    ]);
    expect(mockOpening).toHaveBeenCalledWith('de');
  });
  // зачем (координатор 12.10, Optimistic UI свободного разговора): реплика до готовности сессии — пузырь и пустое поле сразу,
  // ход уходит один раз, когда сессия пришла; двойные тапы не шлют ход дважды и не создают вторую серверную сессию.
  it('queues a message sent before the session is ready: bubble and empty draft at once, one turn after start', async () => {
    let resolveStart!: (value: unknown) => void;
    mockStart.mockImplementationOnce(() => new Promise((resolve) => { resolveStart = resolve; }));
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Hallo zusammen'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    const queuedFrame = mockScreen.mock.calls.at(-1)[0];
    expect(queuedFrame.messages).toEqual([{ id: 'learner_1', author: 'learner', text: 'Hallo zusammen' }]);
    expect(queuedFrame.draft).toBe('');
    expect(queuedFrame.sending).toBe(true);
    expect(mockTurn).not.toHaveBeenCalled();
    await act(async () => { resolveStart({ ok: true, sessionId: `d2fs_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) }); });
    await waitFor(() => expect(mockTurn).toHaveBeenCalledTimes(1));
    expect(mockTurn.mock.calls[0][0]).toEqual(expect.objectContaining({ userMessage: 'Hallo zusammen' }));
    await waitFor(() => expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([
      { id: 'learner_1', author: 'learner', text: 'Hallo zusammen' },
      { id: 'assistant_2', author: 'assistant', text: 'Hallo! Woran möchtest du heute arbeiten?' },
    ]));
    expect(mockScreen.mock.calls.at(-1)[0].sending).toBe(false);
  });

  it('double tap before the session is ready queues one message and sends one turn', async () => {
    let resolveStart!: (value: unknown) => void;
    mockStart.mockImplementationOnce(() => new Promise((resolve) => { resolveStart = resolve; }));
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Erste'); });
    await act(async () => {
      const frame = mockScreen.mock.calls.at(-1)[0];
      await frame.onSend();
      await frame.onSend();
    });
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Zweite'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([{ id: 'learner_1', author: 'learner', text: 'Erste' }]);
    await act(async () => { resolveStart({ ok: true, sessionId: `d2fs_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) }); });
    await waitFor(() => expect(mockTurn).toHaveBeenCalledTimes(1));
    await act(async () => { await Promise.resolve(); });
    expect(mockTurn).toHaveBeenCalledTimes(1);
    expect(mockTurn.mock.calls[0][0]).toEqual(expect.objectContaining({ userMessage: 'Erste' }));
  });

  it('does not queue or show a non-canonical message before the session is ready', async () => {
    mockStart.mockImplementationOnce(() => new Promise(() => undefined));
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Café'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    expect(mockScreen.mock.calls.at(-1)[0].messages).toEqual([]);
    expect(mockScreen.mock.calls.at(-1)[0].sending).toBe(false);
    expect(mockTurn).not.toHaveBeenCalled();
  });

  it('double tap on Retry after a failed turn resends the pending turn once', async () => {
    let resolveRetry!: (value: unknown) => void;
    mockTurn
      .mockRejectedValueOnce(new Error('provider detail'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve; }));
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled()); await act(async () => { await Promise.resolve(); });
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Noch einmal.'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    await waitTurnRetry();
    const retry = turnRetry()!;
    await act(async () => {
      retry.onRetry();
      retry.onRetry();
    });
    expect(mockTurn).toHaveBeenCalledTimes(2);
    await act(async () => { resolveRetry({ ok: true, assistantMessage: 'Alles klar.', sessionId: `d2fs_${'a'.repeat(32)}`, expiresAtMs: Date.UTC(2026, 9, 1) }); });
    expect(mockTurn).toHaveBeenCalledTimes(2);
  });

  it('redirects to the hub exactly once after a failed start', async () => {
    failStartTimes(6, 'null');
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(6);
  });

  it('a failed start retries silently without the error panel and the chat keeps the queued message', async () => {
    failStartTimes(2);
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onChangeDraft('Hallo'); });
    await act(async () => { await mockScreen.mock.calls.at(-1)[0].onSend(); });
    await waitFor(() => expect(mockTurn).toHaveBeenCalledTimes(1));
    expect(mockStart).toHaveBeenCalledTimes(3);
    expect(screen.queryByLabelText('Повторить')).toBeNull();
    expect(mockTurn.mock.calls[0][0]).toEqual(expect.objectContaining({ userMessage: 'Hallo' }));
  });

  it('goes to the hub only after 1 start + 5 silent retries fail', async () => {
    failStartTimes(6);
    await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/ai_dialog_home'));
    expect(mockStart).toHaveBeenCalledTimes(6);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(mockStart).toHaveBeenCalledTimes(6);
  });

  it('drops a pending silent retry of the previous language after the language changes', async () => {
    mockRetryDelay = 60;
    mockStart.mockRejectedValueOnce(new Error('start failed'));
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ studyTarget: 'de' }));
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'es' });
    await screen.rerender(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ studyTarget: 'es' }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    expect(mockStart.mock.calls.map((call) => call[0].studyTarget)).toEqual(['de', 'es']);
    expect(screen.queryByLabelText('Повторить')).toBeNull();
  });

  it('cancels a pending silent retry when the screen unmounts', async () => {
    mockRetryDelay = 60;
    mockStart.mockRejectedValueOnce(new Error('start failed'));
    const screen = await render(h(DialogueV2FreeformRoute));
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    await act(async () => { await Promise.resolve(); });
    screen.unmount();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('energy contract: the Plus-only freeform route charges no energy; a future charge must come with the one-shot refund', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_freeform.tsx'), 'utf8');
    const charges = /useEnergy\(|energyOp|confirmActivityStart|spendMistakeEnergy/.test(source);
    if (charges) expect(source).toContain('createDialogueEnergySettler(');
    else expect(charges).toBe(false);
    expect(source).not.toMatch(/catch \{/);
  });
});
