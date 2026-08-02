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
  player: SfxPlayerLike;
  lastUsed: number;
};

const DEFAULT_CACHE_SIZE = 6;

export class ExpoSfxBackend {
  private readonly cache = new Map<SoundEventId, CacheEntry>();
  private current: {
    eventId: SoundEventId;
    player: SfxPlayerLike;
    subscription: SubscriptionLike | null;
  } | null = null;
  private useSequence = 0;

  constructor(
    private readonly createPlayer: PlayerFactory = (source) => createAudioPlayer(source) as unknown as SfxPlayerLike,
    private readonly maxCacheSize = DEFAULT_CACHE_SIZE,
  ) {}

  play(
    eventId: SoundEventId,
    source: number,
    volume: number,
    onEnded: () => void,
  ): boolean {
    try {
      this.stop();
      const player = this.ensure(eventId, source);
      player.volume = Math.max(0, Math.min(1, volume));
      void player.seekTo(0);

      // зачем: play() по ещё не загруженному плееру уходит в тишину — на Android
      // ExoPlayer после createAudioPlayer какое-то время в состоянии загрузки, и
      // первый запрос каждого звука молча пропадал (ошибки нет, поэтому снаружи
      // это выглядело как «звук нигде не работает»). Тот же класс бага уже разобран
      // в hooks/phrase_audio_player.ts, где старт ждёт isLoaded && playing.
      // Здесь ждать нечем — API синхронный, поэтому повторяем play() по статусу,
      // пока плеер не сообщит, что действительно поехал.
      let retriedAfterLoad = false;
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (this.current?.player !== player) return;

        // Завершение обрабатываем ВСЕГДА и первым делом: рантайм может не
        // присылать `playing`, и привязка finish к «мы видели старт» подвесила бы
        // арбитра с вечно занятым слотом.
        if (status.didJustFinish) {
          this.current.subscription?.remove();
          this.current = null;
          onEnded();
          return;
        }

        // Загрузился, но не играет — значит ранний play() пропал (Android
        // ExoPlayer ещё декодировал файл). Повторяем ровно один раз по
        // готовности: без этого первый запрос каждого звука всегда немой.
        if (!retriedAfterLoad && status.isLoaded && status.playing === false) {
          retriedAfterLoad = true;
          try { player.play(); } catch {}
        }
      });
      this.current = { eventId, player, subscription };

      // Пробуем сразу: на прогретом плеере (звук уже в кэше) это даёт мгновенный
      // отклик без ожидания первого статуса.
      player.play();
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  stop(): void {
    const current = this.current;
    if (!current) return;
    this.current = null;
    try { current.subscription?.remove(); } catch {}
    try { current.player.pause(); } catch {}
    try { void current.player.seekTo(0); } catch {}
  }

  dispose(): void {
    this.stop();
    for (const entry of this.cache.values()) {
      try { entry.player.remove(); } catch {}
    }
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  private ensure(eventId: SoundEventId, source: number): SfxPlayerLike {
    const existing = this.cache.get(eventId);
    if (existing) {
      existing.lastUsed = ++this.useSequence;
      return existing.player;
    }

    this.evictIfNeeded();
    const player = this.createPlayer(source);
    this.cache.set(eventId, { player, lastUsed: ++this.useSequence });
    return player;
  }

  private evictIfNeeded(): void {
    if (this.cache.size < Math.max(1, this.maxCacheSize)) return;
    let oldest: [SoundEventId, CacheEntry] | null = null;
    for (const entry of this.cache.entries()) {
      if (!oldest || entry[1].lastUsed < oldest[1].lastUsed) oldest = entry;
    }
    if (!oldest) return;
    try { oldest[1].player.remove(); } catch {}
    this.cache.delete(oldest[0]);
  }
}

