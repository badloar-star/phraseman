// Press-and-hold microphone capture for speaking practice on Android.
//
// WHY THIS EXISTS: Android's system SpeechRecognizer decides on its own when
// the speaker "stopped" (the endpointer), and on many OEM builds it fires
// ERROR_NO_MATCH within a fraction of a second — the mic appears to "close by
// itself the moment you tap it". It also needs Google's recognizer present at
// all, so it never works on a bare emulator. The reliable pattern the strongest
// speaking apps use (ELSA, Speak) is: the app records the audio itself and
// recognizes it separately. Here we capture raw PCM with an app-owned recorder
// (@fugood/react-native-audio-pcm-stream → AudioRecord, no Google needed, works
// offline everywhere), wrap it as a WAV, and hand the file to on-device whisper.
//
// Hold to record, release to stop → one WAV → whisper transcribes it. No
// endpointer, no OEM recognizer variance, no "recognizer busy" races.
//
// Lifecycle is guarded end-to-end: absent native package (jest / iOS / a binary
// built before this package was added) → isHoldRecordingSupported() is false and
// callers fall back to the system recognizer. A hard cap stops a stuck hold.

import { Platform } from 'react-native';

import { base64ToBytes, pcmChunksToWav, pcmDurationSec, type WavPcmConfig } from './pcm_wav';

/** 16 kHz mono 16-bit PCM — exactly what on-device whisper expects. */
export const HOLD_PCM_CONFIG: WavPcmConfig = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
};

/**
 * MediaRecorder.AudioSource.VOICE_RECOGNITION (6): the input tuned for speech
 * (noise suppression / AGC), the same source the recognizer would use.
 */
const ANDROID_AUDIO_SOURCE_VOICE_RECOGNITION = 6;

/** ~50ms of audio per buffer at 16 kHz mono 16-bit ≈ 1600 bytes; round up. */
const BUFFER_SIZE_BYTES = 4 * 1024;

/** Hard ceiling on a single hold so a stuck finger / missed release can't record forever. */
export const MAX_HOLD_MS = 20000;

/** Below this we treat the capture as "nothing said" (button fat-fingered). */
export const MIN_CAPTURE_SEC = 0.25;

let holdAttemptSequence = 0;

type LiveAudioStreamModule = {
  init: (options: {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    audioSource?: number;
    bufferSize?: number;
    wavFile: string;
  }) => void;
  start: () => void;
  stop: () => void | Promise<unknown>;
  on: (event: 'data', cb: (base64Chunk: string) => void) => { remove?: () => void } | undefined;
};

// Native module loaded lazily & guarded: pure functions above stay importable in
// jest (no native env), and the app degrades instead of crashing when the
// package isn't in the binary yet.
function loadLiveAudioStream(): LiveAudioStreamModule | null {
  // Android-only path. iOS keeps the system recognizer (whisper is disabled
  // there anyway), so we never touch this module on iOS.
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@fugood/react-native-audio-pcm-stream');
    const native = mod?.default ?? mod;
    if (
      !native ||
      typeof native.init !== 'function' ||
      typeof native.start !== 'function' ||
      typeof native.stop !== 'function' ||
      typeof native.on !== 'function'
    ) {
      return null;
    }
    return native as LiveAudioStreamModule;
  } catch {
    return null;
  }
}

type FsModule = { File: any; Directory: any; Paths: any } | null;

function loadFs(): FsModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('expo-file-system');
    if (!fs?.File || !fs?.Directory || !fs?.Paths) return null;
    return fs;
  } catch {
    return null;
  }
}

/** The hold-recorder path can run on this device/binary (Android + native package present). */
export function isHoldRecordingSupported(): boolean {
  return loadLiveAudioStream() != null && loadFs() != null;
}

/**
 * A single hold-to-record session. Create with `startHoldRecording()`, then call
 * `stop()` on release. One instance = one attempt; do not reuse.
 */
export interface HoldRecording {
  /**
   * Stop capture and flush a WAV file. Resolves the file:// uri, or null when
   * nothing usable was captured (too short / write failed). Idempotent.
   */
  stop: () => Promise<string | null>;
  /** Abort without producing a file (panel closed mid-hold). Idempotent. */
  cancel: () => void;
  /** True until stop()/cancel() settles. */
  isActive: () => boolean;
}

const SILENT_STOP: HoldRecording = {
  stop: async () => null,
  cancel: () => undefined,
  isActive: () => false,
};

/** Options for a hold-recording session. */
export interface StartHoldRecordingOptions {
  /**
   * Fired once, when the FIRST real PCM chunk arrives — i.e. the mic is actually
   * capturing. AudioRecord needs ~100-300ms to spin up after start(); showing
   * «Говори» before this drops the user's first word. Callers should flip the
   * "listening" UI / cue on this callback, not synchronously after start.
   */
  onFirstAudio?: () => void;
}

