// High-quality phrase audio playback (OpenAI TTS, voice "fable").
//
// Plays a pre-generated mp3 hosted on Firebase Storage for a given phrase text,
// caching it on disk so each clip is downloaded at most once and then plays
// instantly offline. Falls back gracefully: callers should use expo-speech if
// playByText() returns false.
//
// Kept separate from use-audio.ts so the speak() hook stays small.

import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { setManagedAudioMode } from '../app/audio_session_coordinator';
import { Directory, File, Paths } from 'expo-file-system';
import { LOUD_PLAYBACK_AUDIO_MODE } from '../app/audio_playback_mode';
import { getPhraseAudioUrl, normalizePhraseAudioKey } from '../app/phrase_audio_url_map.generated';

const CACHE_DIR_NAME = 'phrase-audio';

type PlayCallbacks = {
  onStart?: () => void;
  onDone?: () => void;
  onError?: (e: Error) => void;
};

// Clamp the clip playback rate to the slider's usable range. Below ~0.8 the
// pre-generated voice distorts/garbles; above ~1.3 it gets too fast for a
// learner. The clips are recorded at a calm pace, so 1.0 already sounds natural.
const MIN_CLIP_RATE = 0.8;
const MAX_CLIP_RATE = 1.3;
const DOWNLOAD_TIMEOUT_MS = 4500;
const MIN_VALID_AUDIO_BYTES = 200;
const CACHE_MAX_BYTES = 96 * 1024 * 1024;
const CACHE_TARGET_BYTES = 80 * 1024 * 1024;
const CACHE_MAX_FILES = 2000;
const CACHE_TARGET_FILES = 1800;
const CACHE_SWEEP_INTERVAL_MS = 10 * 60 * 1000;
// If a created native player never reports itself loaded+playing within this
// window, we treat the clip as failed: free the native player and let the caller
// fall back to TTS. Without this, an exhausted native player slot (accumulated
// over a lesson) leaves a silent player that never emits didJustFinish — the clip
// dies with no fallback, and only an app restart frees the slot. Generous enough
// to cover a cold first-play + short buffering; the caller has its own longer
// CLIP_START_TIMEOUT backstop.
const CLIP_PLAY_WATCHDOG_MS = 3500;

function clampPlaybackRate(rate: number | undefined): number {
  if (typeof rate !== 'number' || !isFinite(rate)) return 1;
  return Math.min(MAX_CLIP_RATE, Math.max(MIN_CLIP_RATE, rate));
}

let currentPlayer: AudioPlayer | null = null;
// Слушатель playbackStatusUpdate текущего плеера. Держим ссылку, чтобы снять его
// при остановке/смене фразы — иначе каждый прерванный клип оставляет висящую
// подписку (утечка, копящаяся за урок: десятки фраз → десятки слушателей).
let currentSub: { remove: () => void } | null = null;
// Watchdog текущего плеера: если клип не заиграл вовремя (исчерпан нативный лимит
// плееров / клип не декодировался), снимаем плеер и уходим в фолбэк.
let currentWatchdog: ReturnType<typeof setTimeout> | null = null;

// Каждый createAudioPlayer — сырой нативный AudioPlayer БЕЗ авто-release
// (в отличие от useAudioPlayer). Если хоть один путь пропустит remove(), нативный
// плеер утекает, и после ~N клипов за урок ОС отказывает новым — звук фразы глохнет
// (эффекты живут: у них один постоянный пул-плеер). Держим реестр всех живых
// плееров и гарантированно освобождаем каждый — реестр как страховка от утечки в
// гоночных путях, а не только текущий currentPlayer.
const livePlayers = new Set<AudioPlayer>();

// Безопасно освободить нативный плеер и убрать его из реестра. Идемпотентно.
function disposePlayer(player: AudioPlayer | null): void {
  if (!player) return;
  livePlayers.delete(player);
  try {
    player.pause();
  } catch {
    // ignore
  }
  try {
    player.remove();
  } catch {
    // ignore
  }
}

function clearCurrentWatchdog(): void {
  if (currentWatchdog != null) {
    clearTimeout(currentWatchdog);
    currentWatchdog = null;
  }
}
const inFlightDownloads = new Map<string, Promise<string | null>>();
let lastCacheSweepAt = 0;
let cacheSweepInFlight = false;

// Monotonic token: every stopPhraseAudio() / new playPhraseByText() bumps it.
// Async work captures the token before awaiting and bails if it changed, so a
// download that resolves after the user stopped or moved on never starts audio.
let playGeneration = 0;

function cacheDir(): Directory {
  return new Directory(Paths.cache, CACHE_DIR_NAME);
}

function cacheFileFor(key: string): File {
  // Stable filename derived from the normalized text key.
  const safe = key.replace(/[^a-z0-9]+/g, '_').slice(0, 80) || 'phrase';
  return new File(cacheDir(), `${safe}.mp3`);
}

type CachedAudioFile = {
  file: File;
  uri: string;
  size: number;
  at: number;
};

