// зачем (решение владельца 18.10 ≈06:15, звук по сети): загрузка файла озвучки из Storage — точный путь, токен входа в
// заголовке, понятная причина каждого отказа (404/403/таймаут/нет входа/слишком большой). Сверку sha256 делает кэш.
const mockGetIdToken = jest.fn(async () => "id-token-1");
let mockUser: { getIdToken: () => Promise<string> } | null = { getIdToken: () => mockGetIdToken() };
jest.mock("@react-native-firebase/auth", () => ({ __esModule: true, default: () => ({ currentUser: mockUser }) }));
jest.mock("@react-native-firebase/app", () => ({ getApp: () => ({ options: { storageBucket: "phraseman-ea0b3.firebasestorage.app" } }) }));
jest.mock("../app/debug-logger", () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { fetchLearningV2RemoteAudioBytesV1, LearningV2RemoteAudioErrorV1 } from "../app/learning_v2_remote_audio_v1";

const input = { objectPath: "learning-v2/voice-audio/a/b/c/abc.mp3", contentHash: "a".repeat(64), byteSize: 3, where: "test" };
const realFetch = global.fetch;

describe("Learning V2: звук по сети — загрузка из Storage", () => {
  afterEach(() => { global.fetch = realFetch; mockUser = { getIdToken: () => mockGetIdToken() }; });

  test("точный путь, alt=media и «Authorization: Firebase <idToken>»; байты отдаются как есть", async () => {
    const fetchMock = jest.fn(async () => ({ status: 200, ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const bytes = await fetchLearningV2RemoteAudioBytesV1(input);
    expect([...bytes]).toEqual([1, 2, 3]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe(`https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/${encodeURIComponent(input.objectPath)}?alt=media`);
    expect(init.headers.Authorization).toBe("Firebase id-token-1");
  });

  test.each([[404, "not_found"], [403, "forbidden"], [500, "http_error"]])("ответ %d → причина %s", async (status, reason) => {
    global.fetch = jest.fn(async () => ({ status, ok: false, arrayBuffer: async () => new ArrayBuffer(0) })) as unknown as typeof fetch;
    await expect(fetchLearningV2RemoteAudioBytesV1(input)).rejects.toMatchObject({ reason });
  });

  test("нет входа → no_user, в сеть не ходим", async () => {
    mockUser = null;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchLearningV2RemoteAudioBytesV1(input)).rejects.toMatchObject({ reason: "no_user" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("обрыв сети → network; ответ больше потолка → too_large", async () => {
    global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); }) as unknown as typeof fetch;
    await expect(fetchLearningV2RemoteAudioBytesV1(input)).rejects.toMatchObject({ reason: "network" });
    global.fetch = jest.fn(async () => ({ status: 200, ok: true, arrayBuffer: async () => new ArrayBuffer(70 * 1024) })) as unknown as typeof fetch;
    const error = await fetchLearningV2RemoteAudioBytesV1(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LearningV2RemoteAudioErrorV1);
    expect((error as LearningV2RemoteAudioErrorV1).reason).toBe("too_large");
  });
});
