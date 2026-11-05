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
import { DebugLogger } from './debug-logger';

type RecordingActivityLease = { release(): void };

// Keep the pure PCM helpers importable in Jest and scripts without loading the
// native expo-audio package. The literal require is still statically bundled.
function claimRecordingActivity(stop: () => void): RecordingActivityLease {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const activity = require('../modules/audio/audio_runtime_arbiter') as {
      claimRecordingAudio?: (stopOwner: () => void) => RecordingActivityLease;
    };
    return activity.claimRecordingAudio?.(stop) ?? { release: () => undefined };
  } catch {
    return { release: () => undefined };
  }
}

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

/** Convert little-endian signed PCM16 into the 0..4 scale used by VoiceEqualizer. */
export function pcm16VolumeSample(bytes: Uint8Array): number {
  const sampleCount = Math.floor(bytes.length / 2);
  if (sampleCount <= 0) return 0;
  let squareSum = 0;
  for (let i = 0; i < sampleCount * 2; i += 2) {
    let sample = (bytes[i] ?? 0) | ((bytes[i + 1] ?? 0) << 8);
    if (sample >= 0x8000) sample -= 0x10000;
    const normalized = sample / 32768;
    squareSum += normalized * normalized;
  }
  const rms = Math.sqrt(squareSum / sampleCount);
  return Math.max(0, Math.min(4, rms * 16));
}

let holdAttemptSequence = 0;

type LiveAudioStreamModule = {
  init: (options: {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    audioSource?: number;
    bufferSize?: number;
    wavFile: string;
  }) => void | Promise<void>;
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
  readonly finalized: Promise<HoldRecordingFinalization>;
  dispose: () => Promise<HoldRecordingFinalization>;
  /**
   * Stop capture and flush a WAV file. Resolves the file:// uri, or null when
   * nothing usable was captured (too short / write failed). Idempotent.
   */
  stop: () => Promise<string | null>;
  /** Abort without producing a file (panel closed mid-hold). Idempotent. */
  cancel: () => void;
  /** True until stop()/cancel() settles. */
  isActive: () => boolean;
  /** Numeric capture evidence only; never includes speech or file paths. */
  diagnostics?: () => HoldCaptureDiagnostics;
}

type CaptureOutcome = 'recording' | 'stopped' | 'too_short' | 'cancelled' | 'superseded' | 'init_failed' | 'write_failed' | 'unsupported';
export type HoldRecordingFinalization = Readonly<{
  trigger: 'manual_stop' | 'max_hold' | 'cancelled' | 'superseded' | 'init_failed' | 'unsupported';
  status: 'wav' | 'too_short' | 'write_failed' | 'native_stop_failed' | 'no_wav';
  uri: string | null;
  diagnostics: HoldCaptureDiagnostics;
}>;
export type HoldCaptureDiagnostics = Readonly<{
  why: CaptureOutcome;
  pcmMs: number;
  chunks: number;
  peak: number;
}>;

