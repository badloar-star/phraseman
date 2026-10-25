import {
  encodeLearningV2CourseSessionIntroChildV1,
  encodeLearningV2CourseSessionLearnerChildV1,
  encodeLearningV2CourseSessionAuxiliaryChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  encodeLearningV2CourseSessionEvaluatorCapsuleChildV1,
  evaluateLearningV2CourseSessionInteractionV1,
} from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import {
  materializeFactoryNativeLearningV2SessionV1,
} from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import {
  projectLearningV2CourseSessionLearnerTransportFromCanonicalSourceV1,
  projectLearningV2CourseSessionLearnerTransportFromVerifiedValueV1,
  projectLearningV2CourseSessionTransportV2,
} from "../modules/learning-v2/runtime/course_session_learner_transport_projection_v1";

function legacySourceRaw() {
  const material = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    interfaceLocale: "ru",
  });
  if (!material) throw new Error("fixture_missing");
  const source = JSON.parse(
    encodeLearningV2CourseSessionLearnerChildV1(material.learnerChild),
  );
  const choice = source.interactions.find((entry: any) =>
    entry.inputMode === "single_choice" &&
    Array.isArray(entry.modePayload?.choiceFeedback) &&
    entry.responseOptions.length >= 2,
  );
  const ordered = source.interactions.find((entry: any) =>
    entry.inputMode === "ordered_tokens" &&
    Array.isArray(entry.modePayload?.slotFeedback) &&
    entry.responseOptions.length >= 2,
  );
  if (!choice || !ordered) throw new Error("feedback_fixture_missing");
  choice.modePayload.choiceFeedback = choice.responseOptions.slice(0, 2).map(
    (option: any, index: number) => ({
      responseId: option.responseId,
      correct: index === 0,
      feedbackByLocale: index === 0
        ? { ru: "Верно.", uk: "Правильно." }
        : { ru: "Неверный вариант.", uk: "Неправильний варіант." },
    }),
  );
  const wrongSlot = {
    responseId: ordered.responseOptions.at(-1).responseId,
    correct: false,
    feedbackByLocale: { ru: "Неверная плитка.", uk: "Неправильна плитка." },
  };
  ordered.modePayload.slotFeedback = [{
    responseId: ordered.responseOptions[0].responseId,
    correct: true,
    feedbackByLocale: { ru: "Верная плитка.", uk: "Правильна плитка." },
  }, wrongSlot];
  const { learnerFingerprint: _old, ...body } = source;
  source.learnerFingerprint = hashCanonicalBody(body);
  return canonicalJsonV1(source);
}

test("projects verified v3 learner bytes into a distinct marker-free transport view", () => {
  const sourceRaw = legacySourceRaw();
  const source = JSON.parse(sourceRaw);
  const projected = projectLearningV2CourseSessionLearnerTransportFromCanonicalSourceV1(sourceRaw);
  const view = JSON.parse(projected.canonicalLearnerProjectionRaw);

  expect(projected.sourceLearnerFingerprint).toBe(source.learnerFingerprint);
  expect(projected.learnerProjectionFingerprint).toBe(view.learnerFingerprint);
  expect(projected.learnerProjectionFingerprint).not.toBe(projected.sourceLearnerFingerprint);
  expect(projected.canonicalLearnerProjectionRaw).not.toContain('"correct"');
  expect(sourceRaw).toContain('"correct"');

  const sourceChoice = source.interactions.find((entry: any) =>
    Array.isArray(entry.modePayload?.choiceFeedback) && entry.modePayload.choiceFeedback.length === 2,
  );
  const viewChoice = view.interactions.find((entry: any) =>
    entry.interactionId === sourceChoice.interactionId,
  );
  expect(viewChoice.modePayload.choiceFeedback.map((row: any) => row.responseId)).toEqual([
    sourceChoice.modePayload.choiceFeedback[1].responseId,
  ]);

  const sourceOrdered = source.interactions.find((entry: any) =>
    Array.isArray(entry.modePayload?.slotFeedback) && entry.modePayload.slotFeedback.length === 2,
  );
  const viewOrdered = view.interactions.find((entry: any) =>
    entry.interactionId === sourceOrdered.interactionId,
  );
  expect(viewOrdered.modePayload.slotFeedback.map((row: any) => row.responseId)).toEqual([
    sourceOrdered.modePayload.slotFeedback[1].responseId,
  ]);
});

