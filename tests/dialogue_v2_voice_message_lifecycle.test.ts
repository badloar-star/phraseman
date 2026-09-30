/* eslint-disable import/first */
import { act, cleanup, renderHook } from '@testing-library/react-native';

type Listener = (payload?: any) => void;

let mockRuntimeActive = true;
const mockLifecycle: string[] = [];
const mockListeners = new Map<string, Listener[]>();
const mockDeletedUris: string[] = [];
const mockPlayer = {
  play: jest.fn(() => { mockLifecycle.push('play'); }),
  pause: jest.fn(() => { mockLifecycle.push('pause'); }),
  release: jest.fn(() => { mockLifecycle.push('release-player'); }),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
const mockSpeech = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addListener: jest.fn((event: string, listener: Listener) => {
    const listeners = mockListeners.get(event) ?? [];
    listeners.push(listener);
    mockListeners.set(event, listeners);
    return { remove: jest.fn() };
  }),
};
const mockRecordingClaim = { isCurrent: jest.fn(() => true), release: jest.fn() };
const mockSpokenClaim = { isCurrent: jest.fn(() => true), release: jest.fn() };

jest.mock('react-native', () => ({ Platform: { OS: 'ios', Version: 18 } }));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(() => mockPlayer) }));
jest.mock('expo-file-system', () => ({
  File: class MockFile {
    readonly exists = true;
    constructor(private readonly uri: string) {}
    delete() {
      mockLifecycle.push(`delete:${this.uri}`);
      mockDeletedUris.push(this.uri);
    }
  },
}));
jest.mock('../hooks/use_runtime_active', () => ({
  useRuntimeActive: () => mockRuntimeActive,
}));
jest.mock('../app/speech_recognition_module', () => ({
  isSpeechRecognitionAvailable: () => true,
  loadSpeechRecognitionModule: () => mockSpeech,
  readSpeechRecognitionLocaleInventory: jest.fn(async () => ({ serviceId: 'ios-system', locales: [] })),
  requestSpeechPermissionForHold: jest.fn(async () => 'granted'),
}));
jest.mock('../app/dialogue_voice_capability', () => ({
  resolveDialogueAsrCapability: () => ({ available: true, locale: 'de-DE', reason: null }),
}));
jest.mock('../app/speaking_recognition_options', () => ({
  buildSpeakingStartOptions: (input: unknown) => input,
}));
jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimRecordingAudio: jest.fn(() => mockRecordingClaim),
  whenRecordingAudioReady: jest.fn(async () => true),
  claimSpokenAudio: jest.fn(() => mockSpokenClaim),
  whenSpokenAudioReady: jest.fn(async () => true),
}));

import { useDialogueV2VoiceMessage } from '../hooks/use_dialogue_v2_voice_message';

function latestListener(event: string): Listener {
  const listeners = mockListeners.get(event) ?? [];
  const listener = listeners[listeners.length - 1];
  if (!listener) throw new Error(`Missing ${event} listener`);
  return listener;
}

async function beginCapture(
  hook: Awaited<ReturnType<typeof renderHook<ReturnType<typeof useDialogueV2VoiceMessage>, unknown>>>,
): Promise<void> {
  await act(async () => {
    await hook.result.current.start();
    latestListener('start')();
  });
}

async function finishCapture(
  hook: Awaited<ReturnType<typeof renderHook<ReturnType<typeof useDialogueV2VoiceMessage>, unknown>>>,
  uri: string,
  transcript = 'Guten Tag!',
): Promise<void> {
  await act(async () => {
    latestListener('result')({ results: [{ transcript }] });
    latestListener('audioend')({ uri });
    latestListener('end')();
  });
  expect(hook.result.current.voiceDraft).toEqual({ uri, transcript });
}

describe('useDialogueV2VoiceMessage lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRuntimeActive = true;
    mockLifecycle.length = 0;
    mockDeletedUris.length = 0;
    mockListeners.clear();
    mockRecordingClaim.isCurrent.mockReturnValue(true);
    mockSpokenClaim.isCurrent.mockReturnValue(true);
  });

  afterEach(async () => {
    await cleanup();
  });

  test('background stops playback before deleting a sent local voice recording', async () => {
    const hook = await renderHook(() => useDialogueV2VoiceMessage({
      studyTarget: 'de',
      promptText: 'Begrüßung',
      onTranscript: jest.fn(),
    }));
    const uri = 'file:///cache/dialogue-v2-sent.wav';
    await beginCapture(hook);
    await finishCapture(hook, uri);

    let attachment: ReturnType<typeof hook.result.current.takeVoiceAttachment> = null;
    await act(async () => {
      attachment = hook.result.current.takeVoiceAttachment('Guten Tag!');
      hook.result.current.play(uri);
      await Promise.resolve();
    });
    expect(attachment).toEqual({ uri, transcript: 'Guten Tag!' });
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);

    mockRuntimeActive = false;
    await hook.rerender({});

    expect(mockDeletedUris).toContain(uri);
    expect(mockLifecycle.indexOf('pause')).toBeGreaterThanOrEqual(0);
    expect(mockLifecycle.indexOf('pause')).toBeLessThan(mockLifecycle.indexOf(`delete:${uri}`));
    expect(hook.result.current.playingVoiceUri).toBeNull();
  });

  test('unmount deletes an unsent draft recording', async () => {
    const hook = await renderHook(() => useDialogueV2VoiceMessage({
      studyTarget: 'de',
      promptText: 'Begrüßung',
      onTranscript: jest.fn(),
    }));
    const uri = 'file:///cache/dialogue-v2-draft.wav';
    await beginCapture(hook);
    await finishCapture(hook, uri);

    await hook.unmount();

    expect(mockDeletedUris).toContain(uri);
  });

  test('taking while capture is active aborts it and deletes a late audioend URI without attaching it', async () => {
    const onTranscript = jest.fn();
    const hook = await renderHook(() => useDialogueV2VoiceMessage({
      studyTarget: 'de',
      promptText: 'Begrüßung',
      onTranscript,
    }));
    await beginCapture(hook);
    const lateAudioEnd = latestListener('audioend');
    await act(async () => {
      latestListener('result')({ results: [{ transcript: 'Guten Tag!' }] });
    });

    let attachment: ReturnType<typeof hook.result.current.takeVoiceAttachment> = null;
    await act(async () => {
      attachment = hook.result.current.takeVoiceAttachment('Guten Tag!');
      lateAudioEnd({ uri: 'file:///cache/dialogue-v2-late.wav' });
    });

    expect(mockSpeech.abort).toHaveBeenCalled();
    expect(attachment).toBeNull();
    expect(hook.result.current.voiceDraft).toBeNull();
    expect(mockDeletedUris).toContain('file:///cache/dialogue-v2-late.wav');
    expect(onTranscript).toHaveBeenCalledWith('Guten Tag!');
  });
});
