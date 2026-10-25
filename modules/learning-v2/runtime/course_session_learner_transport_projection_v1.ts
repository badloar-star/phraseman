import {
  LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1,
  encodeLearningV2CourseSessionAuxiliaryChildV1,
  encodeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionAuxiliaryEntryV1,
  type LearningV2CourseSessionIntroChildV1,
  type LearningV2CourseSessionLearnerChildV1,
} from "./course_session_client_children_v1";
import {
  evaluateLearningV2CourseSessionInteractionV1,
  parseLearningV2CourseSessionEvaluatorCapsuleChildV1,
  type LearningV2CourseSessionEvaluatorCapsuleChildV1,
} from "./course_session_evaluator_capsule_child_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../policies/decision_registry";

export const LEARNING_V2_COURSE_SESSION_LEARNER_TRANSPORT_PROJECTION_V1 =
  "learning-v2-course-session-learner-transport-projection.v1" as const;

export type LearningV2CourseSessionLearnerTransportProjectionV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_LEARNER_TRANSPORT_PROJECTION_V1;
  sourceLearnerFingerprint: string;
  learnerProjectionFingerprint: string;
  canonicalLearnerProjectionRaw: string;
}>;

export const LEARNING_V2_COURSE_SESSION_TRANSPORT_PROJECTION_V2 =
  "learning-v2-course-session-transport-projection.v2" as const;

export type LearningV2CourseSessionTransportProjectionV2 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_TRANSPORT_PROJECTION_V2;
  sourceLearnerFingerprint: string;
  learnerProjectionFingerprint: string;
  canonicalLearnerProjectionRaw: string;
  sourceAuxiliaryFingerprint: string;
  auxiliaryProjectionFingerprint: string;
  canonicalAuxiliaryProjectionRaw: string;
}>;

const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const HASH_RE = /^[a-f0-9]{64}$/u;
const MAX_DEPTH = 64;
const MAX_NODES = 200_000;
const MAX_ARRAY_LENGTH = 100_000;
const encoder = new TextEncoder();

function fail(): never {
  throw new Error("learning_v2_learner_transport_projection_invalid");
}

type TraversalState = {
  readonly ancestors: WeakSet<object>;
  nodes: number;
};

function dataDescriptor(
  descriptors: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
): PropertyDescriptor {
  const descriptor = descriptors[key];
  if (
    !descriptor ||
    !("value" in descriptor) ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    descriptor.enumerable !== true
  )
    fail();
  return descriptor;
}

function ownDenseArrayValues(value: unknown[]): readonly unknown[] {
  if (Object.getPrototypeOf(value) !== Array.prototype) fail();
  if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as
    Record<string, PropertyDescriptor>;
  const lengthDescriptor = descriptors.length;
  if (
    !lengthDescriptor ||
    !("value" in lengthDescriptor) ||
    lengthDescriptor.get !== undefined ||
    lengthDescriptor.set !== undefined ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > MAX_ARRAY_LENGTH
  )
    fail();
  const length = lengthDescriptor.value as number;
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== length + 1) fail();
  const output: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    if (!Object.prototype.hasOwnProperty.call(descriptors, key)) fail();
    output.push(dataDescriptor(descriptors, key).value);
  }
  if (names.some((key) => key !== "length" && !/^(?:0|[1-9]\d*)$/u.test(key)))
    fail();
  return output;
}

function ownCorrectValue(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (!Object.prototype.hasOwnProperty.call(descriptors, "correct")) return undefined;
  return dataDescriptor(descriptors, "correct").value;
}

function cloneFeedbackRows(
  value: unknown,
  state: TraversalState,
  depth: number,
): readonly unknown[] {
  if (!Array.isArray(value)) fail();
  const rows = ownDenseArrayValues(value);
  return Object.freeze(rows
    .filter((row) => ownCorrectValue(row) === false)
    .map((row) => cloneJson(row, state, depth + 1, true)));
}

function cloneJson(
  value: unknown,
  state: TraversalState,
  depth: number,
  projectLearner: boolean,
): unknown {
  if (depth > MAX_DEPTH) fail();
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  )
    return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail();
    return value;
  }
  if (typeof value !== "object") fail();
  state.nodes += 1;
  if (state.nodes > MAX_NODES || state.ancestors.has(value)) fail();
  state.ancestors.add(value);
  try {
    if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) fail();
    if (Array.isArray(value)) {
      const output = ownDenseArrayValues(value).map((child) =>
        cloneJson(child, state, depth + 1, projectLearner),
      );
      return Object.freeze(output);
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) fail();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const output: Record<string, unknown> = Object.create(null);
    for (const key of Object.getOwnPropertyNames(value)) {
      if (RESERVED.has(key)) fail();
      const child = dataDescriptor(descriptors, key).value;
      if (projectLearner && key === "correct") continue;
      output[key] = projectLearner &&
        (key === "choiceFeedback" || key === "slotFeedback")
        ? cloneFeedbackRows(child, state, depth + 1)
        : cloneJson(child, state, depth + 1, projectLearner);
    }
    return Object.freeze(output);
  } finally {
    state.ancestors.delete(value);
  }
}

