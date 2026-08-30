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
} from "../modules/learning-v2/runtime/hold_capture_route_v1";

export type LearningV2LocalHoldToTalkStatusV1 =
  | "idle"
  | "requesting"
  | "listening"
  | "finishing"
  | "permission_denied"
  | "local_recognition_unavailable"
  | "error";

type Subscription = { remove?: () => void } | undefined;

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
  const transcriptRef = useRef("");
  const finalTranscriptDeliveredRef = useRef(false);
  const [status, setStatus] =
    useState<LearningV2LocalHoldToTalkStatusV1>("idle");
  const pcmRecorderSupported = useMemo(
    () => Platform.OS === "android" && isHoldRecordingSupported(),
    [],
  );
  const neuralJudgeSupported = useMemo(isNeuralJudgeSupported, []);
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
    } catch {
      // The native recognizer may already be gone.
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
    pcmFinishingRef.current = false;
    pcmRecordingRef.current?.cancel();
    pcmRecordingRef.current = null;
    clearStopTimer();
    clearSystemRestartTimer();
    cleanupListeners();
    try {
      speechModule?.abort();
    } catch {
      // Capture is already closed.
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
    captureRouteRef.current = "system";
    holdPressRef.current = true;
    transcriptRef.current = "";
    finalTranscriptDeliveredRef.current = false;
    onTranscriptRef.current("");
    if (!speechModule || !isSpeechRecognitionAvailable(speechModule)) {
      setStatus("local_recognition_unavailable");
      return;
    }
    setStatus("requesting");
    const permission = await requestSpeechPermissionForHold(speechModule);
    if (!mountedRef.current || generation !== generationRef.current) return;
    if (permission === "denied") {
      holdPressRef.current = false;
      setStatus("permission_denied");
      return;
    }
    if (permission === "granted_after_prompt" || !holdPressRef.current) {
      holdPressRef.current = false;
      setStatus("idle");
      return;
    }
    let localRecognition = false;
    try {
      localRecognition =
        (await speechModule.supportsOnDeviceRecognition?.()) === true;
    } catch {
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
      } catch {
        scheduleSystemRestart();
      }
    }
    function scheduleSystemRestart() {
      const action = resolveLearningV2SystemHoldTerminalActionV1({
        holdActive: holdPressRef.current,
      });
      if (action === "finish") {
        finishCapture();
        return;
      }
      if (systemRestartTimerRef.current !== null) return;
      setStatus("requesting");
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
        } catch {
          // Capture is already closing.
        }
        return;
      }
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
      transcriptRef.current = mergeLearningV2LocalTranscriptV1(
        transcriptRef.current,
        candidate,
        locale,
      );
      onTranscriptRef.current(transcriptRef.current);
      if (holdPressRef.current) setStatus("listening");
    });
    const endSub = speechModule.addListener("end", () => {
      if (current()) scheduleSystemRestart();
    });
    const errorSub = speechModule.addListener("error", () => {
      if (!current()) return;
      scheduleSystemRestart();
    });
    const noMatchSub = speechModule.addListener("nomatch", () => {
      if (!current()) return;
      scheduleSystemRestart();
    });
    listenersRef.current = [startSub, resultSub, endSub, errorSub, noMatchSub];
    try {
      if (
        !(await recordingAudio.begin()) ||
        !current() ||
        !holdPressRef.current
      ) {
        cancel();
        return;
      }
      launchSystemRecognition();
    } catch {
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
    try {
      speechModule?.stop();
    } catch {
      finishCapture();
      return;
    }
    scheduleSpeechStopSettlement(stopTimerRef, finishCapture);
  }, [clearSystemRestartTimer, finishCapture, speechModule]);

  const startPcm = useCallback(async () => {
    if (!enabled || !runtimeActiveRef.current) return;
    if (statusRef.current === "requesting" || statusRef.current === "listening")
      return;
    cancel();
    const generation = generationRef.current;
    captureRouteRef.current = "pcm";
    holdPressRef.current = true;
    pcmFinishingRef.current = false;
    transcriptRef.current = "";
    finalTranscriptDeliveredRef.current = false;
    onTranscriptRef.current("");
    if (!speechModule) {
      captureRouteRef.current = null;
      holdPressRef.current = false;
      setStatus("local_recognition_unavailable");
      return;
    }
    setStatus("requesting");
    const permission = await requestSpeechPermissionForHold(speechModule);
    if (!mountedRef.current || generation !== generationRef.current) return;
    if (permission === "denied") {
      captureRouteRef.current = null;
      holdPressRef.current = false;
      setStatus("permission_denied");
      return;
    }
    if (permission === "granted_after_prompt" || !holdPressRef.current) {
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
      setStatus("error");
      return;
    }
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
          } catch {
            // The file recognizer may already have settled.
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
      if (
        !mountedRef.current ||
        !runtimeActiveRef.current ||
        generation !== generationRef.current
      )
        return;
      if (!wavUri) {
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
        setStatus("error");
        return;
      }
      transcriptRef.current = value;
      onTranscriptRef.current(value);
      deliverFinalTranscript();
      setStatus("idle");
    } catch {
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
    });
    return captureRoute === "pcm" ? startPcm() : startSystem();
  }, [pcmRecorderSupported, startPcm, startSystem]);

  const stop = useCallback(() => {
    if (captureRouteRef.current === "pcm") {
      void stopPcm();
      return;
    }
    stopSystem();
  }, [stopPcm, stopSystem]);

  useEffect(() => {
    if (!pcmRecorderSupported || !neuralJudgeSupported) return;
    void ensureNeuralModel(locale);
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
    } catch {
      // Capture is already closed.
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
