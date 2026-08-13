import { useEffect, useMemo, useState } from "react";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";
import {
  createLearningV2ActivityAuxiliarySessionRuntimeV1,
  type LearningV2ActivityAuxiliarySessionRuntimeV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_session_runtime_v1";
import {
  hydrateLearningV2ActivityAuxiliaryCacheV1,
  loadCurrentLearningV2ActivityAuxiliarySessionV1,
  peekCurrentLearningV2ActivityAuxiliarySessionV1,
  waitForCurrentLearningV2ActivityAuxiliaryPreloadV1,
  type LearningV2ActivityAuxiliaryCurrentLocatorV1,
} from "./learning_v2_activity_auxiliary_client";

export type LearningV2ActivityAuxiliaryRouteScopeV1 = Readonly<{
  environment: "lab" | "staging" | "production";
  seasonId: string;
  episodeId: string;
}>;

export type LearningV2ActivityAuxiliarySessionMountV1 = Readonly<{
  status: "inactive" | "loading" | "ready" | "unavailable";
  runtime: LearningV2ActivityAuxiliarySessionRuntimeV1 | null;
}>;

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

export function parseLearningV2ActivityAuxiliaryRouteScopeV1(input: {
  releaseEnvironment?: string | string[];
  releaseSeasonId?: string | string[];
  releaseEpisodeId?: string | string[];
}): LearningV2ActivityAuxiliaryRouteScopeV1 | null {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  const environment = first(input.releaseEnvironment);
  const seasonId = first(input.releaseSeasonId);
  const episodeId = first(input.releaseEpisodeId);
  if (!environment && !seasonId && !episodeId) return null;
  if (
    !["lab", "staging", "production"].includes(environment) ||
    !ID_RE.test(seasonId) ||
    !ID_RE.test(episodeId)
  )
    return null;
  return Object.freeze({
    environment:
      environment as LearningV2ActivityAuxiliaryRouteScopeV1["environment"],
    seasonId,
    episodeId,
  });
}

function runtimeFromPeek(
  locator: LearningV2ActivityAuxiliaryCurrentLocatorV1 | null,
  interfaceLocale: LearningV2InterfaceLocale,
): LearningV2ActivityAuxiliarySessionRuntimeV1 | null {
  if (!locator) return null;
  const descriptor = peekCurrentLearningV2ActivityAuxiliarySessionV1(locator);
  return descriptor
    ? createLearningV2ActivityAuxiliarySessionRuntimeV1({
        descriptor,
        interfaceLocale,
      })
    : null;
}

export function useLearningV2ActivityAuxiliarySessionV1(input: {
  scope: LearningV2ActivityAuxiliaryRouteScopeV1 | null;
  studyTarget: string;
  learnerSourceLocale: string;
  sessionOrdinal: number;
  interfaceLocale: LearningV2InterfaceLocale;
  active: boolean;
  allowNetwork: boolean;
}): LearningV2ActivityAuxiliarySessionMountV1 {
  const locator = useMemo<LearningV2ActivityAuxiliaryCurrentLocatorV1 | null>(
    () =>
      input.scope &&
      Number.isSafeInteger(input.sessionOrdinal) &&
      input.sessionOrdinal >= 1 &&
      input.sessionOrdinal <= 12
        ? Object.freeze({
            environment: input.scope.environment,
            studyTarget: input.studyTarget,
            learnerSourceLocale: input.learnerSourceLocale,
            seasonId: input.scope.seasonId,
            episodeId: input.scope.episodeId,
            sessionOrdinal: input.sessionOrdinal,
          })
        : null,
    [
      input.learnerSourceLocale,
      input.scope,
      input.sessionOrdinal,
      input.studyTarget,
    ],
  );
  const [runtime, setRuntime] = useState(() =>
    runtimeFromPeek(locator, input.interfaceLocale),
  );
  const [status, setStatus] = useState<
    LearningV2ActivityAuxiliarySessionMountV1["status"]
  >(locator ? (runtime ? "ready" : "loading") : "inactive");

  useEffect(() => {
    if (!locator || !input.active) {
      setRuntime(null);
      setStatus(locator ? "loading" : "inactive");
      return;
    }
    let cancelled = false;
    const accept = (next: LearningV2ActivityAuxiliarySessionRuntimeV1) => {
      if (cancelled) return;
      setRuntime((current) =>
        current?.descriptorFingerprint === next.descriptorFingerprint
          ? current
          : next,
      );
      setStatus("ready");
    };
    const cached = runtimeFromPeek(locator, input.interfaceLocale);
    if (cached) accept(cached);
    else {
      setRuntime(null);
      setStatus("loading");
    }
    void (async () => {
      if (!input.allowNetwork) {
        await hydrateLearningV2ActivityAuxiliaryCacheV1();
        let hydrated = runtimeFromPeek(locator, input.interfaceLocale);
        if (!hydrated) {
          const pending =
            waitForCurrentLearningV2ActivityAuxiliaryPreloadV1(locator);
          if (pending) {
            await pending;
            hydrated = runtimeFromPeek(locator, input.interfaceLocale);
          }
        }
        if (!hydrated) throw new Error("activity_auxiliary_cache_unavailable");
        accept(hydrated);
        return;
      }
      const result =
        await loadCurrentLearningV2ActivityAuxiliarySessionV1(locator);
      accept(
        createLearningV2ActivityAuxiliarySessionRuntimeV1({
          descriptor: result.descriptor,
          interfaceLocale: input.interfaceLocale,
        }),
      );
    })().catch(() => {
      if (!cancelled && !runtimeFromPeek(locator, input.interfaceLocale)) {
        setRuntime(null);
        setStatus("unavailable");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [input.active, input.allowNetwork, input.interfaceLocale, locator]);

  return useMemo(() => Object.freeze({ status, runtime }), [runtime, status]);
}
