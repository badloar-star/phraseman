import {
  V2_VOICE_MP3_CODEC_RULES_FINGERPRINT_V1,
  isV2VoiceMp3CodecResultV1,
  validateV2VoiceMp3CodecV1,
} from "./v2_voice_mp3_codec_v1";

function frame(padding = 0): Uint8Array {
  const length = 417 + padding;
  const value = new Uint8Array(length);
  value.set([0xff, 0xfb, 0x90 | (padding << 1), 0x00]);
  return value;
}

function mp3(withId3 = false): Uint8Array {
  const frames = [frame(), frame(1), frame()];
  const prefix = withId3
    ? new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 3, 1, 2, 3])
    : new Uint8Array(0);
  const result = new Uint8Array(
    prefix.byteLength +
      frames.reduce((sum, value) => sum + value.byteLength, 0),
  );
  result.set(prefix);
  let offset = prefix.byteLength;
  for (const value of frames) {
    result.set(value, offset);
    offset += value.byteLength;
  }
  return result;
}

function withId3v1(value: Uint8Array): Uint8Array {
  const result = new Uint8Array(value.byteLength + 128);
  result.set(value);
  result.set([0x54, 0x41, 0x47], value.byteLength);
  return result;
}

describe("Learning V2 structural MP3 codec gate", () => {
  it("accepts consecutive MPEG-1 Layer III frames with or without bounded ID3v2", () => {
    const plain = validateV2VoiceMp3CodecV1(mp3());
    const tagged = validateV2VoiceMp3CodecV1(mp3(true));
    expect(plain).toMatchObject({
      rulesFingerprint: V2_VOICE_MP3_CODEC_RULES_FINGERPRINT_V1,
      mpegVersion: "1",
      layer: "III",
      sampleRateHz: 44_100,
      frameCount: 3,
      id3v2Bytes: 0,
      codecEvidenceAuthority: "structural_mpeg_layer_iii_frames_only",
      decoderEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      releaseAuthority: false,
    });
    expect(tagged.id3v2Bytes).toBe(13);
    expect(validateV2VoiceMp3CodecV1(withId3v1(mp3()))).toMatchObject({
      id3v1Bytes: 128,
      frameCount: 3,
    });
    expect(isV2VoiceMp3CodecResultV1(plain)).toBe(true);
    expect(isV2VoiceMp3CodecResultV1({ ...plain })).toBe(false);
  });

  it.each([
    new Uint8Array([0x49, 0x44, 0x33, 4]),
    new Uint8Array(100),
    frame(),
    (() => {
      const source = mp3();
      const value = new Uint8Array(source.byteLength + 1);
      value.set(source);
      value[value.byteLength - 1] = 1;
      return value;
    })(),
    (() => {
      const value = mp3();
      value[417 + 3] = 0xc0;
      return value;
    })(),
  ])("rejects truncated, non-MP3, trailing or inconsistent frames", (value) => {
    expect(() => validateV2VoiceMp3CodecV1(value)).toThrow(
      "v2_voice_mp3_codec_invalid",
    );
  });
});
