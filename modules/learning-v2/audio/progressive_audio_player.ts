import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import {
  claimSpokenAudio,
  whenSpokenAudioReady,
  type SpokenAudioClaim,
} from "../../audio/audio_runtime_arbiter";
import { getLearningV2ProgressiveAudioRuntime } from "./progressive_audio_runtime";

// зачем (жалоба 28.10 «Урок 1 · Эпизод 1 — не слышно»): сперва логи — каждый выход без звука называет причину; поведение прежнее
const LOG = "[LV2-AUDIO]";
const where = (request: LearningV2RecordedAudioRequest) => ({ study: request.studyTarget, lesson: request.lessonOrdinal, session: request.sessionOrdinal, text: request.text.slice(0, 40) });

type PlayCallbacks = Readonly<{
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}>;

export type LearningV2RecordedAudioRequest = Readonly<{
  studyTarget: "en" | "es";
  lessonOrdinal: number;
  sessionOrdinal: number;
  text: string;
  rate: number;
}>;

let generation = 0;
let player: AudioPlayer | null = null;
let subscription: { remove(): void } | null = null;
let claim: SpokenAudioClaim | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let onStopped: (() => void) | null = null;

function disposeLearningV2RecordedAudio(notifyStopped: boolean): void {
  generation += 1;
  const stopped = onStopped;
  onStopped = null;
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
  subscription?.remove();
  subscription = null;
  claim?.release();
  claim = null;
  const current = player;
  player = null;
  try {
    current?.pause();
  } catch (error) {
    console.warn("[LV2-AUDIO] pause_failed", error);
  }
  try {
    current?.release();
  } catch (error) {
    console.warn("[LV2-AUDIO] release_failed", error);
  }
  if (notifyStopped) stopped?.();
}

export function stopLearningV2RecordedAudio(): void {
  disposeLearningV2RecordedAudio(true);
}

export async function playLearningV2RecordedAudio(
  request: LearningV2RecordedAudioRequest,
  callbacks: PlayCallbacks = {},
): Promise<boolean> {
  stopLearningV2RecordedAudio();
  const ownGeneration = generation;
  onStopped = callbacks.onStopped ?? null;
  let resolved: { uri: string; clipSha256: string } | null;
  try {
    resolved =
      await getLearningV2ProgressiveAudioRuntime().resolveCached(request);
  } catch (error) {
    console.warn(LOG, "player:resolve_failed", JSON.stringify({ ...where(request), reason: error instanceof Error ? error.message : String(error), superseded: ownGeneration !== generation })); // guard-ok: catch пишет причину
    if (ownGeneration !== generation) return true;
    if (ownGeneration === generation) onStopped = null;
    return false;
  }
  if (ownGeneration !== generation) { console.log(LOG, "player:superseded_after_resolve", JSON.stringify(where(request))); return true; } // guard-ok: ранний выход с причиной
  if (!resolved || !resolved.uri.startsWith("file://")) {
    console.warn(LOG, "player:not_cached", JSON.stringify({ ...where(request), resolved: resolved ? resolved.uri.slice(0, 12) : null })); // guard-ok: записи нет на телефоне — вызывающий скажет системным голосом
    if (ownGeneration === generation) onStopped = null;
    return false;
  }
  console.log(LOG, "player:resolved", JSON.stringify({ ...where(request), clip: resolved.clipSha256.slice(0, 12) })); // guard-ok: откуда звук
  let ownClaim: SpokenAudioClaim | null = null;
  ownClaim = claimSpokenAudio(() => {
    if (claim === ownClaim) stopLearningV2RecordedAudio();
  }, "learning-v2:recorded-audio");
  if (!ownClaim) {
    console.warn(LOG, "player:claim_refused", JSON.stringify(where(request))); // guard-ok: голос выключен или идёт запись — вызывающий ловит по таймеру старта
    disposeLearningV2RecordedAudio(true);
    return true;
  }
  claim = ownClaim;
  let ready = false;
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    ready = await Promise.race([
      whenSpokenAudioReady(ownClaim),
      new Promise<false>((resolve) => {
        readyTimer = setTimeout(() => resolve(false), 4_000);
      }),
    ]);
  } catch (error) {
    console.warn(LOG, "player:ready_check_failed", JSON.stringify({ ...where(request), reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    ready = false;
  } finally {
    if (readyTimer) clearTimeout(readyTimer);
  }
  if (!ready || ownGeneration !== generation || !ownClaim.isCurrent()) {
    console.warn(LOG, "player:not_ready", JSON.stringify({ ...where(request), ready, superseded: ownGeneration !== generation, claimCurrent: ownClaim.isCurrent() })); // guard-ok: «не готово за 4 с» — вызывающий ловит по таймеру старта
    ownClaim.release();
    if (claim === ownClaim) claim = null;
    if (ownGeneration === generation) disposeLearningV2RecordedAudio(true);
    return true;
  }

  try {
    const ownPlayer = createAudioPlayer(resolved.uri);
    if (ownGeneration !== generation || !ownClaim.isCurrent()) {
      ownPlayer.release();
      return true;
    }
    player = ownPlayer;
    ownPlayer.setPlaybackRate(request.rate);
    let started = false;
    let finished = false;
    const fail = (error: Error) => {
      if (finished) return;
      finished = true;
      disposeLearningV2RecordedAudio(false);
      callbacks.onError?.(error);
    };
    subscription = ownPlayer.addListener("playbackStatusUpdate", (status) => {
      if (finished || ownGeneration !== generation || player !== ownPlayer)
        return;
      if (!started && status.isLoaded && status.playing) {
        started = true;
        if (watchdog) clearTimeout(watchdog);
        watchdog = null;
        callbacks.onStart?.();
      }
      if (status.didJustFinish) {
        finished = true;
        disposeLearningV2RecordedAudio(false);
        callbacks.onDone?.();
      }
    });
    watchdog = setTimeout(() => {
      watchdog = null;
      if (!started)
        fail(new Error("learning_v2_recorded_audio_failed_to_start"));
    }, 4_000);
    ownPlayer.play();
    return true;
  } catch (error) {
    disposeLearningV2RecordedAudio(false);
    callbacks.onError?.(
      error instanceof Error ? error : new Error(String(error)),
    );
    return true;
  }
}
