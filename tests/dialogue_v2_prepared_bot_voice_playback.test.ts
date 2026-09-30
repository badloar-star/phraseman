/* eslint-disable import/first */
import { act, cleanup, renderHook } from '@testing-library/react-native';

let mockRuntimeActive = true;
let mockStatusListener: ((event: { didJustFinish?: boolean }) => void) | null = null;
const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  release: jest.fn(),
  addListener: jest.fn((_event: string, listener: (event: { didJustFinish?: boolean }) => void) => {
    mockStatusListener = listener;
    return { remove: jest.fn() };
  }),
};
const mockSpokenClaim = { isCurrent: jest.fn(() => true), release: jest.fn() };

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(() => mockPlayer) }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => mockRuntimeActive }));
jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimSpokenAudio: jest.fn(() => mockSpokenClaim),
  whenSpokenAudioReady: jest.fn(async () => true),
}));

import { createAudioPlayer } from 'expo-audio';
import { useDialogueV2PreparedBotVoicePlayback } from '../hooks/use_dialogue_v2_prepared_bot_voice_playback';

const allowed = Object.freeze([Object.freeze({
  messageId: 'persona_2',
  localUri: 'file:///app/dialogue-v2/social-01-host.m4a',
})]);

describe('useDialogueV2PreparedBotVoicePlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRuntimeActive = true;
    mockStatusListener = null;
    mockSpokenClaim.isCurrent.mockReturnValue(true);
  });

  afterEach(async () => { await cleanup(); });

  it('plays only a message already authorized into the current local allowlist', async () => {
    const hook = await renderHook(() => useDialogueV2PreparedBotVoicePlayback({ assets: allowed }));
    await act(async () => {
      hook.result.current.play('unknown_message');
      await Promise.resolve();
    });
    expect(createAudioPlayer).not.toHaveBeenCalled();

    await act(async () => {
      hook.result.current.play('persona_2');
      await Promise.resolve();
    });
    expect(createAudioPlayer).toHaveBeenCalledWith(allowed[0].localUri);
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(hook.result.current.playingMessageId).toBe('persona_2');
  });

  it('rejects non-local entries even if a caller puts one in the allowlist', async () => {
    const hook = await renderHook(() => useDialogueV2PreparedBotVoicePlayback({
      assets: [{ messageId: 'persona_2', localUri: 'https://cdn.test/voice.m4a' }],
    }));
    await act(async () => {
      hook.result.current.play('persona_2');
      await Promise.resolve();
    });
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it('stops and releases playback on completion, background and unmount without deleting bundled audio', async () => {
    const hook = await renderHook(() => useDialogueV2PreparedBotVoicePlayback({ assets: allowed }));
    await act(async () => {
      hook.result.current.play('persona_2');
      await Promise.resolve();
      mockStatusListener?.({ didJustFinish: true });
    });
    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(mockPlayer.release).toHaveBeenCalled();
    expect(hook.result.current.playingMessageId).toBeNull();

    mockRuntimeActive = false;
    await hook.rerender({});
    await hook.unmount();
    expect(mockPlayer.release).toHaveBeenCalledTimes(1);
  });
});