function hardenedClone(value: unknown, projectLearner: boolean): unknown {
  return cloneJson(value, { ancestors: new WeakSet<object>(), nodes: 0 }, 0, projectLearner);
}

function bodyWithoutLearnerFingerprint(
  learner: Record<string, unknown>,
): Record<string, unknown> {
  const body: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(learner)) {
    if (key !== "learnerFingerprint") body[key] = learner[key];
  }
  return body;
}

export function projectLearningV2CourseSessionLearnerTransportFromVerifiedValueV1(
  value: unknown,
): LearningV2CourseSessionLearnerTransportProjectionV1 {
  const source = hardenedClone(value, false);
  const canonicalSourceRaw = canonicalJsonV1(source);
  if (
    encoder.encode(canonicalSourceRaw).byteLength >
    LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1
  )
    fail();
  let verifiedSource: LearningV2CourseSessionLearnerChildV1;
  try {
    verifiedSource = parseLearningV2CourseSessionLearnerChildV1(canonicalSourceRaw);
  } catch {
    fail();
  }
  const projected = hardenedClone(source, true) as Record<string, unknown>;
  const projectedBody = bodyWithoutLearnerFingerprint(projected);
  const learnerProjectionFingerprint = hashCanonicalBody(
    projectedBody,
  );
  const projectedWithFingerprint = Object.freeze({
    ...projectedBody,
    learnerFingerprint: learnerProjectionFingerprint,
  });
  const canonicalLearnerProjectionRaw = canonicalJsonV1(projectedWithFingerprint);
  try {
    const parsedProjection = parseLearningV2CourseSessionLearnerChildV1(
      canonicalLearnerProjectionRaw,
    );
    if (parsedProjection.learnerFingerprint !== learnerProjectionFingerprint) fail();
  } catch {
    fail();
  }
  return Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_LEARNER_TRANSPORT_PROJECTION_V1,
    sourceLearnerFingerprint: verifiedSource.learnerFingerprint,
    learnerProjectionFingerprint,
    canonicalLearnerProjectionRaw,
  });
}

