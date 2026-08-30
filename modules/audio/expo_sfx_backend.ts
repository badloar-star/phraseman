import { createAudioPlayer } from 'expo-audio';
import type { SoundEventId } from './sound_events';

// зачем: `isLoaded`/`playing` нужны, чтобы понять, что нативный плеер реально
// готов. На Android ExoPlayer после createAudioPlayer какое-то время находится
// в состоянии загрузки, и play() по неготовому плееру уходит в никуда —
// см. подробный разбор в hooks/phrase_audio_player.ts.
type PlaybackStatus = { didJustFinish?: boolean; isLoaded?: boolean; playing?: boolean };
type SubscriptionLike = { remove(): void };

export type SfxPlayerLike = {
  volume: number;
  /** Готовность нативного плеера. undefined — рантайм не сообщает статус. */
  readonly isLoaded?: boolean;
  play(): void;
  pause(): void;
  seekTo(seconds: number): void | Promise<void>;
  remove(): void;
  addListener(
    event: 'playbackStatusUpdate',
    callback: (status: PlaybackStatus) => void,
  ): SubscriptionLike;
};

type PlayerFactory = (source: number) => SfxPlayerLike;

type CacheEntry = {
  eventId: SoundEventId;
  player: SfxPlayerLike;
  lastUsed: number;
  activeToken: number | null;
};

type ActivePlayback = {
  token: number;
  entry: CacheEntry;
  player: SfxPlayerLike;
  subscription: SubscriptionLike | null;
  /** Слотовое (не allowConcurrent) воспроизведение — только его гасит stopExclusive. */
  exclusive: boolean;
};

// зачем 12 (аудит §R8, 2026-08-30): рабочий набор одного урока — 8-10 разных
// событий (correct, needs_work, оба тапа, сердечки, completion, тики XP…),
// кэш на 6 выселял плееры каждый ход, и первый play каждого звука платил
// латентность создания ExoPlayer/буферизации (expo-audio не префетчит,
// issue #42900). 12 закрывает набор урока с запасом; ~12 нативных плееров —
// копейки по памяти.
const DEFAULT_CACHE_SIZE = 12;
// A broken/native-stalled rewind must never keep the global sound slot busy.
// Normal rewinds settle well before this; the fallback is only for a Promise
// that never resolves or rejects on a problematic ExoPlayer instance.
const SEEK_SETTLE_TIMEOUT_MS = 200;

export class ExpoSfxBackend {
  private readonly cache = new Set<CacheEntry>();
  private readonly activePlayback = new Map<number, ActivePlayback>();
  private useSequence = 0;
  private playbackSequence = 0;

  constructor(
    private readonly createPlayer: PlayerFactory = (source) => createAudioPlayer(source) as unknown as SfxPlayerLike,
    private readonly maxCacheSize = DEFAULT_CACHE_SIZE,
  ) {}

