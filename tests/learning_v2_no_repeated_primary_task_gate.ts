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

const normalize = (value: string): string => value
  .normalize("NFKC")
  .replaceAll("’", "'")
  .toLocaleLowerCase("en")
  .replace(/[^a-z0-9']+/gu, " ")
  .trim();

const primaryTarget = (payload: ModePayload): string => {
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
): string => {
  const payload = interaction.modePayload as ModePayload;
  const surface = primaryTarget(payload);
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
  interactions: readonly Readonly<{ interactionId: string; modePayload: unknown }>[],
  introPrimaryTargets: readonly string[] = [],
): void => {
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
    const firstId = firstByTarget.get(signature);
    if (firstId) {
      findings.push(
        `primary_target_repeated:lesson=${lessonOrdinal}:session=${sessionOrdinal}:target=${signature}:first=${firstId}:again=intro-${index + 1}`,
      );
    } else {
      firstByTarget.set(signature, `intro-${index + 1}`);
    }
  }
  for (const interaction of interactions) {
    const signature = normalize(primaryTaskSignature(interaction));
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
    const preview = buildLearningV2AuthoringDevicePreviewV1(row.sessionOrdinal, "ru");
    audit(
      1,
      row.sessionOrdinal,
      preview.learnerChild.interactions,
      preview.introChild.pages.map((page) => page.question.choicesByLocale.ru[0] ?? ""),
    );
  }
}
const lesson2Rows = requestedSessionOrdinal === undefined
  ? learningV2AuthoringDevicePreviewLesson2RowsV1()
  : [{ lessonOrdinal: 2 as const, sessionOrdinal: requestedSessionOrdinal, status: "DRAFT" as const, openable: true as const }];
for (const row of lesson2Rows) {
  if (!authoredLearningV2Episode02SessionSource(row.sessionOrdinal)) continue;
  const preview = buildLearningV2AuthoringDevicePreviewLesson2V1(row.sessionOrdinal, "ru");
  audit(
    2,
    row.sessionOrdinal,
    preview.learnerChild.interactions,
    preview.introChild.pages.map((page) => page.question.choicesByLocale.ru[0] ?? ""),
  );
}
for (const row of learningV2AuthoringDevicePreviewLesson3RowsV1()) {
  if (!authoredLearningV2Episode03SessionSource(row.sessionOrdinal)) continue;
  const preview = buildLearningV2AuthoringDevicePreviewLesson3V1(row.sessionOrdinal, "ru");
  audit(
    3,
    row.sessionOrdinal,
    preview.learnerChild.interactions,
    preview.introChild.pages.map((page) => page.question.choicesByLocale.ru[0] ?? ""),
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
