import {
  materializeFactoryNativeLearningV2SessionV1,
} from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import {
  encodeLearningV2CourseSessionLearnerChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  evaluateLearningV2CourseSessionInteractionV1,
} from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";

function pathsForKey(value: unknown, wanted: string, path = "$" ): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) =>
      pathsForKey(child, wanted, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    ...(key === wanted ? [`${path}.${key}`] : []),
    ...pathsForKey(child, wanted, `${path}.${key}`),
  ]);
}

test("factory S01 learner wire omits correctness markers while evaluator keeps scoring", () => {
  const material = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    interfaceLocale: "ru",
  });
  expect(material).not.toBeNull();

  const learner = material!.learnerChild;
  const raw = encodeLearningV2CourseSessionLearnerChildV1(learner);
  expect(pathsForKey(learner, "correct")).toEqual([]);
  expect(pathsForKey(JSON.parse(raw), "correct")).toEqual([]);

  const interaction = learner.interactions.find(
    (entry) => entry.inputMode === "single_choice",
  );
  expect(interaction).toBeDefined();
  const verdicts = interaction!.responseOptions.map((option) =>
    evaluateLearningV2CourseSessionInteractionV1(
      material!.evaluatorCapsuleChild,
      interaction!.interactionId,
      { kind: "choice_token", value: option.responseId },
    ).resultCode,
  );
  expect(verdicts.filter((verdict) => verdict === "provisional_correct")).toHaveLength(1);
  expect(verdicts.filter((verdict) => verdict === "provisional_wrong")).toHaveLength(
    interaction!.responseOptions.length - 1,
  );
});
