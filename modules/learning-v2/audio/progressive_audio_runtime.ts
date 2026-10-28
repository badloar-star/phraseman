import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import {
  LEARNING_V2_AUDIO_CACHE_MAX_BYTES,
  LEARNING_V2_AUDIO_CACHE_TARGET_BYTES,
  LEARNING_V2_AUDIO_MAX_CATALOG_BYTES,
  type LearningV2AudioLessonCatalog,
  type LearningV2AudioPack,
  type LearningV2AudioReleaseManifest,
  type LearningV2AudioStudyTarget,
  normalizeLearningV2RecordedText,
  parseLearningV2AudioLessonCatalog,
  parseLearningV2AudioReleaseManifest,
  planLearningV2ProgressiveAudioWindow,
} from "./progressive_audio_contract";

const MANIFEST_REFRESH_MS = 24 * 60 * 60 * 1_000;
const MANIFEST_FAILURE_COOLDOWN_MS = 6 * 60 * 60 * 1_000;
const NOT_FOUND_COOLDOWN_MS = 24 * 60 * 60 * 1_000;
const FORBIDDEN_COOLDOWN_MS = 6 * 60 * 60 * 1_000;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const CELLULAR_REQUIRED_MAX_BYTES = 1024 * 1024;
const PREPARE_MAX_BYTES = 24 * 1024 * 1024;
const STATE_KEY = "state.v1.json";

export interface LearningV2AudioIo {
  read(key: string): Promise<Uint8Array | null>;
  size(key: string): Promise<number | null>;
  writeAtomic(key: string, bytes: Uint8Array): Promise<void>;
  remove(key: string): Promise<void>;
  list?(
    prefix: string,
  ): Promise<ReadonlyArray<{ key: string; byteSize: number }>>;
  uri(key: string): string;
}
export interface LearningV2AudioTransport {
  get(
    objectPath: string,
    maxBytes: number,
    signal: AbortSignal,
  ): Promise<Uint8Array>;
}
export type LearningV2AudioConnection =
  | "wifi"
  | "cellular"
  | "offline"
  | "unknown";
export interface LearningV2AudioRuntimeDeps {
  readonly io: LearningV2AudioIo;
  readonly transport: LearningV2AudioTransport;
  readonly digestSha256: (bytes: Uint8Array) => Promise<string>;
  readonly connection: () => Promise<LearningV2AudioConnection>;
  readonly now: () => number;
  readonly sleep: (ms: number) => Promise<void>;
}

export type LearningV2AudioTransportFailure =
  | "not_found"
  | "forbidden"
  | "too_large"
  | "timeout"
  | "cancelled"
  | "network"
  | "http_error"
  | "no_user"
  | "no_origin"
  | "no_bucket";
export class LearningV2AudioTransportError extends Error {
  constructor(
    readonly reason: LearningV2AudioTransportFailure,
    detail: string,
  ) {
    super(`learning_v2_progressive_audio_${reason}:${detail.slice(0, 160)}`);
  }
}

interface PersistedState {
  version: 1;
  manifestCheckedAt: Partial<Record<LearningV2AudioStudyTarget, number>>;
  manifestFailureUntil: Partial<Record<LearningV2AudioStudyTarget, number>>;
  negative: Record<
    string,
    { reason: "not_found" | "forbidden"; until: number }
  >;
  clips: Record<string, { byteSize: number; lastAccessAt: number }>;
}
const emptyState = (): PersistedState => ({
  version: 1,
  manifestCheckedAt: {},
  manifestFailureUntil: {},
  negative: {},
  clips: {},
});
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const encodeJson = (value: unknown): Uint8Array =>
  textEncoder.encode(JSON.stringify(value));
const decodeJson = (bytes: Uint8Array): unknown =>
  JSON.parse(textDecoder.decode(bytes));
const manifestKey = (target: LearningV2AudioStudyTarget): string =>
  `targets/${target}/active-manifest.json`;
const lessonKey = (
  target: LearningV2AudioStudyTarget,
  releaseId: string,
  lesson: number,
): string => `targets/${target}/releases/${releaseId}/lesson-${lesson}.json`;
const clipKey = (target: LearningV2AudioStudyTarget, sha256: string): string =>
  `targets/${target}/clips/${sha256}.mp3`;