test("real S01 v4 projection preserves only evaluator/source-proven wrong feedback and auxiliary maps", () => {
  const material = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    interfaceLocale: "ru",
  });
  if (!material) throw new Error("fixture_missing");
  const learnerRaw = encodeLearningV2CourseSessionLearnerChildV1(material.learnerChild);
  const introRaw = encodeLearningV2CourseSessionIntroChildV1(material.introChild);
  const evaluatorRaw = encodeLearningV2CourseSessionEvaluatorCapsuleChildV1(material.evaluatorCapsuleChild);
  const auxiliaryRaw = encodeLearningV2CourseSessionAuxiliaryChildV1(material.auxiliaryChild);
  const projection = projectLearningV2CourseSessionTransportV2({
    canonicalIntroSourceRaw: introRaw,
    canonicalLearnerSourceRaw: learnerRaw,
    canonicalEvaluatorCapsuleRaw: evaluatorRaw,
    canonicalAuxiliarySourceRaw: auxiliaryRaw,
  });
  const learner = JSON.parse(projection.canonicalLearnerProjectionRaw);
  const auxiliary = JSON.parse(projection.canonicalAuxiliaryProjectionRaw);

  let provenWrongChoiceRows = 0;
  let retainedWrongChoiceRows = 0;
  let provenWrongSlotRows = 0;
  let retainedWrongSlotRows = 0;
  for (const sourceInteraction of material.learnerChild.interactions) {
    const projectedInteraction = learner.interactions.find(
      (entry: any) => entry.interactionId === sourceInteraction.interactionId,
    );
    if (!projectedInteraction) throw new Error("projected_interaction_missing");
    if (sourceInteraction.inputMode === "single_choice") {
      const wrongIds = new Set(sourceInteraction.responseOptions.filter((option) =>
        evaluateLearningV2CourseSessionInteractionV1(
          material.evaluatorCapsuleChild,
          sourceInteraction.interactionId,
          { kind: "choice_token", value: option.responseId },
        ).resultCode === "provisional_wrong",
      ).map((option) => option.responseId));
      const correctIds = new Set(sourceInteraction.responseOptions
        .map((option) => option.responseId)
        .filter((id) => !wrongIds.has(id)));
      const rows = projectedInteraction.modePayload?.choiceFeedback ?? [];
      provenWrongChoiceRows += wrongIds.size;
      retainedWrongChoiceRows += rows.length;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row: any) => wrongIds.has(row.responseId))).toBe(true);
      expect(rows.some((row: any) => correctIds.has(row.responseId))).toBe(false);

      const auxiliaryEntry = auxiliary.entries.find(
        (entry: any) => entry.interactionId === sourceInteraction.interactionId,
      );
      for (const mapName of ["responseFeedbackById", "responseAnalysisById", "responseDiagnosticsById"]) {
        const keys = Object.keys(auxiliaryEntry?.[mapName] ?? {});
        expect(keys.every((id) => wrongIds.has(id))).toBe(true);
        expect(keys.some((id) => correctIds.has(id))).toBe(false);
      }
    }
    if (sourceInteraction.inputMode === "ordered_tokens") {
      const rows = projectedInteraction.modePayload?.slotFeedback ?? [];
      retainedWrongSlotRows += rows.length;
      const orderedCount = projectedInteraction.modePayload.orderedTokens.length;
      const distractorIds = new Set(sourceInteraction.responseOptions
        .slice(orderedCount)
        .map((option) => option.responseId));
      const auxiliaryEntry = material.auxiliaryChild.entries.find(
        (entry) => entry.interactionId === sourceInteraction.interactionId,
      );
      const expectedWrongRows = sourceInteraction.responseOptions
        .filter((option) => distractorIds.has(option.responseId))
        .flatMap((option) => {
          const feedbackByLocale = auxiliaryEntry?.responseFeedbackById?.[option.responseId];
          return feedbackByLocale ? [{ responseId: option.responseId, feedbackByLocale }] : [];
        });
      provenWrongSlotRows += expectedWrongRows.length;
      expect(rows.every((row: any) => distractorIds.has(row.responseId))).toBe(true);
      expect(rows.map((row: any) => ({
        responseId: row.responseId,
        feedbackByLocale: row.feedbackByLocale,
      }))).toEqual(expectedWrongRows);
    }
  }
  expect(provenWrongChoiceRows).toBeGreaterThan(0);
  expect(retainedWrongChoiceRows).toBeGreaterThan(0);
  expect(provenWrongSlotRows).toBeGreaterThan(0);
  expect(retainedWrongSlotRows).toBe(provenWrongSlotRows);
  expect(projection.canonicalLearnerProjectionRaw).not.toContain('"correct"');
  expect(projection.canonicalLearnerProjectionRaw).not.toContain('"completionFeedbackByLocale"');
  expect(projection.canonicalAuxiliaryProjectionRaw).not.toContain('"correct"');
  for (const page of material.introChild.pages) {
    const introEntry = auxiliary.entries.find(
      (entry: any) => entry.interactionId === page.question.interactionId,
    );
    const verdicts = page.question.choicesByLocale.en.map((choice, index) => ({
      responseId: `${page.question.interactionId.replace(/:q$/u, "")}:r${index + 1}`,
      verdict: evaluateLearningV2CourseSessionInteractionV1(
        material.evaluatorCapsuleChild,
        page.question.interactionId,
        { kind: "text", value: choice },
      ).resultCode,
    }));
    const wrongIds = verdicts
      .filter((entry) => entry.verdict === "provisional_wrong")
      .map((entry) => entry.responseId);
    const correctIds = new Set(verdicts
      .filter((entry) => entry.verdict === "provisional_correct")
      .map((entry) => entry.responseId));
    expect(Object.keys(introEntry.responseFeedbackById)).toEqual(wrongIds);
    expect(Object.keys(introEntry.responseFeedbackById)
      .some((id) => correctIds.has(id))).toBe(false);
    expect(introEntry.secondErrorExplanationByLocale.ru).toEqual(expect.any(String));
  }
  expect(encodeLearningV2CourseSessionLearnerChildV1(material.learnerChild)).toBe(learnerRaw);
  expect(encodeLearningV2CourseSessionAuxiliaryChildV1(material.auxiliaryChild)).toBe(auxiliaryRaw);
});

