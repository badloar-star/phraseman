import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const entries = Object.freeze(
  Array.from({ length: 33 }, (_, index) => {
    const body = Object.freeze({
      generationTargetFingerprint: h(["generation", index]),
      entryFingerprint: h(["entry", index]),
      objectPath: `learning-v2/voice-audio/${h(["audio", index])}.mp3`,
      contentHash: h(["audio", index]),
      objectGeneration: "7",
      byteSize: 100 + index,
      contentType: "audio/mpeg" as const,
      codecRulesFingerprint: h("codec-rules"),
      codecResultFingerprint: h(["codec", index]),
    });
    return body;
  }),
);
const manifest = Object.freeze({
  planFingerprint: h("plan"),
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 33,
  sessionManifests: Object.freeze([
    Object.freeze({ entries: Object.freeze(entries.slice(0, 17)) }),
    Object.freeze({ entries: Object.freeze(entries.slice(17)) }),
  ]),
});
jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));

// Jest hoists the private manifest predicate before this import.
// eslint-disable-next-line import/first
import {
  isV2VoiceAudioPageReceiptV1,
  materializeV2VoiceAudioPageReceiptV1,
  parseV2VoiceAudioPageReceiptV1,
} from "./v2_voice_audio_page_receipt_v1";

const observation = (entry: (typeof entries)[number], itemIndex: number) =>
  Object.freeze({ itemIndex, ...entry });

describe("Learning V2 durable voice-audio page receipt contract", () => {
  it("materializes and canonically rehydrates a bounded first page", () => {
    const receipt = materializeV2VoiceAudioPageReceiptV1({
      manifest: manifest as never,
      pageStartIndex: 0,
      observations: Object.freeze(
        entries.slice(0, 32).map((entry, index) => observation(entry, index)),
      ),
    });
    expect(receipt).toMatchObject({
      pageStartIndex: 0,
      pageItemCount: 32,
      nextPageStartIndex: 32,
      audioByteAuthority: "none",
      codecEvidenceAuthority: "unverified_serialized_claim",
      releaseAuthority: false,
    });
    expect(isV2VoiceAudioPageReceiptV1(receipt)).toBe(true);
    const parsed = parseV2VoiceAudioPageReceiptV1({
      raw: canonicalJsonV1(receipt),
      manifest: manifest as never,
    });
    expect(parsed.receiptFingerprint).toBe(receipt.receiptFingerprint);
    expect(isV2VoiceAudioPageReceiptV1({ ...receipt })).toBe(false);
  });

  it("materializes the exact final page and rejects substitution or cap overflow", () => {
    const final = materializeV2VoiceAudioPageReceiptV1({
      manifest: manifest as never,
      pageStartIndex: 32,
      observations: Object.freeze([observation(entries[32]!, 32)]),
    });
    expect(final.nextPageStartIndex).toBeNull();
    expect(() =>
      materializeV2VoiceAudioPageReceiptV1({
        manifest: manifest as never,
        pageStartIndex: 0,
        observations: Object.freeze(
          entries
            .slice(0, 32)
            .map((entry, index) =>
              observation(
                index === 4
                  ? Object.freeze({ ...entry, contentHash: h("bad") })
                  : entry,
                index,
              ),
            ),
        ),
      }),
    ).toThrow("v2_voice_audio_page_receipt_invalid");
    expect(() =>
      materializeV2VoiceAudioPageReceiptV1({
        manifest: manifest as never,
        pageStartIndex: 0,
        observations: Object.freeze(
          Array.from({ length: 33 }, (_, index) =>
            observation(entries[index]!, index),
          ),
        ),
      }),
    ).toThrow("v2_voice_audio_page_receipt_invalid");
  });

  it("rejects hostile depth before canonicalization", () => {
    const raw = `${"[".repeat(1000)}0${"]".repeat(1000)}`;
    expect(() =>
      parseV2VoiceAudioPageReceiptV1({
        raw,
        manifest: manifest as never,
      }),
    ).toThrow("v2_voice_audio_page_receipt_invalid");
  });
});
