export interface LearningV2NativePcmDecodeMetrics {
  schemaVersion: "learning-v2-native-pcm-decode-metrics.v1";
  decoderBackend: "av_audio_file" | "android_media_codec";
  sourceByteSize: number;
  sourceSha256: string;
  sampleRateHz: number;
  channelCount: 1 | 2;
  sampleCount: number;
  frameCount: number;
  durationMs: number;
  peakAbsoluteSample: number;
  rmsAbsoluteSample: number;
  activeSampleBasisPoints: number;
  clippedSampleBasisPoints: number;
  zeroSampleBasisPoints: number;
  leadingSilenceMs: number;
  trailingSilenceMs: number;
}

export interface LearningV2PcmDecoderNativeModule {
  decodeFile(
    fileUri: string,
    expectedSha256: string,
    expectedByteSize: number,
    maximumByteSize: number,
  ): Promise<LearningV2NativePcmDecodeMetrics>;
}