function exactState(value: unknown): PersistedState {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return emptyState();
  const row = value as Partial<PersistedState>;
  if (
    row.version !== 1 ||
    typeof row.negative !== "object" ||
    row.negative === null ||
    typeof row.clips !== "object" ||
    row.clips === null
  )
    return emptyState();
  const manifestCheckedAt: PersistedState["manifestCheckedAt"] = {};
  const manifestFailureUntil: PersistedState["manifestFailureUntil"] = {};
  for (const target of ["en", "es"] as const) {
    const checked =
      row.manifestCheckedAt && typeof row.manifestCheckedAt === "object"
        ? (row.manifestCheckedAt as Record<string, unknown>)[target]
        : undefined;
    const failed =
      row.manifestFailureUntil && typeof row.manifestFailureUntil === "object"
        ? (row.manifestFailureUntil as Record<string, unknown>)[target]
        : undefined;
    if (Number.isSafeInteger(checked) && (checked as number) >= 0)
      manifestCheckedAt[target] = checked as number;
    if (Number.isSafeInteger(failed) && (failed as number) >= 0)
      manifestFailureUntil[target] = failed as number;
  }
  const negative: PersistedState["negative"] = {};
  for (const [objectPath, candidate] of Object.entries(
    row.negative as Record<string, unknown>,
  )) {
    if (
      !/^learning-v2\/voice-audio\/v1\/(?:en|es)\//u.test(objectPath) ||
      objectPath.split("/").includes("..") ||
      typeof candidate !== "object" ||
      candidate === null
    )
      continue;
    const entry = candidate as Record<string, unknown>;
    if (
      (entry.reason !== "not_found" && entry.reason !== "forbidden") ||
      !Number.isSafeInteger(entry.until) ||
      (entry.until as number) < 0
    )
      continue;
    negative[objectPath] = {
      reason: entry.reason,
      until: entry.until as number,
    };
  }
  const clips: PersistedState["clips"] = {};
  for (const [identity, candidate] of Object.entries(
    row.clips as Record<string, unknown>,
  )) {
    if (
      !/^(?:en|es):[a-f0-9]{64}$/u.test(identity) ||
      typeof candidate !== "object" ||
      candidate === null
    )
      continue;
    const entry = candidate as Record<string, unknown>;
    if (
      !Number.isSafeInteger(entry.byteSize) ||
      (entry.byteSize as number) < 1 ||
      !Number.isSafeInteger(entry.lastAccessAt) ||
      (entry.lastAccessAt as number) < 0
    )
      continue;
    clips[identity] = {
      byteSize: entry.byteSize as number,
      lastAccessAt: entry.lastAccessAt as number,
    };
  }
  return {
    version: 1,
    manifestCheckedAt,
    manifestFailureUntil,
    negative,
    clips,
  };
}

