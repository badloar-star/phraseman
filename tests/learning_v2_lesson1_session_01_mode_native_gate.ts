import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import {
  createLearningV2CourseSessionDeviceRunV1,
  evaluateLearningV2CourseSessionDeviceInteractionV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";

const expectedFamilies = [
  "listen_choose",
  "listen_build_dictation",
  "listen_choose",
  "listen_build_dictation",
  "phrase_builder",
  "listen_choose",
  "phrase_builder",
  "listen_choose",
  "phrase_builder",
  "listen_build_dictation",
  "phrase_builder",
  "listen_build_dictation",
  "speed_match",
  "listen_build_dictation",
  "listen_choose",
  "context_gap_grammar",
  "scripted_repeat_compare",
] as const;

const expectedTargets = [
  "I",
  "am",
  "here",
  "ready",
  "I",
  "am",
  "here",
  "ready",
  "am",
  "I",
  "ready",
  "here",
  "I\u0000am\u0000here\u0000ready",
  "I am ready",
  "I am here",
  "I am ready",
  "I am here",
] as const;

const findings: string[] = [];
const shard = buildSessionShardFromSource(EPISODE_01_SESSION_01_SOURCE);
const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);

if (practiceCards.length !== 17) {
  findings.push(`practice_count:expected=17:actual=${practiceCards.length}`);
}

for (let index = 0; index < expectedFamilies.length; index += 1) {
  const card = practiceCards[index];
  const expectedFamily = expectedFamilies[index];
  if (!card) {
    findings.push(`card_missing:index=${index}`);
    continue;
  }
  if (card.family !== expectedFamily) {
    findings.push(
      `family:index=${index}:expected=${expectedFamily}:actual=${card.family}`,
    );
  }
  const payload = (card as unknown as { modePayload?: Record<string, unknown> })
    .modePayload;
  if (!payload) {
    findings.push(`source_mode_payload_missing:index=${index}:${card.family}`);
    continue;
  }
  if (
    ["listen_choose", "listen_build_dictation", "scripted_repeat_compare"].includes(
      card.family,
    )
  ) {
    for (const field of ["referenceAudio", "slowReferenceAudio"] as const) {
      const audio = payload[field];
      if (
        !audio ||
        typeof audio !== "object" ||
        Array.isArray(audio) ||
        !String((audio as { audioTargetId?: unknown }).audioTargetId ?? "").trim()
      ) {
        findings.push(
          `source_audio_field_missing:index=${index}:${card.family}:${field}`,
        );
      }
    }
  }
  const target =
    card.family === "speed_match"
      ? Array.isArray(payload.pairGrid)
        ? (payload.pairGrid as readonly { target?: string }[])
            .map((pair) => pair.target ?? "")
            .join("\u0000")
        : ""
      : String(
          payload.targetPhrase ??
            payload.hiddenTargetPhrase ??
            payload.targetWord ??
            card.contentItem.target.text,
        );
  if (target !== expectedTargets[index]) {
    findings.push(
      `target:index=${index}:expected=${expectedTargets[index]}:actual=${target}`,
    );
  }
}

const children = buildSessionChildBodiesFromShard(
  shard,
  "ru",
  "en:lesson-01:session:01",
);
const interactions = (children.learner as {
  readonly interactions: readonly Record<string, unknown>[];
}).interactions;

if (interactions.length !== 17) {
  findings.push(`learner_count:expected=17:actual=${interactions.length}`);
}

for (let index = 0; index < interactions.length; index += 1) {
  const interaction = interactions[index]!;
  const family = String(interaction.family);
  const payload = interaction.modePayload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    findings.push(`learner_mode_payload_missing:index=${index}:${family}`);
  }
  if (family === "speed_match" && interaction.inputMode !== "pair_grid") {
    findings.push(`speed_match_input:${String(interaction.inputMode)}`);
  }
  if (
    family === "scripted_repeat_compare" &&
    interaction.inputMode !== "tap_record_compare"
  ) {
    findings.push(`repeat_compare_input:${String(interaction.inputMode)}`);
  }
  if (
    ["listen_choose", "listen_build_dictation", "scripted_repeat_compare"].includes(
      family,
    ) &&
    (!Array.isArray(interaction.audioTargetIds) ||
      interaction.audioTargetIds.length === 0)
  ) {
    findings.push(`audio_missing:index=${index}:${family}`);
  }
  if (
    ["listen_choose", "listen_build_dictation", "scripted_repeat_compare"].includes(
      family,
    )
  ) {
    for (const field of ["referenceAudio", "slowReferenceAudio"] as const) {
      const audio = (payload as Record<string, unknown>)[field];
      if (
        !audio ||
        typeof audio !== "object" ||
        Array.isArray(audio) ||
        !String((audio as { audioTargetId?: unknown }).audioTargetId ?? "").trim()
      ) {
        findings.push(
          `learner_audio_field_missing:index=${index}:${family}:${field}`,
        );
      }
    }
  }
}

const run = createLearningV2CourseSessionDeviceRunV1({
  environment: "production",
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "learning-v2",
  releaseId: "session-01-mode-native-gate",
  activeRootFingerprint: "a".repeat(64),
  activeHeadFingerprint: "b".repeat(64),
  lessonId: "lesson-01",
  lessonOrdinal: 1,
  courseSessionId: "en:lesson-01:session:01",
  sessionOrdinal: 1,
  packageFingerprint: "c".repeat(64),
  childSetFingerprint: "d".repeat(64),
  introChild: children.intro as never,
  learnerChild: children.learner as never,
  evaluatorCapsuleChild: children.evaluatorCapsule as never,
  auxiliaryChild: children.auxiliary as never,
});

for (const interaction of interactions) {
  const payload = interaction.modePayload as Record<string, unknown>;
  const family = String(interaction.family);
  const response = family === "speed_match"
    ? { kind: "choice_token" as const, value: "all_pairs_matched" }
    : family === "listen_choose" || family === "context_gap_grammar"
      ? {
          kind: "choice_token" as const,
          value: ((payload.choiceFeedback as readonly { responseId: string; correct: boolean }[])
            .find((entry) => entry.correct)?.responseId ?? null),
        }
      : family === "scripted_repeat_compare"
        ? { kind: "transcript" as const, value: String(payload.targetPhrase) }
        : {
            kind: "text" as const,
            value: String(payload.targetPhrase ?? payload.hiddenTargetPhrase),
          };
  const verdict = evaluateLearningV2CourseSessionDeviceInteractionV1(
    run,
    String(interaction.interactionId),
    response,
  );
  if (verdict.resultCode !== "provisional_correct") {
    findings.push(
      `runtime_correct_response_rejected:${String(interaction.interactionId)}:${verdict.resultCode}`,
    );
  }
}

if (findings.length > 0) {
  throw new Error(
    [
      "LESSON 1 SESSION 01 MODE-NATIVE GATE: HOLD",
      `total_findings=${findings.length}`,
      ...findings,
    ].join("\n"),
  );
}

process.stdout.write("LESSON 1 SESSION 01 MODE-NATIVE GATE: PASS\n");
