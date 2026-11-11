import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type PreferenceListener = (value: boolean | null) => void;

let preference: boolean | null = null;
let subscription: { remove: () => void } | null = null;
let generation = 0;
let revision = 0;
let teardownQueued = false;
const listeners = new Set<PreferenceListener>();

function publish(value: boolean | null) {
  if (preference === value) return;
  preference = value;
  for (const listener of listeners) listener(value);
}

function beginNativeObservation() {
  if (subscription || listeners.size === 0) return true;

  const observationGeneration = ++generation;
  const readRevision = revision;
  let initialRead: Promise<boolean>;
  try {
    initialRead = AccessibilityInfo.isReduceMotionEnabled();
  } catch (error: unknown) {
    generation += 1;
    noteSwallowedHandler('use_reduce_motion:promise_1')(error);
    return false;
  }

  initialRead
    .then((enabled) => {
      if (generation !== observationGeneration || listeners.size === 0 || revision !== readRevision) return;
      revision += 1;
      publish(Boolean(enabled));
    })
    .catch((error: unknown) => {
      if (generation === observationGeneration && listeners.size > 0) {
        noteSwallowedHandler('use_reduce_motion:promise_1')(error);
      }
    });

  try {
    subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (generation !== observationGeneration || listeners.size === 0) return;
        revision += 1;
        publish(Boolean(enabled));
      },
    );
  } catch (error: unknown) {
    generation += 1;
    noteSwallowedHandler('use_reduce_motion:promise_1')(error);
    return false;
  }
  return true;
}

function subscribe(listener: PreferenceListener): () => void {
  // React may replace keyed consumers in one commit. Keep the observer through
  // that cleanup/setup hand-off so the new cohort neither flickers to null nor
  // repeats the native read/subscription.
  teardownQueued = false;
  listeners.add(listener);
  listener(preference);
  // A synchronous native setup failure leaves this mounted subscriber in the
  // shared set. A later subscriber may successfully start observation, whose
  // publish then reaches every still-mounted consumer.
  beginNativeObservation();

  return () => {
    listeners.delete(listener);
    if (listeners.size !== 0) return;

    teardownQueued = true;
    setTimeout(() => {
      if (!teardownQueued || listeners.size !== 0) return;
      teardownQueued = false;
      // Invalidate both the listener and a pending initial promise. A later
      // genuine remount begins from unknown rather than a disposed cohort's
      // value.
      generation += 1;
      revision += 1;
      const currentSubscription = subscription;
      subscription = null;
      preference = null;
      try {
        currentSubscription?.remove();
      } catch (error: unknown) {
        noteSwallowedHandler('use_reduce_motion:promise_1')(error);
      }
    }, 0);
  };
}

/**
 * Возвращает true, когда в системе включён режим «Уменьшение движения», и
 * null, пока начальное системное значение ещё не прочитано.
 * (iOS: Настройки → Универсальный доступ → Движение; Android: удаление анимаций).
 * Компоненты с бесконечными/укачивающими анимациями обязаны гейтить их этим
 * флагом: при reduce-motion крутиться нельзя — статичный кадр вместо цикла.
 *
 * Одна активная группа потребителей разделяет один native read и одну live
 * subscription; наблюдение начинается в эффекте первого потребителя, а не
 * при импорте модуля. Live-изменение всегда выигрывает у старого initial read.
 * Потребитель, для которого первый кадр критичен, трактует null консервативно
 * как запрет движения. Совместимый useReduceMotion ниже сохраняет прежний
 * boolean-контракт и возвращает false на время чтения/при ошибке API.
 */
export function useReduceMotionPreference(): boolean | null {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(() => preference);

  useEffect(() => subscribe(setReduceMotion), []);

  return reduceMotion;
}

export function useReduceMotion(): boolean {
  return useReduceMotionPreference() ?? false;
}
