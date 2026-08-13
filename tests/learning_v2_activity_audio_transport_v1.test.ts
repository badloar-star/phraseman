const fetchMock = jest.fn();
let accountCurrent = true;
const lease = Object.freeze({
  source: "learning-v2.activity-audio-preload",
  signal: new AbortController().signal,
  assertCurrent: () => undefined,
});
const account = Object.freeze({
  generation: 1,
  stableId: "stable-1",
  phase: "active" as const,
});
const user = Object.freeze({ uid: "auth-1" });
const authToken = `a.${"b".repeat(80)}.c`;
const appCheckToken = `d.${"e".repeat(80)}.f`;

jest.mock("@react-native-firebase/app", () => ({
  getApp: () => ({
    options: {
      projectId: "phraseman-ea0b3",
      storageBucket: "phraseman-ea0b3.firebasestorage.app",
    },
  }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => fetchMock(...args),
}));
jest.mock("../app/account_generation", () => ({
  isCapturedAccountGenerationToken: (value: unknown) => value === account,
  isCurrentAccountGeneration: () => accountCurrent,
}));
jest.mock("../app/app_check_init", () => ({
  initFirebaseAppCheckIfAvailable: async () => true,
}));
jest.mock("../app/interactive_network_quiet", () => ({
  isCurrentBackgroundNetworkLease: (value: unknown) => value === lease,
}));
jest.mock("@react-native-firebase/auth", () => ({
  __esModule: true,
  default: () => ({ currentUser: user }),
  getIdTokenResult: async () => ({
    token: authToken,
    expirationTime: new Date(Date.now() + 10 * 60_000).toISOString(),
  }),
}));
jest.mock("@react-native-firebase/app-check", () => ({
  __esModule: true,
  default: () => ({ getToken: async () => ({ token: appCheckToken }) }),
}));

/* eslint-disable import/first -- Firebase/native transport is mocked first */
import {
  createLearningV2ActivityAudioTransportV1,
  downloadLearningV2ActivityAudioBytesV1,
} from "../app/learning_v2_activity_audio_transport_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
/* eslint-enable import/first */

const h = (value: unknown) => hashCanonicalBody(value);
const bytes = new Uint8Array([1, 2, 3, 4]);
const contentHash = h("content");
const entry = Object.freeze({
  generationTargetFingerprint: h("generation"),
  itemFingerprint: h("item"),
  taskId: "task-1",
  taskVoiceGroupFingerprint: h("voice-group"),
  audioTargetId: h("target"),
  inputKind: "word" as const,
  wordId: h("word"),
  wordOrdinal: 1,
  voiceId: "ash" as const,
  objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${contentHash}.mp3`,
  contentHash,
  objectGeneration: "7",
  byteSize: bytes.byteLength,
  contentType: "audio/mpeg" as const,
  codecRulesFingerprint: h("codec"),
  codecResultFingerprint: h("codec-result"),
  entryFingerprint: h("entry"),
});

function response(value = bytes) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(value);
      controller.close();
    },
  });
  return {
    ok: true,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type"
          ? "audio/mpeg"
          : name.toLowerCase() === "content-length"
            ? String(value.byteLength)
            : null,
    },
    body: stream,
  };
}

describe("Learning V2 authenticated activity-audio transport", () => {
  beforeEach(() => {
    accountCurrent = true;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(response());
  });

  it("uses transient Firebase/Auth App Check headers and returns only bounded bytes", async () => {
    const transport = await createLearningV2ActivityAudioTransportV1({
      account,
      lease,
    });
    await expect(
      downloadLearningV2ActivityAudioBytesV1({ entry, transport }),
    ).resolves.toEqual(bytes);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/${encodeURIComponent(entry.objectPath)}?alt=media`,
    );
    expect(url).not.toMatch(/token=/u);
    expect(options).toMatchObject({
      method: "GET",
      headers: {
        Authorization: `Firebase ${authToken}`,
        "X-Firebase-AppCheck": appCheckToken,
      },
      credentials: "omit",
      redirect: "error",
    });
  });

  it("rejects copied transport handles, stale accounts and byte overrun", async () => {
    const transport = await createLearningV2ActivityAudioTransportV1({
      account,
      lease,
    });
    await expect(
      downloadLearningV2ActivityAudioBytesV1({
        entry,
        transport: { ...transport } as never,
      }),
    ).rejects.toThrow("learning_v2_activity_audio_transport_invalid");

    accountCurrent = false;
    await expect(
      downloadLearningV2ActivityAudioBytesV1({ entry, transport }),
    ).rejects.toThrow("learning_v2_activity_audio_transport_invalid");

    accountCurrent = true;
    fetchMock.mockResolvedValue(response(new Uint8Array([1, 2, 3, 4, 5])));
    await expect(
      downloadLearningV2ActivityAudioBytesV1({ entry, transport }),
    ).rejects.toThrow("learning_v2_activity_audio_transport_invalid");
  });
});
