// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
//
// Движок звуков V2. Пока никто не импортирует (подключит координатор) и флаг sound_v2 выключен по умолчанию.
//
// Что делает:
//  - playEvent(event, opts?) — колода «не повторять»: у каждого события своя перемешанная очередь вариантов,
//    один вариант НИКОГДА не звучит два раза подряд (в том числе на стыке колод);
//  - микро-вариация каждого запуска: скорость ±0,15 % (около ±2,5 цента) и громкость ±1 дБ;
//  - серии (correct, lightning, coin, ring): advanceStreak / resetStreak, событие wrong само рвёт серии;
//  - уважает флаг sound_v2, общий переключатель звука (настройка uiSounds) и тихий режим (запись микрофона);
//  - ленивая подгрузка: нативные плееры создаются при первом запросе клипа (не на старте приложения),
//    пул ограничен SOUND_V2_MAX_PLAYERS, лишние освобождаются (release) — утечек нет;
//  - лог [SOUND-V2]: событие, вариант, шаг, файл, причина «не играть»; немых catch нет.
//
// Серии: playEvent играет ТЕКУЩИЙ шаг и сам его не двигает. Двигает advanceStreak(event) либо
// playEvent(event, { advance: true }) — выбирайте одно, иначе серия перескочит через шаг.
// Явный шаг opts.step играет именно его и серию не трогает.
//
// Тяжёлые зависимости (expo-audio, настройки, аудиоактивность) лежат в sound_v2_runtime.ts и грузятся
// лениво — только когда флаг включён и событие прошло проверки.

import {
  SOUND_V2_CATALOG,
  SOUND_V2_RESET_ON_ERROR_EVENT,
  SOUND_V2_STREAKS_RESET_BY_ERROR,
  getSoundV2Clip,
  isSoundV2EventId,
  type SoundV2Clip,
  type SoundV2EventDef,
  type SoundV2EventId,
} from './catalog';
import { NoRepeatDeck, StreakBook, type RandomSource } from './deck';
import { isSoundV2Enabled, primeSoundV2Flag } from './sound_v2_flag';

const LOG = '[SOUND-V2]';

/** Потолок нативных плееров: тот же порядок, что у старого ExpoSfxBackend (16), с запасом на голос и карточки. */
export const SOUND_V2_MAX_PLAYERS = 12;
/** Скорость воспроизведения ±0,15 % ≈ ±2,6 цента. */
export const SOUND_V2_RATE_JITTER = 0.0015;
/** Номинальная громкость −1 дБ: плеер не умеет громче 1.0, поэтому +1 дБ вокруг номинала помещается ровно в потолок. */
export const SOUND_V2_GAIN_NOMINAL_DB = -1;
export const SOUND_V2_GAIN_JITTER_DB = 1;

const PREWARM_DELAY_MS = 250;
const PREWARM_GAP_MS = 300;
const SEEK_SETTLE_TIMEOUT_MS = 200;
const RETRY_WINDOW_MS = 400;
const WATCHDOG_EXTRA_MS = 1500;
const SKIP_LOG_INTERVAL_MS = 5000;

export type SoundV2SkipReason =
  | 'unknown_event'
  | 'flag_off'
  | 'effects_disabled'
  | 'quiet_recording'
  | 'player_unavailable';

export type SoundV2PlayResult = Readonly<{
  event: string;
  played: boolean;
  reason?: SoundV2SkipReason;
  /** Номер варианта с нуля. */
  variant?: number;
  step?: number;
  file?: string;
}>;

export type PlayEventOptions = Readonly<{
  /** Явный шаг серии (с нуля). Серию не двигает. */
  step?: number;
  /** После запуска сдвинуть серию на шаг (сахар вместо отдельного advanceStreak). */
  advance?: boolean;
}>;

type PlaybackStatus = { didJustFinish?: boolean; isLoaded?: boolean; playing?: boolean };

export type SoundV2Player = {
  volume: number;
  shouldCorrectPitch?: boolean;
  readonly isLoaded?: boolean;
  play(): void;
  pause(): void;
  seekTo(seconds: number): void | Promise<void>;
  setPlaybackRate?(rate: number, pitchCorrectionQuality?: unknown): void;
  release(): void;
  addListener(event: 'playbackStatusUpdate', callback: (status: PlaybackStatus) => void): { remove(): void };
};

