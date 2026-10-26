import assert from "node:assert/strict";

import {
  buildLearningV2AuthoringDevicePreviewV1,
  learningV2AuthoringDevicePreviewRowsV1,
} from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { authoredLearningV2SessionSource } from "../modules/learning-v2/content/source/authored_sessions_v1";
import {
  buildLearningV2AuthoringDevicePreviewLesson2V1,
  learningV2AuthoringDevicePreviewLesson2RowsV1,
} from "../modules/learning-v2/preview/authoring_device_preview_lesson2_v1";
import { authoredLearningV2Episode02SessionSource } from "../modules/learning-v2/content/source/authored_episode_02_sessions_v1";
import { authoredLearningV2Episode03SessionSource } from "../modules/learning-v2/content/source/authored_episode_03_sessions_v1";
import { buildLearningV2AuthoringDevicePreviewLesson3V1, learningV2AuthoringDevicePreviewLesson3RowsV1 } from "../modules/learning-v2/preview/authoring_device_preview_lesson3_v1";

type ModePayload = Readonly<Record<string, unknown>> & { readonly family: string };
type AuditInteraction = Readonly<{
  interactionId: string;
  ordinal: number;
  purpose: string;
  family: string;
  modePayload: unknown;
}>;
type AuthoritativePracticeStep = Readonly<{
  family: string;
  purpose: string;
  modePayload: unknown;
}>;

