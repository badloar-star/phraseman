import AsyncStorage from "@react-native-async-storage/async-storage";

import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  readLearningV2VoiceAudioDeviceJournalV1,
  recordLearningV2VoiceAudioDevicePageV1,
} from "../modules/learning-v2/runtime/voice_audio_device_page_journal_v1";
import { materializeLearningV2VoiceAudioDevicePageUploadAckV1 } from "../modules/learning-v2/runtime/voice_audio_device_page_upload_ack_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const device = {
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
};
const page = (start: number, count: number, next: number | null) => {
  const rows = Array.from({ length: count }, (_, offset) => ({
    itemIndex: start + offset,
    generationTargetFingerprint: h(["target", start + offset]),
    entryFingerprint: h(["entry", start + offset]),
  }));
  return {
    manifestFingerprint: h("manifest"),
    episodeReceiptFingerprint: h("episode-receipt"),
    pageStartIndex: start,
    pageItemCount: count,
    nextPageStartIndex: next,
    stableProjectionFingerprint: h(["page", start]),
    rows,
  };
};
const run = (start: number, count: number) => ({
  ...device,
  pageStartIndex: start,
  pageItemCount: count,
  rows: Array.from({ length: count }, (_, offset) => ({
    itemIndex: start + offset,
    generationTargetFingerprint: h(["target", start + offset]),
    entryFingerprint: h(["entry", start + offset]),
  })),
  pageRunFingerprint: h(["run", start]),
});
const ack = (start: number, count: number, next: number | null) =>
  materializeLearningV2VoiceAudioDevicePageUploadAckV1({
    manifestFingerprint: h("manifest"),
    audioEpisodeReceiptFingerprint: h("episode-receipt"),
    stableProjectionFingerprint: h(["page", start]),
    evidenceFingerprint: h(["evidence", start]),
    pageRunFingerprint: h(["run", start]),
    pageStartIndex: start,
    pageItemCount: count,
    nextPageStartIndex: next,
    platform: "ios",
    deviceClass: "physical_device",
    osVersion: "18.6",
    appBuildFingerprint: h("build"),
    decoderPageReceiptFingerprint: h(["decoder", start]),
    pcmPageReceiptFingerprint: h(["pcm", start]),
    pageCommitFingerprint: h(["page-commit", start]),
    pageCommitPin: {
      objectPath: `learning-v2/voice-device-receipts/${h("plan")}/${h("stage")}/${h("manifest")}/page-commit/${h(["page-commit", start])}/${h(["page-commit-raw", start])}.json`,
      contentHash: h(["page-commit-raw", start]),
      objectGeneration: "1",
      byteSize: 1_000,
      contentType: "application/json; charset=utf-8",
    },
  });

describe("Learning V2 voice device page journal", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("restores the next exact page after restart without retaining URLs", async () => {
    const first = await recordLearningV2VoiceAudioDevicePageV1({
      page: page(0, 32, 32) as never,
      run: run(0, 32) as never,
      uploadAck: ack(0, 32, 32),
    });
    expect(first.nextPageStartIndex).toBe(32);
    const restored = await readLearningV2VoiceAudioDeviceJournalV1({
      manifestFingerprint: h("manifest"),
      episodeReceiptFingerprint: h("episode-receipt"),
      ...device,
    });
    expect(restored).toEqual(first);
    expect(JSON.stringify(restored)).not.toContain("http");
    expect(JSON.stringify(restored)).not.toContain("signed");

    const complete = await recordLearningV2VoiceAudioDevicePageV1({
      page: page(32, 2, null) as never,
      run: run(32, 2) as never,
      uploadAck: ack(32, 2, null),
    });
    expect(complete).toMatchObject({
      completedItemCount: 34,
      nextPageStartIndex: null,
      progressAuthority: "none",
      releaseEligible: false,
    });
    expect(complete.pages).toHaveLength(2);
  });

  it("rejects gaps, stale replay, and a page/run identity mismatch", async () => {
    await expect(
      recordLearningV2VoiceAudioDevicePageV1({
        page: page(32, 2, null) as never,
        run: run(32, 2) as never,
        uploadAck: ack(32, 2, null),
      }),
    ).rejects.toThrow("learning_v2_voice_audio_device_journal_invalid");
    await recordLearningV2VoiceAudioDevicePageV1({
      page: page(0, 32, 32) as never,
      run: run(0, 32) as never,
      uploadAck: ack(0, 32, 32),
    });
    await expect(
      recordLearningV2VoiceAudioDevicePageV1({
        page: page(0, 32, 32) as never,
        run: run(0, 32) as never,
        uploadAck: ack(0, 32, 32),
      }),
    ).rejects.toThrow("learning_v2_voice_audio_device_journal_invalid");
    await expect(
      recordLearningV2VoiceAudioDevicePageV1({
        page: page(32, 2, null) as never,
        run: {
          ...run(32, 2),
          rows: [
            { ...run(32, 2).rows[0], entryFingerprint: h("wrong") },
            run(32, 2).rows[1],
          ],
        } as never,
        uploadAck: ack(32, 2, null),
      }),
    ).rejects.toThrow("learning_v2_voice_audio_device_journal_invalid");
  });

  it("fails closed when persisted bytes are changed", async () => {
    await recordLearningV2VoiceAudioDevicePageV1({
      page: page(0, 32, 32) as never,
      run: run(0, 32) as never,
      uploadAck: ack(0, 32, 32),
    });
    const keys = (AsyncStorage.getAllKeys as jest.Mock | undefined)
      ? await AsyncStorage.getAllKeys()
      : [];
    expect(keys).toHaveLength(1);
    const raw = await AsyncStorage.getItem(keys[0]!);
    await AsyncStorage.setItem(
      keys[0]!,
      raw!.replace(h(["run", 0]), h("tamper")),
    );
    await expect(
      readLearningV2VoiceAudioDeviceJournalV1({
        manifestFingerprint: h("manifest"),
        episodeReceiptFingerprint: h("episode-receipt"),
        ...device,
      }),
    ).rejects.toThrow("learning_v2_voice_audio_device_journal_invalid");
  });
});