export type SoundBankDeps = {
  createPlayer(clip: SoundV2Clip): SoundV2Player;
  isFlagEnabled(): boolean;
  isEffectsEnabled(): boolean;
  /** Тихий режим: идёт запись микрофона. */
  isQuiet(): boolean;
  rng: RandomSource;
  now(): number;
  setTimer(callback: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  log(message: string): void;
  warn(message: string): void;
  /** Вызывается при каждом отказе по флагу — боевая версия прогревает флаг из кэша. */
  onFlagMiss?(): void;
  /** Поддерживает ли платформа смену скорости воспроизведения (Android < 6 — нет). Нет зависимости → считаем, что да. */
  isRateSupported?(): boolean;
  /** Подписка на «пора замолчать» (звук выключили / началась запись). Возвращает отписку. */
  onSilenceNeeded?(listener: (reason: 'effects_disabled' | 'quiet_recording') => void): () => void;
};

type Playback = {
  subscription: { remove(): void } | null;
  watchdog: unknown;
  fallback: unknown;
};

type PoolEntry = {
  clip: SoundV2Clip;
  player: SoundV2Player;
  lastUsed: number;
  uses: number;
  pitchReady: boolean;
  active: Playback | null;
};

function errText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

function isThenable(value: unknown): value is PromiseLike<void> {
  return Boolean(value) && typeof (value as { then?: unknown }).then === 'function';
}

export class SoundBank {
  private readonly pool = new Set<PoolEntry>();
  private readonly decks = new Map<SoundV2EventId, NoRepeatDeck>();
  private readonly seenGroups = new Set<string>();
  private readonly skipLog = new Map<string, { at: number; suppressed: number }>();
  private prewarmQueue: SoundV2Clip[] = [];
  private prewarmTimer: unknown = null;
  private unsubscribeSilence: (() => void) | null = null;
  private silenceSubscribed = false;
  private useSeq = 0;
  private disposed = false;
  // зачем (координатор 14.10, п.3): если платформа не применяет микро-вариацию скорости, тихо отключаем её ОДИН раз с логом — без исключений и без шума на каждом запуске
  private rateDisabled = false;
  private rateMismatchRun = 0;

  constructor(
    private readonly deps: SoundBankDeps,
    readonly streaks: StreakBook = new StreakBook(),
    private readonly maxPlayers: number = SOUND_V2_MAX_PLAYERS,
  ) {}

  /** Сколько нативных плееров сейчас держит банк (для тестов и логов). */
  get poolSize(): number {
    return this.pool.size;
  }

  playEvent(event: SoundV2EventId, options: PlayEventOptions = {}): SoundV2PlayResult {
    const result = this.playInner(event, options);
    // Серия логически сдвигается, даже если звук не сыграл (выключен): верный ответ засчитан в любом случае.
    if (options.advance === true && options.step === undefined && isSoundV2EventId(event)) {
      this.streaks.advance(event);
      if (result.played) this.queuePrewarm(event);
    }
    return result;
  }

  advanceStreak(event: SoundV2EventId): number {
    if (!isSoundV2EventId(event)) {
      this.deps.warn(`${LOG} advanceStreak: неизвестное событие "${String(event)}"`);
      return 0;
    }
    const step = this.streaks.advance(event);
    this.deps.log(`${LOG} streak advance event=${event} step=${step}`);
    if (this.canPlayNow()) this.queuePrewarm(event);
    return step;
  }

  resetStreak(event?: SoundV2EventId): void {
    if (event === undefined) {
      this.streaks.resetAll();
      this.deps.log(`${LOG} streak reset all`);
      return;
    }
    if (!isSoundV2EventId(event)) {
      this.deps.warn(`${LOG} resetStreak: неизвестное событие "${String(event)}"`);
      return;
    }
    this.streaks.reset(event);
    this.deps.log(`${LOG} streak reset event=${event}`);
  }

  /** Заранее создать плееры первых клипов событий (например, при входе на экран). Плееры создаются по одному, с паузой. */
  prewarm(events: readonly SoundV2EventId[]): void {
    for (const event of events) {
      if (isSoundV2EventId(event)) this.queuePrewarm(event);
    }
  }

  /** Гасит всё, что играет сейчас. Плееры остаются в пуле. */
  stopAll(reason: string): void {
    let stopped = 0;
    for (const entry of [...this.pool]) {
      const playback = entry.active;
      if (!playback) continue;
      try {
        entry.player.pause();
      } catch (error) {
        this.deps.warn(`${LOG} stop: pause не удался file=${entry.clip.file} (${errText(error)})`);
      }
      this.finish(entry, playback);
      stopped += 1;
    }
    this.deps.log(`${LOG} stopAll reason=${reason} stopped=${stopped} pool=${this.pool.size}`);
  }

  /** Освободить всё: плееры, таймеры, подписки. После dispose банк больше не играет. */
  dispose(): void {
    this.disposed = true;
    this.stopAll('dispose');
    if (this.prewarmTimer !== null) this.deps.clearTimer(this.prewarmTimer);
    this.prewarmTimer = null;
    this.prewarmQueue = [];
    for (const entry of [...this.pool]) this.releaseEntry(entry, 'dispose');
    if (this.unsubscribeSilence) {
      try {
        this.unsubscribeSilence();
      } catch (error) {
        this.deps.warn(`${LOG} dispose: отписка не удалась (${errText(error)})`);
      }
    }
    this.unsubscribeSilence = null;
    this.decks.clear();
    this.deps.log(`${LOG} dispose done`);
  }

  // ───────────────────────────── выбор и запуск ─────────────────────────────

  private playInner(event: SoundV2EventId, options: PlayEventOptions): SoundV2PlayResult {
    if (!isSoundV2EventId(event)) {
      this.deps.warn(`${LOG} skip event=${String(event)} reason=unknown_event`);
      return { event: String(event), played: false, reason: 'unknown_event' };
    }
    // Ошибка рвёт серии верных ответов — независимо от того, звучит ли сам звук ошибки.
    if (event === SOUND_V2_RESET_ON_ERROR_EVENT) {
      this.streaks.resetMany(SOUND_V2_STREAKS_RESET_BY_ERROR);
    }
    if (this.disposed) return this.skip(event, 'player_unavailable', 'disposed=true');
    if (!this.deps.isFlagEnabled()) {
      this.deps.onFlagMiss?.();
      return this.skip(event, 'flag_off');
    }
    if (!this.deps.isEffectsEnabled()) return this.skip(event, 'effects_disabled', 'uiSounds=false');
    if (this.deps.isQuiet()) return this.skip(event, 'quiet_recording', 'recordingActive=true');

    const def = SOUND_V2_CATALOG[event];
    const step = options.step !== undefined ? this.normalizeStep(def, options.step) : this.streaks.get(event);
    const variant = this.deckFor(event, def).draw();
    const clip = getSoundV2Clip(event, variant, step);

    if (!this.seenGroups.has(def.group)) {
      this.seenGroups.add(def.group); // guard-ok: Set.add, не запись данных
      this.deps.log(`${LOG} group first use group=${def.group} event=${event} (плееры создаются лениво)`);
    }
    this.ensureSilenceSubscription();

    const jitterRate = 1 + (this.deps.rng() * 2 - 1) * SOUND_V2_RATE_JITTER;
    const gainDb = SOUND_V2_GAIN_NOMINAL_DB + (this.deps.rng() * 2 - 1) * SOUND_V2_GAIN_JITTER_DB;
    const gain = Math.max(0, Math.min(1, dbToGain(gainDb)));

    const entry = this.acquire(clip);
    if (!entry) {
      return { ...this.skip(event, 'player_unavailable', `file=${clip.file}`), variant, step, file: clip.file };
    }
    const warm = entry.uses > 0;
    if (!this.start(entry, event, gain, jitterRate)) {
      return { ...this.skip(event, 'player_unavailable', `start_failed file=${clip.file}`), variant, step, file: clip.file };
    }
    this.deps.log(
      `${LOG} play event=${event} variant=${variant + 1}/${def.variants.length} step=${step} file=${clip.file}`
      + ` rate=${jitterRate.toFixed(5)} gainDb=${gainDb.toFixed(2)} warm=${String(warm)} pool=${this.pool.size}`,
    );
    this.queuePrewarmAfter(event, options);
    return { event, played: true, variant, step, file: clip.file };
  }

  private normalizeStep(def: SoundV2EventDef, raw: number): number {
    const value = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
    if (def.steps <= 1) return 0;
    return def.cycle ? value % def.steps : Math.min(value, def.steps - 1);
  }

  private deckFor(event: SoundV2EventId, def: SoundV2EventDef): NoRepeatDeck {
    let deck = this.decks.get(event);
    if (!deck) {
      deck = new NoRepeatDeck(def.variants.length, this.deps.rng);
      this.decks.set(event, deck);
    }
    return deck;
  }

  private skip(event: SoundV2EventId, reason: SoundV2SkipReason, extra = ''): SoundV2PlayResult {
    const key = `${event}:${reason}`;
    const now = this.deps.now();
    const seen = this.skipLog.get(key);
    // Причину пишем всегда, но повторы одной и той же причины сжимаем: тап по кнопке не должен заливать журнал.
    if (!seen || now - seen.at >= SKIP_LOG_INTERVAL_MS) {
      const suppressed = seen?.suppressed ?? 0;
      this.deps.log(`${LOG} skip event=${event} reason=${reason}${extra ? ` ${extra}` : ''}${suppressed > 0 ? ` repeated=${suppressed}` : ''}`);
      this.skipLog.set(key, { at: now, suppressed: 0 });
    } else {
      seen.suppressed += 1;
    }
    return { event, played: false, reason };
  }

  private canPlayNow(): boolean {
    return !this.disposed && this.deps.isFlagEnabled() && this.deps.isEffectsEnabled() && !this.deps.isQuiet();
  }

  private ensureSilenceSubscription(): void {
    if (this.silenceSubscribed || !this.deps.onSilenceNeeded) return;
    this.silenceSubscribed = true;
    try {
      this.unsubscribeSilence = this.deps.onSilenceNeeded((reason) => this.stopAll(reason));
    } catch (error) {
      this.deps.warn(`${LOG} подписка на тишину не удалась (${errText(error)}) — звуки не будут гаситься при записи`);
    }
  }

  // ───────────────────────────── пул плееров ─────────────────────────────

  private acquire(clip: SoundV2Clip): PoolEntry | null {
    for (const entry of this.pool) {
      if (entry.clip.file === clip.file && entry.active === null) {
        entry.lastUsed = ++this.useSeq;
        return entry;
      }
    }
    return this.createEntry(clip);
  }

  private createEntry(clip: SoundV2Clip): PoolEntry | null {
    let player: SoundV2Player;
    try {
      player = this.deps.createPlayer(clip);
    } catch (firstError) {
      // Нативный слой может отказать при исчерпании ресурсов: освобождаем только простаивающие плееры и пробуем один раз.
      this.deps.warn(`${LOG} createPlayer отказал file=${clip.file} pool=${this.pool.size} (${errText(firstError)}) — освобождаю простаивающие`);
      this.releaseIdle();
      try {
        player = this.deps.createPlayer(clip);
      } catch (secondError) {
        this.deps.warn(`${LOG} createPlayer отказал повторно file=${clip.file} (${errText(secondError)}) — звук пропущен`);
        return null;
      }
    }
    const entry: PoolEntry = { clip, player, lastUsed: ++this.useSeq, uses: 0, pitchReady: false, active: null };
    this.pool.add(entry);
    return entry;
  }

  private releaseEntry(entry: PoolEntry, why: string): void {
    this.pool.delete(entry);
    if (entry.active) this.finish(entry, entry.active);
    try {
      entry.player.release();
    } catch (error) {
      this.deps.warn(`${LOG} release не удался why=${why} file=${entry.clip.file} (${errText(error)})`);
    }
  }

  private releaseIdle(): void {
    for (const entry of [...this.pool]) {
      if (entry.active === null) this.releaseEntry(entry, 'recover');
    }
  }

  private evictIdle(): void {
    const capacity = Math.max(1, this.maxPlayers);
    while (this.pool.size > capacity) {
      let oldest: PoolEntry | null = null;
      for (const entry of this.pool) {
        if (entry.active === null && (!oldest || entry.lastUsed < oldest.lastUsed)) oldest = entry;
      }
      if (!oldest) return; // все заняты — выселим, когда освободятся
      this.releaseEntry(oldest, 'evict');
    }
  }

  // ───────────────────────────── воспроизведение ─────────────────────────────

  private start(entry: PoolEntry, event: SoundV2EventId, gain: number, rate: number): boolean {
    const { player, clip } = entry;
    const playback: Playback = { subscription: null, watchdog: null, fallback: null };
    entry.active = playback;
    entry.lastUsed = ++this.useSeq;
    const fresh = entry.uses === 0;
    entry.uses += 1;

    try {
      player.volume = gain;
    } catch (error) {
      this.deps.warn(`${LOG} volume не выставился file=${clip.file} (${errText(error)})`);
    }
    this.applyRate(entry, rate);

    let sawPlaying = false;
    let began = false;
    let retried = false;
    let beganAt = this.deps.now();

    try {
      playback.subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (entry.active !== playback) return;
        if (status.playing === true) sawPlaying = true;
        const withinRetryWindow = !began || this.deps.now() - beganAt < RETRY_WINDOW_MS;
        // Ложный ENDED переиспользуемого плеера в первые мгновения после play() не считаем концом (см. expo_sfx_backend).
        if (status.didJustFinish && (sawPlaying || !withinRetryWindow)) {
          this.finish(entry, playback);
          return;
        }
        // Загрузился, но не играет — ранний play() ушёл в тишину. Повторяем ровно один раз.
        if (began && !retried && status.isLoaded && status.playing === false && !status.didJustFinish) {
          retried = true;
          this.deps.log(`${LOG} retry_after_load event=${event} file=${clip.file} sinceMs=${this.deps.now() - beganAt}`);
          try {
            player.play();
          } catch (error) {
            this.deps.warn(`${LOG} повторный play не удался file=${clip.file} (${errText(error)})`);
            this.finish(entry, playback);
          }
        }
      });
    } catch (error) {
      // Без статусов плеер всё равно играет; слот освободит предохранитель по длительности клипа.
      this.deps.warn(`${LOG} addListener не удался file=${clip.file} (${errText(error)}) — освобождение по таймеру`);
    }

    playback.watchdog = this.deps.setTimer(() => {
      if (entry.active !== playback) return;
      this.deps.warn(`${LOG} watchdog: плеер не сообщил конец file=${clip.file} afterMs=${clip.ms + WATCHDOG_EXTRA_MS}`);
      this.finish(entry, playback);
    }, clip.ms + WATCHDOG_EXTRA_MS);

    let failed = false;
    const begin = () => {
      if (began) return;
      began = true;
      beganAt = this.deps.now();
      if (playback.fallback !== null) {
        this.deps.clearTimer(playback.fallback);
        playback.fallback = null;
      }
      if (entry.active !== playback) return;
      try {
        player.play();
      } catch (error) {
        failed = true;
        this.deps.warn(`${LOG} play не удался file=${clip.file} (${errText(error)})`);
        this.finish(entry, playback);
      }
    };

    if (fresh) {
      // Свежий плеер стоит в нуле — перемотка не нужна, старт без лишней задержки.
      begin();
      return !failed;
    }
    // Переиспользуемый плеер после конца застыл в ENDED: сперва перемотка в ноль, и только потом play().
    let seek: void | Promise<void>;
    try {
      seek = player.seekTo(0);
    } catch (error) {
      this.deps.warn(`${LOG} seekTo не удался file=${clip.file} (${errText(error)}) — пробую играть без перемотки`);
      begin();
      return !failed;
    }
    if (isThenable(seek)) {
      playback.fallback = this.deps.setTimer(begin, SEEK_SETTLE_TIMEOUT_MS);
      seek.then(begin, (error: unknown) => {
        this.deps.warn(`${LOG} seekTo отклонён file=${clip.file} (${errText(error)})`);
        begin();
      });
    } else {
      begin();
    }
    return !failed;
  }

  private applyRate(entry: PoolEntry, rate: number): void {
    const { player, clip } = entry;
    if (this.rateDisabled) return;
    if (typeof player.setPlaybackRate !== 'function') {
      this.disableRate(`у плеера нет setPlaybackRate file=${clip.file}`);
      return;
    }
    if (this.deps.isRateSupported && !this.deps.isRateSupported()) {
      this.disableRate('платформа не поддерживает смену скорости (Android < 6)');
      return;
    }
    try {
      // Без коррекции высоты, иначе ±0,15 % скорости не дают микро-сдвиг тона.
      if (!entry.pitchReady) {
        player.shouldCorrectPitch = false;
        entry.pitchReady = true;
      }
      player.setPlaybackRate(rate);
      this.verifyRate(player, rate, clip.file);
    } catch (error) {
      this.disableRate(`setPlaybackRate упал file=${clip.file} rate=${rate} (${errText(error)})`);
    }
  }

  /** Читаем скорость обратно: если три запуска подряд плеер остаётся на 1,0 вместо заказанных 1±0,15 % — платформа её игнорирует. */
  private verifyRate(player: SoundV2Player, rate: number, file: string): void {
    const got = (player as { playbackRate?: unknown }).playbackRate;
    if (typeof got !== 'number' || !Number.isFinite(got)) return; // плеер не отдаёт скорость — проверить нечем
    if (Math.abs(got - rate) <= 0.0008) {
      this.rateMismatchRun = 0;
      return;
    }
    this.rateMismatchRun += 1;
    this.deps.log(`${LOG} rate: заказано=${rate.toFixed(5)} прочитано=${got.toFixed(5)} file=${file} подряд=${this.rateMismatchRun}`);
    if (this.rateMismatchRun >= 3) this.disableRate(`плеер не применяет скорость: заказано ${rate.toFixed(5)}, прочитано ${got.toFixed(5)} трижды подряд`);
  }

  private disableRate(reason: string): void {
    if (this.rateDisabled) return;
    this.rateDisabled = true;
    this.deps.warn(`${LOG} микро-вариация скорости отключена: ${reason} — звуки играют без неё (тембр и громкость вариантов остаются)`);
  }

  private finish(entry: PoolEntry, playback: Playback): void {
    if (entry.active !== playback) return;
    entry.active = null;
    if (playback.watchdog !== null) this.deps.clearTimer(playback.watchdog);
    if (playback.fallback !== null) this.deps.clearTimer(playback.fallback);
    playback.watchdog = null;
    playback.fallback = null;
    try {
      playback.subscription?.remove();
    } catch (error) {
      this.deps.warn(`${LOG} подписка не снялась file=${entry.clip.file} (${errText(error)})`);
    }
    playback.subscription = null;
    this.evictIdle();
  }

  // ───────────────────────────── прогрев следующего клипа ─────────────────────────────

  private queuePrewarmAfter(event: SoundV2EventId, options: PlayEventOptions): void {
    // Если серию сдвинут уже после запуска (advance), прогревать надо клип нового шага: это делает playEvent / advanceStreak.
    if (options.advance === true && options.step === undefined) return;
    this.queuePrewarm(event);
  }

  private queuePrewarm(event: SoundV2EventId): void {
    if (this.disposed) return;
    const def = SOUND_V2_CATALOG[event];
    const next = getSoundV2Clip(event, this.deckFor(event, def).peek(), this.streaks.get(event));
    const alreadyWarm = [...this.pool].some((entry) => entry.clip.file === next.file && entry.active === null);
    if (alreadyWarm || this.prewarmQueue.some((queued) => queued.file === next.file)) return;
    this.prewarmQueue.push(next);
    if (this.prewarmTimer === null) {
      this.prewarmTimer = this.deps.setTimer(() => this.prewarmStep(), PREWARM_DELAY_MS);
    }
  }

  private prewarmStep(): void {
    this.prewarmTimer = null;
    const next = this.prewarmQueue.shift();
    if (next && this.canPlayNow()) {
      const exists = [...this.pool].some((entry) => entry.clip.file === next.file);
      if (!exists) {
        const entry = this.createEntry(next);
        if (entry) this.evictIdle();
        this.deps.log(`${LOG} prewarm file=${next.file} ok=${String(entry !== null)} pool=${this.pool.size}`);
      }
    }
    if (this.prewarmQueue.length > 0 && !this.disposed) {
      this.prewarmTimer = this.deps.setTimer(() => this.prewarmStep(), PREWARM_GAP_MS);
    }
  }
}