function isCacheAudioFile(entry: File | Directory): entry is File {
  return entry instanceof File && entry.uri.toLowerCase().endsWith('.mp3');
}

async function sweepPhraseAudioCache(protectedUri?: string): Promise<void> {
  const dir = cacheDir();
  if (!dir.exists) return;

  const files: CachedAudioFile[] = [];
  let totalBytes = 0;
  const entries = dir.list();
  for (const entry of entries) {
    if (!isCacheAudioFile(entry)) continue;
    let size = 0;
    let at = 0;
    try {
      size = entry.size ?? 0;
      at = entry.modificationTime ?? entry.creationTime ?? 0;
    } catch {
      size = 0;
      at = 0;
    }
    if (size < MIN_VALID_AUDIO_BYTES) {
      if (entry.uri !== protectedUri) {
        try { entry.delete(); } catch {}
      }
      continue;
    }
    files.push({ file: entry, uri: entry.uri, size, at });
    totalBytes += size;
  }

  if (totalBytes <= CACHE_MAX_BYTES && files.length <= CACHE_MAX_FILES) return;
  files.sort((a, b) => (a.at || 0) - (b.at || 0));
  let nextBytes = totalBytes;
  let nextCount = files.length;
  for (const item of files) {
    if (nextBytes <= CACHE_TARGET_BYTES && nextCount <= CACHE_TARGET_FILES) break;
    if (item.uri === protectedUri) continue;
    try {
      item.file.delete();
      nextBytes -= item.size;
      nextCount -= 1;
    } catch {
      // Best-effort cache cleanup must never affect playback.
    }
  }
}

function maybeSweepPhraseAudioCache(protectedUri?: string): void {
  const now = Date.now();
  if (cacheSweepInFlight || now - lastCacheSweepAt < CACHE_SWEEP_INTERVAL_MS) return;
  cacheSweepInFlight = true;
  lastCacheSweepAt = now;
  void sweepPhraseAudioCache(protectedUri)
    .catch(() => {})
    .finally(() => {
      cacheSweepInFlight = false;
    });
}

