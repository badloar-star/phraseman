// §SPEECH-NA (владелец 04.10.2026): голосовой шаг занятия Learning V2 на
// устройстве без распознавателя речи.
//
// зачем: шаг закрывается честно — disposition "skipped" (сервер и материализатор
// итога его принимают), но в звёздах занятия не учитывается: человек не виноват,
// что его телефон не умеет распознавать речь. Без этого занятие с голосовыми
// шагами давало бы меньше звёзд, а при многих таких шагах — не открывало
// следующее занятие.
import type { LearningV2CourseSessionInteractionCompletionV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";

export function learningV2DeviceSkippedVoiceCompletionV1(
  interactionId: string,
): LearningV2CourseSessionInteractionCompletionV1 {
  return {
    interactionId,
    disposition: "skipped",
    learnerAttempts: 0,
    hintUsed: false,
  };
}

/** Завершения, по которым считаются звёзды: без голосовых шагов, пропущенных устройством. */
export function learningV2StarEligibleCompletionsV1<T extends { readonly interactionId: string }>(
  completions: readonly T[],
  deviceSkippedVoiceIds: ReadonlySet<string>,
): readonly T[] {
  if (deviceSkippedVoiceIds.size === 0) return completions;
  return completions.filter((entry) => !deviceSkippedVoiceIds.has(entry.interactionId));
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
