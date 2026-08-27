import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
} from "./account_generation";
import {
  deleteHoldRecording,
  isHoldRecordingSupported,
  startHoldRecording,
  type HoldRecording,
} from "./speaking_hold_recorder";
import { updateCustomCards } from "./flashcards/custom_cards_store";
import type { CardItem } from "./flashcards/types";
import {
  createLearningV2ActivityActionSessionV1,
  type LearningV2ActivityActionSessionV1,
  type LearningV2ActivityActionTerminalStateV1,
} from "../modules/learning-v2/runtime/activity_action_session_v1";
import type {
  LearningV2ActivityAuxiliaryRuntimeTaskV1,
  LearningV2ActivityAuxiliarySessionRuntimeV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_session_runtime_v1";
import type { LearningV2ActivityAttemptIdentityV1 } from "../modules/learning-v2/runtime/activity_attempt_controller_v1";
import type { LearningV2ActivityReportContextV1 } from "../modules/learning-v2/runtime/activity_learner_action_resource_v1";

export type LearningV2ActivityReportRequestV1 = Readonly<{
  requestId: number;
  context: LearningV2ActivityReportContextV1;
  identity: LearningV2ActivityAttemptIdentityV1;
}>;

export type LearningV2ActivityActionSessionMountV1 = Readonly<{
  actionSession: LearningV2ActivityActionSessionV1 | null;
  reportRequest: LearningV2ActivityReportRequestV1 | null;
  dismissReport: () => void;
}>;

function cardForLocale(
  input: Readonly<{
    targetText: string;
    meaning: string;
    interfaceLocale: LearningV2ActivityActionSessionV1["interfaceLocale"];
    savablePhraseRef: string;
    sourceCatalogFingerprint: string;
  }>,
): CardItem {
  const sourceLocales: NonNullable<CardItem["sourceLocales"]> = {};
  let ru = "";
  let uk = "";
  let es = "";
  if (input.interfaceLocale === "ru") ru = input.meaning;
  else if (input.interfaceLocale === "uk") uk = input.meaning;
  else if (input.interfaceLocale === "es") es = input.meaning;
  // зачем: en — чисто UI-язык, у sourceLocales (контент карточки) нет en-поля —
  // meaning для en уже хранится через targetText/en выше, здесь его дублировать
  // некуда и незачем (см. app/source_locales.ts).
  else if (input.interfaceLocale !== "en") sourceLocales[input.interfaceLocale] = input.meaning;
  return Object.freeze({
    id: `learning_v2_${input.savablePhraseRef}`,
    addedAt: Date.now(),
    en: input.targetText,
    ru,
    uk,
    es,
    sourceLocales,
    categoryId: "custom" as const,
    isSystem: false,
    source: "learning-v2",
    sourceId: `learning-v2:${input.sourceCatalogFingerprint}:${input.savablePhraseRef}`,
  });
}

export function useLearningV2ActivityActionSessionV1(
  input: Readonly<{
    runtime: LearningV2ActivityAuxiliarySessionRuntimeV1 | null;
    task: LearningV2ActivityAuxiliaryRuntimeTaskV1 | null;
    terminalState: LearningV2ActivityActionTerminalStateV1;
    reducedMotion: boolean;
    runtimeActive: boolean;
  }>,
): LearningV2ActivityActionSessionMountV1 {
  const [reportRequest, setReportRequest] =
    useState<LearningV2ActivityReportRequestV1 | null>(null);
  const reportSequenceRef = useRef(0);
  const recordingRef = useRef<HoldRecording | null>(null);

  const ports = useMemo(
    () => ({
      openReport: (
        request: Omit<LearningV2ActivityReportRequestV1, "requestId">,
      ) => {
        setReportRequest(
          Object.freeze({ ...request, requestId: ++reportSequenceRef.current }),
        );
      },
      saveCard: async ({
        card,
      }: Readonly<{
        card: Readonly<{
          targetText: string;
          meaning: string;
          interfaceLocale: LearningV2ActivityActionSessionV1["interfaceLocale"];
          savablePhraseRef: string;
          sourceCatalogFingerprint: string;
        }>;
      }>) => {
        if (input.runtime?.getDescriptor().studyTarget !== "en")
          return "failed" as const;
        const generation = captureAccountGeneration();
        if (!isCurrentAccountGeneration(generation)) return "stale" as const;
        return withAccountTransitionLock(async () => {
          if (!isCurrentAccountGeneration(generation)) return "stale" as const;
          const nextCard = cardForLocale(card);
          let added = false;
          await updateCustomCards((cards) => {
            if (
              cards.some(
                (candidate) =>
                  candidate.id === nextCard.id ||
                  candidate.sourceId === nextCard.sourceId,
              )
            )
              return cards;
            added = true;
            return [...cards, nextCard];
          });
          return added ? ("added" as const) : ("duplicate" as const);
        }).catch(() => "failed" as const);
      },
      voiceControl: async ({
        command,
        interaction,
      }: Readonly<{
        command: "start" | "stop";
        interaction: "tap" | "hold" | "lifecycle";
      }>) => {
        if (command === "stop") {
          const recording = recordingRef.current;
          recordingRef.current = null;
          if (!recording) return "stopped" as const;
          if (interaction === "lifecycle") {
            recording.cancel();
            return "stopped" as const;
          }
          const uri = await recording.stop();
          deleteHoldRecording(uri);
          return "stopped" as const;
        }
        if (recordingRef.current?.isActive()) return "failed" as const;
        if (!isHoldRecordingSupported()) return "unavailable" as const;
        const before = await getRecordingPermissionsAsync().catch(() => null);
        if (before?.granted !== true) {
          const requested = await requestRecordingPermissionsAsync().catch(
            () => null,
          );
          // A native prompt consumes the original press gesture. A fresh tap or
          // hold is required even when permission has just been granted.
          return requested?.granted === true
            ? ("unavailable" as const)
            : ("permission_denied" as const);
        }
        const recording = startHoldRecording();
        if (!recording.isActive()) return "unavailable" as const;
        recordingRef.current = recording;
        return "started" as const;
      },
    }),
    [input.runtime],
  );

  const actionSession = useMemo(() => {
    if (!input.runtime || !input.task || !input.runtimeActive) return null;
    return createLearningV2ActivityActionSessionV1({
      runtime: input.runtime,
      task: input.task,
      terminalState: input.terminalState,
      reducedMotion: input.reducedMotion,
      ports,
    });
  }, [
    input.reducedMotion,
    input.runtime,
    input.runtimeActive,
    input.task,
    input.terminalState,
    ports,
  ]);

  useEffect(() => {
    if (!actionSession) return;
    const accountSubscription = subscribeAccountGeneration(() => {
      setReportRequest(null);
      void actionSession.dispose();
    });
    return () => {
      accountSubscription.remove();
      void actionSession.dispose();
    };
  }, [actionSession]);
  useEffect(() => {
    setReportRequest(null);
  }, [actionSession?.identity.activityId, actionSession?.identity.taskId]);

  return useMemo(
    () =>
      Object.freeze({
        actionSession,
        reportRequest,
        dismissReport: () => setReportRequest(null),
      }),
    [actionSession, reportRequest],
  );
}
