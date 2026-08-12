export type LearningV2Lesson1AudioAuditEntry = Readonly<{
  contentItemId: string;
  transcript: string;
  transcriptSha256: string;
  filename: string;
  assetSha256: string;
  fileBytes: number;
  language: 'en-US';
  voice: 'com.apple.voice.compact.en-US.Samantha';
  provenance: 'macos-say-local-v1';
  codec: 'AAC-LC';
  channels: 1;
  sampleRateHz: 22050;
  durationMs: number;
  audioPackets: number;
  encodedAudioBytes: number;
  rmsDbfs: number;
  peakDbfs: number;
  activeSamplePercent: number;
  reviewStatus: 'machine_verified_pending_human';
}>;

// Immutable structural receipt for the exact bundled recordings. Hashes bind
// the runtime transcript to the shipped bytes; human pronunciation/naturalness
// approval remains deliberately separate and is not inferred from metadata.
export const LEARNING_V2_LESSON1_AUDIO_AUDIT = Object.freeze([
  {
    contentItemId: 'legacy-lesson1_phrase_1',
    transcript: 'I am here',
    transcriptSha256: '916448fc97c1f61ba4f42a06ca78af84383e11c37b8e3f57c85a747f06b08ae8',
    filename: 'i-am-here.m4a',
    assetSha256: '71ecc51bb43ff85180efc3331d06631e54381a5aae09a5d918fb6d3086290a1d',
    fileBytes: 7067,
    language: 'en-US',
    voice: 'com.apple.voice.compact.en-US.Samantha',
    provenance: 'macos-say-local-v1',
    codec: 'AAC-LC',
    channels: 1,
    sampleRateHz: 22050,
    durationMs: 635,
    audioPackets: 16,
    encodedAudioBytes: 2971,
    rmsDbfs: -15.28,
    peakDbfs: -2.99,
    activeSamplePercent: 87.18,
    reviewStatus: 'machine_verified_pending_human',
  },
  {
    contentItemId: 'legacy-lesson1_phrase_10',
    transcript: 'We are safe',
    transcriptSha256: '94f30a2d460851d2545ec2934ee04b93a876fff34baacc28aab741a9b5f534d5',
    filename: 'we-are-safe.m4a',
    assetSha256: '92d77036cc6ebc15055318383ca5c0d6a6ddcccdfec7fbc72ec4c153cb7bbb1d',
    fileBytes: 8307,
    language: 'en-US',
    voice: 'com.apple.voice.compact.en-US.Samantha',
    provenance: 'macos-say-local-v1',
    codec: 'AAC-LC',
    channels: 1,
    sampleRateHz: 22050,
    durationMs: 815,
    audioPackets: 20,
    encodedAudioBytes: 4211,
    rmsDbfs: -16.27,
    peakDbfs: -2.51,
    activeSamplePercent: 76.98,
    reviewStatus: 'machine_verified_pending_human',
  },
  {
    contentItemId: 'legacy-lesson1_phrase_11',
    transcript: 'He is sick',
    transcriptSha256: 'c68f596ee65349af4c318f70ae7c078ecb5199a4eeee185f2fae03ef85a38488',
    filename: 'he-is-sick.m4a',
    assetSha256: '71ae074ad9fb55f62c63e887429b408243b9ca9e2c59494161f524638d5fe1dc',
    fileBytes: 7436,
    language: 'en-US',
    voice: 'com.apple.voice.compact.en-US.Samantha',
    provenance: 'macos-say-local-v1',
    codec: 'AAC-LC',
    channels: 1,
    sampleRateHz: 22050,
    durationMs: 634,
    audioPackets: 16,
    encodedAudioBytes: 3340,
    rmsDbfs: -16.25,
    peakDbfs: -2.96,
    activeSamplePercent: 70.31,
    reviewStatus: 'machine_verified_pending_human',
  },
  {
    contentItemId: 'legacy-lesson1_phrase_12',
    transcript: 'It is cheap',
    transcriptSha256: '82248d438386b4e084953c94c1b64b5d3b613fe8fd17e9c6b0afbfd714d6456f',
    filename: 'it-is-cheap.m4a',
    assetSha256: 'd18eab107ec356832906808ce0e9f1e155f69e31b4dfd263d1e0a6a72e7b222a',
    fileBytes: 7584,
    language: 'en-US',
    voice: 'com.apple.voice.compact.en-US.Samantha',
    provenance: 'macos-say-local-v1',
    codec: 'AAC-LC',
    channels: 1,
    sampleRateHz: 22050,
    durationMs: 705,
    audioPackets: 18,
    encodedAudioBytes: 3488,
    rmsDbfs: -17.06,
    peakDbfs: -4.74,
    activeSamplePercent: 72.91,
    reviewStatus: 'machine_verified_pending_human',
  },
] as const satisfies readonly LearningV2Lesson1AudioAuditEntry[]);
