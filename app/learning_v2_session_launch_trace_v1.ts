export type LearningV2SessionLaunchStageV1 =
  | "material_ready"
  | "audio_ready"
  | "modal_mounted";

export type LearningV2SessionLaunchTraceSnapshotV1 = Readonly<{
  traceId: string;
  courseSessionId: string;
  tapAtMs: number;
  materialReadyAtMs: number | null;
  audioReadyAtMs: number | null;
  modalMountedAtMs: number | null;
  tapToMaterialReadyMs: number | null;
  tapToAudioReadyMs: number | null;
  tapToModalMountedMs: number | null;
  materialPrewarmed: boolean;
  audioPrewarmed: boolean;
}>;

const TRACE_LIMIT = 40;
let sequence = 0;
const active = new Map<string, LearningV2SessionLaunchTraceSnapshotV1>();
let recent: readonly LearningV2SessionLaunchTraceSnapshotV1[] = [];

function nowMs(): number {
  return Date.now();
}

function delta(tapAtMs: number, stageAtMs: number | null): number | null {
  return stageAtMs === null ? null : Math.max(0, stageAtMs - tapAtMs);
}

function withDerived(
  value: Omit<
    LearningV2SessionLaunchTraceSnapshotV1,
    | "tapToMaterialReadyMs"
    | "tapToAudioReadyMs"
    | "tapToModalMountedMs"
    | "materialPrewarmed"
    | "audioPrewarmed"
  >,
): LearningV2SessionLaunchTraceSnapshotV1 {
  return Object.freeze({
    ...value,
    tapToMaterialReadyMs: delta(value.tapAtMs, value.materialReadyAtMs),
    tapToAudioReadyMs: delta(value.tapAtMs, value.audioReadyAtMs),
    tapToModalMountedMs: delta(value.tapAtMs, value.modalMountedAtMs),
    materialPrewarmed:
      value.materialReadyAtMs !== null &&
      value.materialReadyAtMs <= value.tapAtMs,
    audioPrewarmed:
      value.audioReadyAtMs !== null && value.audioReadyAtMs <= value.tapAtMs,
  });
}

function remember(value: LearningV2SessionLaunchTraceSnapshotV1): void {
  recent = [
    ...recent.filter((entry) => entry.traceId !== value.traceId),
    value,
  ].slice(-TRACE_LIMIT);
}

function format(value: number | null): string {
  return value === null ? "pending" : `${value}ms`;
}

function log(value: LearningV2SessionLaunchTraceSnapshotV1): void {
  const dev = typeof __DEV__ !== "undefined" && __DEV__;
  if (!dev && process.env.EXPO_PUBLIC_LEARNING_V2_PERF_TRACE !== "1") return;
  console.info(
    `[LEARNING-V2-PERF] ${value.courseSessionId}` +
      ` tap→material=${format(value.tapToMaterialReadyMs)}` +
      ` tap→audio=${format(value.tapToAudioReadyMs)}` +
      ` tap→modal=${format(value.tapToModalMountedMs)}` +
      ` materialPrewarmed=${value.materialPrewarmed}` +
      ` audioPrewarmed=${value.audioPrewarmed}`,
  );
}

export function startLearningV2SessionLaunchTraceV1(input: {
  courseSessionId: string;
  tapAtMs?: number;
}): string {
  const tapAtMs = input.tapAtMs ?? nowMs();
  sequence += 1;
  const traceId = `${input.courseSessionId}:${tapAtMs}:${sequence}`;
  const snapshot = withDerived({
    traceId,
    courseSessionId: input.courseSessionId,
    tapAtMs,
    materialReadyAtMs: null,
    audioReadyAtMs: null,
    modalMountedAtMs: null,
  });
  active.set(traceId, snapshot);
  while (active.size > TRACE_LIMIT) {
    const oldest = active.keys().next().value as string | undefined;
    if (!oldest || oldest === traceId) break;
    active.delete(oldest);
  }
  remember(snapshot);
  return traceId;
}

export function markLearningV2SessionLaunchStageV1(input: {
  traceId: string;
  stage: LearningV2SessionLaunchStageV1;
  atMs?: number;
}): LearningV2SessionLaunchTraceSnapshotV1 | null {
  const current = active.get(input.traceId);
  if (!current) return null;
  const atMs = input.atMs ?? nowMs();
  const next = withDerived({
    traceId: current.traceId,
    courseSessionId: current.courseSessionId,
    tapAtMs: current.tapAtMs,
    materialReadyAtMs:
      input.stage === "material_ready" ? atMs : current.materialReadyAtMs,
    audioReadyAtMs:
      input.stage === "audio_ready" ? atMs : current.audioReadyAtMs,
    modalMountedAtMs:
      input.stage === "modal_mounted" ? atMs : current.modalMountedAtMs,
  });
  active.set(input.traceId, next);
  remember(next);
  log(next);
  return next;
}

export function getRecentLearningV2SessionLaunchTracesV1(): readonly LearningV2SessionLaunchTraceSnapshotV1[] {
  return recent;
}
