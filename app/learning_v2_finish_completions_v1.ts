// Сборка отметок занятия Learning V2 перед завершением (finish() плеера).
//
// зачем (№46, прод 2.0.0, решение владельца 21.10): finish() требовал отметку по КАЖДОМУ интро и заданию и иначе бросал
// learning_v2_direct_session_incomplete. Проверка главы пропускала интро — человек проходил все задания и получал 0 звёзд,
// проверка не засчитывалась, следующая глава оставалась закрытой. Корень починен в плеере (интро показываются и в проверке),
// а здесь — страховка и журнал:
//  • не хватает ТОЛЬКО интро → досоздаём их как "skipped" (материализатор итога и сервер это принимают: learnerAttempts 0),
//    в звёздах они не участвуют (как пропущенный устройством голосовой шаг), занятие засчитывается;
//  • не хватает хоть одного ЗАДАНИЯ практики → прежний отказ: засчитать непройденное задание нельзя.
// Журнал [V2-FINISH] пишет вход и каждое решение — оставить навсегда (правило «сперва логи»).
import type { LearningV2CourseSessionInteractionCompletionV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";

export type LearningV2FinishCompletionsInputV1 = Readonly<{
  introInteractionIds: readonly string[];
  practiceInteractionIds: readonly string[];
  completions: ReadonlyMap<string, LearningV2CourseSessionInteractionCompletionV1>;
  /** Для журнала: где и в каком состоянии вызвано. */
  context: Readonly<Record<string, unknown>>;
}>;

export type LearningV2FinishCompletionsResultV1 =
  | Readonly<{
      ok: true;
      interactionCompletions: readonly LearningV2CourseSessionInteractionCompletionV1[];
      /** Интро, досозданные как skipped: исключить из подсчёта звёзд. */
      repairedIntroIds: readonly string[];
    }>
  | Readonly<{
      ok: false;
      missingIntroIds: readonly string[];
      missingPracticeIds: readonly string[];
    }>;

const LOG = "[V2-FINISH]";

export function resolveLearningV2FinishCompletionsV1(
  input: LearningV2FinishCompletionsInputV1,
): LearningV2FinishCompletionsResultV1 {
  const missingIntroIds = input.introInteractionIds.filter((id) => !input.completions.has(id));
  const missingPracticeIds = input.practiceInteractionIds.filter((id) => !input.completions.has(id));
  console.log(`${LOG} collect`, JSON.stringify({
    ...input.context,
    intro: input.introInteractionIds.length,
    practice: input.practiceInteractionIds.length,
    completions: input.completions.size,
    missingIntro: missingIntroIds,
    missingPractice: missingPracticeIds,
  })); // guard-ok: одна строка на завершение занятия
  if (missingPracticeIds.length > 0) {
    console.warn(`${LOG} incomplete_practice`, JSON.stringify({ ...input.context, missingPractice: missingPracticeIds, missingIntro: missingIntroIds })); // guard-ok: ранний выход с причиной
    return Object.freeze({ ok: false, missingIntroIds, missingPracticeIds });
  }
  if (missingIntroIds.length > 0) {
    console.warn(`${LOG} intro_repaired_as_skipped`, JSON.stringify({ ...input.context, repaired: missingIntroIds })); // guard-ok: страховка №46 с причиной
  }
  const repaired = new Set(missingIntroIds);
  const toCompletion = (id: string): LearningV2CourseSessionInteractionCompletionV1 =>
    repaired.has(id)
      ? Object.freeze({ interactionId: id, disposition: "skipped" as const, learnerAttempts: 0, hintUsed: false })
      : input.completions.get(id)!;
  return Object.freeze({
    ok: true,
    interactionCompletions: Object.freeze([
      ...input.introInteractionIds.map(toCompletion),
      ...input.practiceInteractionIds.map(toCompletion),
    ]),
    repairedIntroIds: Object.freeze([...missingIntroIds]),
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __LearningV2FinishCompletionsRouteShim() {
  return null;
}
