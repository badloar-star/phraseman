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

let currentPlayer: AudioPlayer | null = null;
let audioModeReady = false;
const inFlightDownloads = new Map<string, Promise<string | null>>();

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
export async function playPhraseByText(text: string, cb?: PlayCallbacks): Promise<boolean> {
  const url = getPhraseAudioUrl(text);
  if (!url) return false;

  const key = normalizePhraseAudioKey(text);
  await ensureAudioMode();

  // Prefer the on-disk cached file; if caching failed, stream from the URL once.
  const cachedUri = await getCachedOrDownload(key, url);
  const source: string = cachedUri ?? url;

  try {
    stopPhraseAudio();
    const player = createAudioPlayer(source);
    currentPlayer = player;
    cb?.onStart?.();
    let finished = false;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (finished) return;
      if (status.didJustFinish) {
        finished = true;
        cb?.onDone?.();
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