// ═══════════════════════════ боевой синглтон и публичный API ═══════════════════════════

const streakBook = new StreakBook();
let bank: SoundBank | null = null;

function defaultDeps(): SoundBankDeps {
  let runtime: typeof import('./sound_v2_runtime') | null = null;
  const rt = () => {
    if (!runtime) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      runtime = require('./sound_v2_runtime') as typeof import('./sound_v2_runtime');
    }
    return runtime;
  };
  return {
    createPlayer: (clip) => rt().createRuntimePlayer(clip),
    isFlagEnabled: isSoundV2Enabled,
    isEffectsEnabled: () => rt().isEffectsEnabled(),
    isQuiet: () => rt().isRecordingActive(),
    isRateSupported: () => rt().isRateSupported(),
    rng: Math.random,
    now: Date.now,
    setTimer: (callback, ms) => setTimeout(callback, ms),
    clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    log: (message) => console.log(message),
    warn: (message) => console.warn(message),
    onFlagMiss: () => {
      void primeSoundV2Flag();
    },
    onSilenceNeeded: (listener) => rt().onSilenceNeeded(listener),
  };
}

function getBank(): SoundBank {
  if (!bank) bank = new SoundBank(defaultDeps(), streakBook);
  return bank;
}

/** Сыграть событие. Никогда не бросает: при любой причине «не играть» возвращает played=false и причину (и пишет её в лог). */
export function playEvent(event: SoundV2EventId, options?: PlayEventOptions): SoundV2PlayResult {
  try {
    return getBank().playEvent(event, options);
  } catch (error) {
    console.warn(`${LOG} playEvent упал event=${String(event)} (${errText(error)})`);
    return { event: String(event), played: false, reason: 'player_unavailable' };
  }
}