export function createLearningV2ProgressiveAudioRuntime(
  deps: LearningV2AudioRuntimeDeps,
) {
  let statePromise: Promise<PersistedState> | null = null;
  let stateWrite: Promise<void> = Promise.resolve();
  const verifiedClips = new Set<string>();
  const lessonCatalogMemory = new Map<string, LearningV2AudioLessonCatalog>();
  const packInFlight = new Map<string, Promise<boolean>>();
  let prepareChain: Promise<void> = Promise.resolve();
  const controllers = new Set<AbortController>();
  const loadState = async (): Promise<PersistedState> => {
    statePromise ??= deps.io.read(STATE_KEY).then((bytes) => {
      if (!bytes) return emptyState();
      try {
        return exactState(decodeJson(bytes));
      } catch {
        return emptyState();
      }
    });
    return statePromise;
  };
  const saveState = (state: PersistedState): Promise<void> => {
    stateWrite = stateWrite
      .catch(() => undefined)
      .then(() => deps.io.writeAtomic(STATE_KEY, encodeJson(state)));
    return stateWrite;
  };
  const reconcileClips = async (
    target: LearningV2AudioStudyTarget,
    state: PersistedState,
  ): Promise<void> => {
    if (!deps.io.list) return;
    const prefix = `targets/${target}/clips`;
    const rows = await deps.io.list(prefix);
    let changed = false;
    for (const row of rows) {
      const relative = row.key.slice(prefix.length + 1);
      const match = /^([a-f0-9]{64})\.mp3$/u.exec(relative);
      if (!match) {
        await deps.io.remove(row.key);
        changed = true;
        continue;
      }
      const identity = `${target}:${match[1]}`;
      if (
        !state.clips[identity] ||
        state.clips[identity].byteSize !== row.byteSize
      ) {
        state.clips[identity] = { byteSize: row.byteSize, lastAccessAt: 0 };
        changed = true;
      }
    }
    if (changed) await saveState(state);
  };
  const readManifest = async (
    target: LearningV2AudioStudyTarget,
  ): Promise<LearningV2AudioReleaseManifest | null> => {
    const bytes = await deps.io.read(manifestKey(target));
    if (!bytes) return null;
    try {
      const parsed = parseLearningV2AudioReleaseManifest(decodeJson(bytes));
      return parsed.studyTarget === target ? parsed : null;
    } catch {
      return null;
    }
  };
  const fetchManifest = async (
    target: LearningV2AudioStudyTarget,
    signal: AbortSignal,
  ): Promise<{
    manifest: LearningV2AudioReleaseManifest;
    bytes: Uint8Array;
  }> => {
    const bytes = await deps.transport.get(
      `learning-v2/voice-audio/v1/${target}/current.json`,
      LEARNING_V2_AUDIO_MAX_CATALOG_BYTES,
      signal,
    );
    const manifest = parseLearningV2AudioReleaseManifest(decodeJson(bytes));
    if (manifest.studyTarget !== target)
      throw new Error("learning_v2_audio_manifest_target_mismatch");
    return { manifest, bytes };
  };
  const loadLesson = async (
    manifest: LearningV2AudioReleaseManifest,
    lessonIndex: number,
    signal: AbortSignal,
    allowNetwork: boolean,
    state: PersistedState,
  ): Promise<LearningV2AudioLessonCatalog | null> => {
    const descriptor = manifest.lessons[lessonIndex];
    if (!descriptor) return null;
    const memoryKey = `${manifest.studyTarget}:${manifest.releaseId}:${descriptor.lessonOrdinal}:${descriptor.sha256}`;
    const memory = lessonCatalogMemory.get(memoryKey);
    if (memory) return memory;
    const key = lessonKey(
      manifest.studyTarget,
      manifest.releaseId,
      descriptor.lessonOrdinal,
    );
    let bytes = await deps.io.read(key);
    if (
      bytes &&
      (bytes.length !== descriptor.byteSize ||
        (await deps.digestSha256(bytes)) !== descriptor.sha256)
    ) {
      await deps.io.remove(key);
      bytes = null;
    }
    if (
      !bytes &&
      allowNetwork &&
      !negativeActive(state, descriptor.objectPath)
    ) {
      try {
        bytes = await deps.transport.get(
          descriptor.objectPath,
          descriptor.byteSize,
          signal,
        );
      } catch (error) {
        if (
          error instanceof LearningV2AudioTransportError &&
          (error.reason === "not_found" || error.reason === "forbidden")
        ) {
          state.negative[descriptor.objectPath] = {
            reason: error.reason,
            until:
              deps.now() +
              (error.reason === "not_found"
                ? NOT_FOUND_COOLDOWN_MS
                : FORBIDDEN_COOLDOWN_MS),
          };
          await saveState(state);
          return null;
        }
        throw error;
      }
      if (
        bytes.length !== descriptor.byteSize ||
        (await deps.digestSha256(bytes)) !== descriptor.sha256
      )
        throw new Error("learning_v2_audio_lesson_integrity");
      await deps.io.writeAtomic(key, bytes);
    }
    if (!bytes) return null;
    const parsed = parseLearningV2AudioLessonCatalog(decodeJson(bytes));
    if (
      parsed.studyTarget !== manifest.studyTarget ||
      parsed.releaseId !== manifest.releaseId ||
      parsed.lessonOrdinal !== descriptor.lessonOrdinal ||
      parsed.startOrdinal !== descriptor.startOrdinal ||
      parsed.endOrdinal !== descriptor.endOrdinal
    )
      throw new Error("learning_v2_audio_lesson_descriptor_mismatch");
    lessonCatalogMemory.set(memoryKey, parsed);
    return parsed;
  };
  const negativeActive = (state: PersistedState, path: string): boolean => {
    const row = state.negative[path];
    if (!row) return false;
    if (row.until > deps.now()) return true;
    delete state.negative[path];
    return false;
  };
  const installPack = (
    target: LearningV2AudioStudyTarget,
    pack: LearningV2AudioPack,
    state: PersistedState,
    signal: AbortSignal,
  ): Promise<boolean> => {
    const inFlightKey = `${target}:${pack.sha256}:${pack.byteSize}:${pack.objectPath}`;
    const prior = packInFlight.get(inFlightKey);
    if (prior) return prior;
    if (negativeActive(state, pack.objectPath)) return Promise.resolve(false);
    const operation = (async (): Promise<boolean> => {
      let bytes: Uint8Array | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (signal.aborted) return false;
        try {
          bytes = await deps.transport.get(
            pack.objectPath,
            pack.byteSize,
            signal,
          );
          break;
        } catch (error) {
          if (
            error instanceof LearningV2AudioTransportError &&
            (error.reason === "not_found" || error.reason === "forbidden")
          ) {
            state.negative[pack.objectPath] = {
              reason: error.reason,
              until:
                deps.now() +
                (error.reason === "not_found"
                  ? NOT_FOUND_COOLDOWN_MS
                  : FORBIDDEN_COOLDOWN_MS),
            };
            await saveState(state);
            return false;
          }
          if (attempt === 2 || signal.aborted) return false;
          await deps.sleep(attempt === 0 ? 250 : 1_000);
        }
      }
      if (
        !bytes ||
        bytes.length !== pack.byteSize ||
        (await deps.digestSha256(bytes)) !== pack.sha256
      )
        return false;
      for (const clip of pack.clips) {
        const slice = bytes.slice(clip.offset, clip.offset + clip.byteSize);
        if (
          slice.length !== clip.byteSize ||
          (await deps.digestSha256(slice)) !== clip.sha256
        )
          return false;
      }
      const installedAt = deps.now();
      for (const clip of pack.clips) {
        const slice = bytes.slice(clip.offset, clip.offset + clip.byteSize);
        await deps.io.writeAtomic(clipKey(target, clip.sha256), slice);
        state.clips[`${target}:${clip.sha256}`] = {
          byteSize: clip.byteSize,
          lastAccessAt: installedAt,
        };
        verifiedClips.add(`${target}:${clip.sha256}`);
      }
      await saveState(state);
      return true;
    })().finally(() => {
      if (packInFlight.get(inFlightKey) === operation)
        packInFlight.delete(inFlightKey);
    });
    packInFlight.set(inFlightKey, operation);
    return operation;
  };
  const prune = async (
    state: PersistedState,
    protectedKeys: ReadonlySet<string>,
    reserveBytes = 0,
  ): Promise<void> => {
    const rows = Object.entries(state.clips);
    let total = rows.reduce((sum, [, row]) => sum + row.byteSize, 0);
    const protectedBytes = rows.reduce(
      (sum, [identity, row]) =>
        sum + (protectedKeys.has(identity) ? row.byteSize : 0),
      0,
    );
    if (protectedBytes + reserveBytes > LEARNING_V2_AUDIO_CACHE_MAX_BYTES)
      throw new Error("learning_v2_audio_protected_cache_overflow");
    const targetBytes = Math.min(
      LEARNING_V2_AUDIO_CACHE_TARGET_BYTES,
      LEARNING_V2_AUDIO_CACHE_MAX_BYTES - reserveBytes,
    );
    if (total <= targetBytes) return;
    rows.sort((a, b) => a[1].lastAccessAt - b[1].lastAccessAt);
    for (const [identity, row] of rows) {
      if (total <= targetBytes) break;
      if (protectedKeys.has(identity)) continue;
      const [target, sha256] = identity.split(":") as [
        LearningV2AudioStudyTarget,
        string,
      ];
      await deps.io.remove(clipKey(target, sha256));
      delete state.clips[identity];
      verifiedClips.delete(identity);
      total -= row.byteSize;
    }
    await saveState(state);
  };
  const prepare = (
    input: Readonly<{
      studyTarget: LearningV2AudioStudyTarget;
      completedPrefixCount: number;
      activeLessonOrdinal?: number;
      activeSessionOrdinal?: number;
      signal?: AbortSignal;
    }>,
  ): Promise<void> => {
    const controller = new AbortController();
    controllers.add(controller);
    const abortFromCaller = () => controller.abort();
    if (input.signal?.aborted) controller.abort();
    else
      input.signal?.addEventListener("abort", abortFromCaller, { once: true });
    const operation = prepareChain
      .catch(() => undefined)
      .then(async (): Promise<void> => {
        if (controller.signal.aborted) return;
        const state = await loadState();
        const now = deps.now();
        let active = await readManifest(input.studyTarget);
        await reconcileClips(input.studyTarget, state);
        const connection = await deps.connection();
        const networkAllowed =
          connection === "wifi" || connection === "cellular";
        const checked = state.manifestCheckedAt[input.studyTarget] ?? 0;
        const canRefresh =
          networkAllowed &&
          now >= (state.manifestFailureUntil[input.studyTarget] ?? 0) &&
          (!active || now - checked >= MANIFEST_REFRESH_MS);
        let candidate: {
          manifest: LearningV2AudioReleaseManifest;
          bytes: Uint8Array;
        } | null = null;
        if (canRefresh) {
          try {
            candidate = await fetchManifest(
              input.studyTarget,
              controller.signal,
            );
            state.manifestCheckedAt[input.studyTarget] = now;
            delete state.manifestFailureUntil[input.studyTarget];
          } catch (error) {
            if (controller.signal.aborted) return;
            if (
              error instanceof LearningV2AudioTransportError &&
              (error.reason === "not_found" || error.reason === "forbidden")
            ) {
              state.manifestCheckedAt[input.studyTarget] = now;
              state.manifestFailureUntil[input.studyTarget] =
                now + MANIFEST_FAILURE_COOLDOWN_MS;
            }
          }
          await saveState(state);
        }
        const desired = candidate?.manifest ?? active;
        if (!desired) return;
        const window = planLearningV2ProgressiveAudioWindow({
          completedPrefixCount: Math.min(
            input.completedPrefixCount,
            desired.totalSessionCount,
          ),
          totalSessionCount: desired.totalSessionCount,
        });
        const activeDescriptor = desired.lessons.find(
          (lesson) => lesson.lessonOrdinal === input.activeLessonOrdinal,
        );
        const proposedActiveOrdinal =
          activeDescriptor && Number.isSafeInteger(input.activeSessionOrdinal)
            ? activeDescriptor.startOrdinal +
              (input.activeSessionOrdinal as number) -
              1
            : window.requiredStartOrdinal;
        const activeOrdinal =
          activeDescriptor &&
          proposedActiveOrdinal >= activeDescriptor.startOrdinal &&
          proposedActiveOrdinal <= activeDescriptor.endOrdinal
            ? proposedActiveOrdinal
            : window.requiredStartOrdinal;
        const activeChapterStart = Math.floor((activeOrdinal - 1) / 8) * 8 + 1;
        const retainStart = activeChapterStart;
        const retainEnd = Math.min(
          desired.totalSessionCount,
          activeChapterStart + 15,
        );
        const lessonIndexes = desired.lessons
          .map((lesson, index) => ({ lesson, index }))
          .filter(
            ({ lesson }) =>
              (lesson.startOrdinal <= window.targetEndOrdinal &&
                lesson.endOrdinal >= window.requiredStartOrdinal) ||
              (lesson.startOrdinal <= retainEnd &&
                lesson.endOrdinal >= retainStart) ||
              lesson.lessonOrdinal === input.activeLessonOrdinal,
          );
        const catalogs: LearningV2AudioLessonCatalog[] = [];
        try {
          for (const { index } of lessonIndexes) {
            const catalog = await loadLesson(
              desired,
              index,
              controller.signal,
              networkAllowed,
              state,
            );
            if (!catalog) throw new Error("learning_v2_audio_lesson_missing");
            catalogs.push(catalog);
          }
        } catch {
          if (!active || active.releaseId === desired.releaseId) return;
          catalogs.length = 0;
          const fallbackWindow = planLearningV2ProgressiveAudioWindow({
            completedPrefixCount: Math.min(
              input.completedPrefixCount,
              active.totalSessionCount,
            ),
            totalSessionCount: active.totalSessionCount,
          });
          for (let index = 0; index < active.lessons.length; index += 1) {
            const lesson = active.lessons[index];
            if (
              !(
                (lesson.startOrdinal <= fallbackWindow.targetEndOrdinal &&
                  lesson.endOrdinal >= fallbackWindow.requiredStartOrdinal) ||
                (lesson.startOrdinal <= retainEnd &&
                  lesson.endOrdinal >= retainStart) ||
                lesson.lessonOrdinal === input.activeLessonOrdinal
              )
            )
              continue;
            const catalog = await loadLesson(
              active,
              index,
              controller.signal,
              false,
              state,
            );
            if (catalog) catalogs.push(catalog);
          }
        }
        const selected = catalogs;
        const retainedCachedTexts = new Set<string>();
        const retainedCachedClipKeys = new Set<string>();
        const isReleaseUpdate = Boolean(
          active && active.releaseId !== desired.releaseId,
        );
        if (isReleaseUpdate && active) {
          for (let index = 0; index < active.lessons.length; index += 1) {
            const descriptor = active.lessons[index];
            if (
              descriptor.startOrdinal > retainEnd ||
              descriptor.endOrdinal < retainStart
            )
              continue;
            const priorCatalog = await loadLesson(
              active,
              index,
              controller.signal,
              false,
              state,
            );
            if (!priorCatalog) continue;
            for (const session of priorCatalog.sessions) {
              if (session.ordinal < retainStart || session.ordinal > retainEnd)
                continue;
              for (const phrase of session.phrases) {
                const indexed = priorCatalog.clipsBySha256.get(
                  phrase.clipSha256,
                );
                if (!indexed) continue;
                const identity = `${input.studyTarget}:${phrase.clipSha256}`;
                if (
                  (await deps.io.size(
                    clipKey(input.studyTarget, phrase.clipSha256),
                  )) !== indexed.clip.byteSize
                )
                  continue;
                retainedCachedTexts.add(
                  `${priorCatalog.lessonOrdinal}:${session.sessionOrdinal}:${phrase.textKey}`,
                );
                retainedCachedClipKeys.add(identity);
              }
            }
          }
        }
        const descriptors = new Map<string, string>();
        for (const catalog of selected)
          for (const pack of catalog.packs) {
            const canonical = JSON.stringify(pack);
            const prior = descriptors.get(pack.sha256);
            if (prior !== undefined && prior !== canonical)
              throw new Error("learning_v2_audio_pack_descriptor_drift");
            descriptors.set(pack.sha256, canonical);
          }
        const retainOrdinals = Array.from(
          { length: Math.max(0, retainEnd - retainStart + 1) },
          (_, index) => retainStart + index,
        );
        const protectedKeys = new Set<string>();
        const protectedSizes = new Map<string, number>();
        const missing = new Map<string, LearningV2AudioPack>();
        const required = new Set<string>();
        const promotionRequired = new Set<string>();
        for (const catalog of selected)
          for (const session of catalog.sessions) {
            const retained = retainOrdinals.includes(session.ordinal);
            if (retained)
              for (const phrase of session.phrases) {
                const indexed = catalog.clipsBySha256.get(phrase.clipSha256);
                if (!indexed) continue;
                const identity = `${input.studyTarget}:${phrase.clipSha256}`;
                if (
                  (await deps.io.size(
                    clipKey(input.studyTarget, phrase.clipSha256),
                  )) === indexed.clip.byteSize
                ) {
                  protectedKeys.add(identity);
                  protectedSizes.set(identity, indexed.clip.byteSize);
                }
              }
            for (const identity of retainedCachedClipKeys)
              protectedKeys.add(identity);
            const inFrontier =
              session.ordinal >= window.requiredStartOrdinal &&
              session.ordinal <= window.targetEndOrdinal;
            for (const phrase of session.phrases) {
              const indexed = catalog.clipsBySha256.get(phrase.clipSha256);
              if (!indexed) continue;
              const retainedReplacement =
                retained &&
                retainedCachedTexts.has(
                  `${catalog.lessonOrdinal}:${session.sessionOrdinal}:${phrase.textKey}`,
                );
              if (
                !inFrontier &&
                session.ordinal !== activeOrdinal &&
                !retainedReplacement
              )
                continue;
              const size = await deps.io.size(
                clipKey(input.studyTarget, phrase.clipSha256),
              );
              if (size !== indexed.clip.byteSize)
                missing.set(indexed.pack.sha256, indexed.pack);
              if (session.ordinal === activeOrdinal)
                required.add(indexed.pack.sha256);
              if (retainedReplacement)
                promotionRequired.add(indexed.pack.sha256);
            }
          }
        const protectedBytes = [...protectedSizes.values()].reduce(
          (sum, value) => sum + value,
          0,
        );
        if (protectedBytes > LEARNING_V2_AUDIO_CACHE_MAX_BYTES)
          throw new Error("learning_v2_audio_protected_cache_overflow");
        let candidates = [...missing.values()];
        candidates.sort(
          (a, b) =>
            Number(required.has(b.sha256)) - Number(required.has(a.sha256)),
        );
        if (connection !== "wifi")
          candidates = candidates.filter(
            (pack) =>
              required.has(pack.sha256) &&
              connection === "cellular" &&
              pack.byteSize <= CELLULAR_REQUIRED_MAX_BYTES,
          );
        let plannedBytes = 0;
        candidates = candidates.filter((pack) => {
          if (plannedBytes + pack.byteSize > PREPARE_MAX_BYTES) return false;
          plannedBytes += pack.byteSize;
          return true;
        });
        await prune(state, protectedKeys, plannedBytes);
        const installed = new Set<string>();
        for (const pack of candidates)
          if (
            !controller.signal.aborted &&
            (await installPack(
              input.studyTarget,
              pack,
              state,
              controller.signal,
            ))
          )
            installed.add(pack.sha256);
        const requiredReady = [...required].every(
          (packSha) => !missing.has(packSha) || installed.has(packSha),
        );
        const promotionReady = !active
          ? requiredReady
          : requiredReady &&
            [...promotionRequired].every(
              (packSha) => !missing.has(packSha) || installed.has(packSha),
            );
        if (
          candidate &&
          promotionReady &&
          selected.length > 0 &&
          selected[0].releaseId === candidate.manifest.releaseId
        ) {
          await deps.io.writeAtomic(
            manifestKey(input.studyTarget),
            candidate.bytes,
          );
          active = candidate.manifest;
        } else
          active =
            active ?? (candidate && promotionReady ? candidate.manifest : null);
        await prune(state, protectedKeys);
      })
      .finally(() => {
        input.signal?.removeEventListener("abort", abortFromCaller);
        controllers.delete(controller);
      });
    prepareChain = operation.catch(() => undefined);
    return operation;
  };
  const resolveCached = async (
    input: Readonly<{
      studyTarget: LearningV2AudioStudyTarget;
      lessonOrdinal: number;
      sessionOrdinal: number;
      text: string;
    }>,
  ): Promise<{ uri: string; clipSha256: string } | null> => {
    const active = await readManifest(input.studyTarget);
    if (!active) return null;
    const lessonIndex = active.lessons.findIndex(
      (lesson) => lesson.lessonOrdinal === input.lessonOrdinal,
    );
    if (lessonIndex < 0) return null;
    const state = await loadState();
    let catalog: LearningV2AudioLessonCatalog | null;
    try {
      catalog = await loadLesson(
        active,
        lessonIndex,
        new AbortController().signal,
        false,
        state,
      );
    } catch {
      return null;
    }
    if (!catalog) return null;
    const session = [...catalog.sessionsByOrdinal.values()].find(
      (row) => row.sessionOrdinal === input.sessionOrdinal,
    );
    if (!session) return null;
    let textKey: string;
    try {
      textKey = normalizeLearningV2RecordedText(input.text);
    } catch {
      return null;
    }
    const indexed = session.phrases.get(textKey);
    if (!indexed) return null;
    const key = clipKey(input.studyTarget, indexed.clip.sha256);
    const size = await deps.io.size(key);
    if (size !== indexed.clip.byteSize) return null;
    const identity = `${input.studyTarget}:${indexed.clip.sha256}`;
    if (!verifiedClips.has(identity)) {
      const clip = await deps.io.read(key);
      if (!clip || (await deps.digestSha256(clip)) !== indexed.clip.sha256) {
        await deps.io.remove(key);
        return null;
      }
      verifiedClips.add(identity);
    }
    state.clips[identity] = {
      byteSize: indexed.clip.byteSize,
      lastAccessAt: deps.now(),
    };
    void saveState(state);
    return Object.freeze({
      uri: deps.io.uri(key),
      clipSha256: indexed.clip.sha256,
    });
  };
  return Object.freeze({
    prepare,
    resolveCached,
    cancelAll: () => {
      for (const controller of controllers) controller.abort();
      controllers.clear();
    },
  });
}

