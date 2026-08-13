import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const stageId = "voice-stage-1";
const contentHash = h("audio");
const objectPath = `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${contentHash}.mp3`;
const entry = Object.freeze({
  generationTargetFingerprint: h("target"),
  entryFingerprint: h("entry"),
  objectPath,
  contentHash,
  objectGeneration: "17",
  byteSize: 10_000,
});
const manifest = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId,
  manifestFingerprint: h("manifest"),
  audioObjectCount: 1,
  sessionManifests: Object.freeze([
    Object.freeze({ entries: Object.freeze([entry]) }),
  ]),
});
const receipt = Object.freeze({
  receiptFingerprint: h("episode-receipt"),
  pages: Object.freeze([
    Object.freeze({
      pageStartIndex: 0,
      pageItemCount: 1,
      nextPageStartIndex: null,
      pageReceiptFingerprint: h("page-receipt"),
      pageAudioReadbackAggregateFingerprint: h("page-readback"),
    }),
  ]),
});
const episodeHandle = Object.freeze({ handle: true });
const getSignedUrl = jest.fn(async () => [
  `https://storage.googleapis.com/phraseman-ea0b3.firebasestorage.app/${objectPath}?X-Goog-Signature=${h("signature")}`,
]);
const file = jest.fn(() => ({ getSignedUrl }));
const bucket = Object.freeze({
  name: "phraseman-ea0b3.firebasestorage.app",
  file,
});

jest.mock("firebase-admin", () => ({
  app: () => ({
    name: "[DEFAULT]",
    options: {
      projectId: "phraseman-ea0b3",
      storageBucket: "phraseman-ea0b3.firebasestorage.app",
    },
  }),
  storage: () => ({ bucket: () => bucket }),
}));
jest.mock("./v2_firebase_voice_audio_episode_receipt_adapter_v1", () => ({
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1: (input: {
    handle: object;
    plan: object;
    stageId: string;
    manifest: object;
  }) => {
    if (
      input.handle !== episodeHandle ||
      input.plan !== plan ||
      input.stageId !== stageId ||
      input.manifest !== manifest
    )
      throw new Error("v2_firebase_voice_audio_episode_receipt_handle_invalid");
    return Object.freeze({ plan, manifest, receipt });
  },
}));
jest.mock("./v2_firebase_repository_trust_root_v1", () => ({
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1: Object.freeze({
    projectId: "phraseman-ea0b3",
    databaseId: "(default)",
    bucketName: "phraseman-ea0b3.firebasestorage.app",
    appName: "[DEFAULT]",
  }),
  validateV2FirebaseRepositoryTrustRootV1: jest.fn(),
}));

// Jest hoists exact Admin/private-handle ports before this import.
// eslint-disable-next-line import/first
import { createFirebaseAdminV2VoiceAudioDevicePageAdapterV1 } from "./v2_firebase_voice_audio_device_page_adapter_v1";

describe("Learning V2 Firebase device audio page", () => {
  beforeEach(() => jest.clearAllMocks());

  it("projects only an exact private episode page into short-lived download transport", async () => {
    const value =
      await createFirebaseAdminV2VoiceAudioDevicePageAdapterV1().projectDevicePage(
        {
          plan: plan as never,
          stageId,
          manifest: manifest as never,
          episodeReceiptHandle: episodeHandle as never,
          pageStartIndex: 0,
        },
      );
    expect(value).toMatchObject({
      manifestFingerprint: manifest.manifestFingerprint,
      episodeReceiptFingerprint: receipt.receiptFingerprint,
      pageItemCount: 1,
      transportUrlPurpose: "short_lived_download_only",
      repositoryOriginAuthority: "none_serialized_transport",
      releaseEligible: false,
    });
    expect(file).toHaveBeenCalledWith(objectPath, { generation: "17" });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "read",
        version: "v4",
        responseType: "audio/mpeg",
        queryParams: { generation: "17" },
      }),
    );
    expect(JSON.stringify(value)).not.toContain("taskId");
    expect(JSON.stringify(value)).not.toContain("provider");
  });

  it("rejects a raw or cross-page request before URL signing", async () => {
    const adapter = createFirebaseAdminV2VoiceAudioDevicePageAdapterV1();
    await expect(
      adapter.projectDevicePage({
        plan: plan as never,
        stageId,
        manifest: manifest as never,
        episodeReceiptHandle: {} as never,
        pageStartIndex: 0,
      }),
    ).rejects.toThrow("handle_invalid");
    await expect(
      adapter.projectDevicePage({
        plan: plan as never,
        stageId,
        manifest: manifest as never,
        episodeReceiptHandle: episodeHandle as never,
        pageStartIndex: 32,
      }),
    ).rejects.toThrow("v2_firebase_voice_audio_device_page_invalid");
    expect(getSignedUrl).not.toHaveBeenCalled();
  });
});
