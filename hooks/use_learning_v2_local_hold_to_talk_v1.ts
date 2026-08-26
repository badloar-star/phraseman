import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useManagedRecordingAudio } from "./use_managed_recording_audio";
import { useRuntimeActive } from "./use_runtime_active";
import {
  isSpeechRecognitionAvailable,
  loadSpeechRecognitionModule,
  requestSpeechPermissionForHold,
  scheduleSpeechStopSettlement,
} from "../app/speech_recognition_module";
import { buildSpeakingStartOptions } from "../app/speaking_recognition_options";
import { mergeLearningV2LocalTranscriptV1 } from "../modules/learning-v2/runtime/course_session_voice_response_v1";

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
  const runtimeActive = useRuntimeActive();
  const runtimeActiveRef = useRef(runtimeActive);
  runtimeActiveRef.current = runtimeActive;
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const holdPressRef = useRef(false);
  const listenersRef = useRef<Subscription[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef("");
  const finalTranscriptDeliveredRef = useRef(false);
  const [status, setStatus] =
    useState<LearningV2LocalHoldToTalkStatusV1>("idle");
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
    onFinalTranscript?.(value);
  }, [onFinalTranscript]);
  const finishCapture = useCallback(() => {
    clearStopTimer();
    cleanupListeners();
    restoreLoudPlaybackMode();
    deliverFinalTranscript();
    if (mountedRef.current) setStatus("idle");
  }, [
    cleanupListeners,
    clearStopTimer,
    deliverFinalTranscript,
    restoreLoudPlaybackMode,
  ]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    holdPressRef.current = false;
    clearStopTimer();
    cleanupListeners();
    try {
      speechModule?.abort();
    } catch {
      // Capture is already closed.
    }
    restoreLoudPlaybackMode();
    if (mountedRef.current) setStatus("idle");
  }, [cleanupListeners, clearStopTimer, restoreLoudPlaybackMode, speechModule]);

  const start = useCallback(async () => {
    if (!enabled || !runtimeActiveRef.current) return;
    if (statusRef.current === "requesting" || statusRef.current === "listening")
      return;
    cancel();
    const generation = generationRef.current;
    holdPressRef.current = true;
    transcriptRef.current = "";
    finalTranscriptDeliveredRef.current = false;
    onTranscript("");
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
      onTranscript(transcriptRef.current);
      if (holdPressRef.current) setStatus("listening");
    });
    const endSub = speechModule.addListener("end", () => {
      if (current()) finishCapture();
    });
    const errorSub = speechModule.addListener("error", () => {
      if (!current()) return;
      clearStopTimer();
      cleanupListeners();
      restoreLoudPlaybackMode();
      deliverFinalTranscript();
      setStatus(transcriptRef.current ? "idle" : "error");
    });
    const noMatchSub = speechModule.addListener("nomatch", () => {
      if (!current()) return;
      clearStopTimer();
      cleanupListeners();
      restoreLoudPlaybackMode();
      deliverFinalTranscript();
      setStatus(transcriptRef.current ? "idle" : "error");
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
      speechModule.start({
        ...buildSpeakingStartOptions({
          lang: locale,
          targetText,
          interimResults: true,
          volumeMeter: false,
          onDevice: localRecognition,
          persistRecording: false,
          holdToTalk: true,
          freeSpeech: targetText.trim().length === 0,
        }),
      });
    } catch {
      cleanupListeners();
      restoreLoudPlaybackMode();
      if (mountedRef.current) setStatus("error");
    }
  }, [
    cancel,
    cleanupListeners,
    clearStopTimer,
    finishCapture,
    deliverFinalTranscript,
    enabled,
    locale,
    onTranscript,
    recordingAudio,
    restoreLoudPlaybackMode,
    speechModule,
    targetText,
  ]);

  const stop = useCallback(() => {
    holdPressRef.current = false;
    if (statusRef.current === "requesting") {
      cancel();
      return;
    }
    if (statusRef.current !== "listening") return;
    setStatus("finishing");
    try {
      speechModule?.stop();
    } catch {
      finishCapture();
      return;
    }
    scheduleSpeechStopSettlement(stopTimerRef, finishCapture);
  }, [cancel, finishCapture, speechModule]);

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
    restoreLoudPlaybackMode,
    runtimeActive,
    speechModule,
  ]);

  return Object.freeze({ status, start, stop, cancel });
}