export function projectLearningV2CourseSessionLearnerTransportFromCanonicalSourceV1(
  raw: string,
): LearningV2CourseSessionLearnerTransportProjectionV1 {
  if (
    typeof raw !== "string" ||
    encoder.encode(raw).byteLength > LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  const projection = projectLearningV2CourseSessionLearnerTransportFromVerifiedValueV1(value);
  const canonicalSource = canonicalJsonV1(hardenedClone(value, false));
  if (
    canonicalSource !== raw ||
    !HASH_RE.test(projection.sourceLearnerFingerprint) ||
    !HASH_RE.test(projection.learnerProjectionFingerprint)
  )
    fail();
  return projection;
}

function evaluatorEntryByInteractionId(
  evaluator: LearningV2CourseSessionEvaluatorCapsuleChildV1,
) {
  return new Map(evaluator.entries.map((entry) => [entry.interactionId, entry]));
}

function provenWrongResponseIdsV2(
  intro: LearningV2CourseSessionIntroChildV1,
  learner: LearningV2CourseSessionLearnerChildV1,
  evaluator: LearningV2CourseSessionEvaluatorCapsuleChildV1,
): ReadonlyMap<string, ReadonlySet<string>> {
  const entries = evaluatorEntryByInteractionId(evaluator);
  const proven = new Map<string, ReadonlySet<string>>();
  for (const page of intro.pages) {
    const interactionId = page.question.interactionId;
    const evaluatorEntry = entries.get(interactionId);
    const empty = new Set<string>();
    if (
      !interactionId.endsWith(":q") ||
      !evaluatorEntry ||
      evaluatorEntry.inputKind !== "text"
    ) {
      proven.set(interactionId, empty);
      continue;
    }
    const choices = page.question.choicesByLocale.en;
    const localizedChoices = Object.values(page.question.choicesByLocale);
    if (
      choices.length < 2 ||
      localizedChoices.some((localized) =>
        localized.length !== choices.length ||
        localized.some((choice, index) => choice !== choices[index]),
      )
    ) {
      proven.set(interactionId, empty);
      continue;
    }
    const wrong = new Set<string>();
    let correctCount = 0;
    let invalid = false;
    choices.forEach((choice, index) => {
      const verdict = evaluateLearningV2CourseSessionInteractionV1(
        evaluator,
        interactionId,
        { kind: "text", value: choice },
      );
      const responseId = `${interactionId.slice(0, -2)}:r${index + 1}`;
      if (verdict.resultCode === "provisional_correct") correctCount += 1;
      else if (verdict.resultCode === "provisional_wrong") wrong.add(responseId);
      else invalid = true;
    });
    proven.set(
      interactionId,
      !invalid && correctCount === 1 && wrong.size === choices.length - 1
        ? wrong
        : empty,
    );
  }

  for (const [interactionId, wrongIds] of new Map(learner.interactions.map((interaction) => {
    const empty = new Set<string>();
    const evaluatorEntry = entries.get(interaction.interactionId);
    if (!evaluatorEntry || evaluatorEntry.family !== interaction.family)
      return [interaction.interactionId, empty] as const;

    if (
      interaction.inputMode === "single_choice" &&
      evaluatorEntry.inputKind === "choice_token"
    ) {
      const wrong = new Set<string>();
      let correctCount = 0;
      for (const option of interaction.responseOptions) {
        const verdict = evaluateLearningV2CourseSessionInteractionV1(
          evaluator,
          interaction.interactionId,
          { kind: "choice_token", value: option.responseId },
        );
        if (verdict.resultCode === "technical_invalid")
          return [interaction.interactionId, empty] as const;
        if (verdict.resultCode === "provisional_correct") correctCount += 1;
        else if (verdict.resultCode === "provisional_wrong")
          wrong.add(option.responseId);
      }
      return [
        interaction.interactionId,
        correctCount > 0 ? wrong : empty,
      ] as const;
    }

    if (
      interaction.inputMode === "ordered_tokens" &&
      evaluatorEntry.inputKind === "text" &&
      interaction.modePayload !== null &&
      (interaction.modePayload.family === "phrase_builder" ||
        interaction.modePayload.family === "listen_build_dictation")
    ) {
      const payload = interaction.modePayload;
      const expectedTexts = [
        ...payload.orderedTokens,
        ...payload.authoredDistractorTokens,
      ];
      if (
        interaction.responseOptions.length !== expectedTexts.length ||
        interaction.responseOptions.some(
          (option, index) => option.text !== expectedTexts[index],
        )
      ) return [interaction.interactionId, empty] as const;
      const canonicalVerdict = evaluateLearningV2CourseSessionInteractionV1(
        evaluator,
        interaction.interactionId,
        { kind: "text", value: payload.orderedTokens.join(" ") },
      );
      const orderedTokens = new Set(payload.orderedTokens);
      if (
        canonicalVerdict.resultCode !== "provisional_correct" ||
        payload.authoredDistractorTokens.some((token) => orderedTokens.has(token))
      ) return [interaction.interactionId, empty] as const;
      return [
        interaction.interactionId,
        new Set(
          interaction.responseOptions
            .slice(payload.orderedTokens.length)
            .map((option) => option.responseId),
        ),
      ] as const;
    }

    return [interaction.interactionId, empty] as const;
  }))) proven.set(interactionId, wrongIds);
  return proven;
}

function learnerModePayloadProjectionV2(
  value: LearningV2CourseSessionLearnerChildV1["interactions"][number]["modePayload"],
  allowedWrongIds: ReadonlySet<string>,
): LearningV2CourseSessionLearnerChildV1["interactions"][number]["modePayload"] {
  if (value === null) return null;
  const projected = JSON.parse(canonicalJsonV1(value)) as Record<string, unknown>;
  delete projected.completionFeedbackByLocale;
  if (
    projected.explanationV1 &&
    typeof projected.explanationV1 === "object" &&
    !Array.isArray(projected.explanationV1)
  ) {
    const explanation = projected.explanationV1 as Record<string, unknown>;
    delete explanation.completionFeedbackByLocale;
    if (
      projected.family === "phrase_builder" ||
      projected.family === "listen_build_dictation"
    ) delete explanation.phrase;
    if (Object.keys(explanation).length === 0) delete projected.explanationV1;
  }
  for (const key of ["choiceFeedback", "slotFeedback"] as const) {
    if (!Array.isArray(projected[key])) continue;
    projected[key] = projected[key].filter((row) =>
      row !== null &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      allowedWrongIds.has(String((row as Record<string, unknown>).responseId)),
    ).map((row) => {
      const { correct: _correct, ...withoutCorrect } = row as Record<string, unknown>;
      return withoutCorrect;
    });
  }
  return projected as LearningV2CourseSessionLearnerChildV1["interactions"][number]["modePayload"];
}

function filterResponseMapV2<T>(
  source: Readonly<Record<string, T>> | undefined,
  allowedWrongIds: ReadonlySet<string>,
): Readonly<Record<string, T>> | undefined {
  if (!source) return undefined;
  const retained = Object.entries(source).filter(([responseId]) =>
    allowedWrongIds.has(responseId),
  );
  return retained.length > 0 ? Object.freeze(Object.fromEntries(retained)) : undefined;
}

function auxiliaryEntryProjectionV2(
  entry: LearningV2CourseSessionAuxiliaryEntryV1,
  allowedWrongIds: ReadonlySet<string>,
): LearningV2CourseSessionAuxiliaryEntryV1 {
  const {
    responseFeedbackById: sourceFeedback,
    responseAnalysisById: sourceAnalysis,
    responseDiagnosticsById: sourceDiagnostics,
    ...base
  } = entry;
  const responseFeedbackById = filterResponseMapV2(
    sourceFeedback,
    allowedWrongIds,
  );
  const responseAnalysisById = filterResponseMapV2(
    sourceAnalysis,
    allowedWrongIds,
  );
  const responseDiagnosticsById = filterResponseMapV2(
    sourceDiagnostics,
    allowedWrongIds,
  );
  return Object.freeze({
    ...base,
    ...(responseFeedbackById ? { responseFeedbackById } : {}),
    ...(responseAnalysisById ? { responseAnalysisById } : {}),
    ...(responseDiagnosticsById ? { responseDiagnosticsById } : {}),
  });
}

/**
 * Versioned learner transport view. Correctness is derived only from the
 * verified evaluator capsule (single choice) or an exact ordered-token source
 * shape whose canonical response is accepted. Unmappable response maps are
 * omitted rather than exposed or guessed.
 */
export function projectLearningV2CourseSessionTransportV2({
  canonicalIntroSourceRaw,
  canonicalLearnerSourceRaw,
  canonicalEvaluatorCapsuleRaw,
  canonicalAuxiliarySourceRaw,
}: Readonly<{
  canonicalIntroSourceRaw: string;
  canonicalLearnerSourceRaw: string;
  canonicalEvaluatorCapsuleRaw: string;
  canonicalAuxiliarySourceRaw: string;
}>): LearningV2CourseSessionTransportProjectionV2 {
  let intro: LearningV2CourseSessionIntroChildV1;
  let learner: LearningV2CourseSessionLearnerChildV1;
  let evaluator: LearningV2CourseSessionEvaluatorCapsuleChildV1;
  let auxiliary: ReturnType<typeof parseLearningV2CourseSessionAuxiliaryChildV1>;
  try {
    intro = parseLearningV2CourseSessionIntroChildV1(
      canonicalIntroSourceRaw,
    );
    learner = parseLearningV2CourseSessionLearnerChildV1(
      canonicalLearnerSourceRaw,
    );
    evaluator = parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
      canonicalEvaluatorCapsuleRaw,
    );
    auxiliary = parseLearningV2CourseSessionAuxiliaryChildV1(
      canonicalAuxiliarySourceRaw,
    );
  } catch {
    fail();
  }
  if (
    intro.courseSessionId !== learner.courseSessionId ||
    learner.courseSessionId !== evaluator.courseSessionId ||
    learner.courseSessionId !== auxiliary.courseSessionId
  ) fail();

  const allowedWrongIds = provenWrongResponseIdsV2(intro, learner, evaluator);
  const projectedLearner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: learner.courseSessionId,
    targetLanguage: learner.targetLanguage,
    interactionProfile: learner.interactionProfile,
    interactions: learner.interactions.map((interaction) => Object.freeze({
      ...interaction,
      modePayload: learnerModePayloadProjectionV2(
        interaction.modePayload,
        allowedWrongIds.get(interaction.interactionId) ?? new Set<string>(),
      ),
    })),
  });
  const projectedAuxiliary = materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId: auxiliary.courseSessionId,
    entries: auxiliary.entries.map((entry) => auxiliaryEntryProjectionV2(
      entry,
      allowedWrongIds.get(entry.interactionId) ?? new Set<string>(),
    )),
  });
  const canonicalLearnerProjectionRaw =
    encodeLearningV2CourseSessionLearnerChildV1(projectedLearner);
  const canonicalAuxiliaryProjectionRaw =
    encodeLearningV2CourseSessionAuxiliaryChildV1(projectedAuxiliary);
  return Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_TRANSPORT_PROJECTION_V2,
    sourceLearnerFingerprint: learner.learnerFingerprint,
    learnerProjectionFingerprint: projectedLearner.learnerFingerprint,
    canonicalLearnerProjectionRaw,
    sourceAuxiliaryFingerprint: auxiliary.auxiliaryFingerprint,
    auxiliaryProjectionFingerprint: projectedAuxiliary.auxiliaryFingerprint,
    canonicalAuxiliaryProjectionRaw,
  });
}
