import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { useManagedRecordingAudio } from "./use_managed_recording_audio";
import { useRuntimeActive } from "./use_runtime_active";
import {
  deleteHoldRecording,
  isHoldRecordingSupported,
  startHoldRecording,
  type HoldRecording,
} from "../app/speaking_hold_recorder";
import {
  ensureNeuralModel,
  isNeuralJudgeSupported,
  isNeuralModelReady,
  judgeWithNeuralEngine,
} from "../app/speaking_neural_judge";
import {
  isSpeechRecognitionAvailable,
  loadSpeechRecognitionModule,
  requestSpeechPermissionForHold,
  scheduleSpeechStopSettlement,
} from "../app/speech_recognition_module";
import {
  buildControlRecognitionOptions,
  buildSpeakingStartOptions,
} from "../app/speaking_recognition_options";
import { mergeLearningV2LocalTranscriptV1 } from "../modules/learning-v2/runtime/course_session_voice_response_v1";
import {
  resolveLearningV2HoldCaptureRouteV1,
  resolveLearningV2SystemHoldTerminalActionV1,
  resolveLearningV2SystemRestartStatusV1,
} from "../modules/learning-v2/runtime/hold_capture_route_v1";
import { noteSwallowed } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { DebugLogger } from "../app/debug-logger";

export type LearningV2LocalHoldToTalkStatusV1 =
  | "idle"
  | "requesting"
  | "listening"
  | "finishing"
  | "permission_denied"
  | "local_recognition_unavailable"
  | "error";

type Subscription = { remove?: () => void } | undefined;

// зачем (жалоба 23.10 №6 «теряет связь с микрофоном», координатор 24.10): путь голосового задания был немым — ни код ошибки
// распознавателя, ни отказ записи нигде не оставались, а ошибка распознавателя молча перезапускала его каждые 140 мс.
// [LESSON-MIC] пишет каждую ветку; конечные отказы уходят в прод-журнал сбоев — одна запись на причину (дедуп по отпечатку).
const MIC_LOG = "[LESSON-MIC]";
function micLog(event: string, data: Record<string, unknown> = {}): void {
  console.log(MIC_LOG, event, JSON.stringify(data)); // guard-ok: трасса голосового задания
}
function micFailure(reason: string, data: Record<string, unknown> = {}): void {
  console.warn(MIC_LOG, `fail:${reason}`, JSON.stringify(data)); // guard-ok: конечный отказ с причиной
  DebugLogger.error(`lesson_mic:${reason}`, new Error(`${reason} ${JSON.stringify(data).slice(0, 300)}`), "critical");
}
function speechErrorFields(event: unknown): Record<string, unknown> {
  if (typeof event !== "object" || event === null) return { raw: String(event) };
  const value = event as { error?: unknown; code?: unknown; message?: unknown };
  return { error: value.error ?? null, code: value.code ?? null, message: typeof value.message === "string" ? value.message.slice(0, 160) : null };
}

