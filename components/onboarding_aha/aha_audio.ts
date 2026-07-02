// Аудио-движок АХ-сцены: реплика собеседника, эталон целевой фразы, тихий
// ambient-луп места. Три плеера на сценарий, преloaded хуком useAudioPlayer.
// Дакинг ambient во время voice-плейбека; громкий playback-режим перед каждым
// play (после записи микрофона сессия могла остаться в playAndRecord).

import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { LOUD_PLAYBACK_AUDIO_MODE } from '../../app/audio_playback_mode';
import { AHA_VOICE_HEAR, AHA_VOICE_SAY, AHA_AMBIENT } from './aha_assets';
import type { AhaScenarioId } from './aha_types';

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

/** Проиграть плеер сначала: восстановить громкий режим → перемотать → play. */
function playFromStart(player: AudioPlayer): void {
  void setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE)
    .catch(() => undefined)
    .finally(() => safe(() => {
      void player.seekTo(0);
      player.play();
    }));
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

  const playVoice = useCallback(
    (player: AudioPlayer, onEnd?: () => void) => {
      safe(() => { player.volume = 1; });
      activeEndRef.current = { player, onEnd };
      duckAmbient();
      playFromStart(player);
    },
    [duckAmbient],
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
    safe(() => playFromStart(ambientPlayer));
  }, [ambientPlayer]);

  const stopAmbient = useCallback(() => {
    safe(() => ambientPlayer.pause());
  }, [ambientPlayer]);

  const stopAll = useCallback(() => {
    activeEndRef.current = null;
    for (const player of [hearPlayer, sayPlayer, ambientPlayer]) {
      safe(() => player.pause());
    }
  }, [hearPlayer, sayPlayer, ambientPlayer]);

  // Один слушатель на плеер: реагируем на didJustFinish только для активного
  // прогона (сравниваем player по ссылке), возвращаем ambient на полную громкость.
  useEffect(() => {
    const handleStatus = (player: AudioPlayer) => (status: AudioStatus) => {
      if (!status.didJustFinish) return;
      const active = activeEndRef.current;
      unduckAmbient();
      if (active && active.player === player) {
        activeEndRef.current = null;
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
      safe(() => hearPlayer.pause());
      safe(() => sayPlayer.pause());
      safe(() => ambientPlayer.pause());
    };
  }, [hearPlayer, sayPlayer, ambientPlayer]);

  return { playHear, playSay, startAmbient, stopAmbient, stopAll };
}
