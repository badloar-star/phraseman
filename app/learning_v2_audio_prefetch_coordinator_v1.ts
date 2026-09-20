import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

import { runLearningV2AudioPrefetchCoordinatorCoreV1 } from "./learning_v2_audio_prefetch_coordinator_core_v1";
import {
  isLearningV2SessionAudioPublishedV1,
  learningV2PublishedAudioLessonOrdinalsV1,
  prepareLearningV2LessonAudioPackV1,
  prepareLearningV2SessionAudioPackV1,
  retainLearningV2LessonAudioPacksV1,
} from "./learning_v2_lesson_audio_pack_v1";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";

const REQUEST_KEY = "learning-v2:audio-prefetch-request:v1";
const SCHEMA = "learning-v2-audio-prefetch-request.v1" as const;
const LOCALES = new Set<LearningV2InterfaceLocale>([
  "ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl", "en",
]);

export type LearningV2AudioPrefetchRequestV1 = Readonly<{
  schemaVersion: typeof SCHEMA;
  targetLanguage: "en" | "es";
  interfaceLocale: LearningV2InterfaceLocale;
  lessonOrdinal: number;
  sessionOrdinal: number;
}>;

let latestRequest: LearningV2AudioPrefetchRequestV1 | null = null;
let lastKnownRequest: LearningV2AudioPrefetchRequestV1 | null = null;
let inFlight: Promise<void> | null = null;
let networkUnsubscribe: (() => void) | null = null;
let activeRunAbortController: AbortController | null = null;
let queueRevision = 0;
let persistSequence = 0;
let persistChain: Promise<void> = Promise.resolve();

function parseRequest(value: unknown): LearningV2AudioPrefetchRequestV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Partial<LearningV2AudioPrefetchRequestV1>;
  if (
    row.schemaVersion !== SCHEMA ||
    (row.targetLanguage !== "en" && row.targetLanguage !== "es") ||
    !row.interfaceLocale || !LOCALES.has(row.interfaceLocale) ||
    !Number.isSafeInteger(row.lessonOrdinal) || (row.lessonOrdinal ?? 0) < 1 || (row.lessonOrdinal ?? 0) > 32 ||
    !Number.isSafeInteger(row.sessionOrdinal) || (row.sessionOrdinal ?? 0) < 1 || (row.sessionOrdinal ?? 0) > 56
  ) return null;
  return Object.freeze(row as LearningV2AudioPrefetchRequestV1);
}

function networkSnapshot(state: NetInfoState) {
  const details = state.details as { readonly isConnectionExpensive?: boolean } | null;
  return Object.freeze({
    type: state.type,
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    isConnectionExpensive: details?.isConnectionExpensive ?? null,
  });
}

async function loadPersistedRequest(): Promise<LearningV2AudioPrefetchRequestV1 | null> {
  const raw = await AsyncStorage.getItem(REQUEST_KEY);
  if (!raw) return null;
  try {
    return parseRequest(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function execute(
  request: LearningV2AudioPrefetchRequestV1,
  runRevision: number,
  signal: AbortSignal,
): Promise<void> {
  const readNetwork = async () => networkSnapshot(await NetInfo.fetch());
  const network = await readNetwork();
  const publishedLessonOrdinals = learningV2PublishedAudioLessonOrdinalsV1(request.targetLanguage);
  // Bulk-prefetched files are an offline feature, not disposable speculation.
  // Protect every released lesson from the bounded cache's normal eviction pass.
  retainLearningV2LessonAudioPacksV1({
    targetLanguage: request.targetLanguage,
    lessonOrdinals: publishedLessonOrdinals,
  });
  await runLearningV2AudioPrefetchCoordinatorCoreV1({
    current: {
      lessonOrdinal: request.lessonOrdinal,
      sessionOrdinal: request.sessionOrdinal,
    },
    network,
    getNetwork: readNetwork,
    shouldContinue: () => runRevision === queueRevision && latestRequest === null,
    publishedLessonOrdinals,
    isSessionPublished: (lessonOrdinal, sessionOrdinal) =>
      isLearningV2SessionAudioPublishedV1({
        targetLanguage: request.targetLanguage,
        lessonOrdinal,
        sessionOrdinal,
      }),
    prepareSession: ({ lessonOrdinal, sessionOrdinal }) =>
      prepareLearningV2SessionAudioPackV1({
        targetLanguage: request.targetLanguage,
        lessonOrdinal,
        sessionOrdinal,
        signal,
      }).then(() => undefined),
    prepareLesson: (lessonOrdinal) =>
      prepareLearningV2LessonAudioPackV1({
        targetLanguage: request.targetLanguage,
        interfaceLocale: request.interfaceLocale,
        lessonOrdinal,
        signal,
      }).then(() => undefined),
  });
}

function persistRequest(request: LearningV2AudioPrefetchRequestV1): Promise<void> {
  const sequence = ++persistSequence;
  persistChain = persistChain.catch(() => undefined).then(async () => {
    // If a newer request arrived before this write began, only the newest one
    // may become the relaunch/background replay state.
    if (sequence !== persistSequence) return;
    await AsyncStorage.setItem(REQUEST_KEY, JSON.stringify(request));
  });
  return persistChain;
}

function schedule(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    while (latestRequest) {
      const request = latestRequest;
      latestRequest = null;
      const runRevision = queueRevision;
      const controller = new AbortController();
      activeRunAbortController = controller;
      try {
        await execute(request, runRevision, controller.signal);
      } catch (error) {
        if (runRevision !== queueRevision && latestRequest) continue;
        throw error;
      } finally {
        if (activeRunAbortController === controller) activeRunAbortController = null;
      }
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function requestLearningV2AudioPrefetchV1(input: {
  readonly targetLanguage: "en" | "es";
  readonly interfaceLocale: LearningV2InterfaceLocale;
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
}): Promise<void> {
  const request = parseRequest({ schemaVersion: SCHEMA, ...input });
  if (!request) throw new Error("learning_v2_audio_prefetch_request_invalid");
  queueRevision += 1;
  lastKnownRequest = request;
  latestRequest = request;
  activeRunAbortController?.abort();
  const persistence = persistRequest(request);
  const execution = schedule();
  await Promise.all([persistence, execution]);
}

export async function runPersistedLearningV2AudioPrefetchV1(): Promise<void> {
  const request = lastKnownRequest ?? await loadPersistedRequest();
  if (!request) return;
  lastKnownRequest ??= request;
  latestRequest ??= lastKnownRequest;
  await schedule();
}

export function startLearningV2AudioPrefetchNetworkObserverV1(): () => void {
  if (!networkUnsubscribe) {
    networkUnsubscribe = NetInfo.addEventListener(() => {
      // The active run observes this synchronously and yields before its next
      // session/lesson. The latest request then restarts under fresh NetInfo.
      queueRevision += 1;
      if (lastKnownRequest) {
        latestRequest = lastKnownRequest;
        activeRunAbortController?.abort();
        void schedule().catch(() => undefined);
      } else {
        void runPersistedLearningV2AudioPrefetchV1().catch(() => undefined);
      }
    });
  }
  return () => {
    networkUnsubscribe?.();
    networkUnsubscribe = null;
  };
}