export function createFirebaseLearningV2AudioTransport(
  input: Readonly<{
    bucket: () => string | null;
    token: () => Promise<string>;
    fetcher?: typeof fetch;
  }>,
): LearningV2AudioTransport {
  const fetcher = input.fetcher ?? fetch;
  return Object.freeze({
    get: async (
      objectPath: string,
      maxBytes: number,
      signal: AbortSignal,
    ): Promise<Uint8Array> => {
      const bucket = input.bucket();
      if (!bucket)
        throw new LearningV2AudioTransportError("no_bucket", objectPath);
      const controller = new AbortController();
      let timedOut = false;
      const aborted = new Promise<never>((_resolve, reject) =>
        controller.signal.addEventListener(
          "abort",
          () => {
            reject(
              new LearningV2AudioTransportError(
                timedOut ? "timeout" : "cancelled",
                objectPath,
              ),
            );
          },
          { once: true },
        ),
      );
      const onAbort = () => controller.abort();
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, DOWNLOAD_TIMEOUT_MS);
      try {
        const token = await Promise.race([
          input.token().catch(() => {
            throw new LearningV2AudioTransportError("no_user", objectPath);
          }),
          aborted,
        ]);
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
        const response = await fetcher(url, {
          method: "GET",
          headers: { Authorization: `Firebase ${token}` },
          signal: controller.signal,
        });
        if (response.status === 404)
          throw new LearningV2AudioTransportError("not_found", objectPath);
        if (response.status === 403)
          throw new LearningV2AudioTransportError("forbidden", objectPath);
        if (!response.ok)
          throw new LearningV2AudioTransportError(
            "http_error",
            `${response.status}:${objectPath}`,
          );
        const declaredRaw = response.headers.get("content-length");
        const declared = Number(declaredRaw);
        if (
          declaredRaw === null ||
          !Number.isSafeInteger(declared) ||
          declared < 1 ||
          declared > maxBytes ||
          (!objectPath.endsWith("/current.json") && declared !== maxBytes)
        )
          throw new LearningV2AudioTransportError("too_large", objectPath);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > maxBytes)
          throw new LearningV2AudioTransportError("too_large", objectPath);
        return bytes;
      } catch (error) {
        if (error instanceof LearningV2AudioTransportError) throw error;
        throw new LearningV2AudioTransportError(
          controller.signal.aborted
            ? timedOut
              ? "timeout"
              : "cancelled"
            : "network",
          objectPath,
        );
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
      }
    },
  });
}

