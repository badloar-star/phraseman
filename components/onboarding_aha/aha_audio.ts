// Аудио-движок АХ-сцены: реплика собеседника, эталон целевой фразы, тихий
// ambient-луп места. Три плеера на сценарий, преloaded хуком useAudioPlayer.
// Дакинг ambient во время voice-плейбека; громкий playback-режим перед каждым
// play (после записи микрофона сессия могла остаться в playAndRecord).

import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { AHA_VOICE_HEAR, AHA_VOICE_SAY, AHA_AMBIENT } from './aha_assets';
import type { AhaScenarioId } from './aha_types';
import {
  acquireAudioActivity,
  type AudioActivityLease,
  whenAudioActivitySettled,
} from '../../modules/audio/audio_activity';
import { voicePlaybackPolicy } from '../../modules/audio/voice_playback_policy';
import {
  getSoundSettingsSnapshot,
  subscribeSoundSettings,
} from '../../modules/audio/sound_settings';

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
  } catch {
    // ignore
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
  const voiceLeaseRef = useRef<AudioActivityLease | null>(null);

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
    voiceLeaseRef.current?.release();
    voiceLeaseRef.current = null;
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
      const lease = acquireAudioActivity('spoken');
      voiceLeaseRef.current = lease;
      void whenAudioActivitySettled().finally(() => {
        if (
          activeEndRef.current?.player !== player
          || !voicePlaybackPolicy.canStart(voicePolicyToken)
        ) {
          lease.release();
          if (voiceLeaseRef.current === lease) voiceLeaseRef.current = null;
          return;
        }
        playFromStart(player);
      });
    },
    [duckAmbient, stopVoicePlayers],
  );

  const playHear = useCallback(
    (onEnd?: () => void) => playVoice(hearPlayer, onEnd),
    [hearPlayer, playVoice],
  );

  const playSay = useCallback(
    (onEnd?: () => void) => playVoice(sayPlayer, onEnd),
    [sayPlayer, playVoice],
  );

  const startAmbient = useCallback(() => {
    if (!getSoundSettingsSnapshot().effectsEnabled) return;
    safe(() => playFromStart(ambientPlayer));
  }, [ambientPlayer]);

  const stopAmbient = useCallback(() => {
    safe(() => ambientPlayer.pause());
  }, [ambientPlayer]);

  const stopAll = useCallback(() => {
    stopVoicePlayers(false);
    safe(() => ambientPlayer.pause());
  }, [ambientPlayer, stopVoicePlayers]);

  useEffect(() => voicePlaybackPolicy.registerStop(() => {
    stopVoicePlayers(true);
  }), [stopVoicePlayers]);

  useEffect(() => subscribeSoundSettings(() => {
    if (!getSoundSettingsSnapshot().effectsEnabled) safe(() => ambientPlayer.pause());
  }), [ambientPlayer]);

  // Один слушатель на плеер: реагируем на didJustFinish только для активного
  // прогона (сравниваем player по ссылке), возвращаем ambient на полную громкость.
  useEffect(() => {
    const handleStatus = (player: AudioPlayer) => (status: AudioStatus) => {
      if (!status.didJustFinish) return;
      const active = activeEndRef.current;
      unduckAmbient();
      if (active && active.player === player) {
        activeEndRef.current = null;
        voiceLeaseRef.current?.release();
        voiceLeaseRef.current = null;
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
      voiceLeaseRef.current?.release();
      voiceLeaseRef.current = null;
      safe(() => hearPlayer.pause());
      safe(() => sayPlayer.pause());
      safe(() => ambientPlayer.pause());
    };
  }, [hearPlayer, sayPlayer, ambientPlayer]);

  return { playHear, playSay, startAmbient, stopAmbient, stopAll };
}