/**
 * Begin recording immediately. Returns a controller whose `stop()` yields the
 * WAV uri. Returns a no-op controller (stop→null) when unsupported, so callers
 * can always `await rec.stop()` and branch on null → fall back to the system
 * recognizer. NEVER throws.
 *
 * `opts.onFirstAudio` fires when capture is genuinely live (first PCM chunk),
 * so the UI can delay «Говори» until the mic is actually recording — the audio
 * captured before that point is still kept, so no leading word is lost.
 */
export function startHoldRecording(opts?: StartHoldRecordingOptions): HoldRecording {
  const native = loadLiveAudioStream();
  const fs = loadFs();
  if (!native || !fs) return SILENT_STOP;
  let firstAudioFired = false;

  const chunks: Uint8Array[] = [];
  let dataSub: { remove?: () => void } | undefined;
  let settled = false;
  let maxHoldTimer: ReturnType<typeof setTimeout> | null = null;
  // stop() may be triggered by release AND by the max-hold timer; share one promise.
  let stopPromise: Promise<string | null> | null = null;

  const clearMaxHold = () => {
    if (maxHoldTimer != null) {
      clearTimeout(maxHoldTimer);
      maxHoldTimer = null;
    }
  };

  const teardownNative = () => {
    try {
      dataSub?.remove?.();
    } catch {
      /* no-op */
    }
    dataSub = undefined;
    try {
      // stop() may return a promise (Android) — we don't await; we already have the PCM.
      void native.stop();
    } catch {
      /* no-op */
    }
  };

  const finalizeToWav = async (): Promise<string | null> => {
    const totalBytes = chunks.reduce((n, c) => n + c.length, 0);
    if (pcmDurationSec(totalBytes, HOLD_PCM_CONFIG) < MIN_CAPTURE_SEC) return null;
    try {
      const wav = pcmChunksToWav(chunks, HOLD_PCM_CONFIG);
      const dir = new fs.Directory(fs.Paths.cache, 'speaking_hold');
      if (!dir.exists) dir.create({ intermediates: true });
      // Unique per attempt: a late scorer or replay must never read a newer
      // attempt through the old shared `attempt.wav` path.
      const file = new fs.File(
        dir,
        `attempt-${Date.now()}-${++holdAttemptSequence}.wav`,
      );
      file.write(wav);
      return typeof file.uri === 'string' && file.uri.length > 0 ? file.uri : null;
    } catch {
      return null;
    }
  };

  const stop = (): Promise<string | null> => {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      settled = true;
      clearMaxHold();
      teardownNative();
      return finalizeToWav();
    })();
    return stopPromise;
  };

  const cancel = () => {
    if (settled) return;
    settled = true;
    clearMaxHold();
    teardownNative();
    // Drop captured audio; nothing to finalize.
    chunks.length = 0;
    stopPromise = Promise.resolve(null);
  };

  // Wire up capture. Any native throw → degrade to the no-op controller.
  try {
    native.init({
      sampleRate: HOLD_PCM_CONFIG.sampleRate,
      channels: HOLD_PCM_CONFIG.channels,
      bitsPerSample: HOLD_PCM_CONFIG.bitsPerSample,
      audioSource: ANDROID_AUDIO_SOURCE_VOICE_RECOGNITION,
      bufferSize: BUFFER_SIZE_BYTES,
      wavFile: '', // we assemble the WAV ourselves for full control over format/location
    });
    dataSub = native.on('data', (base64Chunk: string) => {
      if (settled) return;
      const bytes = base64ToBytes(base64Chunk);
      if (bytes.length > 0) {
        chunks.push(bytes);
        // Первый реальный чанк = мик пишет по-настоящему. Сообщаем один раз,
        // чтобы UI показал «Говори» именно сейчас, а не в момент cold-start.
        if (!firstAudioFired) {
          firstAudioFired = true;
          try {
            opts?.onFirstAudio?.();
          } catch {
            /* колбэк UI не должен ронять запись */
          }
        }
      }
    });
    native.start();
    maxHoldTimer = setTimeout(() => {
      // Missed release / stuck hold: stop ourselves so we still score what we have.
      void stop();
    }, MAX_HOLD_MS);
  } catch {
    teardownNative();
    return SILENT_STOP;
  }

  return {
    stop,
    cancel,
    isActive: () => !settled,
  };
}

/** Delete a transient hold-recording WAV (best-effort cache hygiene). */
export function deleteHoldRecording(uri: string | null): void {
  if (!uri) return;
  const fs = loadFs();
  if (!fs) return;
  try {
    const file = new fs.File(uri);
    if (file.exists) file.delete();
  } catch {
    /* already gone / locked — not critical */
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