const LEARNING_V2_AUDIO_R2_ORIGIN =
  "https://phraseman-learning-audio.badloar.workers.dev";

export function resolveCloudflareR2LearningV2AudioOrigin(
  input: Readonly<{ enabled: string | undefined; origin: string | undefined }>,
): string | null {
  if (input.enabled !== "1" || input.origin !== LEARNING_V2_AUDIO_R2_ORIGIN)
    return null;
  return LEARNING_V2_AUDIO_R2_ORIGIN;
}

export function createCloudflareR2LearningV2AudioTransport(
  input: Readonly<{
    origin: () => string | null;
    token: () => Promise<string>;
    fetcher?: typeof fetch;
  }>,
): LearningV2AudioTransport {
  const fetcher = input.fetcher ?? fetch;
  return Object.freeze({
    get: async (
      objectPath: string,
      maxBytes: number,
      signal: AbortSignal,
    ): Promise<Uint8Array> => {
      const candidate = input.origin();
      const origin =
        candidate === LEARNING_V2_AUDIO_R2_ORIGIN ? candidate : null;
      if (!origin)
        throw new LearningV2AudioTransportError("no_origin", objectPath);
      const controller = new AbortController();
      let timedOut = false;
      const aborted = new Promise<never>((_resolve, reject) =>
        controller.signal.addEventListener(
          "abort",
          () => {
            reject(
              new LearningV2AudioTransportError(
                timedOut ? "timeout" : "cancelled",
                objectPath,
              ),
            );
          },
          { once: true },
        ),
      );
      const onAbort = () => controller.abort();
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, DOWNLOAD_TIMEOUT_MS);
      try {
        const token = await Promise.race([
          input.token().catch(() => {
            throw new LearningV2AudioTransportError("no_user", objectPath);
          }),
          aborted,
        ]);
        const response = await fetcher(`${origin}/${objectPath}`, {
          method: "GET",
          headers: { Authorization: `Firebase ${token}` },
          signal: controller.signal,
        });
        if (response.status === 404)
          throw new LearningV2AudioTransportError("not_found", objectPath);
        if (response.status === 401)
          throw new LearningV2AudioTransportError("no_user", objectPath);
        if (response.status === 403)
          throw new LearningV2AudioTransportError("forbidden", objectPath);
        if (!response.ok)
          throw new LearningV2AudioTransportError(
            "http_error",
            `${response.status}:${objectPath}`,
          );
        const standardLengthRaw = response.headers.get("content-length");
        const workerLengthRaw = response.headers.get(
          "x-phraseman-content-length",
        );
        const parseLength = (value: string | null): number | null => {
          if (value === null || !/^[1-9]\d*$/u.test(value)) return null;
          const parsed = Number(value);
          return Number.isSafeInteger(parsed) ? parsed : null;
        };
        const standardLength = parseLength(standardLengthRaw);
        const workerLength = parseLength(workerLengthRaw);
        const declared = standardLength ?? workerLength;
        if (
          (standardLengthRaw !== null && standardLength === null) ||
          (workerLengthRaw !== null && workerLength === null) ||
          declared === null ||
          (standardLength !== null &&
            workerLength !== null &&
            standardLength !== workerLength) ||
          declared > maxBytes ||
          (!objectPath.endsWith("/current.json") && declared !== maxBytes)
        )
          throw new LearningV2AudioTransportError("too_large", objectPath);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > maxBytes)
          throw new LearningV2AudioTransportError("too_large", objectPath);
        return bytes;
      } catch (error) {
        if (error instanceof LearningV2AudioTransportError) throw error;
        throw new LearningV2AudioTransportError(
          controller.signal.aborted
            ? timedOut
              ? "timeout"
              : "cancelled"
            : "network",
          objectPath,
        );
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
      }
    },
  });
}