/** Верный ответ подряд: серия на шаг вперёд (держится на последнем шаге; кольцо дня идёт по кругу). Возвращает новый шаг. */
export function advanceStreak(event: SoundV2EventId): number {
  try {
    return getBank().advanceStreak(event);
  } catch (error) {
    console.warn(`${LOG} advanceStreak упал event=${String(event)} (${errText(error)})`);
    return 0;
  }
}

/** Ошибка: сбросить серию события или (без аргумента) все серии. */
export function resetStreak(event?: SoundV2EventId): void {
  try {
    getBank().resetStreak(event);
  } catch (error) {
    console.warn(`${LOG} resetStreak упал event=${String(event)} (${errText(error)})`);
  }
}

/** Текущий шаг серии события (с нуля). */
export function getStreakStep(event: SoundV2EventId): number {
  return streakBook.get(event);
}

/** Прогреть плееры событий заранее (по одному, с паузой). Ничего не делает при выключенном флаге. */
export function prewarmSoundV2(events: readonly SoundV2EventId[]): void {
  if (!isSoundV2Enabled()) return;
  try {
    getBank().prewarm(events);
  } catch (error) {
    console.warn(`${LOG} prewarm упал (${errText(error)})`);
  }
}

/** Прогреть флаг sound_v2 из кэша удалённой конфигурации (звать после старта приложения). */
export function primeSoundV2(): Promise<void> {
  return primeSoundV2Flag();
}

/** Погасить всё играющее и освободить плееры (выход из аккаунта, тесты). */
export function disposeSoundV2(): void {
  if (!bank) return;
  bank.dispose();
  bank = null;
}
