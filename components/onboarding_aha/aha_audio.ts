// Аудио-движок АХ-сцены: реплика собеседника, эталон целевой фразы, тихий
// ambient-луп места. Три плеера на сценарий, преloaded хуком useAudioPlayer.
// Дакинг ambient во время voice-плейбека; громкий playback-режим перед каждым
// play (после записи микрофона сессия могла остаться в playAndRecord).

import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { AHA_VOICE_HEAR, AHA_VOICE_SAY, AHA_AMBIENT } from './aha_assets';
import type { AhaScenarioId } from './aha_types';
import {
  claimAmbientAudio,
  claimSpokenAudio,
  type AmbientAudioClaim,
  type SpokenAudioClaim,
  whenSpokenAudioReady,
} from '../../modules/audio/audio_runtime_arbiter';
import { voicePlaybackPolicy } from '../../modules/audio/voice_playback_policy';
import {
  getSoundSettingsSnapshot,
  subscribeSoundSettings,
} from '../../modules/audio/sound_settings';
import { DebugLogger } from '../../app/debug-logger';

const AMBIENT_VOLUME = 0.5;
const AMBIENT_DUCKED_VOLUME = 0.25;

export interface UseAhaSceneAudio {
  playHear: (onEnd?: () => void) => void;
  playSay: (onEnd?: () => void) => void;
  startAmbient: () => void;
  stopAmbient: () => void;
  stopAll: () => void;
}