export class ExpoLearningV2AudioIo implements LearningV2AudioIo {
  private readonly root: Directory;
  constructor() {
    this.root = new Directory(Paths.document, "learning-v2-audio-v1");
    if (this.root.exists) this.cleanupRecoveryArtifacts(this.root);
  }
  private cleanupRecoveryArtifacts(directory: Directory): void {
    for (const entry of directory.list()) {
      if (entry instanceof Directory) {
        this.cleanupRecoveryArtifacts(entry);
        continue;
      }
      if (!(entry instanceof File)) continue;
      if (entry.name.endsWith(".previous")) {
        const target = new File(
          directory,
          entry.name.slice(0, -".previous".length),
        );
        if (target.exists) entry.delete();
        else entry.move(target);
      } else if (/\.part-[^/]+$/u.test(entry.name)) {
        entry.delete();
      }
    }
  }
  private file(key: string): File {
    return new File(this.root, ...key.split("/"));
  }
  private ensureParent(key: string): void {
    const parts = key.split("/");
    parts.pop();
    const directory = new Directory(this.root, ...parts);
    if (!directory.exists)
      directory.create({ intermediates: true, idempotent: true });
  }
  private recover(key: string): File {
    const target = this.file(key);
    const backup = this.file(`${key}.previous`);
    if (!target.exists && backup.exists) backup.move(target);
    else if (target.exists && backup.exists) backup.delete();
    return target;
  }
  async read(key: string): Promise<Uint8Array | null> {
    const file = this.recover(key);
    return file.exists ? file.bytes() : null;
  }
  async size(key: string): Promise<number | null> {
    const file = this.recover(key);
    return file.exists ? file.size : null;
  }
  async writeAtomic(key: string, bytes: Uint8Array): Promise<void> {
    this.ensureParent(key);
    const target = this.recover(key);
    const partKey = `${key}.part-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const part = this.file(partKey);
    part.write(bytes);
    try {
      if (target.exists) target.move(this.file(`${key}.previous`));
      part.move(this.file(key));
      const committedBackup = this.file(`${key}.previous`);
      if (committedBackup.exists) committedBackup.delete();
    } catch (error) {
      const currentTarget = this.file(key);
      const currentBackup = this.file(`${key}.previous`);
      if (!currentTarget.exists && currentBackup.exists)
        currentBackup.move(currentTarget);
      const currentPart = this.file(partKey);
      if (currentPart.exists) currentPart.delete();
      throw error;
    }
  }
  async remove(key: string): Promise<void> {
    for (const suffix of ["", ".previous"]) {
      const file = this.file(`${key}${suffix}`);
      if (file.exists) file.delete();
    }
  }
  async list(
    prefix: string,
  ): Promise<ReadonlyArray<{ key: string; byteSize: number }>> {
    const directory = new Directory(this.root, ...prefix.split("/"));
    if (!directory.exists) return [];
    this.cleanupRecoveryArtifacts(directory);
    return directory
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => ({ key: `${prefix}/${file.name}`, byteSize: file.size }));
  }
  uri(key: string): string {
    return this.file(key).uri;
  }
}
const hex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
const productionAuthToken = async (): Promise<string> => {
  const user = require("@react-native-firebase/auth").default()?.currentUser;
  if (!user) throw new Error("no_user");
  return user.getIdToken();
};
const configuredR2AudioOrigin = resolveCloudflareR2LearningV2AudioOrigin({
  enabled: process.env.EXPO_PUBLIC_LEARNING_V2_AUDIO_R2_ENABLED,
  origin: process.env.EXPO_PUBLIC_LEARNING_V2_AUDIO_R2_ORIGIN,
});
const productionFirebaseTransport = createFirebaseLearningV2AudioTransport({
  bucket: () => {
    try {
      return (
        (require("@react-native-firebase/app").getApp()?.options
          ?.storageBucket as string | undefined) ?? null
      );
    } catch {
      return null;
    }
  },
  token: productionAuthToken,
});
const productionTransport = configuredR2AudioOrigin
  ? createCloudflareR2LearningV2AudioTransport({
      origin: () => configuredR2AudioOrigin,
      token: productionAuthToken,
    })
  : productionFirebaseTransport;
let productionRuntime: ReturnType<
  typeof createLearningV2ProgressiveAudioRuntime
> | null = null;
export function getLearningV2ProgressiveAudioRuntime(): ReturnType<
  typeof createLearningV2ProgressiveAudioRuntime
> {
  productionRuntime ??= createLearningV2ProgressiveAudioRuntime({
    io: new ExpoLearningV2AudioIo(),
    transport: productionTransport,
    digestSha256: async (bytes) =>
      hex(
        await Crypto.digest(
          Crypto.CryptoDigestAlgorithm.SHA256,
          bytes as Uint8Array<ArrayBuffer>,
        ),
      ),
    now: Date.now,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    connection: async () => {
      try {
        const loaded = require("@react-native-community/netinfo") as Readonly<{
          default?: {
            fetch?: () => Promise<{
              isConnected?: boolean | null;
              isInternetReachable?: boolean | null;
              type?: string;
              details?: { isConnectionExpensive?: boolean } | null;
            }>;
          };
        }>;
        const state = await loaded.default?.fetch?.();
        if (!state) return "unknown";
        if (state.isConnected === false || state.isInternetReachable === false)
          return "offline";
        if (
          state.type === "wifi" &&
          state.details?.isConnectionExpensive !== true
        )
          return "wifi";
        return state.type === "cellular" ? "cellular" : "unknown";
      } catch {
        return "unknown";
      }
    },
  });
  return productionRuntime;
}
