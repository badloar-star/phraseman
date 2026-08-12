import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const read = (relative: string) =>
  fs.readFileSync(path.join(ROOT, relative), "utf8");

describe("Learning V2 native PCM decoder boundary", () => {
  it("registers one local Expo module on iOS and Android without touching expo-audio", () => {
    const config = JSON.parse(
      read("modules/learning-v2-pcm-decoder/expo-module.config.json"),
    );
    expect(config).toEqual({
      platforms: ["ios", "android"],
      ios: { modules: ["LearningV2PcmDecoderModule"] },
      android: {
        modules: ["app.phraseman.learningv2pcm.LearningV2PcmDecoderModule"],
      },
    });
    expect(
      read("modules/learning-v2-pcm-decoder/ios/LearningV2PcmDecoder.podspec"),
    ).toContain('spec.dependency "ExpoModulesCore"');
    const sources = [
      read(
        "modules/learning-v2-pcm-decoder/ios/LearningV2PcmDecoderModule.swift",
      ),
      read(
        "modules/learning-v2-pcm-decoder/android/src/main/java/app/phraseman/learningv2pcm/LearningV2PcmDecoderModule.kt",
      ),
    ].join("\n");
    expect(sources).not.toMatch(/expo-audio|AudioPlayer|audioSampleUpdate/u);
    expect(sources).not.toMatch(/https?:\/\//u);
  });

  it("binds a local file to exact size and SHA-256 before system decoding", () => {
    const ios = read(
      "modules/learning-v2-pcm-decoder/ios/LearningV2PcmDecoderModule.swift",
    );
    const android = read(
      "modules/learning-v2-pcm-decoder/android/src/main/java/app/phraseman/learningv2pcm/LearningV2PcmDecoderModule.kt",
    );
    expect(ios).toContain("url.isFileURL");
    expect(ios).toContain("fileSize == expectedByteSize");
    expect(ios).toContain("read(upToCount: maximumByteSize + 1)");
    expect(ios).toContain("hexSha256(source) == expectedSha256");
    expect(ios).toContain("try source.write(to: decodeUrl");
    expect(ios).toContain("removeItem(at: decodeUrl)");
    expect(android).toContain('uri.scheme != "file"');
    expect(android).toContain("file.length() != expectedByteSize.toLong()");
    expect(android).toContain("boundedBytes(file, maximumByteSize)");
    expect(android).toContain("sha256(sourceBytes) != expectedSha256");
    expect(android).toContain("decodeFile.writeBytes(sourceBytes)");
    expect(android).toContain("decodeFile.delete()");
  });

  it("uses platform system decoders and emits bounded PCM16 metrics only", () => {
    const ios = read(
      "modules/learning-v2-pcm-decoder/ios/LearningV2PcmDecoderModule.swift",
    );
    const android = read(
      "modules/learning-v2-pcm-decoder/android/src/main/java/app/phraseman/learningv2pcm/LearningV2PcmDecoderModule.kt",
    );
    expect(ios).toContain("commonFormat: .pcmFormatFloat32");
    expect(ios).toContain("interleaved: false");
    expect(ios).toContain("maximumFrames");
    expect(ios).toContain('"decoderBackend": "av_audio_file"');
    expect(android).toContain("MediaCodec.createDecoderByType");
    expect(android).toContain("maximumFrames");
    expect(android).toContain("maximumDecodeWallMs");
    expect(android).toContain('"decoderBackend" to "android_media_codec"');
    for (const source of [ios, android]) {
      expect(source).toContain('"sourceSha256"');
      expect(source).toContain('"sampleRateHz"');
      expect(source).toContain('"channelCount"');
      expect(source).toContain('"peakAbsoluteSample"');
      expect(source).toContain('"rmsAbsoluteSample"');
      expect(source).not.toContain('"samples"');
      expect(source).not.toContain('"pcmBytes"');
    }
  });

  it("keeps JS unavailable outside a native build and grants no evidence itself", () => {
    const source = read("modules/learning-v2-pcm-decoder/index.ts");
    expect(source).toContain("requireOptionalNativeModule");
    expect(source).toContain("nativeModule === null");
    expect(source).toContain("observeLearningV2NativePcmSignalMetricsV1");
    expect(source).not.toMatch(/deviceEvidenceAuthority\s*:\s*['"](?!none)/u);
    expect(source).not.toMatch(/releaseEligible\s*:\s*true/u);
  });
});
