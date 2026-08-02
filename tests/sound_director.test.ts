jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

import { ExpoSfxBackend, type SfxPlayerLike } from '@/modules/audio/expo_sfx_backend';
import { SoundArbiter } from '@/modules/audio/sound_arbiter';
import type { SoundClock } from '@/modules/audio/sound_clock';
import { SoundDirector, type SfxPlaybackBackend } from '@/modules/audio/sound_director';

class FakeClock implements SoundClock {
  nowMs = 0;
  now = () => this.nowMs;
}

class FakeBackend implements SfxPlaybackBackend {
  plays: Array<{ eventId: string; volume: number }> = [];
  stopCount = 0;
  disposeCount = 0;
  onEnded: (() => void) | null = null;

  play(eventId: any, _source: number, volume: number, onEnded: () => void) {
    this.plays.push({ eventId, volume });
    this.onEnded = onEnded;
    return true;
  }
  stop() { this.stopCount += 1; this.onEnded = null; }
  dispose() { this.disposeCount += 1; }
}

function makePlayer(): SfxPlayerLike & { emitEnded: () => void; calls: string[] } {
  const calls: string[] = [];
  let listener: ((status: { didJustFinish?: boolean }) => void) | null = null;
  return {
    volume: 1,
    play: () => calls.push('play'),
    pause: () => calls.push('pause'),
    seekTo: () => { calls.push('seek'); },
    remove: () => calls.push('remove'),
    addListener: (_event, callback) => {
      listener = callback;
      return { remove: () => { listener = null; } };
    },
    emitEnded: () => listener?.({ didJustFinish: true }),
    calls,
  };
}

describe('SoundDirector', () => {
  test('plays manifest volume and preempts through one backend owner', () => {
    const backend = new FakeBackend();
    const director = new SoundDirector(backend, new SoundArbiter(new FakeClock()));

    expect(director.request('pm.system.info').kind).toBe('play');
    expect(backend.plays).toEqual([{ eventId: 'pm.system.info', volume: 0.28 }]);
    expect(director.request('pm.system.error_recoverable')).toMatchObject({ kind: 'play', preempt: true });
    expect(backend.stopCount).toBe(1);
    expect(backend.plays.at(-1)).toEqual({ eventId: 'pm.system.error_recoverable', volume: 0.3 });
  });

  test('disabling effects immediately stops native playback and blocks new starts', () => {
    const backend = new FakeBackend();
    const director = new SoundDirector(backend, new SoundArbiter(new FakeClock()));
    director.request('pm.learn.correct');

    director.setEffectsEnabled(false);

    expect(backend.stopCount).toBe(1);
    expect(director.request('pm.system.warning')).toEqual({ kind: 'drop', reason: 'disabled' });
  });

  test('voice and recording activity stop active SFX', () => {
    const backend = new FakeBackend();
    const director = new SoundDirector(backend, new SoundArbiter(new FakeClock()));
    director.request('pm.learn.correct');
    director.setVoiceActive(true);
    expect(backend.stopCount).toBe(1);
    director.setVoiceActive(false);
    director.setRecordingActive(true);
    expect(backend.stopCount).toBe(2);
  });
});

describe('ExpoSfxBackend', () => {
  test('keeps one active player, reuses entries, and evicts beyond the LRU cap', () => {
    const made: SfxPlayerLike[] = [];
    const backend = new ExpoSfxBackend((source) => {
      const player = makePlayer();
      made.push(player);
      return player;
    }, 2);

    backend.play('pm.system.info', 1, 0.28, jest.fn());
    backend.play('pm.system.success', 2, 0.34, jest.fn());
    backend.play('pm.system.warning', 3, 0.34, jest.fn());

    expect(backend.getCacheSize()).toBe(2);
    expect(made).toHaveLength(3);
    expect((made[0] as ReturnType<typeof makePlayer>).calls).toContain('remove');
    expect((made[1] as ReturnType<typeof makePlayer>).calls).toContain('pause');
  });

  test('finishes playback, applies volume, and contains native creation failure', () => {
    const player = makePlayer();
    const ended = jest.fn();
    const backend = new ExpoSfxBackend(() => player, 2);

    expect(backend.play('pm.learn.correct', 1, 0.42, ended)).toBe(true);
    expect(player.volume).toBe(0.42);
    player.emitEnded();
    expect(ended).toHaveBeenCalledTimes(1);

    const broken = new ExpoSfxBackend(() => { throw new Error('native'); }, 2);
    expect(broken.play('pm.learn.correct', 1, 0.42, ended)).toBe(false);
  });

  // зачем: боевой баг «звук нигде не играет». На Android ExoPlayer после
  // createAudioPlayer какое-то время декодирует файл, и ранний play() уходит в
  // никуда БЕЗ ошибки — первый запрос каждого звука был немым, а catch в
  // бэкенде это молчание скрывал. Тот же класс бага уже разобран в
  // hooks/phrase_audio_player.ts. Здесь плеер обязан доиграть после загрузки.
  test('retries playback once when the native player was still loading', () => {
    type Status = { didJustFinish?: boolean; isLoaded?: boolean; playing?: boolean };
    const calls: string[] = [];
    const listeners: ((status: Status) => void)[] = [];
    const emit = (status: Status) => listeners.forEach((l) => l(status));
    const player: SfxPlayerLike = {
      volume: 1,
      play: () => calls.push('play'),
      pause: () => calls.push('pause'),
      seekTo: () => { calls.push('seek'); },
      remove: () => calls.push('remove'),
      addListener: (_event, callback) => {
        listeners.push(callback);
        return { remove: () => { listeners.length = 0; } };
      },
    };

    const backend = new ExpoSfxBackend(() => player, 2);
    const ended = jest.fn();
    expect(backend.play('pm.learn.correct', 1, 0.42, ended)).toBe(true);
    expect(calls.filter((c) => c === 'play')).toHaveLength(1);

    // Плеер догрузился, но не поехал — ранний play() пропал.
    emit({ isLoaded: true, playing: false });
    expect(calls.filter((c) => c === 'play')).toHaveLength(2);

    // Повтор ровно один: дальше плеер уже играет, дёргать его нельзя.
    emit({ isLoaded: true, playing: false });
    expect(calls.filter((c) => c === 'play')).toHaveLength(2);

    // Завершение по-прежнему освобождает слот арбитра.
    emit({ didJustFinish: true });
    expect(ended).toHaveBeenCalledTimes(1);
  });
});
