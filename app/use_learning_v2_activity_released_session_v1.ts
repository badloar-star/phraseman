import { useEffect, useMemo, useState } from "react";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";
import {
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  mountLearningV2ActivityReleasedSessionRuntimeV1,
  type LearningV2ActivityReleasedSessionRuntimeHandleV1,
} from "../modules/learning-v2/runtime/activity_released_session_package_v1";
import {
  hydrateLearningV2ActivityReleasedSessionCacheV1,
  loadCurrentLearningV2ActivityReleasedSessionV1,
  peekCurrentLearningV2ActivityReleasedSessionV1,
  waitForCurrentLearningV2ActivityReleasedSessionPreloadV1,
  type LearningV2ActivityReleasedSessionCurrentLocatorV1,
} from "./learning_v2_activity_released_session_client_v1";
import type { LearningV2ActivityAuxiliaryRouteScopeV1 } from "./use_learning_v2_activity_auxiliary_session_v1";

export type LearningV2ActivityReleasedSessionMountV1 = Readonly<{
  status: "inactive" | "loading" | "ready" | "unavailable";
  runtime: LearningV2ActivityReleasedSessionRuntimeHandleV1 | null;
}>;

function runtimeFromPeek(
  locator: LearningV2ActivityReleasedSessionCurrentLocatorV1 | null,
  interfaceLocale: LearningV2InterfaceLocale,
): LearningV2ActivityReleasedSessionRuntimeHandleV1 | null {
  if (!locator) return null;
  const found = peekCurrentLearningV2ActivityReleasedSessionV1(locator);
  return found
    ? mountLearningV2ActivityReleasedSessionRuntimeV1({
        packageHandle: found.packageHandle,
        interfaceLocale,
      })
    : null;
}

export function useLearningV2ActivityReleasedSessionV1(input: {
  scope: LearningV2ActivityAuxiliaryRouteScopeV1 | null;
  studyTarget: string;
  learnerSourceLocale: string;
  sessionOrdinal: number;
  interfaceLocale: LearningV2InterfaceLocale;
  active: boolean;
  allowNetwork: boolean;
}): LearningV2ActivityReleasedSessionMountV1 {
  const locator =
    useMemo<LearningV2ActivityReleasedSessionCurrentLocatorV1 | null>(
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
    LearningV2ActivityReleasedSessionMountV1["status"]
  >(locator ? (runtime ? "ready" : "loading") : "inactive");

  useEffect(() => {
    if (!locator || !input.active) {
      setRuntime(null);
      setStatus(locator ? "loading" : "inactive");
      return;
    }
    let cancelled = false;
    const accept = (next: LearningV2ActivityReleasedSessionRuntimeHandleV1) => {
      if (cancelled) return;
      const nextFingerprint =
        getLearningV2ActivityReleasedSessionRuntimeSummaryV1(
          next,
        ).runtimeFingerprint;
      setRuntime((current) =>
        current &&
        getLearningV2ActivityReleasedSessionRuntimeSummaryV1(current)
          .runtimeFingerprint === nextFingerprint
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
        await hydrateLearningV2ActivityReleasedSessionCacheV1();
        let hydrated = runtimeFromPeek(locator, input.interfaceLocale);
        if (!hydrated) {
          const pending =
            waitForCurrentLearningV2ActivityReleasedSessionPreloadV1(locator);
          if (pending) {
            await pending;
            hydrated = runtimeFromPeek(locator, input.interfaceLocale);
          }
        }
        if (!hydrated) throw new Error("activity_released_cache_unavailable");
        accept(hydrated);
        return;
      }
      const result =
        await loadCurrentLearningV2ActivityReleasedSessionV1(locator);
      accept(
        mountLearningV2ActivityReleasedSessionRuntimeV1({
          packageHandle: result.packageHandle,
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