const SILENT_STOP: HoldRecording = {
  finalized: Promise.resolve({ trigger: 'unsupported', status: 'no_wav', uri: null, diagnostics: { why: 'unsupported', pcmMs: 0, chunks: 0, peak: 0 } }),
  dispose: () => SILENT_STOP.finalized,
  stop: async () => null,
  cancel: () => undefined,
  isActive: () => false,
  diagnostics: () => ({ why: 'unsupported', pcmMs: 0, chunks: 0, peak: 0 }),
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
  /** Live PCM loudness for animation only; never participates in recognition. */
  onLevel?: (rawVolume: number) => void;
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
  let outcome: CaptureOutcome = 'recording';
  let capturedBytes = 0;
  let chunkCount = 0;
  let peak = 0;
  let allocatedUri: string | null = null;

  const chunks: Uint8Array[] = [];
  let dataSub: { remove?: () => void } | undefined;
  let settled = false;
  let maxHoldTimer: ReturnType<typeof setTimeout> | null = null;
  // Native PCM capture bypasses expo-speech, so it must explicitly participate
  // in the same process-wide session arbitration as the system recognizer.
  let recordingLease: RecordingActivityLease | null = null;
  // stop() may be triggered by release AND by the max-hold timer; share one promise.
  let resolveFinalized!: (result: HoldRecordingFinalization) => void;
  const finalized = new Promise<HoldRecordingFinalization>(resolve => { resolveFinalized = resolve; });
  const diagnostics = (): HoldCaptureDiagnostics => ({ why: outcome, pcmMs: Math.round(pcmDurationSec(capturedBytes, HOLD_PCM_CONFIG) * 1000), chunks: chunkCount, peak: Math.round(peak * 1000) / 1000 });

  const clearMaxHold = () => {
    if (maxHoldTimer != null) {
      clearTimeout(maxHoldTimer);
      maxHoldTimer = null;
    }
  };

  const releaseRecordingLease = () => {
    recordingLease?.release();
    recordingLease = null;
  };

  const teardownNative = async () => {
    try {
      dataSub?.remove?.();
    } catch (e) {
      // no-op
      DebugLogger.error('speaking_hold_recorder:teardownNative', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    dataSub = undefined;
    try {
      await native.stop();
    } catch (e) {
      // no-op
      DebugLogger.error('speaking_hold_recorder:teardownNative', e instanceof Error ? e : new Error(String(e)), 'warning');
      return false;
    }
    return true;
  };

  const finalizeToWav = async (): Promise<string | null> => {
    const totalBytes = chunks.reduce((n, c) => n + c.length, 0);
    if (pcmDurationSec(totalBytes, HOLD_PCM_CONFIG) < MIN_CAPTURE_SEC) {
      outcome = 'too_short';
      return null;
    }
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
      // Preserve the allocated path if the write creates a partial file then throws.
      allocatedUri = typeof file.uri === 'string' && file.uri.startsWith('file://') ? file.uri : null;
      file.write(wav);
      if (typeof file.uri !== 'string' || file.uri.length === 0) { outcome = 'write_failed'; return null; }
      outcome = 'stopped';
      return file.uri;
    } catch {
      outcome = 'write_failed';
      return null;
    }
  };

  const terminate = (trigger: HoldRecordingFinalization['trigger'], discard: boolean): Promise<HoldRecordingFinalization> => {
    if (settled) return finalized;
    settled = true;
    clearMaxHold();
    if (discard) { outcome = trigger as CaptureOutcome; chunks.length = 0; }
    void (async () => {
      let uri: string | null = null;
      let status: HoldRecordingFinalization['status'] = 'no_wav';
      try {
        const stopped = await teardownNative();
        if (!stopped) status = 'native_stop_failed';
        else if (!discard) {
          uri = await finalizeToWav();
          status = uri ? 'wav' : outcome === 'too_short' ? 'too_short' : 'write_failed';
          if (status === 'write_failed') {
            // Failed artifacts never leave the recorder: legacy callers only see stop() -> null.
            // Successful WAV ownership still belongs to the caller/session.
            deleteHoldRecording(allocatedUri);
            uri = null;
          }
        }
      } finally {
        chunks.length = 0;
        releaseRecordingLease();
        resolveFinalized(Object.freeze({ trigger, status, uri, diagnostics: diagnostics() }));
      }
    })();
    return finalized;
  };
  const stop = () => terminate('manual_stop', false).then(result => result.status === 'wav' ? result.uri : null);
  const cancelCapture = (reason: 'cancelled' | 'superseded' | 'init_failed') => { void terminate(reason, true); };
  const cancel = () => cancelCapture('cancelled');

  // Wire up capture. Any native throw → degrade to the no-op controller.
  try {
    // Revocation must retire the controller too. A late cancel/stop from the
    // previous panel must never stop the new owner's native recorder.
    recordingLease = claimRecordingActivity(() => cancelCapture('superseded'));
    const initialized = native.init({
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
        capturedBytes += bytes.length;
        chunkCount += 1;
        const level = pcm16VolumeSample(bytes);
        peak = Math.max(peak, level);
        try {
          opts?.onLevel?.(level);
        } catch (e) {
      // UI animation callbacks must never interrupt audio capture.
      DebugLogger.error('speaking_hold_recorder:bytes', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        // Первый реальный чанк = мик пишет по-настоящему. Сообщаем один раз,
        // чтобы UI показал «Говори» именно сейчас, а не в момент cold-start.
        if (!firstAudioFired) {
          firstAudioFired = true;
          try {
            opts?.onFirstAudio?.();
          } catch (e) {
      // колбэк UI не должен ронять запись
      DebugLogger.error('speaking_hold_recorder:bytes', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        }
      }
    });
    // Android init returns a Promise. Never start a failed or released capture.
    void Promise.resolve(initialized).then(() => {
      if (settled) return;
      native.start();
    }).catch((error: unknown) => {
      DebugLogger.error('speaking_hold_recorder:init', error instanceof Error ? error : new Error(String(error)), 'warning');
      cancelCapture('init_failed');
    });
    maxHoldTimer = setTimeout(() => {
      // Missed release / stuck hold: stop ourselves so we still score what we have.
      void terminate('max_hold', false);
    }, MAX_HOLD_MS);
  } catch {
    cancelCapture('init_failed');
  }

  return {
    finalized,
    dispose: () => terminate('cancelled', true),
    stop,
    cancel,
    isActive: () => !settled,
    diagnostics: () => ({ why: outcome, pcmMs: Math.round(pcmDurationSec(capturedBytes, HOLD_PCM_CONFIG) * 1000), chunks: chunkCount, peak: Math.round(peak * 1000) / 1000 }),
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
  } catch (e) {
      // already gone / locked — not critical
      DebugLogger.error('speaking_hold_recorder:file', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
