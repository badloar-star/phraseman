import AsyncStorage from "@react-native-async-storage/async-storage";
import { httpsCallable } from "@react-native-firebase/functions";
import { ensureAnonUser } from "../app/cloud_sync";
import {
  clearLearningV2ActivityAuxiliaryCacheV1,
  LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_ENTRIES_V1,
  loadCurrentLearningV2ActivityAuxiliarySessionV1,
  loadLearningV2ActivityAuxiliarySessionV1,
  peekCurrentLearningV2ActivityAuxiliarySessionV1,
  peekLearningV2ActivityAuxiliarySessionV1,
  preloadCurrentLearningV2ActivityAuxiliarySessionV1,
  waitForCurrentLearningV2ActivityAuxiliaryPreloadV1,
} from "../app/learning_v2_activity_auxiliary_client";

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => ({})),
}));
jest.mock("@react-native-firebase/functions", () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock("../app/app_check_init", () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock("../app/cloud_sync", () => ({
  ensureAnonUser: jest.fn(async () => "stable-1"),
}));
jest.mock("../app/stable_id", () => ({
  peekStableId: jest.fn(() => "stable-1"),
}));
jest.mock(
  "../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1",
  () => ({
    parseLearningV2ActivityAuxiliaryClientDescriptorV1: jest.fn((raw: string) =>
      Object.freeze(JSON.parse(raw)),
    ),
  }),
);

const h = (character: string) => character.repeat(64);
const storage = new Map<string, string>();
let callableImplementation: (data: Record<string, unknown>) => Promise<unknown>;

const locator = Object.freeze({
  environment: "lab" as const,
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  activeManifestHash: h("a"),
  episodeId: "episode-1",
  sessionOrdinal: 1,
});

function response(data: Record<string, unknown>) {
  const episodeId = String(data.episodeId);
  const sessionOrdinal = Number(data.sessionOrdinal);
  const descriptor = {
    environment: data.environment,
    studyTarget: data.studyTarget,
    learnerSourceLocale: data.learnerSourceLocale,
    seasonId: data.seasonId,
    activeManifestHash:
      data.expectedActiveManifestHash ?? locator.activeManifestHash,
    episodeId,
    sessionId: `${episodeId}-session-${sessionOrdinal}`,
    sessionOrdinal,
    activityPackageFingerprint: h("b"),
    auxiliaryIndexFingerprint: h("c"),
    descriptorFingerprint: h("d"),
  };
  return {
    schemaVersion: "v2-activity-auxiliary-session-response.v1",
    activeManifestHash: descriptor.activeManifestHash,
    episodeId,
    sessionId: descriptor.sessionId,
    sessionOrdinal,
    activityPackageFingerprint: descriptor.activityPackageFingerprint,
    auxiliaryIndexFingerprint: descriptor.auxiliaryIndexFingerprint,
    descriptorFingerprint: descriptor.descriptorFingerprint,
    canonicalDescriptorRaw: JSON.stringify(descriptor),
    transportAuthority: "firebase_callable_auth_and_app_check_boundary",
    repositoryOriginProjection: "server_private_release_handle_projection",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    releaseAuthority: false,
  };
}

describe("Learning V2 activity auxiliary app client", () => {
  beforeEach(async () => {
    storage.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => storage.get(key) ?? null,
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        storage.set(key, value);
      },
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => {
        storage.delete(key);
      },
    );
    callableImplementation = async (data) => response(data);
    jest.mocked(httpsCallable).mockReturnValue((async (
      data: Record<string, unknown>,
    ) => ({
      data: await callableImplementation(data),
    })) as never);
    await clearLearningV2ActivityAuxiliaryCacheV1();
  });

  test("loads through authenticated callable, persists and reuses exact-release LKG", async () => {
    const network = await loadLearningV2ActivityAuxiliarySessionV1(locator);
    expect(network.source).toBe("network");
    expect(network.transport).toBe("firebase_callable");
    expect(peekLearningV2ActivityAuxiliarySessionV1(locator)?.sessionId).toBe(
      "episode-1-session-1",
    );

    callableImplementation = async () => {
      throw new Error("offline");
    };
    const offline = await loadLearningV2ActivityAuxiliarySessionV1(locator);
    expect(offline.source).toBe("lkg");
    expect(offline.transport).toBe("offline_lkg");
    expect(offline.cacheAuthority).toBe(
      "availability_only_not_release_or_origin_authority",
    );

    await expect(
      loadLearningV2ActivityAuxiliarySessionV1({
        ...locator,
        activeManifestHash: h("e"),
      }),
    ).rejects.toThrow("offline");
  });

  test("discovers the current release online and reuses only its newest LKG offline", async () => {
    const current = {
      environment: locator.environment,
      studyTarget: locator.studyTarget,
      learnerSourceLocale: locator.learnerSourceLocale,
      seasonId: locator.seasonId,
      episodeId: locator.episodeId,
      sessionOrdinal: locator.sessionOrdinal,
    };
    const network =
      await loadCurrentLearningV2ActivityAuxiliarySessionV1(current);
    expect(network.descriptor.activeManifestHash).toBe(
      locator.activeManifestHash,
    );
    expect(
      peekCurrentLearningV2ActivityAuxiliarySessionV1(current)?.sessionId,
    ).toBe("episode-1-session-1");
    callableImplementation = async () => {
      throw new Error("offline-current");
    };
    const offline =
      await loadCurrentLearningV2ActivityAuxiliarySessionV1(current);
    expect(offline.source).toBe("lkg");
    expect(offline.descriptor.activeManifestHash).toBe(
      locator.activeManifestHash,
    );
    jest.mocked(ensureAnonUser).mockResolvedValueOnce("stable-2");
    await expect(
      loadCurrentLearningV2ActivityAuxiliarySessionV1(current),
    ).rejects.toThrow("offline-current");
  });

  test("deduplicates map preload and exposes only its in-flight settlement", async () => {
    const current = {
      environment: locator.environment,
      studyTarget: locator.studyTarget,
      learnerSourceLocale: locator.learnerSourceLocale,
      seasonId: locator.seasonId,
      episodeId: locator.episodeId,
      sessionOrdinal: locator.sessionOrdinal,
    };
    let resolveNetwork!: (value: unknown) => void;
    callableImplementation = (data) =>
      new Promise((resolve) => {
        resolveNetwork = () => resolve(response(data));
      });
    const first = preloadCurrentLearningV2ActivityAuxiliarySessionV1(current);
    const second = preloadCurrentLearningV2ActivityAuxiliarySessionV1(current);
    expect(first).toBe(second);
    expect(waitForCurrentLearningV2ActivityAuxiliaryPreloadV1(current)).toBe(
      first,
    );
    for (let spin = 0; spin < 20 && !resolveNetwork; spin += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    resolveNetwork(undefined);
    await first;
    expect(
      waitForCurrentLearningV2ActivityAuxiliaryPreloadV1(current),
    ).toBeNull();
    expect(
      peekCurrentLearningV2ActivityAuxiliarySessionV1(current)?.sessionId,
    ).toBe("episode-1-session-1");
  });

  test("does not hide an arrived protocol mismatch behind cached bytes", async () => {
    await loadLearningV2ActivityAuxiliarySessionV1(locator);
    callableImplementation = async (data) => ({
      ...response(data),
      descriptorFingerprint: h("f"),
    });
    await expect(
      loadLearningV2ActivityAuxiliarySessionV1(locator),
    ).rejects.toThrow("learning_v2_activity_auxiliary_app_client_invalid");
    callableImplementation = async () => {
      throw Object.assign(new Error("release changed"), {
        code: "functions/failed-precondition",
      });
    };
    await expect(
      loadLearningV2ActivityAuxiliarySessionV1(locator),
    ).rejects.toMatchObject({ code: "functions/failed-precondition" });
  });

  test("bounds persistent rows and removes a corrupt envelope", async () => {
    for (let index = 1; index <= 13; index += 1) {
      await loadLearningV2ActivityAuxiliarySessionV1({
        ...locator,
        episodeId: `episode-${index}`,
      });
    }
    const raw = [...storage.values()][0];
    const envelope = JSON.parse(raw);
    expect(envelope.rows).toHaveLength(
      LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_ENTRIES_V1,
    );
    storage.set([...storage.keys()][0], "{not-json");
    callableImplementation = async () => {
      throw new Error("offline-after-corruption");
    };
    await expect(
      loadLearningV2ActivityAuxiliarySessionV1({
        ...locator,
        episodeId: "episode-13",
      }),
    ).rejects.toThrow("offline-after-corruption");
    expect(storage.size).toBe(0);
  });
});
