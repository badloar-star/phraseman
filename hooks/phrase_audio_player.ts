// High-quality phrase audio playback (OpenAI TTS, voice "fable").
//
// Plays a pre-generated mp3 hosted on Firebase Storage for a given phrase text,
// caching it on disk so each clip is downloaded at most once and then plays
// instantly offline. Falls back gracefully: callers should use expo-speech if
// playByText() returns false.
//
// Kept separate from use-audio.ts so the speak() hook stays small.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
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
function clampPlaybackRate(rate: number | undefined): number {
  if (typeof rate !== 'number' || !isFinite(rate)) return 1;
  return Math.min(MAX_CLIP_RATE, Math.max(MIN_CLIP_RATE, rate));
}

let currentPlayer: AudioPlayer | null = null;
let audioModeReady = false;
const inFlightDownloads = new Map<string, Promise<string | null>>();

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

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
    audioModeReady = true;
  } catch {
    // Non-fatal; playback may still work with default mode.
    audioModeReady = true;
  }
}

async function getCachedOrDownload(key: string, url: string): Promise<string | null> {
  const file = cacheFileFor(key);
  try {
    if (file.exists && (file.size ?? 0) > 200) return file.uri;
  } catch {
    // fall through to download
  }

  if (inFlightDownloads.has(key)) return inFlightDownloads.get(key)!;

  const task = (async (): Promise<string | null> => {
    try {
      const dir = cacheDir();
      if (!dir.exists) dir.create({ intermediates: true });
      const downloaded = await File.downloadFileAsync(url, file);
      if (downloaded.exists && (downloaded.size ?? 0) > 200) return downloaded.uri;
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
  if (currentPlayer) {
    try {
      currentPlayer.pause();
      currentPlayer.remove();
    } catch {
      // ignore
    }
    currentPlayer = null;
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
    // Honor the user's speed slider on the pre-generated clip, with pitch
    // correction so a slowed-down voice stays natural (not deep/garbled).
    try {
      player.shouldCorrectPitch = true;
      player.setPlaybackRate(clampPlaybackRate(rate), 'high');
    } catch {
      // older/edge runtimes: ignore, play at natural rate
    }
    cb?.onStart?.();
    let finished = false;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (finished) return;
      if (status.didJustFinish) {
        finished = true;
        // Only report completion if this play is still the active one — a
        // superseded clip's late finish must not re-trigger caller auto-advance.
        if (!superseded()) cb?.onDone?.();
        try { sub?.remove(); } catch {}
        if (currentPlayer === player) {
          try { player.remove(); } catch {}
          currentPlayer = null;
        }
      }
    });
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
