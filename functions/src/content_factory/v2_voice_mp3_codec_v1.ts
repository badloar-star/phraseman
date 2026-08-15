import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

export const V2_VOICE_MP3_CODEC_RESULT_SCHEMA_V1 =
  "v2-voice-mp3-codec-result.v1" as const;
export const V2_VOICE_MP3_CODEC_RULES_V1 = Object.freeze({
  schemaVersion: "v2-voice-mp3-codec-rules.v1" as const,
  container: "mpeg_audio_elementary_stream" as const,
  layer: "layer_iii_only" as const,
  minimumConsecutiveFrames: 2,
  acceptedMpegVersions: Object.freeze(["1", "2", "2.5"] as const),
  acceptedId3v2MajorVersions: Object.freeze([2, 3, 4] as const),
  evidenceClass: "structural_frame_validation_only" as const,
});
export const V2_VOICE_MP3_CODEC_RULES_FINGERPRINT_V1 = hashCanonicalBody(
  V2_VOICE_MP3_CODEC_RULES_V1,
);

export interface V2VoiceMp3CodecResultV1 {
  readonly schemaVersion: typeof V2_VOICE_MP3_CODEC_RESULT_SCHEMA_V1;
  readonly rulesFingerprint: string;
  readonly mpegVersion: "1" | "2" | "2.5";
  readonly layer: "III";
  readonly sampleRateHz: number;
  readonly channelMode: "stereo" | "joint_stereo" | "dual_channel" | "mono";
  readonly frameCount: number;
  readonly audioFrameBytes: number;
  readonly estimatedDurationMs: number;
  readonly id3v2Bytes: number;
  readonly id3v1Bytes: 0 | 128;
  readonly codecEvidenceAuthority: "structural_mpeg_layer_iii_frames_only";
  readonly decoderEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly resultFingerprint: string;
}

interface FrameHeader {
  readonly version: "1" | "2" | "2.5";
  readonly sampleRateHz: number;
  readonly channelMode: V2VoiceMp3CodecResultV1["channelMode"];
  readonly frameLength: number;
  readonly samplesPerFrame: 1152 | 576;
}

const BITRATES_KBPS = Object.freeze({
  "1": Object.freeze([
    32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
  ]),
  "2": Object.freeze([
    8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
  ]),
  "2.5": Object.freeze([
    8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
  ]),
});
const SAMPLE_RATES = Object.freeze({
  "1": Object.freeze([44_100, 48_000, 32_000]),
  "2": Object.freeze([22_050, 24_000, 16_000]),
  "2.5": Object.freeze([11_025, 12_000, 8_000]),
});
const CHANNEL_MODES = Object.freeze([
  "stereo",
  "joint_stereo",
  "dual_channel",
  "mono",
] as const);
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_voice_mp3_codec_invalid");
}

function id3v2Length(bytes: Uint8Array): number {
  if (
    bytes.byteLength < 3 ||
    bytes[0] !== 0x49 ||
    bytes[1] !== 0x44 ||
    bytes[2] !== 0x33
  )
    return 0;
  if (bytes.byteLength < 10) fail();
  const major = bytes[3]!;
  const flags = bytes[5]!;
  if (
    !V2_VOICE_MP3_CODEC_RULES_V1.acceptedId3v2MajorVersions.includes(
      major as 2 | 3 | 4,
    ) ||
    (bytes[6]! & 0x80) !== 0 ||
    (bytes[7]! & 0x80) !== 0 ||
    (bytes[8]! & 0x80) !== 0 ||
    (bytes[9]! & 0x80) !== 0
  )
    fail();
  const payloadLength =
    bytes[6]! * 2 ** 21 + bytes[7]! * 2 ** 14 + bytes[8]! * 2 ** 7 + bytes[9]!;
  const footerLength = major === 4 && (flags & 0x10) !== 0 ? 10 : 0;
  const total = 10 + payloadLength + footerLength;
  if (!Number.isSafeInteger(total) || total > bytes.byteLength) fail();
  return total;
}

