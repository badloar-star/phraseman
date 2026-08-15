import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  createLearningV2VoiceAudioDevicePageRuntimeInputV1,
  materializeLearningV2VoiceAudioDevicePageV1,
} from "../modules/learning-v2/runtime/voice_audio_device_page_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const objectPath = (index: number) =>
  `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h(["target", index])}/${h(["audio", index])}.mp3`;
const row = (index: number) => ({
  itemIndex: index,
  generationTargetFingerprint: h(["target", index]),
  entryFingerprint: h(["entry", index]),
  objectPath: objectPath(index),
  contentHash: h(["audio", index]),
  objectGeneration: String(index + 10),
  byteSize: 10_000,
  signedReadUrl: `https://storage.googleapis.com/phraseman-ea0b3.firebasestorage.app/${objectPath(index)}?X-Goog-Signature=${h(index)}`,
});

function page() {
  return materializeLearningV2VoiceAudioDevicePageV1({
    manifestFingerprint: h("manifest"),
    episodeReceiptFingerprint: h("episode-receipt"),
    pageReceiptFingerprint: h("page-receipt"),
    pageAudioReadbackAggregateFingerprint: h("page-readback"),
    audioObjectCount: 34,
    pageStartIndex: 0,
    nextPageStartIndex: 2,
    signedUrlExpiresAtMs: 1_700_000_300_000,
    observedAtMs: 1_700_000_000_000,
    rows: [row(0), row(1)],
  });
}

describe("Learning V2 voice device page", () => {
  it("separates stable exact pins from short-lived transport URLs", async () => {
    const first = page();
    const second = materializeLearningV2VoiceAudioDevicePageV1({
      manifestFingerprint: first.manifestFingerprint,
      episodeReceiptFingerprint: first.episodeReceiptFingerprint,
      pageReceiptFingerprint: first.pageReceiptFingerprint,
      pageAudioReadbackAggregateFingerprint:
        first.pageAudioReadbackAggregateFingerprint,
      audioObjectCount: first.audioObjectCount,
      pageStartIndex: first.pageStartIndex,
      nextPageStartIndex: first.nextPageStartIndex,
      signedUrlExpiresAtMs: 1_700_000_600_000,
      observedAtMs: 1_700_000_300_000,
      rows: [
        { ...row(0), signedReadUrl: `${row(0).signedReadUrl}a` },
        { ...row(1), signedReadUrl: `${row(1).signedReadUrl}b` },
      ],
    });
    expect(first.stableProjectionFingerprint).toBe(
      second.stableProjectionFingerprint,
    );
    expect(first.signedTransportFingerprint).not.toBe(
      second.signedTransportFingerprint,
    );
    expect(first).toMatchObject({
      transportUrlRetention: "forbidden_in_evidence_and_journal",
      audioByteAuthority: "none_device_must_hash_exact_bytes",
      releaseEligible: false,
    });
  });

  it("creates exact device identities while keeping URLs behind a resolver", async () => {
    const value = page();
    const runtime = createLearningV2VoiceAudioDevicePageRuntimeInputV1({
      page: value,
      observedAtMs: 1_700_000_010_000,
      device: {
        platform: "ios",
        deviceClass: "physical_device",
        osVersion: "18.6",
        appBuildFingerprint: h("build"),
        expoAudioVersion: "1.1.1",
      },
    });
    expect(runtime.identities).toHaveLength(2);
    expect(runtime.identities[0]).not.toHaveProperty("signedReadUrl");
    await expect(
      runtime.resolveSourceUrl(runtime.identities[0]!),
    ).resolves.toBe(value.rows[0]!.signedReadUrl);
  });

  it.each([
    { rows: [{ ...row(0), objectPath: "../audio.mp3" }, row(1)] },
    { rows: [{ ...row(0), contentHash: h("other") }, row(1)] },
    {
      rows: [
        { ...row(0), signedReadUrl: "https://example.test/audio" },
        row(1),
      ],
    },
    { rows: [row(0), { ...row(1), itemIndex: 3 }] },
    { nextPageStartIndex: 3 },
    { signedUrlExpiresAtMs: 1_700_000_010_000 },
  ])("rejects pin, coordinate, URL, and TTL drift", (mutation) => {
    expect(() =>
      materializeLearningV2VoiceAudioDevicePageV1({
        manifestFingerprint: h("manifest"),
        episodeReceiptFingerprint: h("episode-receipt"),
        pageReceiptFingerprint: h("page-receipt"),
        pageAudioReadbackAggregateFingerprint: h("page-readback"),
        audioObjectCount: 34,
        pageStartIndex: 0,
        nextPageStartIndex: 2,
        signedUrlExpiresAtMs: 1_700_000_300_000,
        observedAtMs: 1_700_000_000_000,
        rows: [row(0), row(1)],
        ...mutation,
      }),
    ).toThrow("learning_v2_voice_audio_device_page_invalid");
  });
});
