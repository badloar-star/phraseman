/* eslint-disable import/first */
import { act, cleanup, renderHook } from '@testing-library/react-native';

let runtimeActive = true;
let completionListener: ((event: { didJustFinish?: boolean }) => void) | null = null;
const player = {
  play: jest.fn(),
  pause: jest.fn(),
  release: jest.fn(),
  addListener: jest.fn((_event: string, listener: (event: { didJustFinish?: boolean }) => void) => {
    completionListener = listener;
    return { remove: jest.fn() };
  }),
};
const spokenClaim = { isCurrent: jest.fn(() => true), release: jest.fn() };

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(() => player) }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => runtimeActive }));
jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimSpokenAudio: jest.fn(() => spokenClaim),
  whenSpokenAudioReady: jest.fn(async () => true),
}));

import { createAudioPlayer } from 'expo-audio';
import {
  useDialogueV2FreeformPreparedBotVoicePlayback,
} from '../hooks/use_dialogue_v2_freeform_prepared_bot_voice_playback';

const callerControlledUri = Object.freeze([Object.freeze({
  messageId: 'assistant_2',
  localUri: 'file:///app/dialogue-v2/freeform-milestone-en-01.m4a',
})]);

describe('Freeform prepared bot voice playback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runtimeActive = true;
    completionListener = null;
    spokenClaim.isCurrent.mockReturnValue(true);
  });

  afterEach(async () => { await cleanup(); });

  it('does not autoplay or accept a caller-provided URI without a registry-issued capability', async () => {
    const hook = await renderHook(() => useDialogueV2FreeformPreparedBotVoicePlayback({
      assets: callerControlledUri as never,
    }));
    expect(createAudioPlayer).not.toHaveBeenCalled();

    await act(async () => {
      hook.result.current.play('assistant_2');
      await Promise.resolve();
    });
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  it('rejects remote URIs and releases native playback on completion and unmount', async () => {
    const remote = await renderHook(() => useDialogueV2FreeformPreparedBotVoicePlayback({
      assets: [{ messageId: 'assistant_2', localUri: 'https://cdn.example/voice.m4a' }] as never,
    }));
    await act(async () => {
      remote.result.current.play('assistant_2');
      await Promise.resolve();
    });
    expect(createAudioPlayer).not.toHaveBeenCalled();
    await remote.unmount();

    const hook = await renderHook(() => useDialogueV2FreeformPreparedBotVoicePlayback({ assets: callerControlledUri as never }));
    await act(async () => {
      hook.result.current.play('assistant_2');
      await Promise.resolve();
      completionListener?.({ didJustFinish: true });
    });
    expect(player.pause).not.toHaveBeenCalled();
    expect(player.release).not.toHaveBeenCalled();
    await hook.unmount();
    expect(player.release).not.toHaveBeenCalled();
  });
});