function downloadFileWithTimeout(url: string, file: File): Promise<File | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), DOWNLOAD_TIMEOUT_MS);
  });
  // expo-file-system ships two structurally-identical `File` declarations
  // (FileSystem vs ExpoFileSystem.types); downloadFileAsync resolves to the
  // latter, so cast back to the imported `File` to keep the signature aligned.
  return Promise.race([
    File.downloadFileAsync(url, file) as Promise<File>,
    timeout,
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function ensureAudioMode(): Promise<void> {
  try {
    // Other screens can change the shared native audio session after phrase
    // audio has played once, so restore the phrase mode on every clip.
    await setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE);
  } catch {
    // Non-fatal; playback may still work with default mode.
  }
}

async function getCachedOrDownload(key: string, url: string): Promise<string | null> {
  const file = cacheFileFor(key);
  try {
    if (file.exists) {
      if ((file.size ?? 0) > MIN_VALID_AUDIO_BYTES) {
        maybeSweepPhraseAudioCache(file.uri);
        return file.uri;
      }
      file.delete();
    }
  } catch {
    // fall through to download
  }

  if (inFlightDownloads.has(key)) return inFlightDownloads.get(key)!;

  const task = (async (): Promise<string | null> => {
    try {
      const dir = cacheDir();
      if (!dir.exists) dir.create({ intermediates: true });
      const downloaded = await downloadFileWithTimeout(url, file);
      if (!downloaded) return null;
      if (downloaded.exists && (downloaded.size ?? 0) > MIN_VALID_AUDIO_BYTES) {
        maybeSweepPhraseAudioCache(downloaded.uri);
        return downloaded.uri;
      }
      return null;
    } catch {
      return null;
    } finally {
      inFlightDownloads.delete(key);
    }
  })();

  inFlightDownloads.set(key, task);
  return task;
}

export function stopPhraseAudio(): void {
  // Invalidate any in-flight playPhraseByText so a pending download won't start.
  playGeneration += 1;
  clearCurrentWatchdog();
  // Снимаем слушатель ДО player.remove(), иначе подписка остаётся висеть.
  if (currentSub) {
    try { currentSub.remove(); } catch {}
    currentSub = null;
  }
  if (currentPlayer) {
    disposePlayer(currentPlayer);
    currentPlayer = null;
  }
  // Страховка: если гоночный путь оставил живой плеер вне currentPlayer, освободить
  // и его — иначе нативные слоты копятся до отказа за урок.
  if (livePlayers.size > 0) {
    for (const player of Array.from(livePlayers)) disposePlayer(player);
  }
}

/**
 * Try to play a high-quality clip for `text`. Returns true if a clip exists and
 * playback was started (download may still be in progress on first use); returns
 * false if there is no clip for this text — the caller should fall back to TTS.
 */
export async function playPhraseByText(
  text: string,
  cb?: PlayCallbacks,
  rate?: number,
): Promise<boolean> {
  const url = getPhraseAudioUrl(text);
  if (!url) return false;

  const key = normalizePhraseAudioKey(text);
  // Claim this playback: stop whatever was playing and capture the new token.
  stopPhraseAudio();
  const myGeneration = playGeneration;
  const superseded = () => playGeneration !== myGeneration;

  await ensureAudioMode();
  if (superseded()) return true; // stop()/another play() happened during await

  // Prefer the on-disk cached file; if caching failed, stream from the URL once.
  const cachedUri = await getCachedOrDownload(key, url);
  if (superseded()) return true; // user moved on while downloading — do not play
  const source: string = cachedUri ?? url;

  try {
    const player = createAudioPlayer(source);
    currentPlayer = player;
    livePlayers.add(player);
    // Play the clip at full volume. Without this the player can default below
    // the level the old expo-speech path used (which always passed volume: 1),
    // making phrases sound quieter than before the OpenAI-clip switch.
    try {
      player.volume = 1;
    } catch {
      // ignore on runtimes without a settable volume
    }
    // Honor the user's speed slider on the pre-generated clip, with pitch
    // correction so a slowed-down voice stays natural (not deep/garbled).
    try {
      player.shouldCorrectPitch = true;
      player.setPlaybackRate(clampPlaybackRate(rate), 'high');
    } catch {
      // older/edge runtimes: ignore, play at natural rate
    }

    let finished = false;
    let started = false;
    // Общий разбор клипа: снять подписку/watchdog и освободить нативный плеер.
    // fromWatchdog=true → это провал старта (плеер завис/не декодировался).
    const teardown = (fromWatchdog: boolean) => {
      if (finished) return;
      finished = true;
      clearCurrentWatchdog();
      try { sub.remove(); } catch {}
      if (currentSub === sub) currentSub = null;
      disposePlayer(player);
      if (currentPlayer === player) currentPlayer = null;
      // Провал старта на актуальном клипе → сообщаем ошибку, чтобы вызывающая
      // сторона ушла в системный TTS (иначе фраза молча пропадает).
      if (fromWatchdog && !superseded()) {
        cb?.onError?.(new Error('phrase clip failed to start'));
      }
    };

    // Кол-во пришедших статусов: первый 'idle' — это НАЧАЛЬНОЕ состояние до
    // загрузки, он нормален. 'idle' ПОСЛЕ него = ExoPlayer упал в STATE_IDLE
    // (ошибка декода / исчерпан нативный слот): expo-audio не эмитит отдельного
    // события ошибки, поэтому это единственный точный признак сбоя (см. нативный
    // AudioPlayer.kt: STATE_IDLE→"idle", onPlayerError не проброшен).
    let statusTicks = 0;

    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (finished) return;
      statusTicks += 1;
      // Реальный старт воспроизведения — только теперь гасим watchdog и сообщаем
      // onStart. КРИТИЧНО: onStart НЕ вызываем сразу после createAudioPlayer —
      // иначе вызывающая сторона снимет свой fallback-таймер для плеера, который
      // на исчерпанном нативном слоте никогда не заиграет → вечная тишина.
      if (!started && status.isLoaded && status.playing) {
        started = true;
        clearCurrentWatchdog();
        if (!superseded()) cb?.onStart?.();
      }
      // Точное само-лечение (не ждём таймер): плеер вернулся в 'idle' уже ПОСЛЕ
      // первого статуса, но так и не заиграл → это сбой натива. Освобождаем слот
      // и уходим в TTS немедленно, а не через CLIP_PLAY_WATCHDOG_MS.
      if (!started && statusTicks > 1 && status.playbackState === 'idle') {
        teardown(true);
        return;
      }
      if (status.didJustFinish) {
        const wasSuperseded = superseded();
        // Естественное завершение: разбираем плеер и (если ещё актуальны)
        // сообщаем onDone. wasSuperseded-клип не должен триггерить авто-переход.
        finished = true;
        clearCurrentWatchdog();
        try { sub.remove(); } catch {}
        if (currentSub === sub) currentSub = null;
        disposePlayer(player);
        if (currentPlayer === player) currentPlayer = null;
        if (!wasSuperseded) cb?.onDone?.();
      }
    });
    // Регистрируем активную подписку, чтобы stopPhraseAudio() мог её снять при
    // прерывании (смена фразы) — а не только естественное завершение клипа.
    currentSub = sub;
    // Watchdog старта: если клип не заиграл вовремя, освобождаем нативный плеер и
    // уходим в фолбэк. Это и есть само-лечение от «звук глохнет после половины
    // урока»: ни один зависший плеер не остаётся навсегда занимать слот/синглтон.
    clearCurrentWatchdog();
    currentWatchdog = setTimeout(() => {
      currentWatchdog = null;
      if (!started) teardown(true);
    }, CLIP_PLAY_WATCHDOG_MS);
    player.play();
    return true;
  } catch (e) {
    cb?.onError?.(e instanceof Error ? e : new Error(String(e)));
    return false;
  }
}

export function hasPhraseAudio(text: string): boolean {
  return !!getPhraseAudioUrl(text);
}
