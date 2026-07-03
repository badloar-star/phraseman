import {
  WAV_HEADER_BYTES,
  base64ToBytes,
  buildWavHeader,
  concatPcmChunks,
  pcmChunksToWav,
  pcmDurationSec,
} from '../app/pcm_wav';

const CONFIG = { sampleRate: 16000, channels: 1, bitsPerSample: 16 };

function readTag(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

describe('buildWavHeader', () => {
  it('emits a 44-byte header with the canonical RIFF/WAVE/fmt/data tags', () => {
    const h = buildWavHeader(1000, CONFIG);
    expect(h.length).toBe(WAV_HEADER_BYTES);
    expect(readTag(h, 0)).toBe('RIFF');
    expect(readTag(h, 8)).toBe('WAVE');
    expect(readTag(h, 12)).toBe('fmt ');
    expect(readTag(h, 36)).toBe('data');
  });

  it('encodes PCM format, channel count, sample rate and derived rates correctly', () => {
    const dataSize = 32000;
    const h = buildWavHeader(dataSize, CONFIG);
    expect(readUint32LE(h, 4)).toBe(36 + dataSize); // ChunkSize
    expect(readUint16LE(h, 20)).toBe(1); // AudioFormat = PCM
    expect(readUint16LE(h, 22)).toBe(1); // channels
    expect(readUint32LE(h, 24)).toBe(16000); // sampleRate
    expect(readUint32LE(h, 28)).toBe(16000 * 1 * 2); // byteRate
    expect(readUint16LE(h, 32)).toBe(2); // blockAlign
    expect(readUint16LE(h, 34)).toBe(16); // bitsPerSample
    expect(readUint32LE(h, 40)).toBe(dataSize); // Subchunk2Size
  });
});

describe('concatPcmChunks', () => {
  it('joins chunks in order', () => {
    const out = concatPcmChunks([new Uint8Array([1, 2]), new Uint8Array([3]), new Uint8Array([4, 5])]);
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns an empty buffer for no chunks', () => {
    expect(concatPcmChunks([]).length).toBe(0);
  });
});

describe('pcmChunksToWav', () => {
  it('prepends a 44-byte header and appends the PCM payload', () => {
    const pcm = new Uint8Array([10, 20, 30, 40]);
    const wav = pcmChunksToWav([pcm], CONFIG);
    expect(wav.length).toBe(WAV_HEADER_BYTES + pcm.length);
    expect(readTag(wav, 0)).toBe('RIFF');
    expect(readUint32LE(wav, 40)).toBe(pcm.length); // data size matches payload
    expect(Array.from(wav.slice(WAV_HEADER_BYTES))).toEqual([10, 20, 30, 40]);
  });
});

describe('pcmDurationSec', () => {
  it('computes seconds from PCM byte count', () => {
    // 16000 Hz * 1 ch * 2 bytes = 32000 bytes/sec → 16000 bytes = 0.5s
    expect(pcmDurationSec(16000, CONFIG)).toBeCloseTo(0.5, 5);
    expect(pcmDurationSec(0, CONFIG)).toBe(0);
  });

  it('is zero (not NaN/Infinity) for a degenerate config', () => {
    expect(pcmDurationSec(1000, { sampleRate: 0, channels: 1, bitsPerSample: 16 })).toBe(0);
  });
});

describe('base64ToBytes', () => {
  it('decodes standard base64 to the exact bytes', () => {
    // "hello" → aGVsbG8=
    expect(Array.from(base64ToBytes('aGVsbG8='))).toEqual([104, 101, 108, 108, 111]);
  });

  it('decodes without padding', () => {
    // "hell" → aGVsbA (no '=')
    expect(Array.from(base64ToBytes('aGVsbA'))).toEqual([104, 101, 108, 108]);
  });

  it('ignores whitespace/newlines embedded in the stream', () => {
    expect(Array.from(base64ToBytes('aGVs\nbG8='))).toEqual([104, 101, 108, 108, 111]);
  });

  it('returns empty for empty / nullish input', () => {
    expect(base64ToBytes('').length).toBe(0);
    // @ts-expect-error runtime guard for a nullish chunk
    expect(base64ToBytes(undefined).length).toBe(0);
  });

  it('round-trips 16-bit PCM sample bytes losslessly', () => {
    const original = new Uint8Array([0x00, 0x80, 0xff, 0x7f, 0x01, 0xfe]);
    // Encode with Node Buffer, decode with our function.
    const b64 = Buffer.from(original).toString('base64');
    expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(original));
  });
});