  play(
    eventId: SoundEventId,
    source: number,
    volume: number,
    exclusive: boolean,
    onEnded: () => void,
  ): boolean {
    try {
      const entry = this.ensure(eventId, source);
      const player = entry.player;
      const playbackToken = ++this.playbackSequence;
      entry.activeToken = playbackToken;
      player.volume = Math.max(0, Math.min(1, volume));
      const seekResult = player.seekTo(0);
      const seekPromise = seekResult && typeof (seekResult as Promise<void>).then === 'function'
        ? seekResult as Promise<void>
        : null;
      let seekSettled = seekPromise === null;

      // зачем: play() по ещё не загруженному плееру уходит в тишину — на Android
      // ExoPlayer после createAudioPlayer какое-то время в состоянии загрузки, и
      // первый запрос каждого звука молча пропадал (ошибки нет, поэтому снаружи
      // это выглядело как «звук нигде не работает»). Тот же класс бага уже разобран
      // в hooks/phrase_audio_player.ts, где старт ждёт isLoaded && playing.
      // Здесь ждать нечем — API синхронный, поэтому повторяем play() по статусу,
      // пока плеер не сообщит, что действительно поехал.
      let retriedAfterLoad = false;
      // зачем 2026-08-03 (владелец: «звук таймера был только в первом раунде
      // турнира, дальше вообще ни разу»): у expo-audio на Android didJustFinish
      // читается напрямую из ref.playbackState == STATE_ENDED — это НЕ разовое
      // событие «доиграл», а живой снимок состояния плеера (см. AudioPlayer.kt,
      // currentStatus()). Второй и каждый следующий play() того же закэшированного
      // события переиспользует плеер, который после первого проигрывания застыл
      // в STATE_ENDED. seekTo(0) командует ExoPlayer'у выйти из этого состояния
      // АСИНХРОННО (свой поток декодера), а play() зовётся синхронно следующей
      // строкой. Первый же статус, долетевший до JS раньше, чем ExoPlayer
      // фактически сменил playbackState, всё ещё честно репортит ENDED —
      // didJustFinish=true СРАЗУ после play(), звук помечается сыгранным
      // мгновенно и не звучит. Раунд 1 не задет: свежесозданный плеер стартует в
      // STATE_IDLE, а не в ENDED, гонки нет.
      //
      // ПРЕДОХРАНИТЕЛЬ: рантайм может вообще не присылать `playing` (уже было
      // известно ДО этой правки, см. исходный коммент ниже) — если ждать его
      // безусловно, один такой рантайм навсегда блокирует onEnded, и арбитр
      // зависает с занятым слотом навечно (хуже исходного бага: тот молчал
      // максимум durationMs). Поэтому недоверие к раннему ENDED ограничено
      // коротким окном retryWindowMs — это то же самое окно, которое ниже даёт
      // повторной попытке play() шанс реально стартовать. Если оно истекло,
      // ENDED принимается как есть, будто предохранителя не было вовсе.
      let sawPlaying = false;
      let playStartedAtMs = Date.now();
      let startAttempted = false;
      const RETRY_WINDOW_MS = 400;
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        const playback = this.activePlayback.get(playbackToken);
        if (!playback || playback.player !== player) return;

        if (status.playing === true) sawPlaying = true;
        const withinRetryWindow = !startAttempted || Date.now() - playStartedAtMs < RETRY_WINDOW_MS;

        // Завершение обрабатываем ВСЕГДА и первым делом: рантайм может не
        // присылать `playing`, и привязка finish к «мы видели старт» подвесила бы
        // арбитра с вечно занятым слотом. Исключение — ложный ENDED от
        // переиспользуемого плеера в первые RETRY_WINDOW_MS после play(), пока
        // ещё не видели ни одного playing:true (см. коммент выше).
        if (status.didJustFinish && (sawPlaying || !withinRetryWindow)) {
          this.finish(playbackToken);
          onEnded();
          return;
        }

        // Загрузился, но не играет — значит ранний play() пропал (Android
        // ExoPlayer ещё декодировал файл, либо это тот самый ложный ENDED на
        // переиспользуемом плеере). Повторяем ровно один раз по готовности:
        // без этого первый запрос каждого звука всегда немой.
        if (seekSettled && !retriedAfterLoad && status.isLoaded && status.playing === false) {
          retriedAfterLoad = true;
          try {
            player.play();
          } catch {
            // Android may fail only on the readiness-triggered retry. Swallowing
            // that exception leaves SoundDirector believing this effect still
            // owns the global slot, so the next lower-priority sounds appear to
            // work "through once". Release exactly this playback generation.
            if (this.activePlayback.get(playbackToken)?.player === player) {
              this.stopPlayback(playbackToken);
              onEnded();
            }
          }
        }
      });
      this.activePlayback.set(playbackToken, { token: playbackToken, entry, player, subscription, exclusive });