const normalize = (value: string): string => value
  .normalize("NFKC")
  .replaceAll("’", "'")
  .toLocaleLowerCase("en")
  .replace(/[^a-z0-9']+/gu, " ")
  .trim();

const projectedPrimaryTargetMatchesAuthority = (
  learner: ModePayload,
  authoritative: ModePayload,
  interactionId: string,
): void => {
  assert.equal(learner.family, authoritative.family, `projection_payload_family_mismatch:${interactionId}`);
  if (authoritative.family === "phrase_builder" || authoritative.family === "scripted_repeat_compare") {
    assert.equal(learner.targetPhrase, authoritative.targetPhrase, `projection_target_mismatch:${interactionId}`);
  } else if (authoritative.family === "listen_build_dictation") {
    assert.equal(learner.hiddenTargetPhrase, authoritative.hiddenTargetPhrase, `projection_target_mismatch:${interactionId}`);
  } else if (authoritative.family === "listen_choose") {
    assert.equal(
      (learner.referenceAudio as Readonly<{ transcript?: string }> | undefined)?.transcript,
      (authoritative.referenceAudio as Readonly<{ transcript?: string }> | undefined)?.transcript,
      `projection_target_mismatch:${interactionId}`,
    );
  } else if (authoritative.family === "speed_match") {
    assert.deepEqual(
      (learner.pairGrid as readonly Readonly<{ target: string }>[]).map((entry) => entry.target),
      (authoritative.pairGrid as readonly Readonly<{ target: string }>[]).map((entry) => entry.target),
      `projection_target_mismatch:${interactionId}`,
    );
  } else if (authoritative.family === "context_gap_grammar") {
    assert.equal(
      learner.gappedTargetPhrase,
      authoritative.gappedTargetPhrase,
      `projection_target_mismatch:${interactionId}`,
    );
    assert.deepEqual(learner.gapOptions, authoritative.gapOptions, `projection_gap_options_mismatch:${interactionId}`);
  }
};

const primaryTarget = (
  learnerPayload: ModePayload,
  authoritativePayload: ModePayload,
  interactionId = "fixture",
): string => {
  projectedPrimaryTargetMatchesAuthority(learnerPayload, authoritativePayload, interactionId);
  const payload = authoritativePayload;
  if (payload.family === "phrase_builder") return String(payload.targetPhrase);
  if (payload.family === "listen_build_dictation") return String(payload.hiddenTargetPhrase);
  if (payload.family === "scripted_repeat_compare") return String(payload.targetPhrase);
  if (payload.family === "listen_choose") {
    return String((payload.referenceAudio as Readonly<{ transcript: string }>).transcript);
  }
  if (payload.family === "speed_match") {
    const pairs = payload.pairGrid as readonly Readonly<{ target: string }>[];
    return `board:${pairs.map((entry) => normalize(entry.target)).sort().join("|")}`;
  }
  if (payload.family === "context_gap_grammar") {
    const feedback = payload.choiceFeedback as readonly Readonly<{
      responseId: string;
      correct: boolean;
    }>[];
    const options = payload.gapOptions as readonly Readonly<{
      responseId: string;
      text: string;
    }>[];
    const correctId = feedback.find((entry) => entry.correct)?.responseId;
    const correctText = options.find((entry) => entry.responseId === correctId)?.text;
    assert.ok(correctText, "context_gap_correct_target_missing");
    return String(payload.gappedTargetPhrase).replace("___", correctText);
  }
  throw new Error(`unsupported_mode_family:${payload.family}`);
};

const authoritativeStepsForProjection = (
  lessonOrdinal: number,
  sessionOrdinal: number,
  interactions: readonly AuditInteraction[],
  authoritativeSteps: readonly AuthoritativePracticeStep[] | undefined,
): readonly AuthoritativePracticeStep[] => {
  assert.ok(authoritativeSteps, `authoritative_mode_native_practice_missing:lesson=${lessonOrdinal}:session=${sessionOrdinal}`);
  const pad = (value: number): string => String(value).padStart(2, "0");
  const idPattern = new RegExp(`^card-episode-${pad(lessonOrdinal)}-s${pad(sessionOrdinal)}-(\\d+)$`, "u");
  let previousSourceSlot = 3;
  return interactions.map((interaction, index) => {
    assert.equal(interaction.ordinal, index + 4, `projection_order_mismatch:${interaction.interactionId}`);
    const match = idPattern.exec(interaction.interactionId);
    assert.ok(match, `projection_task_identity_mismatch:${interaction.interactionId}`);
    const sourceSlot = Number(match[1]);
    assert.ok(sourceSlot > previousSourceSlot, `projection_source_order_mismatch:${interaction.interactionId}`);
    previousSourceSlot = sourceSlot;
    const authority = authoritativeSteps[sourceSlot - 4];
    assert.ok(authority, `projection_authority_missing:${interaction.interactionId}`);
    assert.equal(interaction.family, authority.family, `projection_family_mismatch:${interaction.interactionId}`);
    assert.equal(interaction.purpose, authority.purpose, `projection_purpose_mismatch:${interaction.interactionId}`);
    const learnerPayload = interaction.modePayload as ModePayload;
    const authoritativePayload = authority.modePayload as ModePayload;
    assert.equal(learnerPayload.family, interaction.family, `projection_payload_family_mismatch:${interaction.interactionId}`);
    assert.equal(authoritativePayload.family, authority.family, `authority_payload_family_mismatch:${interaction.interactionId}`);
    projectedPrimaryTargetMatchesAuthority(learnerPayload, authoritativePayload, interaction.interactionId);
    return authority;
  });
};

/**
 * A lexical item must recur across *different* learning operations: hearing a
 * word, retrieving its meaning, and building its form are distinct learner
 * tasks.  Treating the bare word as the full task identity made the gate
 * forbid the required word-first progression and rewarded a seven-card
 * truncation.  What must never recur is the same learner action on the same
 * primary surface target (and a Speed Match board is always unique by itself).
 */
const primaryTaskSignature = (
  interaction: Readonly<{ purpose: string; modePayload: unknown }>,
  authority: AuthoritativePracticeStep,
): string => {
  const payload = interaction.modePayload as ModePayload;
  const surface = primaryTarget(
    payload,
    authority.modePayload as ModePayload,
    (interaction as Readonly<{ interactionId?: string }>).interactionId,
  );
  return payload.family === "speed_match"
    ? surface
    : `${payload.family}|${interaction.purpose}|${surface}`;
};

const findings: string[] = [];
const requiredFamilies = new Set([
  "phrase_builder",
  "listen_choose",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
]);
const audit = (
  lessonOrdinal: number,
  sessionOrdinal: number,
  interactions: readonly AuditInteraction[],
  introPrimaryTargets: readonly string[] = [],
  authoritativeSteps?: readonly AuthoritativePracticeStep[],
): void => {
  const linkedAuthority = authoritativeStepsForProjection(
    lessonOrdinal,
    sessionOrdinal,
    interactions,
    authoritativeSteps,
  );
  const exactPracticeTargets = interactions.map((interaction, index) => normalize(primaryTarget(
    interaction.modePayload as ModePayload,
    linkedAuthority[index]!.modePayload as ModePayload,
    interaction.interactionId,
  )));
  const speedMatchCount = interactions.filter(
    (entry) => (entry.modePayload as ModePayload).family === "speed_match",
  ).length;
  if (speedMatchCount > 1) {
    findings.push(`speed_match_more_than_once:lesson=${lessonOrdinal}:session=${sessionOrdinal}:count=${speedMatchCount}`);
  }
  const presentFamilies = new Set(
    interactions.map((entry) => (entry.modePayload as ModePayload).family),
  );
  for (const family of requiredFamilies) {
    if (!presentFamilies.has(family)) {
      findings.push(`required_family_missing:lesson=${lessonOrdinal}:session=${sessionOrdinal}:family=${family}`);
    }
  }

  const firstByTarget = new Map<string, string>();
  for (const [index, target] of introPrimaryTargets.entries()) {
    const signature = normalize(target);
    if (!exactPracticeTargets.includes(signature)) {
      findings.push(
        `intro_target_not_practiced:lesson=${lessonOrdinal}:session=${sessionOrdinal}:intro=${index + 1}:target=${signature}`,
      );
    }
    const firstId = firstByTarget.get(signature);
    if (firstId) {
      findings.push(
        `primary_target_repeated:lesson=${lessonOrdinal}:session=${sessionOrdinal}:target=${signature}:first=${firstId}:again=intro-${index + 1}`,
      );
    } else {
      firstByTarget.set(signature, `intro-${index + 1}`);
    }
  }
  for (const [index, interaction] of interactions.entries()) {
    const signature = normalize(primaryTaskSignature(interaction, linkedAuthority[index]!));
    const firstId = firstByTarget.get(signature);
    if (firstId) {
      findings.push(
        `primary_target_repeated:lesson=${lessonOrdinal}:session=${sessionOrdinal}:target=${signature}:first=${firstId}:again=${interaction.interactionId}`,
      );
    } else {
      firstByTarget.set(signature, interaction.interactionId);
    }
  }
};

const selfTestRedactedContextGap = process.argv.includes("--self-test-redacted-context-gap");
const selfTestIntroPracticeLink = process.argv.includes("--self-test-intro-practice-link");
const selfTestIntroPracticePositive = process.argv.includes("--self-test-intro-practice-positive");
const selfTestSourceSlotMismatch = process.argv.includes("--self-test-source-slot-mismatch");
if (selfTestRedactedContextGap) {
  const learnerPayload = {
    family: "context_gap_grammar",
    gappedTargetPhrase: "I ___ here.",
    gapOptions: [
      { responseId: "gap-am", text: "am" },
      { responseId: "gap-is", text: "is" },
    ],
    choiceFeedback: [
      { responseId: "gap-am" },
      { responseId: "gap-is" },
    ],
  } as unknown as ModePayload;
  const authoritativePayload = {
    ...learnerPayload,
    choiceFeedback: [
      { responseId: "gap-am", correct: true },
      { responseId: "gap-is", correct: false },
    ],
  } as unknown as ModePayload;
  const target = (primaryTarget as unknown as (
    learner: ModePayload,
    authoritative: ModePayload,
  ) => string)(learnerPayload, authoritativePayload);
  assert.equal(target, "I am here.");
  process.stdout.write("LEARNING V2 NO REPEATED PRIMARY TASK SELF-TEST: PASS redacted-context-gap\n");
  process.exit(0);
}

if (selfTestIntroPracticeLink) {
  const fixture = (
    slot: number,
    family: string,
    modePayload: Readonly<Record<string, unknown>>,
  ) => ({
    interaction: {
      interactionId: `card-episode-01-s01-${String(slot).padStart(2, "0")}`,
      ordinal: slot,
      purpose: "guided_practice",
      family,
      modePayload,
    },
    authority: {
      family,
      purpose: "guided_practice",
      modePayload,
    },
  });
  const fixtures = [
    fixture(4, "phrase_builder", { family: "phrase_builder", targetPhrase: "I am ready." }),
    fixture(5, "listen_choose", { family: "listen_choose", referenceAudio: { transcript: "I am early." } }),
    fixture(6, "listen_build_dictation", { family: "listen_build_dictation", hiddenTargetPhrase: "I am calm." }),
    fixture(7, "context_gap_grammar", {
      family: "context_gap_grammar",
      gappedTargetPhrase: "I ___ busy.",
      gapOptions: [
        { responseId: "gap-am", text: "am" },
        { responseId: "gap-is", text: "is" },
      ],
      choiceFeedback: [
        { responseId: "gap-am", correct: true },
        { responseId: "gap-is", correct: false },
      ],
    }),
    fixture(8, "speed_match", {
      family: "speed_match",
      pairGrid: [{ target: "here" }, { target: "ready" }],
    }),
    fixture(9, "scripted_repeat_compare", { family: "scripted_repeat_compare", targetPhrase: "I am fine." }),
    fixture(10, "phrase_builder", { family: "phrase_builder", targetPhrase: "I am ready." }),
  ];
  const before = findings.length;
  (audit as unknown as (
    lessonOrdinal: number,
    sessionOrdinal: number,
    interactions: readonly unknown[],
    introPrimaryTargets: readonly string[],
    authoritativeSteps: readonly unknown[],
  ) => void)(
    1,
    1,
    fixtures.map((entry) => entry.interaction),
    ["I am here."],
    fixtures.map((entry) => entry.authority),
  );
  const fixtureFindings = findings.slice(before);
  assert.ok(
    fixtureFindings.some((finding) => finding.includes("intro_target_not_practiced")),
    `missing_intro_practice_binding:${fixtureFindings.join(";")}`,
  );
  assert.ok(
    fixtureFindings.some((finding) => finding.includes("primary_target_repeated")),
    `existing_repeat_constraint_lost:${fixtureFindings.join(";")}`,
  );
  process.stdout.write("LEARNING V2 NO REPEATED PRIMARY TASK SELF-TEST: PASS intro-practice-link\n");
  process.exit(0);
}

if (selfTestIntroPracticePositive) {
  const fixture = (
    slot: number,
    family: string,
    modePayload: Readonly<Record<string, unknown>>,
  ) => ({
    interaction: {
      interactionId: `card-episode-01-s01-${String(slot).padStart(2, "0")}`,
      ordinal: slot,
      purpose: "guided_practice",
      family,
      modePayload,
    },
    authority: {
      family,
      purpose: "guided_practice",
      modePayload,
    },
  });
  const fixtures = [
    fixture(4, "phrase_builder", { family: "phrase_builder", targetPhrase: "I am here." }),
    fixture(5, "listen_choose", { family: "listen_choose", referenceAudio: { transcript: "I am early." } }),
    fixture(6, "listen_build_dictation", { family: "listen_build_dictation", hiddenTargetPhrase: "I am calm." }),
    fixture(7, "context_gap_grammar", {
      family: "context_gap_grammar",
      gappedTargetPhrase: "I ___ busy.",
      gapOptions: [
        { responseId: "gap-am", text: "am" },
        { responseId: "gap-is", text: "is" },
      ],
      choiceFeedback: [
        { responseId: "gap-am", correct: true },
        { responseId: "gap-is", correct: false },
      ],
    }),
    fixture(8, "speed_match", {
      family: "speed_match",
      pairGrid: [{ target: "here" }, { target: "ready" }],
    }),
    fixture(9, "scripted_repeat_compare", { family: "scripted_repeat_compare", targetPhrase: "I am fine." }),
  ];
  const before = findings.length;
  (audit as unknown as (
    lessonOrdinal: number,
    sessionOrdinal: number,
    interactions: readonly unknown[],
    introPrimaryTargets: readonly string[],
    authoritativeSteps: readonly unknown[],
  ) => void)(
    1,
    1,
    fixtures.map((entry) => entry.interaction),
    ["I am here."],
    fixtures.map((entry) => entry.authority),
  );
  assert.deepEqual(
    findings.slice(before),
    [],
    "exact_intro_target_should_link_to_real_practice_without_a_finding",
  );
  process.stdout.write("LEARNING V2 NO REPEATED PRIMARY TASK SELF-TEST: PASS intro-practice-positive\n");
  process.exit(0);
}

if (selfTestSourceSlotMismatch) {
  const learnerInteraction = {
    interactionId: "card-episode-01-s01-05",
    ordinal: 4,
    purpose: "guided_practice",
    family: "phrase_builder",
    modePayload: { family: "phrase_builder", targetPhrase: "I am here." },
  };
  const authoritativeSteps = [
    {
      family: "phrase_builder",
      purpose: "guided_practice",
      modePayload: { family: "phrase_builder", targetPhrase: "I am here." },
    },
    {
      family: "phrase_builder",
      purpose: "guided_practice",
      modePayload: { family: "phrase_builder", targetPhrase: "I am ready." },
    },
  ];
  assert.throws(
    () => authoritativeStepsForProjection(1, 1, [learnerInteraction], authoritativeSteps),
    /projection_target_mismatch:card-episode-01-s01-05/u,
    "card id must bind the learner surface to its exact authoritative source slot",
  );
  process.stdout.write("LEARNING V2 NO REPEATED PRIMARY TASK SELF-TEST: PASS source-slot-mismatch\n");
  process.exit(0);
}

const lesson2Only = process.argv.includes("--lesson2-only");
const requestedSessionArgument = process.argv.find((argument) => argument.startsWith("--session="));
const requestedSessionOrdinal = requestedSessionArgument
  ? Number.parseInt(requestedSessionArgument.slice("--session=".length), 10)
  : undefined;
if (requestedSessionArgument && (!Number.isInteger(requestedSessionOrdinal) || requestedSessionOrdinal! < 1 || requestedSessionOrdinal! > 56)) {
  throw new Error("no_repeated_primary_task_session_argument_invalid");
}
if (!lesson2Only) {
  for (const row of learningV2AuthoringDevicePreviewRowsV1()) {
    const source = authoredLearningV2SessionSource(row.sessionOrdinal);
    if (row.status !== "LOCKED" && !(source?.modeNativePractice?.length ?? 0)) continue;
    assert.ok(source, `authoritative_session_source_missing:lesson=1:session=${row.sessionOrdinal}`);
    const preview = buildLearningV2AuthoringDevicePreviewV1(row.sessionOrdinal, "ru");
    audit(
      1,
      row.sessionOrdinal,
      preview.learnerChild.interactions,
      preview.introChild.pages.map((page, index) => {
        const correctChoiceIndex = source.introPages[index]?.question.correctChoiceIndex;
        assert.ok(correctChoiceIndex !== undefined, `intro_authority_missing:lesson=1:session=${row.sessionOrdinal}:intro=${index + 1}`);
        return page.question.choicesByLocale.ru[correctChoiceIndex] ?? "";
      }),
      source.modeNativePractice,
    );
  }
}
const lesson2Rows = requestedSessionOrdinal === undefined
  ? learningV2AuthoringDevicePreviewLesson2RowsV1()
  : [{ lessonOrdinal: 2 as const, sessionOrdinal: requestedSessionOrdinal, status: "DRAFT" as const, openable: true as const }];
for (const row of lesson2Rows) {
  const source = authoredLearningV2Episode02SessionSource(row.sessionOrdinal);
  if (!source) continue;
  const preview = buildLearningV2AuthoringDevicePreviewLesson2V1(row.sessionOrdinal, "ru");
  audit(
    2,
    row.sessionOrdinal,
    preview.learnerChild.interactions,
    preview.introChild.pages.map((page, index) => {
      const correctChoiceIndex = source.introPages[index]?.question.correctChoiceIndex;
      assert.ok(correctChoiceIndex !== undefined, `intro_authority_missing:lesson=2:session=${row.sessionOrdinal}:intro=${index + 1}`);
      return page.question.choicesByLocale.ru[correctChoiceIndex] ?? "";
    }),
    source.modeNativePractice,
  );
}
for (const row of learningV2AuthoringDevicePreviewLesson3RowsV1()) {
  const source = authoredLearningV2Episode03SessionSource(row.sessionOrdinal);
  if (!source) continue;
  const preview = buildLearningV2AuthoringDevicePreviewLesson3V1(row.sessionOrdinal, "ru");
  audit(
    3,
    row.sessionOrdinal,
    preview.learnerChild.interactions,
    preview.introChild.pages.map((page, index) => {
      const correctChoiceIndex = source.introPages[index]?.question.correctChoiceIndex;
      assert.ok(correctChoiceIndex !== undefined, `intro_authority_missing:lesson=3:session=${row.sessionOrdinal}:intro=${index + 1}`);
      return page.question.choicesByLocale.ru[correctChoiceIndex] ?? "";
    }),
    source.modeNativePractice,
  );
}

assert.equal(
  findings.length,
  0,
  `repeated_primary_task_findings:${findings.length}\n${findings.slice(0, 20).join("\n")}`,
);
process.stdout.write(
  `LEARNING V2 NO REPEATED PRIMARY TASK GATE: PASS scope=${lesson2Only ? "lesson2" : "all-authored-en"}\n`,
);
