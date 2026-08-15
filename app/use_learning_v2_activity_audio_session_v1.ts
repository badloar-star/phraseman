import { useEffect, useMemo, useState } from "react";

import type { LearningV2ActivityAudioPreloadHandleV1 } from "./learning_v2_activity_audio_preload_v1";
import {
  peekCurrentLearningV2ActivityAudioSessionV1,
  resolveLearningV2ActivityFullPhraseAudioFileV1,
  resolveLearningV2ActivitySelectableAudioFileV1,
  waitForCurrentLearningV2ActivityAudioPreloadV1,
} from "./learning_v2_activity_audio_preload_v1";
import type { LearningV2ActivityAuxiliaryCurrentLocatorV1 } from "./learning_v2_activity_auxiliary_client";

export type LearningV2ActivityAudioSessionV1 = Readonly<{
  status: "inactive" | "ready" | "unavailable";
  playability: "local_files_only" | "none";
  resolveSelectable(
    taskId: string,
    selectableId: string,
  ): Readonly<{
    fileUri: string;
    voiceId: "ash" | "onyx" | "nova" | "coral";
  }> | null;
  resolveFullPhrase(taskId: string): Readonly<{
    fileUri: string;
    voiceId: "ash" | "onyx" | "nova" | "coral";
  }> | null;
}>;

function sessionFromHandle(
  handle: LearningV2ActivityAudioPreloadHandleV1,
): LearningV2ActivityAudioSessionV1 {
  return Object.freeze({
    status: "ready" as const,
    playability: "local_files_only" as const,
    resolveSelectable: (taskId: string, selectableId: string) =>
      resolveLearningV2ActivitySelectableAudioFileV1({
        handle,
        taskId,
        selectableId,
      }),
    resolveFullPhrase: (taskId: string) =>
      resolveLearningV2ActivityFullPhraseAudioFileV1({ handle, taskId }),
  });
}

export function useLearningV2ActivityAudioSessionV1(input: {
  readonly locator: LearningV2ActivityAuxiliaryCurrentLocatorV1 | null;
  readonly active: boolean;
}): LearningV2ActivityAudioSessionV1 {
  const [readyHandle, setReadyHandle] =
    useState<LearningV2ActivityAudioPreloadHandleV1 | null>(() =>
      input.active && input.locator
        ? peekCurrentLearningV2ActivityAudioSessionV1(input.locator)
        : null,
    );
  useEffect(() => {
    if (!input.active || !input.locator) {
      setReadyHandle(null);
      return;
    }
    let cancelled = false;
    const cached = peekCurrentLearningV2ActivityAudioSessionV1(input.locator);
    setReadyHandle(cached);
    if (cached) return;
    const pending = waitForCurrentLearningV2ActivityAudioPreloadV1(
      input.locator,
    );
    if (!pending) return;
    void pending
      .then(() => {
        if (cancelled) return;
        setReadyHandle(
          peekCurrentLearningV2ActivityAudioSessionV1(input.locator!),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [input.active, input.locator]);
  return useMemo(() => {
    if (!input.active || !input.locator)
      return Object.freeze({
        status: "inactive" as const,
        playability: "none" as const,
        resolveSelectable: () => null,
        resolveFullPhrase: () => null,
      });
    const handle = readyHandle;
    if (handle) return sessionFromHandle(handle);
    return Object.freeze({
      status: "unavailable" as const,
      playability: "none" as const,
      resolveSelectable: () => null,
      resolveFullPhrase: () => null,
    });
  }, [input.active, input.locator, readyHandle]);
}