export function useLearningV2LocalHoldToTalkV1(
  input: Readonly<{
    enabled: boolean;
    interactionId: string;
    locale: string;
    targetText?: string;
    onTranscript: (value: string) => void;
    onFinalTranscript?: (value: string) => void;
  }>,
) {
  const {
    enabled,
    interactionId,
    locale,
    targetText = "",
    onTranscript,
    onFinalTranscript,
  } = input;
  const speechModule = useMemo(loadSpeechRecognitionModule, []);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;
  const runtimeActive = useRuntimeActive();
  const runtimeActiveRef = useRef(runtimeActive);
  runtimeActiveRef.current = runtimeActive;
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const holdPressRef = useRef(false);
  const captureRouteRef = useRef<"pcm" | "system" | null>(null);
  const pcmRecordingRef = useRef<HoldRecording | null>(null);
  const pcmFinishingRef = useRef(false);
  const listenersRef = useRef<Subscription[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const systemRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const systemHasListenedRef = useRef(false);
  const transcriptRef = useRef("");
  const finalTranscriptDeliveredRef = useRef(false);
  const [status, setStatus] =
    useState<LearningV2LocalHoldToTalkStatusV1>("idle");
  const pcmRecorderSupported = useMemo(
    () => Platform.OS === "android" && isHoldRecordingSupported(),
    [],
  );
  const neuralJudgeSupported = useMemo(isNeuralJudgeSupported, []);
  const [neuralModelReady, setNeuralModelReady] = useState(
    () => neuralJudgeSupported && isNeuralModelReady(locale),
  );
  const statusRef = useRef(status);
  statusRef.current = status;

  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((entry) => entry?.remove?.());
    listenersRef.current = [];
  }, []);
  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
  }, []);
  const clearSystemRestartTimer = useCallback(() => {
    if (systemRestartTimerRef.current !== null)
      clearTimeout(systemRestartTimerRef.current);
    systemRestartTimerRef.current = null;
  }, []);
  const recordingAudio = useManagedRecordingAudio(() => {
    try {
      speechModule?.abort();
    } catch (swallowedError) {
      // The native recognizer may already be gone.
      noteSwallowed('use_learning_v2_local_hold_to_talk_v1:catch_1', swallowedError);
}
  });
  const restoreLoudPlaybackMode = recordingAudio.release;
  const deliverFinalTranscript = useCallback(() => {
    const value = transcriptRef.current.trim();
    if (!value || finalTranscriptDeliveredRef.current) return;
    finalTranscriptDeliveredRef.current = true;
    onFinalTranscriptRef.current?.(value);
  }, []);
  const finishCapture = useCallback(() => {
    clearStopTimer();
    clearSystemRestartTimer();
    cleanupListeners();
    restoreLoudPlaybackMode();
    deliverFinalTranscript();
    if (mountedRef.current) setStatus("idle");
  }, [
    cleanupListeners,
    clearStopTimer,
    clearSystemRestartTimer,
    deliverFinalTranscript,
    restoreLoudPlaybackMode,
  ]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    holdPressRef.current = false;
    captureRouteRef.current = null;
    systemHasListenedRef.current = false;
    pcmFinishingRef.current = false;
    pcmRecordingRef.current?.cancel();
    pcmRecordingRef.current = null;
    clearStopTimer();
    clearSystemRestartTimer();
    cleanupListeners();
    try {
      speechModule?.abort();
    } catch (swallowedError) {
      // Capture is already closed.
      noteSwallowed('use_learning_v2_local_hold_to_talk_v1:catch_2', swallowedError);
}
    restoreLoudPlaybackMode();
    if (mountedRef.current) setStatus("idle");
  }, [
    cleanupListeners,
    clearStopTimer,
    clearSystemRestartTimer,
    restoreLoudPlaybackMode,
    speechModule,
  ]);

  const startSystem = useCallback(async () => {
    if (!enabled || !runtimeActiveRef.current) return;
    if (statusRef.current === "requesting" || statusRef.current === "listening")
      return;
    cancel();
    const generation = generationRef.current;
    micLog("system:start", { interactionId, locale, generation, hasTarget: targetText.trim().length > 0 });
    captureRouteRef.current = "system";
    systemHasListenedRef.current = false;
    holdPressRef.current = true;
    transcriptRef.current = "";
    finalTranscriptDeliveredRef.current = false;
    onTranscriptRef.current("");
    if (!speechModule || !isSpeechRecognitionAvailable(speechModule)) {
      micFailure("system_unavailable", { hasModule: Boolean(speechModule) });
      setStatus("local_recognition_unavailable");
      return;
    }
    setStatus("requesting");
    const permission = await requestSpeechPermissionForHold(speechModule);
    micLog("system:permission", { permission, stale: !mountedRef.current || generation !== generationRef.current, holding: holdPressRef.current });
    if (!mountedRef.current || generation !== generationRef.current) return;
    if (permission === "denied") {
      holdPressRef.current = false;
      micLog("system:permission_denied → shown", {});
      setStatus("permission_denied");
      return;
    }
    if (permission === "granted_after_prompt" || !holdPressRef.current) {
      holdPressRef.current = false;
      micLog("system:not_started", { reason: permission === "granted_after_prompt" ? "granted_after_prompt" : "released_before_start" });
      setStatus("idle");
      return;
    }
    let localRecognition = false;
    try {
      localRecognition =
        (await speechModule.supportsOnDeviceRecognition?.()) === true;
    } catch (error) {
      micLog("system:on_device_check_failed", { reason: error instanceof Error ? error.message : String(error) });
      localRecognition = false;
    }
    if (!mountedRef.current || generation !== generationRef.current) return;
    cleanupListeners();
    const current = () =>
      mountedRef.current &&
      runtimeActiveRef.current &&
      generation === generationRef.current;
    const startOptions = buildSpeakingStartOptions({
      lang: locale,
      targetText,
      interimResults: true,
      volumeMeter: false,
      onDevice: localRecognition,
      persistRecording: false,
      holdToTalk: true,
      freeSpeech: targetText.trim().length === 0,
    });
    function launchSystemRecognition() {
      if (!current() || !holdPressRef.current || !speechModule) return;
      try {
        speechModule.start(startOptions);
        micLog("system:recognizer_started", { onDevice: localRecognition, restarts });
      } catch (error) {
        micLog("system:start_threw", { reason: error instanceof Error ? error.message : String(error), restarts });
        scheduleSystemRestart("start_threw");
      }
    }
    let restarts = 0;
    function scheduleSystemRestart(cause: string) {
      const action = resolveLearningV2SystemHoldTerminalActionV1({
        holdActive: holdPressRef.current,
      });
      if (action === "finish") {
        micLog("system:finish", { cause, restarts, heard: systemHasListenedRef.current, transcriptChars: transcriptRef.current.trim().length });
        if (!transcriptRef.current.trim() && restarts > 0) micFailure("system_no_transcript_after_restarts", { cause, restarts, heard: systemHasListenedRef.current });
        finishCapture();
        return;
      }
      if (systemRestartTimerRef.current !== null) return;
      restarts += 1;
      if (restarts === 1 || restarts % 10 === 0) micLog("system:restart", { cause, restarts, heard: systemHasListenedRef.current });
      setStatus(resolveLearningV2SystemRestartStatusV1({
        hasListened: systemHasListenedRef.current,
      }));
      systemRestartTimerRef.current = setTimeout(() => {
        systemRestartTimerRef.current = null;
        launchSystemRecognition();
      }, 140);
    }
    const startSub = speechModule.addListener("start", () => {
      if (!current()) return;
      if (!holdPressRef.current) {
        try {
          speechModule.stop();
        } catch (swallowedError) {
          // Capture is already closing.
          noteSwallowed('use_learning_v2_local_hold_to_talk_v1:catch_3', swallowedError);
}
        return;
      }
      systemHasListenedRef.current = true;
      setStatus("listening");
    });
    const resultSub = speechModule.addListener("result", (event: unknown) => {
      if (!current()) return;
      const results =
        typeof event === "object" && event !== null && "results" in event
          ? (event as { results?: unknown }).results
          : null;
      if (!Array.isArray(results)) return;
      const top = results[0];
      const candidate =
        typeof top === "object" && top !== null && "transcript" in top
          ? String((top as { transcript?: unknown }).transcript ?? "").trim()
          : "";
      if (!candidate) return;
      systemHasListenedRef.current = true;
      transcriptRef.current = mergeLearningV2LocalTranscriptV1(
        transcriptRef.current,
        candidate,
        locale,
      );
      onTranscriptRef.current(transcriptRef.current);
      if (holdPressRef.current) setStatus("listening");
    });
    const endSub = speechModule.addListener("end", () => {
      if (current()) scheduleSystemRestart("end");
    });
    const errorSub = speechModule.addListener("error", (event: unknown) => {
      if (!current()) return;
      const fields = speechErrorFields(event);
      micLog("system:recognizer_error", { ...fields, restarts, holding: holdPressRef.current });
      // зачем: код ошибки распознавателя — главный факт по жалобе №6; одна прод-запись на код
      if (restarts === 0 || restarts === 5) micFailure(`system_error_${String(fields.error ?? fields.code ?? "unknown")}`, { ...fields, restarts });
      scheduleSystemRestart("error");
    });
    const noMatchSub = speechModule.addListener("nomatch", () => {
      if (!current()) return;
      scheduleSystemRestart("nomatch");
    });
    listenersRef.current = [startSub, resultSub, endSub, errorSub, noMatchSub];
    try {
      const audioReady = await recordingAudio.begin();
      if (!audioReady || !current() || !holdPressRef.current) {
        micLog("system:audio_session_not_ready", { audioReady, current: current(), holding: holdPressRef.current });
        if (!audioReady) micFailure("system_audio_session_begin_false", {});
        cancel();
        return;
      }
      launchSystemRecognition();
    } catch (error) {
      micFailure("system_audio_session_threw", { reason: error instanceof Error ? error.message : String(error) });
      cleanupListeners();
      restoreLoudPlaybackMode();
      if (mountedRef.current) setStatus("error");
    }
  }, [
    cancel,
    cleanupListeners,
    finishCapture,
    enabled,
    locale,
    recordingAudio,
    restoreLoudPlaybackMode,
    speechModule,
    targetText,
  ]);

  const stopSystem = useCallback(() => {
    holdPressRef.current = false;
    clearSystemRestartTimer();
    if (
      statusRef.current !== "requesting" &&
      statusRef.current !== "listening"
    )
      return;
    setStatus("finishing");
    micLog("system:stop", { transcriptChars: transcriptRef.current.trim().length });
    try {
      speechModule?.stop();
    } catch (error) {
      micLog("system:stop_threw", { reason: error instanceof Error ? error.message : String(error) });
      finishCapture();
      return;
    }
    scheduleSpeechStopSettlement(stopTimerRef, finishCapture);
  }, [clearSystemRestartTimer, finishCapture, speechModule]);

  const startPcm = useCallback(async () => {
    if (!enabled || !runtimeActiveRef.current) return;
    if (statusRef.current === "requesting" || statusRef.current === "listening")
      return;
    const previousStillFinishing = pcmFinishingRef.current;
    cancel();
    const generation = generationRef.current;
    micLog("pcm:start", { interactionId, locale, generation, previousStillFinishing });
    captureRouteRef.current = "pcm";
    holdPressRef.current = true;
    pcmFinishingRef.current = false;
    transcriptRef.current = "";
    finalTranscriptDeliveredRef.current = false;
    onTranscriptRef.current("");
    if (!speechModule) {
      captureRouteRef.current = null;
      holdPressRef.current = false;
      micFailure("pcm_no_speech_module", {});
      setStatus("local_recognition_unavailable");
      return;
    }
    setStatus("requesting");
    const permission = await requestSpeechPermissionForHold(speechModule);
    micLog("pcm:permission", { permission, stale: !mountedRef.current || generation !== generationRef.current, holding: holdPressRef.current });
    if (!mountedRef.current || generation !== generationRef.current) return;
    if (permission === "denied") {
      captureRouteRef.current = null;
      holdPressRef.current = false;
      micLog("pcm:permission_denied → shown", {});
      setStatus("permission_denied");
      return;
    }
    if (permission === "granted_after_prompt" || !holdPressRef.current) {
      micLog("pcm:not_started", { reason: permission === "granted_after_prompt" ? "granted_after_prompt" : "released_before_start" });
      captureRouteRef.current = null;
      holdPressRef.current = false;
      setStatus("idle");
      return;
    }
    let recording: HoldRecording | null = null;
    recording = startHoldRecording({
      onFirstAudio: () => {
        if (
          mountedRef.current &&
          runtimeActiveRef.current &&
          generation === generationRef.current &&
          holdPressRef.current &&
          pcmRecordingRef.current === recording
        ) {
          setStatus("listening");
        }
      },
    });
    if (!recording.isActive()) {
      captureRouteRef.current = null;
      holdPressRef.current = false;
      // зачем: кандидат на «микрофон пропал» — новая запись не поднялась (прежняя ещё освобождала микрофон?)
      micFailure("pcm_recorder_not_active", { previousStillFinishing });
      setStatus("error");
      return;
    }
    micLog("pcm:recording", {});
    pcmRecordingRef.current = recording;
  }, [cancel, enabled, speechModule]);

  const transcribePcmWithSystem = useCallback(
    (wavUri: string, generation: number): Promise<string> => {
      const androidApiLevel = Number(Platform.Version);
      if (
        !speechModule ||
        !Number.isFinite(androidApiLevel) ||
        androidApiLevel < 33
      ) {
        return Promise.resolve("");
      }

      cleanupListeners();
      return new Promise((resolve) => {
        let settled = false;
        let best = "";
        let timeout: ReturnType<typeof setTimeout> | null = null;
        const current = () =>
          mountedRef.current &&
          runtimeActiveRef.current &&
          generation === generationRef.current;
        const settle = () => {
          if (settled) return;
          settled = true;
          if (timeout !== null) clearTimeout(timeout);
          cleanupListeners();
          resolve(best.trim());
        };
        const resultSub = speechModule.addListener(
          "result",
          (event: unknown) => {
            if (!current()) return;
            const results =
              typeof event === "object" && event !== null && "results" in event
                ? (event as { results?: unknown }).results
                : null;
            if (!Array.isArray(results)) return;
            for (const result of results) {
              const candidate =
                typeof result === "object" &&
                result !== null &&
                "transcript" in result
                  ? String(
                      (result as { transcript?: unknown }).transcript ?? "",
                    ).trim()
                  : "";
              if (candidate.length > best.length) best = candidate;
            }
          },
        );
        const endSub = speechModule.addListener("end", settle);
        const errorSub = speechModule.addListener("error", settle);
        const noMatchSub = speechModule.addListener("nomatch", settle);
        listenersRef.current = [resultSub, endSub, errorSub, noMatchSub];
        timeout = setTimeout(() => {
          try {
            speechModule.abort();
          } catch (swallowedError) {
            // The file recognizer may already have settled.
            noteSwallowed('use_learning_v2_local_hold_to_talk_v1:catch_4', swallowedError);
}
          settle();
        }, 8_000);
        try {
          speechModule.start(
            buildControlRecognitionOptions({ lang: locale, uri: wavUri }),
          );
        } catch {
          settle();
        }
      });
    },
    [cleanupListeners, locale, speechModule],
  );

  const stopPcm = useCallback(async () => {
    holdPressRef.current = false;
    const generation = generationRef.current;
    const recording = pcmRecordingRef.current;
    if (!recording) {
      if (statusRef.current === "requesting") setStatus("idle");
      captureRouteRef.current = null;
      return;
    }
    if (pcmFinishingRef.current) return;
    pcmFinishingRef.current = true;
    pcmRecordingRef.current = null;
    setStatus("finishing");
    let wavUri: string | null = null;
    try {
      wavUri = await recording.stop();
      micLog("pcm:stopped", { hasFile: Boolean(wavUri), stale: generation !== generationRef.current });
      if (
        !mountedRef.current ||
        !runtimeActiveRef.current ||
        generation !== generationRef.current
      )
        return;
      if (!wavUri) {
        micFailure("pcm_no_file", {});
        setStatus("error");
        return;
      }
      const verdict = neuralJudgeSupported
        ? await judgeWithNeuralEngine({
            wavUri,
            targetText,
            locale,
          })
        : null;
      if (
        !mountedRef.current ||
        !runtimeActiveRef.current ||
        generation !== generationRef.current
      )
        return;
      const value =
        verdict?.transcript.trim() ||
        (await transcribePcmWithSystem(wavUri, generation));
      if (
        !mountedRef.current ||
        !runtimeActiveRef.current ||
        generation !== generationRef.current
      )
        return;
      if (!value) {
        micLog("pcm:empty_transcript → error shown", { neural: verdict ? "empty" : neuralJudgeSupported ? "failed" : "unsupported", androidApi: Number(Platform.Version) });
        setStatus("error");
        return;
      }
      micLog("pcm:transcript", { chars: value.length, source: verdict?.transcript.trim() ? "neural" : "system_file" });
      transcriptRef.current = value;
      onTranscriptRef.current(value);
      deliverFinalTranscript();
      setStatus("idle");
    } catch (error) {
      micFailure("pcm_stop_threw", { reason: error instanceof Error ? error.message : String(error) });
      if (mountedRef.current && generation === generationRef.current)
        setStatus("error");
    } finally {
      deleteHoldRecording(wavUri);
      if (generation === generationRef.current) {
        captureRouteRef.current = null;
        pcmFinishingRef.current = false;
      }
    }
  }, [
    deliverFinalTranscript,
    locale,
    neuralJudgeSupported,
    targetText,
    transcribePcmWithSystem,
  ]);

  const start = useCallback(() => {
    const captureRoute = resolveLearningV2HoldCaptureRouteV1({
      platform: Platform.OS,
      pcmRecorderSupported,
      neuralModelReady,
    });
    return captureRoute === "pcm" ? startPcm() : startSystem();
  }, [neuralModelReady, pcmRecorderSupported, startPcm, startSystem]);

  const stop = useCallback(() => {
    if (captureRouteRef.current === "pcm") {
      void stopPcm();
      return;
    }
    stopSystem();
  }, [stopPcm, stopSystem]);

  useEffect(() => {
    if (!pcmRecorderSupported || !neuralJudgeSupported) {
      setNeuralModelReady(false);
      return;
    }
    let cancelled = false;
    setNeuralModelReady(isNeuralModelReady(locale));
    void ensureNeuralModel(locale).then((ready) => {
      if (!cancelled) setNeuralModelReady(ready);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, neuralJudgeSupported, pcmRecorderSupported]);

  useEffect(() => {
    transcriptRef.current = "";
    cancel();
  }, [cancel, interactionId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  // Speech capture lifecycle invariant: blur/background invalidates pending starts,
  // aborts live capture, clears local transcript delivery, and never auto-resumes.
  useEffect(() => {
    if (runtimeActive) return;
    generationRef.current += 1;
    holdPressRef.current = false;
    clearStopTimer();
    clearSystemRestartTimer();
    cleanupListeners();
    try {
      speechModule?.abort();
    } catch (swallowedError) {
      // Capture is already closed.
      noteSwallowed('use_learning_v2_local_hold_to_talk_v1:catch_5', swallowedError);
}
    restoreLoudPlaybackMode();
    if (mountedRef.current) setStatus("idle");
  }, [
    cleanupListeners,
    clearStopTimer,
    clearSystemRestartTimer,
    restoreLoudPlaybackMode,
    runtimeActive,
    speechModule,
  ]);

  return Object.freeze({ status, start, stop, cancel });
}