      let seekFallbackTimer: ReturnType<typeof setTimeout> | null = null;
      let startReleased = false;
      const startAfterSeek = () => {
        if (startReleased) return;
        startReleased = true;
        if (seekFallbackTimer) {
          clearTimeout(seekFallbackTimer);
          seekFallbackTimer = null;
        }
        seekSettled = true;
        // Сравнения только player недостаточно: повтор того же eventId повторно
        // использует тот же объект. Поздний timeout/Promise прошлого seek тогда
        // мог запустить уже новый сеанс раньше завершения его собственной перемотки.
        if (this.activePlayback.get(playbackToken)?.player !== player) return;
        startAttempted = true;
        playStartedAtMs = Date.now();
        try {
          player.play();
        } catch {
          // Async seek completion runs outside the outer play() try/catch.
          // Release the director slot instead of leaving all later sounds queued.
          this.stopPlayback(playbackToken);
          onEnded();
        }
      };
      // На переиспользуемом Android-плеере seekTo(0) асинхронно выводит
      // ExoPlayer из STATE_ENDED. Запуск до завершения seek — точная причина
      // эффекта «тот же системный звук играет через раз».
      if (seekPromise) {
        seekFallbackTimer = setTimeout(startAfterSeek, SEEK_SETTLE_TIMEOUT_MS);
        void seekPromise.then(startAfterSeek, startAfterSeek);
      } else {
        startAfterSeek();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * зачем разделение (аудит §R5, 2026-08-30): прежний единый stop() гасил ВСЕ
   * плейбеки, включая allowConcurrent (полёт руны, хвост learn_correct) — хотя
   * им обещан собственный плеер вне слота. Преемпт и точечные stopActiveEvent
   * касаются только слотового звука; полная тишина нужна лишь записи,
   * выключателю звуков и dispose.
   */
  stopExclusive(): void {
    for (const [token, playback] of [...this.activePlayback.entries()]) {
      if (playback.exclusive) this.stopPlayback(token);
    }
  }

  stopAll(): void {
    for (const token of [...this.activePlayback.keys()]) this.stopPlayback(token);
  }

  /**
   * Тёплый прогрев: создать нативные плееры заранее, ничего не проигрывая —
   * первый реальный play частого события стартует без латентности создания
   * и первичной буферизации (expo-audio не префетчит сам, issue #42900).
   */
  prewarm(entries: ReadonlyArray<{ eventId: SoundEventId; source: number }>): void {
    for (const { eventId, source } of entries) {
      try {
        this.ensure(eventId, source);
      } catch {
        // Прогрев — оптимизация: не готов нативный слой — просто пропускаем,
        // реальный play создаст плеер обычным путём.
      }
    }
    this.evictIdleEntries();
  }

  dispose(): void {
    this.stopAll();
    for (const entry of this.cache.values()) {
      try { entry.player.remove(); } catch (e) {
      console.warn('[silent-catch] expo_sfx_backend:startAfterSeek', e instanceof Error ? e.message : String(e));
    }
    }
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  private ensure(eventId: SoundEventId, source: number): CacheEntry {
    for (const entry of this.cache) {
      if (entry.eventId === eventId && entry.activeToken === null) {
        entry.lastUsed = ++this.useSequence;
        return entry;
      }
    }

    const player = this.createPlayer(source);
    const entry: CacheEntry = {
      eventId,
      player,
      lastUsed: ++this.useSequence,
      activeToken: null,
    };
    this.cache.add(entry);
    return entry;
  }

  private finish(token: number): void {
    const playback = this.activePlayback.get(token);
    if (!playback) return;
    this.activePlayback.delete(token);
    playback.entry.activeToken = null;
    try { playback.subscription?.remove(); } catch (e) {
      console.warn('[silent-catch] expo_sfx_backend:playback', e instanceof Error ? e.message : String(e));
    }
    this.evictIdleEntries();
  }

  private stopPlayback(token: number): void {
    const playback = this.activePlayback.get(token);
    if (!playback) return;
    this.activePlayback.delete(token);
    playback.entry.activeToken = null;
    try { playback.subscription?.remove(); } catch (e) {
      console.warn('[silent-catch] expo_sfx_backend:playback', e instanceof Error ? e.message : String(e));
    }
    try { playback.player.pause(); } catch (e) {
      console.warn('[silent-catch] expo_sfx_backend:playback', e instanceof Error ? e.message : String(e));
    }
    try { void playback.player.seekTo(0); } catch (e) {
      console.warn('[silent-catch] expo_sfx_backend:playback', e instanceof Error ? e.message : String(e));
    }
    this.evictIdleEntries();
  }

  private evictIdleEntries(): void {
    const capacity = Math.max(1, this.maxCacheSize);
    while (this.cache.size > capacity) {
      let oldest: CacheEntry | null = null;
      for (const entry of this.cache) {
        if (entry.activeToken === null && (!oldest || entry.lastUsed < oldest.lastUsed)) {
          oldest = entry;
        }
      }
      if (!oldest) return;
      try { oldest.player.remove(); } catch (e) {
      console.warn('[silent-catch] expo_sfx_backend:capacity', e instanceof Error ? e.message : String(e));
    }
      this.cache.delete(oldest);
    }
  }
}
