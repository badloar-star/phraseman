import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  claimSpokenAudio,
  whenSpokenAudioReady,
  type SpokenAudioClaim,
} from '../modules/audio/audio_runtime_arbiter';
import { useRuntimeActive } from './use_runtime_active';
import { noteSwallowed } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type DialogueV2PreparedBotVoicePlaybackAsset = Readonly<{
  messageId: string;
  localUri: string;
}>;

export type UseDialogueV2PreparedBotVoicePlaybackInput = Readonly<{
  assets: readonly DialogueV2PreparedBotVoicePlaybackAsset[];
}>;

type Removable = Readonly<{ remove?: () => void }>;

function buildLocalAllowlist(
  assets: readonly DialogueV2PreparedBotVoicePlaybackAsset[],
): ReadonlyMap<string, string> {
  const counts = new Map<string, number>();
  for (const asset of assets) counts.set(asset.messageId, (counts.get(asset.messageId) ?? 0) + 1);
  const allowlist = new Map<string, string>();
  for (const asset of assets) {
    if (counts.get(asset.messageId) !== 1 || !asset.localUri.startsWith('file://')) continue;
    allowlist.set(asset.messageId, asset.localUri);
  }
  return allowlist;
}

/** Plays only already-resolved build-local bot audio owned by a rendered message. */
export function useDialogueV2PreparedBotVoicePlayback({
  assets,
}: UseDialogueV2PreparedBotVoicePlaybackInput) {
  const runtimeActive = useRuntimeActive();
  const runtimeActiveRef = useRef(runtimeActive);
  runtimeActiveRef.current = runtimeActive;
  const mountedRef = useRef(true);
  const playerRef = useRef<AudioPlayer | null>(null);
  const claimRef = useRef<SpokenAudioClaim | null>(null);
  const listenerRef = useRef<Removable | null>(null);
  const playbackGenerationRef = useRef(0);
  const playingMessageIdRef = useRef<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const allowlist = useMemo(() => buildLocalAllowlist(assets), [assets]);
  const allowlistRef = useRef(allowlist);
  allowlistRef.current = allowlist;

  const stop = useCallback(() => {
    playbackGenerationRef.current += 1;
    listenerRef.current?.remove?.();
    listenerRef.current = null;
    claimRef.current?.release();
    claimRef.current = null;
    const player = playerRef.current;
    playerRef.current = null;
    try { player?.pause(); } catch (swallowedError) { /* native player is already stopped */ noteSwallowed('use_dialogue_v2_prepared_bot_voice_playback:catch_1', swallowedError); }
    try { player?.release(); } catch (swallowedError) { /* native player is already released */ noteSwallowed('use_dialogue_v2_prepared_bot_voice_playback:catch_2', swallowedError); }
    playingMessageIdRef.current = null;
    if (mountedRef.current) setPlayingMessageId(null);
  }, []);

  const play = useCallback((messageId: string) => {
    const localUri = allowlistRef.current.get(messageId);
    if (!localUri || !runtimeActiveRef.current) return;
    if (playingMessageIdRef.current === messageId) {
      stop();
      return;
    }
    stop();
    const playbackGeneration = playbackGenerationRef.current;
    let claim: SpokenAudioClaim | null = null;
    claim = claimSpokenAudio(() => {
      if (claimRef.current === claim) stop();
    }, 'dialogue-v2:prepared-bot-voice');
    if (!claim) return;
    claimRef.current = claim;
    void whenSpokenAudioReady(claim).then((ready) => {
      if (!ready || !claim?.isCurrent() || !mountedRef.current || !runtimeActiveRef.current
        || playbackGeneration !== playbackGenerationRef.current
        || allowlistRef.current.get(messageId) !== localUri) {
        claim?.release();
        if (claimRef.current === claim) claimRef.current = null;
        return;
      }
      let player: AudioPlayer;
      try {
        player = createAudioPlayer(localUri);
      } catch {
        stop();
        return;
      }
      if (!claim.isCurrent() || playbackGeneration !== playbackGenerationRef.current) {
        try { player.release(); } catch (swallowedError) { /* player never became active */ noteSwallowed('use_dialogue_v2_prepared_bot_voice_playback:catch_3', swallowedError); }
        return;
      }
      playerRef.current = player;
      playingMessageIdRef.current = messageId;
      if (mountedRef.current) setPlayingMessageId(messageId);
      listenerRef.current = player.addListener('playbackStatusUpdate', (event) => {
        if (playerRef.current === player
          && playbackGeneration === playbackGenerationRef.current
          && event.didJustFinish) stop();
      });
      try { player.play(); } catch { stop(); }
    });
  }, [stop]);

  useEffect(() => {
    const current = playingMessageIdRef.current;
    if (current && !allowlist.has(current)) stop();
  }, [allowlist, stop]);

  useEffect(() => {
    if (!runtimeActive) stop();
  }, [runtimeActive, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  return Object.freeze({ playingMessageId, play, stop });
}

export default useDialogueV2PreparedBotVoicePlayback;