/** Best-effort вызов: звук не должен уметь ломать сцену. */
function safe(fn: () => void): void {
  try {
    fn();
  } catch (e) {
      // ignore
      DebugLogger.error('aha_audio:safe', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

function playFromStart(player: AudioPlayer): void {
  safe(() => {
    void player.seekTo(0);
    player.play();
  });
}

/** Хук аудио-движка одного сценария: 3 преloaded плеера + дакинг ambient. */
export function useAhaSceneAudio(scenarioId: AhaScenarioId): UseAhaSceneAudio {
  const hearPlayer = useAudioPlayer(AHA_VOICE_HEAR[scenarioId]);
  const sayPlayer = useAudioPlayer(AHA_VOICE_SAY[scenarioId]);
  const ambientPlayer = useAudioPlayer(AHA_AMBIENT[scenarioId]);

  // Текущий колбэк onEnd для voice-плеера, который сейчас слушаем (один активный
  // прогон за раз — второй play() того же или другого voice-плеера просто
  // переустанавливает ref, старый onEnd больше не сработает).
  const activeEndRef = useRef<{ player: AudioPlayer; onEnd?: () => void } | null>(null);
  const voiceClaimRef = useRef<SpokenAudioClaim | null>(null);
  const ambientClaimRef = useRef<AmbientAudioClaim | null>(null);

  useEffect(() => {
    safe(() => {
      ambientPlayer.loop = true;
      ambientPlayer.volume = AMBIENT_VOLUME;
    });
  }, [ambientPlayer]);

  const duckAmbient = useCallback(() => {
    safe(() => { ambientPlayer.volume = AMBIENT_DUCKED_VOLUME; });
  }, [ambientPlayer]);

  const unduckAmbient = useCallback(() => {
    safe(() => { ambientPlayer.volume = AMBIENT_VOLUME; });
  }, [ambientPlayer]);

  const stopVoicePlayers = useCallback((completeCurrent: boolean) => {
    const active = activeEndRef.current;
    activeEndRef.current = null;
    safe(() => hearPlayer.pause());
    safe(() => sayPlayer.pause());
    voiceClaimRef.current?.release();
    voiceClaimRef.current = null;
    unduckAmbient();
    if (completeCurrent) active?.onEnd?.();
  }, [hearPlayer, sayPlayer, unduckAmbient]);

  const playVoice = useCallback(
    (player: AudioPlayer, onEnd?: () => void) => {
      const voicePolicyToken = voicePlaybackPolicy.captureStart();
      if (voicePolicyToken === null) {
        onEnd?.();
        return;
      }
      stopVoicePlayers(false);
      safe(() => { player.volume = 1; });
      activeEndRef.current = { player, onEnd };
      duckAmbient();
      const claim = claimSpokenAudio(() => stopVoicePlayers(true));
      if (!claim) {
        activeEndRef.current = null;
        unduckAmbient();
        onEnd?.();
        return;
      }
      voiceClaimRef.current = claim;
      void whenSpokenAudioReady(claim).then((audioReady) => {
        if (
          !audioReady
          || !claim.isCurrent()
          || activeEndRef.current?.player !== player
          || !voicePlaybackPolicy.canStart(voicePolicyToken)
        ) {
          if (voiceClaimRef.current === claim && activeEndRef.current?.player === player) {
            stopVoicePlayers(true);
          } else {
            claim.release();
          }
          return;
        }
        playFromStart(player);
      });
    },
    [duckAmbient, stopVoicePlayers, unduckAmbient],
  );

  const playHear = useCallback(
    (onEnd?: () => void) => playVoice(hearPlayer, onEnd),
    [hearPlayer, playVoice],
  );

  const playSay = useCallback(
    (onEnd?: () => void) => playVoice(sayPlayer, onEnd),
    [sayPlayer, playVoice],
  );

  const stopAmbient = useCallback(() => {
    ambientClaimRef.current?.release();
    ambientClaimRef.current = null;
    safe(() => ambientPlayer.pause());
  }, [ambientPlayer]);

  const startAmbient = useCallback(() => {
    if (!getSoundSettingsSnapshot().effectsEnabled) return;
    let claim: AmbientAudioClaim | null = null;
    claim = claimAmbientAudio(() => {
      safe(() => ambientPlayer.pause());
      if (ambientClaimRef.current === claim) ambientClaimRef.current = null;
    });
    if (!claim) return;
    ambientClaimRef.current = claim;
    safe(() => playFromStart(ambientPlayer));
  }, [ambientPlayer]);

  const stopAll = useCallback(() => {
    stopVoicePlayers(false);
    stopAmbient();
  }, [stopAmbient, stopVoicePlayers]);

  useEffect(() => voicePlaybackPolicy.registerStop(() => {
    stopVoicePlayers(true);
  }), [stopVoicePlayers]);

  useEffect(() => subscribeSoundSettings(() => {
    if (!getSoundSettingsSnapshot().effectsEnabled) stopAmbient();
  }), [stopAmbient]);

  // Один слушатель на плеер: реагируем на didJustFinish только для активного
  // прогона (сравниваем player по ссылке), возвращаем ambient на полную громкость.
  useEffect(() => {
    const handleStatus = (player: AudioPlayer) => (status: AudioStatus) => {
      if (!status.didJustFinish) return;
      const active = activeEndRef.current;
      unduckAmbient();
      if (active && active.player === player) {
        activeEndRef.current = null;
        voiceClaimRef.current?.release();
        voiceClaimRef.current = null;
        active.onEnd?.();
      }
    };
    const hearSub = hearPlayer.addListener('playbackStatusUpdate', handleStatus(hearPlayer));
    const saySub = sayPlayer.addListener('playbackStatusUpdate', handleStatus(sayPlayer));
    return () => {
      safe(() => hearSub.remove());
      safe(() => saySub.remove());
    };
  }, [hearPlayer, sayPlayer, unduckAmbient]);

  // Cleanup при unmount: useAudioPlayer сам освобождает плееры при размонтировании
  // компонента (SharedObject release из хука), поэтому здесь только останавливаем
  // воспроизведение — без ручного remove(), чтобы не гонять с автоматикой хука.
  useEffect(() => {
    return () => {
      activeEndRef.current = null;
      voiceClaimRef.current?.release();
      voiceClaimRef.current = null;
      ambientClaimRef.current?.release();
      ambientClaimRef.current = null;
      safe(() => hearPlayer.pause());
      safe(() => sayPlayer.pause());
      safe(() => ambientPlayer.pause());
    };
  }, [hearPlayer, sayPlayer, ambientPlayer]);

  return { playHear, playSay, startAmbient, stopAmbient, stopAll };
}