test("v4 projection removes ordered-family answer analysis while retaining scripted-repeat wrong remediation", () => {
  const material = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    interfaceLocale: "ru",
  });
  if (!material) throw new Error("fixture_missing");
  const learner = JSON.parse(
    encodeLearningV2CourseSessionLearnerChildV1(material.learnerChild),
  );
  const ordered = learner.interactions.filter((entry: any) =>
    entry.modePayload?.family === "phrase_builder" ||
    entry.modePayload?.family === "listen_build_dictation",
  );
  if (!ordered.some((entry: any) => entry.modePayload.family === "phrase_builder"))
    throw new Error("phrase_builder_fixture_missing");
  if (!ordered.some((entry: any) => entry.modePayload.family === "listen_build_dictation"))
    throw new Error("listen_build_dictation_fixture_missing");
  const phrase = (text: string) => ({
    text,
    meaningByLocale: { ru: "Я здесь.", uk: "Я тут." },
    explanationByLocale: {
      ru: "Раскрывает полный правильный ответ.",
      uk: "Розкриває повну правильну відповідь.",
    },
    units: [{
      text,
      start: 0,
      end: text.length,
      lemma: text,
      partOfSpeech: "phrase",
      partOfSpeechLabelByLocale: { ru: "фраза", uk: "фраза" },
      meaningByLocale: { ru: "Я здесь.", uk: "Я тут." },
      functionByLocale: { ru: "Правильный ответ.", uk: "Правильна відповідь." },
      sourceRefs: ["test:reviewed-phrase"],
    }],
  });
  for (const interaction of ordered) {
    interaction.modePayload.completionFeedbackByLocale = {
      ru: "Длинное объяснение правильного ответа.",
      uk: "Довге пояснення правильної відповіді.",
    };
    interaction.modePayload.explanationV1 = {
      completionFeedbackByLocale: {
        ru: "Ещё одно длинное объяснение.",
        uk: "Ще одне довге пояснення.",
      },
      phrase: phrase(
        interaction.modePayload.family === "phrase_builder"
          ? interaction.modePayload.targetPhrase
          : interaction.modePayload.hiddenTargetPhrase,
      ),
    };
  }
  const scripted = learner.interactions.find((entry: any) =>
    entry.modePayload?.family === "scripted_repeat_compare",
  );
  if (!scripted) throw new Error("scripted_repeat_fixture_missing");
  scripted.modePayload.explanationV1 = {
    phrase: phrase(scripted.modePayload.targetPhrase),
  };
  const { learnerFingerprint: _old, ...body } = learner;
  learner.learnerFingerprint = hashCanonicalBody(body);
  const sourceRaw = canonicalJsonV1(learner);

  const projection = projectLearningV2CourseSessionTransportV2({
    canonicalIntroSourceRaw:
      encodeLearningV2CourseSessionIntroChildV1(material.introChild),
    canonicalLearnerSourceRaw: sourceRaw,
    canonicalEvaluatorCapsuleRaw:
      encodeLearningV2CourseSessionEvaluatorCapsuleChildV1(
        material.evaluatorCapsuleChild,
      ),
    canonicalAuxiliarySourceRaw:
      encodeLearningV2CourseSessionAuxiliaryChildV1(material.auxiliaryChild),
  });

  const projected = JSON.parse(projection.canonicalLearnerProjectionRaw);
  expect(sourceRaw).toContain('"completionFeedbackByLocale"');
  for (const interaction of projected.interactions.filter((entry: any) =>
    entry.modePayload?.family === "phrase_builder" ||
    entry.modePayload?.family === "listen_build_dictation",
  )) {
    expect(interaction.modePayload.completionFeedbackByLocale).toBeUndefined();
    expect(interaction.modePayload.explanationV1).toBeUndefined();
  }
  const projectedScripted = projected.interactions.find((entry: any) =>
    entry.interactionId === scripted.interactionId,
  );
  expect(projectedScripted.modePayload.explanationV1).toEqual({
    phrase: phrase(scripted.modePayload.targetPhrase),
  });
});

test("hostile traversal fails closed without invoking accessors", () => {
  const source = JSON.parse(legacySourceRaw());
  let getterCalls = 0;
  Object.defineProperty(source.interactions[0].modePayload, "trap", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "secret";
    },
  });
  expect(() =>
    projectLearningV2CourseSessionLearnerTransportFromVerifiedValueV1(source),
  ).toThrow("learning_v2_learner_transport_projection_invalid");
  expect(getterCalls).toBe(0);
});

test.each([
  ["cycle", (source: any) => { source.loop = source; }],
  ["sparse_array", (source: any) => { source.interactions.length += 1; }],
  ["reserved_key", (source: any) => {
    Object.defineProperty(source, "__proto__", { value: {}, enumerable: true });
  }],
  ["symbol", (source: any) => { source[Symbol("hidden")] = true; }],
  ["non_plain", (source: any) => {
    source.interactions[0].modePayload = new Date();
  }],
] as const)("hostile traversal rejects %s", (_label, mutate) => {
  const source = JSON.parse(legacySourceRaw());
  mutate(source);
  expect(() =>
    projectLearningV2CourseSessionLearnerTransportFromVerifiedValueV1(source),
  ).toThrow("learning_v2_learner_transport_projection_invalid");
});
