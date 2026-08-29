import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  AUTHORED_EPISODE_01_SESSIONS,
  authoredLearningV2SessionSource,
} from "../modules/learning-v2/content/source/authored_sessions_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import {
  LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_V1,
  type LearningV2ModeNativeFamilyV1,
} from "../modules/learning-v2/contracts/mode_native_authoring_contract_v1";

const ROOT = join(__dirname, "..");
const findings: string[] = [];
const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
const sessionArg = process.argv.find((arg) => arg.startsWith("--session="));
const requestedTarget = targetArg?.slice("--target=".length) ?? null;
const requestedSession = sessionArg
  ? Number(sessionArg.slice("--session=".length))
  : null;

if (requestedTarget !== null && requestedTarget !== "en" && requestedTarget !== "es") {
  throw new Error(`mode_native_gate_target_invalid:${requestedTarget}`);
}
if (
  requestedSession !== null &&
  (!Number.isInteger(requestedSession) || requestedSession < 1 || requestedSession > 56)
) {
  throw new Error(`mode_native_gate_session_invalid:${String(requestedSession)}`);
}

const focused = requestedTarget !== null || requestedSession !== null;
const usedFamilies = new Set<LearningV2ModeNativeFamilyV1>();

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

for (const mode of LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_V1.modes) {
  const mockupPath = join(ROOT, mode.mockupPath);
  if (!existsSync(mockupPath)) {
    findings.push(`mockup_missing:${mode.family}:${mode.mockupPath}`);
    continue;
  }
  const actualHash = sha256(mockupPath);
  if (actualHash !== mode.mockupSha256) {
    findings.push(
      `mockup_fingerprint_drift:${mode.family}:expected=${mode.mockupSha256}:actual=${actualHash}`,
    );
  }
  if (
    !focused &&
    (mode.mockupParityStatus !== "PASS" ||
      !mode.mockupParityReceiptId?.trim())
  ) {
    findings.push(`mockup_parity_not_pass:${mode.family}`);
  }
}

const approvedFamilies = new Set<LearningV2ModeNativeFamilyV1>(
  LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_V1.modes.map((mode) => mode.family),
);
const definitionByFamily = new Map(
  LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_V1.modes.map((mode) => [
    mode.family,
    mode,
  ]),
);

type ModeGateSource = Parameters<typeof buildSessionShardFromSource>[0];
const sourceSets: {
  target: "en" | "es";
  sources: readonly ModeGateSource[];
}[] = [{
  target: "en",
  sources: requestedSession === null
    ? AUTHORED_EPISODE_01_SESSIONS
    : [authoredLearningV2SessionSource(requestedSession)].filter(
        (source): source is ModeGateSource => Boolean(source),
      ),
}];

// Keep the English focused gate isolated from the independently authored
// Spanish contour. Loading the Spanish registry pulls its own runtime seam,
// which must not be evaluated for --target=en.
if (requestedTarget !== "en") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { allAuthoredEsEpisode01Sessions } = require("../modules/learning-v2/content/source/es_authored_sessions_v1") as {
    allAuthoredEsEpisode01Sessions: () => readonly ModeGateSource[];
  };
  sourceSets.push({
    target: "es",
    sources: allAuthoredEsEpisode01Sessions(),
  });
}

for (const { target, sources } of sourceSets) {
  if (requestedTarget !== null && target !== requestedTarget) continue;
  for (const source of sources) {
    if (
      requestedSession !== null &&
      source.requiredSessionOrdinal !== requestedSession
    ) continue;
    const session = String(source.requiredSessionOrdinal).padStart(2, "0");
    let children: ReturnType<typeof buildSessionChildBodiesFromShard>;
    try {
      const shard = buildSessionShardFromSource(source);
      children = buildSessionChildBodiesFromShard(
        shard,
        "ru",
        `${target}:lesson-01:session:${session}`,
      );
    } catch (error) {
      findings.push(
        `learner_projection_failed:${target}:s${session}:${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
  const interactions = (children.learner as {
    readonly interactions: readonly Record<string, unknown>[];
  }).interactions;

  for (const interaction of interactions) {
    const family = interaction.family as LearningV2ModeNativeFamilyV1;
    const interactionId = String(interaction.interactionId);
    if (!approvedFamilies.has(family)) {
      findings.push(`unapproved_family:${target}:s${session}:${interactionId}:${family}`);
      continue;
    }
    usedFamilies.add(family);

    const modePayload = interaction.modePayload;
    if (
      typeof modePayload !== "object" ||
      modePayload === null ||
      Array.isArray(modePayload)
    ) {
      findings.push(`mode_native_payload_missing:${target}:s${session}:${interactionId}:${family}`);
    } else {
      const payload = modePayload as Record<string, unknown>;
      const definition = definitionByFamily.get(family);
      for (const field of definition?.requiredPayload ?? []) {
        const value = payload[field];
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          findings.push(
            `mode_native_field_missing:${target}:s${session}:${interactionId}:${family}:${field}`,
          );
        }
      }
    }

    const audioTargetIds = Array.isArray(interaction.audioTargetIds)
      ? interaction.audioTargetIds
      : [];
    if (
      [
        "listen_choose",
        "sound_contrast",
        "listen_build_dictation",
        "scripted_repeat_compare",
      ].includes(family) &&
      audioTargetIds.length === 0
    ) {
      findings.push(`required_audio_missing:${target}:s${session}:${interactionId}:${family}`);
    }

    const responseOptions = Array.isArray(interaction.responseOptions)
      ? interaction.responseOptions
      : [];
    if (family === "sound_contrast" && responseOptions.length !== 2) {
      findings.push(
        `sound_contrast_not_two_way:${target}:s${session}:${interactionId}:options=${responseOptions.length}`,
      );
    }
    if (family === "speed_match" && interaction.inputMode !== "pair_grid") {
      findings.push(
        `speed_match_not_pair_grid:${target}:s${session}:${interactionId}:input=${String(interaction.inputMode)}`,
      );
    }
    if (
      family === "scripted_repeat_compare" &&
      interaction.inputMode !== "tap_record_compare"
    ) {
      findings.push(
        `repeat_compare_not_tap_record_compare:${target}:s${session}:${interactionId}:input=${String(interaction.inputMode)}`,
      );
    }
  }
  }
}

if (focused) {
  for (const family of usedFamilies) {
    const mode = definitionByFamily.get(family);
    if (
      !mode ||
      mode.mockupParityStatus !== "PASS" ||
      !mode.mockupParityReceiptId?.trim()
    ) {
      findings.push(`mockup_parity_not_pass:${family}`);
    }
  }
}

const findingCounts = Object.entries(
  findings.reduce<Record<string, number>>((counts, finding) => {
    const code = finding.split(":", 1)[0] ?? "unknown";
    counts[code] = (counts[code] ?? 0) + 1;
    return counts;
  }, {}),
)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([code, count]) => `${code}=${count}`);

if (findings.length > 0) {
  throw new Error(
    [
    "LEARNING V2 MODE-NATIVE AUTHORING GATE: HOLD",
    `total_findings=${findings.length}`,
    ...findingCounts,
    "first_findings:",
    ...findings.slice(0, 24),
    ].join("\n"),
  );
}

process.stdout.write("LEARNING V2 MODE-NATIVE AUTHORING GATE: PASS\n");
