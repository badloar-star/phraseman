// Build a canonical 44-byte RIFF/WAVE PCM container around raw PCM samples.
//
// The on-device recorder (@fugood/react-native-audio-pcm-stream) streams raw
// little-endian 16-bit PCM. whisper.rn's file parser accepts ONLY PCM WAV
// (RIFF/WAVE, 16-bit) and does not decode compressed audio — so we wrap the
// captured PCM in a WAV header ourselves before handing the file to whisper.
//
// Pure (no native / React imports): the header layout and the concat are fully
// unit-testable, and a wrong byte here would silently break recognition.

/** Standard PCM WAV header size in bytes. */
export const WAV_HEADER_BYTES = 44;

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP: Int16Array = (() => {
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < BASE64_ALPHABET.length; i += 1) {
    table[BASE64_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

/**
 * Decode a standard base64 string to raw bytes WITHOUT relying on `atob`,
 * `Buffer`, or any global — the native recorder streams PCM as base64 and we
 * need the exact bytes on every JS engine (Hermes/JSC). Ignores whitespace and
 * `=` padding; unknown characters are skipped defensively.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const src = base64 ?? '';
  // Worst-case size; we trim to the real length after decoding.
  const out = new Uint8Array(Math.ceil((src.length * 3) / 4));
  let outLen = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < src.length; i += 1) {
    const val = BASE64_LOOKUP[src.charCodeAt(i)];
    if (val < 0) continue; // whitespace, '=', or stray char
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outLen] = (buffer >> bits) & 0xff;
      outLen += 1;
    }
  }
  return out.subarray(0, outLen);
}

export interface WavPcmConfig {
  /** Samples per second, e.g. 16000 (what whisper expects). */
  sampleRate: number;
  /** 1 = mono, 2 = stereo. */
  channels: number;
  /** Bits per sample, e.g. 16. */
  bitsPerSample: number;
}

/**
 * Create the 44-byte WAV header for a PCM payload of `dataSize` bytes.
 * Multi-byte fields are little-endian, per the WAV spec; the four ASCII tags
 * (RIFF/WAVE/fmt/data) are written big-endian so their bytes read in order.
 */
export function buildWavHeader(dataSize: number, config: WavPcmConfig): Uint8Array {
  const { sampleRate, channels, bitsPerSample } = config;
  const header = new ArrayBuffer(WAV_HEADER_BYTES);
  const view = new DataView(header);
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true); // ChunkSize = 36 + Subchunk2Size
  view.setUint32(8, 0x57415645, false); // "WAVE"

  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true); // Subchunk2Size = PCM byte count

  return new Uint8Array(header);
}

/**
 * Concatenate raw PCM chunks (in capture order) into one buffer.
 * Kept separate from header-building so both are trivially testable.
 */
export function concatPcmChunks(chunks: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Wrap raw PCM chunks into a complete WAV file (header + data) ready to write
 * to disk and feed to whisper.
 */
export function pcmChunksToWav(
  chunks: readonly Uint8Array[],
  config: WavPcmConfig,
): Uint8Array {
  const pcm = concatPcmChunks(chunks);
  const header = buildWavHeader(pcm.length, config);
  const out = new Uint8Array(header.length + pcm.length);
  out.set(header, 0);
  out.set(pcm, header.length);
  return out;
}

/** Duration in seconds of a PCM byte payload — used to reject empty captures. */
export function pcmDurationSec(dataSize: number, config: WavPcmConfig): number {
  const bytesPerSec = config.sampleRate * config.channels * (config.bitsPerSample / 8);
  if (bytesPerSec <= 0) return 0;
  return dataSize / bytesPerSec;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
