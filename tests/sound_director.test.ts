jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

import { ExpoSfxBackend, type SfxPlayerLike } from '@/modules/audio/expo_sfx_backend';
import { SoundArbiter } from '@/modules/audio/sound_arbiter';
import type { SoundClock } from '@/modules/audio/sound_clock';
import { SoundDirector, type SfxPlaybackBackend } from '@/modules/audio/sound_director';

class FakeClock implements SoundClock {
  nowMs = 0;
  now = () => this.nowMs;
  advance(ms: number) { this.nowMs += ms; }
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

function makePlayer(): SfxPlayerLike & { emitPlaying: () => void; emitEnded: () => void; calls: string[] } {
  const calls: string[] = [];
  let listener: ((status: { didJustFinish?: boolean; playing?: boolean }) => void) | null = null;
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
    // зачем: honest playback always reports `playing:true` before it ends —
    // this is the real-world sequence, distinct from the replay-race guard
    // covered in the dedicated test below.
    emitPlaying: () => listener?.({ playing: true }),
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

  test('cancels only an active completion sound and frees the arbiter slot', () => {
    const backend = new FakeBackend();
    const director = new SoundDirector(backend, new SoundArbiter(new FakeClock()));

    director.request('pm.complete.xp_counter_tick');
    expect(director.stopActiveCompletion()).toBe(true);
    expect(backend.stopCount).toBe(1);
    expect(director.request('pm.system.info')).toMatchObject({ kind: 'play', preempt: false });

    const nonCompletionBackend = new FakeBackend();
    const nonCompletionDirector = new SoundDirector(
      nonCompletionBackend,
      new SoundArbiter(new FakeClock()),
    );
    nonCompletionDirector.request('pm.system.warning');
    expect(nonCompletionDirector.stopActiveCompletion()).toBe(false);
    expect(nonCompletionBackend.stopCount).toBe(0);
  });

  test('cancels the spin plaque sound only for its exact presentation scope', () => {
    const backend = new FakeBackend();
    const director = new SoundDirector(backend, new SoundArbiter(new FakeClock()));

    director.request('pm.reward.small', { scope: 'foreign-spin' });
    expect(director.stopActiveEvent('pm.reward.small', 'results-sequence-spin')).toBe(false);
    expect(backend.stopCount).toBe(0);

    const resultsBackend = new FakeBackend();
    const resultsDirector = new SoundDirector(resultsBackend, new SoundArbiter(new FakeClock()));
    resultsDirector.request('pm.reward.small', { scope: 'results-sequence-spin' });
    expect(resultsDirector.stopActiveEvent('pm.reward.small', 'results-sequence-spin')).toBe(true);
    expect(resultsBackend.stopCount).toBe(1);
  });

  test('cancels only the active completion sound in its own scope', () => {
    const backend = new FakeBackend();
    const director = new SoundDirector(backend, new SoundArbiter(new FakeClock()));
    director.request('pm.complete.xp_counter_tick', { scope: 'foreign-results' });
    expect(director.stopActiveCompletion('results-sequence')).toBe(false);
    expect(backend.stopCount).toBe(0);

    const resultsBackend = new FakeBackend();
    const resultsDirector = new SoundDirector(resultsBackend, new SoundArbiter(new FakeClock()));
    resultsDirector.request('pm.complete.xp_counter_tick', { scope: 'results-sequence' });
    expect(resultsDirector.stopActiveCompletion('results-sequence')).toBe(true);
    expect(resultsBackend.stopCount).toBe(1);
  });

  test('cancels a deferred result spin before it can start after voice playback', () => {
    jest.useFakeTimers();
    try {
      const backend = new FakeBackend();
      const clock = new FakeClock();
      const director = new SoundDirector(backend, new SoundArbiter(clock));
      director.setVoiceActive(true);
      expect(director.request('pm.reward.small', {
        scope: 'results-sequence-spin',
        deferAfterVoice: true,
      }).kind).toBe('defer');

      expect(director.stopActiveEvent('pm.reward.small', 'results-sequence-spin')).toBe(true);
      director.setVoiceActive(false);
      clock.advance(250);
      jest.advanceTimersByTime(250);
      expect(backend.plays).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * зачем 2026-08-04 (владелец: «звуки в турнире работают рандомно и через
   * раз», после того как rateLimit уже поднят): тик таймера (приоритет 62) и
   * вердикт ответа (68-70) конкурируют не только за бюджет запросов в
   * секунду, но и за ЕДИНСТВЕННЫЙ активный слот воспроизведения. Без
   * queueIfBusy низкоприоритетный тик молча пропадает, если совпал с ещё
   * играющим вердиктом — совпадение по времени выглядит как случайность.
   */
  describe('queueIfBusy retries a priority-dropped request once the busy slot frees up', () => {
    test('without queueIfBusy, a lower-priority request during playback is lost for good', () => {
      jest.useFakeTimers();
      try {
        const backend = new FakeBackend();
        const clock = new FakeClock();
        const director = new SoundDirector(backend, new SoundArbiter(clock));

        // pm.learn.correct (priority 70, 380ms) занимает слот.
        expect(director.request('pm.learn.correct').kind).toBe('play');
        // pm.learn.timer_warning (priority 62) конкурирует за слот и проигрывает.
        expect(director.request('pm.learn.timer_warning')).toEqual({ kind: 'drop', reason: 'priority' });

        clock.advance(400);
        jest.advanceTimersByTime(1000);
        // Без queueIfBusy повторной попытки не было — тик безвозвратно потерян.
        expect(backend.plays.map((p) => p.eventId)).toEqual(['pm.learn.correct']);
      } finally {
        jest.useRealTimers();
      }
    });

    test('with queueIfBusy, the dropped request plays once the active sound ends', () => {
      jest.useFakeTimers();
      try {
        const backend = new FakeBackend();
        const clock = new FakeClock();
        const director = new SoundDirector(backend, new SoundArbiter(clock));

        expect(director.request('pm.learn.correct').kind).toBe('play');
        expect(director.request('pm.learn.timer_warning', { queueIfBusy: true }))
          .toMatchObject({ kind: 'drop', reason: 'priority' });

        // durationMs('pm.learn.correct') = 380ms — до этого момента слот занят.
        clock.advance(379);
        jest.advanceTimersByTime(379);
        expect(backend.plays.map((p) => p.eventId)).toEqual(['pm.learn.correct']);

        clock.advance(1);
        jest.advanceTimersByTime(1);
        expect(backend.plays.map((p) => p.eventId)).toEqual(['pm.learn.correct', 'pm.learn.timer_warning']);
      } finally {
        jest.useRealTimers();
      }
    });

    test('a higher-priority sound can still preempt normally — queueIfBusy does not change that', () => {
      const backend = new FakeBackend();
      const clock = new FakeClock();
      const director = new SoundDirector(backend, new SoundArbiter(clock));

      expect(director.request('pm.learn.hint_reveal', { queueIfBusy: true }).kind).toBe('play');
      // pm.system.error_recoverable (higher priority) preempts immediately —
      // no retry needed, no drop happens in the first place.
      expect(director.request('pm.system.error_recoverable')).toMatchObject({ kind: 'play', preempt: true });
      expect(backend.plays.map((p) => p.eventId)).toEqual(['pm.learn.hint_reveal', 'pm.system.error_recoverable']);
    });

    test('going silent (setEffectsEnabled false) before the retry fires cancels it', () => {
      jest.useFakeTimers();
      try {
        const backend = new FakeBackend();
        const clock = new FakeClock();
        const director = new SoundDirector(backend, new SoundArbiter(clock));

        director.request('pm.learn.correct');
        director.request('pm.learn.timer_warning', { queueIfBusy: true });
        director.setEffectsEnabled(false);

        clock.advance(400);
        jest.advanceTimersByTime(1000);
        expect(backend.plays.map((p) => p.eventId)).toEqual(['pm.learn.correct']);
      } finally {
        jest.useRealTimers();
      }
    });
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
    player.emitPlaying();
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

    // Реально заиграл, затем честно доиграл — освобождает слот арбитра.
    emit({ playing: true });
    emit({ didJustFinish: true });
    expect(ended).toHaveBeenCalledTimes(1);
  });

  // зачем 2026-08-03 (владелец: «звук таймера был только в первом раунде
  // турнира, дальше вообще ни разу»): корень — expo-audio на Android читает
  // didJustFinish напрямую из playbackState (см. AudioPlayer.kt, currentStatus:
  // "didJustFinish" to (ref.playbackState == Player.STATE_ENDED)), а не как
  // разовое событие. Переиспользуемый закэшированный плеер после первого
  // проигрывания застревает в STATE_ENDED; seekTo(0) выводит его из этого
  // состояния асинхронно, а play() зовётся синхронно следом — первый статус
  // может долететь до JS раньше, чем ExoPlayer фактически сменил состояние,
  // всё ещё честно репортя ENDED. Без защиты onEnded срабатывал мгновенно на
  // втором и каждом следующем воспроизведении того же события, звук не звучал.
  test('ignores a false didJustFinish from a reused player before it ever played', () => {
    type Status = { didJustFinish?: boolean; playing?: boolean };
    const listeners: ((status: Status) => void)[] = [];
    const emit = (status: Status) => listeners.forEach((l) => l(status));
    const player: SfxPlayerLike = {
      volume: 1,
      play: () => {},
      pause: () => {},
      seekTo: () => {},
      remove: () => {},
      addListener: (_event, callback) => {
        listeners.push(callback);
        return { remove: () => { listeners.length = 0; } };
      },
    };

    const backend = new ExpoSfxBackend(() => player, 2);
    const ended = jest.fn();
    backend.play('pm.learn.timer_warning', 1, 0.34, ended);

    // Ложный ENDED от переиспользуемого плеера, ДО первого настоящего playing.
    emit({ didJustFinish: true });
    expect(ended).not.toHaveBeenCalled();

    // Реальный старт добирается позже — теперь настоящее завершение доверяем.
    emit({ playing: true });
    emit({ didJustFinish: true });
    expect(ended).toHaveBeenCalledTimes(1);
  });

  // зачем: если рантайм НИКОГДА не шлёт playing (уже известный случай —
  // см. соседний тест выше про плеер, который «может не присылать playing»),
  // недоверие к ENDED не должно длиться вечно: иначе арбитр зависает с занятым
  // слотом навсегда, что хуже исходного бага. Окно ограничено реальным
  // временем (Date.now()), не поддельными часами арбитра — это таймаут именно
  // нативного плеера, а не игровой логики.
  test('accepts didJustFinish without ever seeing playing once the retry window elapses', () => {
    jest.useFakeTimers();
    try {
      type Status = { didJustFinish?: boolean; playing?: boolean };
      const listeners: ((status: Status) => void)[] = [];
      const emit = (status: Status) => listeners.forEach((l) => l(status));
      const player: SfxPlayerLike = {
        volume: 1,
        play: () => {},
        pause: () => {},
        seekTo: () => {},
        remove: () => {},
        addListener: (_event, callback) => {
          listeners.push(callback);
          return { remove: () => { listeners.length = 0; } };
        },
      };

      const backend = new ExpoSfxBackend(() => player, 2);
      const ended = jest.fn();
      backend.play('pm.learn.timer_warning', 1, 0.34, ended);

      jest.advanceTimersByTime(500);
      emit({ didJustFinish: true });
      expect(ended).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