function frameHeader(bytes: Uint8Array, offset: number): FrameHeader | null {
  if (offset < 0 || offset + 4 > bytes.byteLength) return null;
  const b0 = bytes[offset]!;
  const b1 = bytes[offset + 1]!;
  const b2 = bytes[offset + 2]!;
  const b3 = bytes[offset + 3]!;
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0 || (b3 & 0x03) === 2) return null;
  const versionBits = (b1 >> 3) & 0x03;
  const version =
    versionBits === 3
      ? "1"
      : versionBits === 2
        ? "2"
        : versionBits === 0
          ? "2.5"
          : null;
  if (version === null || ((b1 >> 1) & 0x03) !== 1) return null;
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  if (bitrateIndex < 1 || bitrateIndex > 14 || sampleRateIndex > 2) return null;
  const bitrateKbps = BITRATES_KBPS[version][bitrateIndex - 1]!;
  const sampleRateHz = SAMPLE_RATES[version][sampleRateIndex]!;
  const padding = (b2 >> 1) & 1;
  const frameLength =
    Math.floor(
      ((version === "1" ? 144 : 72) * bitrateKbps * 1000) / sampleRateHz,
    ) + padding;
  if (frameLength < 24 || offset + frameLength > bytes.byteLength) return null;
  return Object.freeze({
    version,
    sampleRateHz,
    channelMode: CHANNEL_MODES[(b3 >> 6) & 0x03]!,
    frameLength,
    samplesPerFrame: version === "1" ? 1152 : 576,
  });
}

export function validateV2VoiceMp3CodecV1(
  bytes: Uint8Array,
): V2VoiceMp3CodecResultV1 {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 48) fail();
  const id3v2Bytes = id3v2Length(bytes);
  let offset = id3v2Bytes;
  let frameCount = 0;
  let audioFrameBytes = 0;
  let samples = 0;
  let first: FrameHeader | null = null;
  const id3v1Bytes =
    bytes.byteLength >= 128 &&
    bytes[bytes.byteLength - 128] === 0x54 &&
    bytes[bytes.byteLength - 127] === 0x41 &&
    bytes[bytes.byteLength - 126] === 0x47
      ? 128
      : 0;
  const audioEnd = bytes.byteLength - id3v1Bytes;
  while (offset + 4 <= bytes.byteLength) {
    if (offset >= audioEnd) break;
    const header = frameHeader(bytes, offset);
    if (header === null) break;
    if (
      first !== null &&
      (header.version !== first.version ||
        header.sampleRateHz !== first.sampleRateHz ||
        header.channelMode !== first.channelMode)
    )
      fail();
    first ??= header;
    frameCount += 1;
    audioFrameBytes += header.frameLength;
    samples += header.samplesPerFrame;
    offset += header.frameLength;
  }
  if (
    first === null ||
    frameCount < V2_VOICE_MP3_CODEC_RULES_V1.minimumConsecutiveFrames ||
    offset !== audioEnd
  )
    fail();
  const body = {
    schemaVersion: V2_VOICE_MP3_CODEC_RESULT_SCHEMA_V1,
    rulesFingerprint: V2_VOICE_MP3_CODEC_RULES_FINGERPRINT_V1,
    mpegVersion: first.version,
    layer: "III" as const,
    sampleRateHz: first.sampleRateHz,
    channelMode: first.channelMode,
    frameCount,
    audioFrameBytes,
    estimatedDurationMs: Math.round((samples * 1000) / first.sampleRateHz),
    id3v2Bytes,
    id3v1Bytes: id3v1Bytes as 0 | 128,
    codecEvidenceAuthority: "structural_mpeg_layer_iii_frames_only" as const,
    decoderEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    resultFingerprint: hashCanonicalBody(body),
  });
  handles.add(result);
  return result;
}

export function isV2VoiceMp3CodecResultV1(
  value: unknown,
): value is V2VoiceMp3CodecResultV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
