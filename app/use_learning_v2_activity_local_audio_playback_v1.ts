import { createAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

import {
  claimSpokenAudio,
  type SpokenAudioClaim,
  whenSpokenAudioReady,
} from "../modules/audio/audio_runtime_arbiter";
import { DebugLogger } from './debug-logger';

export type LearningV2ActivityLocalAudioPlayDispositionV1 =
  | "started"
  | "unavailable";

type AudioPlayerLike = ReturnType<typeof createAudioPlayer>;
type AudioSubscriptionLike = Readonly<{ remove(): void }>;

const LOCAL_FILE_RE =
  /^file:\/\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]{1,4096}\.mp3$/u;
const START_TIMEOUT_MS = 2_000;

export function useLearningV2ActivityLocalAudioPlaybackV1(input: {
  readonly active: boolean;
  readonly taskId: string | null;
}): Readonly<{
  play(fileUri: string): LearningV2ActivityLocalAudioPlayDispositionV1;
  stop(): void;
}> {
  const epochRef = useRef(0);
  const playerRef = useRef<AudioPlayerLike | null>(null);
  const subscriptionRef = useRef<AudioSubscriptionLike | null>(null);
  const claimRef = useRef<SpokenAudioClaim | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(input.active);
  activeRef.current = input.active;

  const dispose = useCallback((releaseClaim: boolean) => {
    epochRef.current += 1;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const subscription = subscriptionRef.current;
    subscriptionRef.current = null;
    try {
      subscription?.remove();
    } catch (e) {
      // Already detached by native teardown.
      DebugLogger.error('use_learning_v2_activity_local_audio_playback_v1:subscription', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    const player = playerRef.current;
    playerRef.current = null;
    try {
      player?.pause();
    } catch (e) {
      // Already released.
      DebugLogger.error('use_learning_v2_activity_local_audio_playback_v1:player', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    try {
      player?.remove();
    } catch (e) {
      // Already released.
      DebugLogger.error('use_learning_v2_activity_local_audio_playback_v1:player', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    const claim = claimRef.current;
    claimRef.current = null;
    if (releaseClaim) claim?.release();
  }, []);

  const stop = useCallback(() => dispose(true), [dispose]);

  const play = useCallback(
    (fileUri: string): LearningV2ActivityLocalAudioPlayDispositionV1 => {
      if (!activeRef.current || !LOCAL_FILE_RE.test(fileUri))
        return "unavailable";
      dispose(true);
      const epoch = epochRef.current;
      let player: AudioPlayerLike;
      try {
        player = createAudioPlayer(
          { uri: fileUri },
          {
            downloadFirst: false,
            keepAudioSessionActive: true,
            updateInterval: 100,
          },
        );
      } catch {
        return "unavailable";
      }
      playerRef.current = player;
      const claim = claimSpokenAudio(() => {
        if (epochRef.current !== epoch) return;
        dispose(false);
      });
      if (!claim) {
        dispose(false);
        return "unavailable";
      }
      claimRef.current = claim;
      let authorized = false;
      let started = false;
      const startIfReady = () => {
        if (
          started ||
          !authorized ||
          epochRef.current !== epoch ||
          !claim.isCurrent() ||
          !activeRef.current ||
          !player.currentStatus.isLoaded
        )
          return;
        started = true;
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        void player
          .seekTo(0)
          .then(() => {
            if (
              epochRef.current === epoch &&
              claim.isCurrent() &&
              activeRef.current
            )
              player.play();
          })
          .catch(() => {
            if (epochRef.current === epoch) dispose(true);
          });
      };
      try {
        subscriptionRef.current = player.addListener(
          "playbackStatusUpdate",
          (status) => {
            if (epochRef.current !== epoch) return;
            if (status.didJustFinish) {
              dispose(true);
              return;
            }
            startIfReady();
          },
        );
      } catch {
        dispose(true);
        return "unavailable";
      }
      timeoutRef.current = setTimeout(() => {
        if (epochRef.current === epoch && !started) dispose(true);
      }, START_TIMEOUT_MS);
      void whenSpokenAudioReady(claim)
        .then((ready) => {
          if (epochRef.current !== epoch || !ready) {
            if (epochRef.current === epoch) dispose(true);
            return;
          }
          authorized = true;
          startIfReady();
        })
        .catch(() => {
          if (epochRef.current === epoch) dispose(true);
        });
      return "started";
    },
    [dispose],
  );

  useEffect(() => {
    if (!input.active) stop();
  }, [input.active, stop]);
  useEffect(() => stop, [input.taskId, stop]);
  useEffect(() => stop, [stop]);

  return { play, stop };
}
