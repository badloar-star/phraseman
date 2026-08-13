import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2VoiceDevicePageCommitV1,
  materializeV2VoiceDevicePageCommitV1,
  parseV2VoiceDevicePageCommitV1,
} from "./v2_voice_device_page_commit_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const pin = (kind: "decoder-page" | "pcm-page", fingerprint: string) => {
  const rawHash = h([kind, "raw"]);
  return Object.freeze({
    objectPath: `learning-v2/voice-device-receipts/${h("plan")}/${h("stage")}/${h("manifest")}/${kind}/${fingerprint}/${rawHash}.json`,
    contentHash: rawHash,
    objectGeneration: "7",
    byteSize: 1_000,
    contentType: "application/json; charset=utf-8" as const,
  });
};
const input = () => {
  const decoder = h("decoder");
  const pcm = h("pcm");
  return {
    planFingerprint: h("plan"),
    stageId: "voice-stage-1",
    episodeId: "episode-1",
    manifestFingerprint: h("manifest"),
    audioEpisodeReceiptFingerprint: h("audio-episode"),
    stableProjectionFingerprint: h("projection"),
    evidenceFingerprint: h("evidence"),
    pageRunFingerprint: h("run"),
    pageStartIndex: 0,
    pageItemCount: 1,
    nextPageStartIndex: null,
    platform: "ios" as const,
    deviceClass: "physical_device" as const,
    osVersion: "18.6",
    appBuildFingerprint: h("build"),
    decoderPageReceiptFingerprint: decoder,
    decoderPageReceiptPin: pin("decoder-page", decoder),
    pcmPageReceiptFingerprint: pcm,
    pcmPageReceiptPin: pin("pcm-page", pcm),
    pcmPageDisposition: "candidate_for_human_listening" as const,
  };
};

describe("Voice device page durable commit", () => {
  it("round-trips exact page pins without minting listening or device authority", () => {
    const value = materializeV2VoiceDevicePageCommitV1(input());
    const parsed = parseV2VoiceDevicePageCommitV1(canonicalJsonV1(value));
    expect(parsed.commitFingerprint).toBe(value.commitFingerprint);
    expect(parsed.commitAuthority).toBe(
      "durable_page_receipt_pin_mapping_only",
    );
    expect(parsed.listeningEvidenceAuthority).toBe("none");
    expect(parsed.deviceEvidenceAuthority).toBe("none");
    expect(parsed.releaseEligible).toBe(false);
    expect(isV2VoiceDevicePageCommitV1(value)).toBe(true);
    expect(isV2VoiceDevicePageCommitV1({ ...value })).toBe(false);
  });

  it("rejects pin path and generation substitution", () => {
    expect(() =>
      materializeV2VoiceDevicePageCommitV1({
        ...input(),
        decoderPageReceiptPin: {
          ...input().decoderPageReceiptPin,
          objectGeneration: "0",
        },
      }),
    ).toThrow("v2_voice_device_page_commit_invalid");
    expect(() =>
      materializeV2VoiceDevicePageCommitV1({
        ...input(),
        pcmPageReceiptPin: {
          ...input().pcmPageReceiptPin,
          objectPath: "learning-v2/other/path.json",
        },
      }),
    ).toThrow("v2_voice_device_page_commit_invalid");
  });
});
