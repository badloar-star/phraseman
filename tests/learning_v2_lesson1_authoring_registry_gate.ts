import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { learningV2SessionContentFingerprint } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";

const ROOT = join(__dirname, "..");
const modulePath = join(
  ROOT,
  "modules",
  "learning-v2",
  "content",
  "source",
  "lesson1_authoring_registry_v1.ts",
);

assert.ok(
  existsSync(modulePath),
  "lesson1_authoring_registry_missing: create the machine-enforced registry before authoring session 12",
);

const require = createRequire(import.meta.url);
const registryModule = require(modulePath) as {
  readonly LESSON1_AUTHORING_REGISTRY_V1: readonly {
    readonly sessionOrdinal: number;
    readonly status: "DRAFT" | "AUTO_PASS" | "OWNER_APPROVED" | "LOCKED";
    readonly lockedFingerprint?: string;
    readonly candidateFingerprint?: string;
    readonly ownerDecisionRef?: string;
    readonly unlockDecisionRef?: string;
  }[];
  readonly lesson1AuthoringPreflightV1: (
    requestedSessionOrdinal: number | undefined,
    actualFingerprints: Readonly<Record<number, string>>,
    entries?: readonly {
      readonly sessionOrdinal: number;
      readonly status: "DRAFT" | "AUTO_PASS" | "OWNER_APPROVED" | "LOCKED";
      readonly lockedFingerprint?: string;
      readonly candidateFingerprint?: string;
      readonly ownerDecisionRef?: string;
      readonly unlockDecisionRef?: string;
    }[],
  ) => {
    readonly lockedThrough: number;
    readonly currentSessionOrdinal: number | null;
    readonly forbiddenFrom: number | null;
  };
};

assert.equal(registryModule.LESSON1_AUTHORING_REGISTRY_V1.length, 56);
assert.deepEqual(
  registryModule.LESSON1_AUTHORING_REGISTRY_V1.map((entry) => entry.status),
  ["LOCKED", "LOCKED", "LOCKED", "LOCKED", "LOCKED", "LOCKED", "LOCKED", "LOCKED", "LOCKED", "LOCKED", ...Array.from({ length: 46 }, () => "DRAFT")],
);
assert.match(
  registryModule.LESSON1_AUTHORING_REGISTRY_V1[0]?.unlockDecisionRef ?? "",
  /owner-unlocked-all-lesson1-word-first-rewrite-2026-08-24/u,
);

const actualFingerprints = Object.fromEntries(
  AUTHORED_EPISODE_01_SESSIONS.map((source) => [
    source.requiredSessionOrdinal,
    learningV2SessionContentFingerprint(source),
  ]),
) as Readonly<Record<number, string>>;
assert.deepEqual(
  registryModule.lesson1AuthoringPreflightV1(11, actualFingerprints),
  {
    lockedThrough: 10,
    currentSessionOrdinal: 11,
    forbiddenFrom: 12,
  },
);
assert.deepEqual(
  registryModule.lesson1AuthoringPreflightV1(undefined, actualFingerprints),
  {
    lockedThrough: 10,
    currentSessionOrdinal: 11,
    forbiddenFrom: 12,
  },
);
assert.throws(
  () => registryModule.lesson1AuthoringPreflightV1(12, actualFingerprints),
  /lesson1_authoring_out_of_order:requested=12:current=11:lockedThrough=10/u,
);

const driftedRegistry = registryModule.LESSON1_AUTHORING_REGISTRY_V1.map(
  (entry) =>
    entry.sessionOrdinal === 1
      ? {
          ...entry,
          lockedFingerprint: "deliberate-drift-for-red-green-proof",
        }
      : entry,
);
assert.throws(
  () =>
    registryModule.lesson1AuthoringPreflightV1(
      6,
      actualFingerprints,
      driftedRegistry,
    ),
  /lesson1_locked_fingerprint_drift:session=1/u,
);

const futureDraftDrift = {
  ...actualFingerprints,
  12: "deliberate-future-draft-drift-for-red-green-proof",
};
assert.throws(
  () => registryModule.lesson1AuthoringPreflightV1(11, futureDraftDrift),
  /lesson1_forbidden_future_fingerprint_drift:range=12-56/u,
);

const packageJson = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
) as { readonly scripts?: Readonly<Record<string, string>> };
assert.equal(
  packageJson.scripts?.["learning-v2:lesson1-authoring-preflight"],
  "npx tsx scripts/learning_v2_lesson1_authoring_preflight.ts",
);
assert.equal(
  packageJson.scripts?.["learning-v2:lesson1-authoring-gate"],
  "npx tsx tests/learning_v2_lesson1_session_01_word_first_choreography_gate.ts && npx tsx tests/learning_v2_word_target_shard_projection_gate.ts && npx tsx tests/learning_v2_lesson1_session_01_word_first_intro_gate.ts && npx tsx tests/learning_v2_lesson1_session_01_manual_phrase_gate.ts && npx tsx tests/learning_v2_lesson1_session_02_word_first_gate.ts && npx tsx tests/learning_v2_lesson1_session_03_word_first_gate.ts && npx tsx tests/learning_v2_lesson1_session_04_word_first_gate.ts && npx tsx tests/learning_v2_lesson1_session_05_word_first_gate.ts && npx tsx tests/learning_v2_lesson1_session_06_word_first_gate.ts && npx tsx tests/learning_v2_lesson1_session_07_voice_gate.ts && npx tsx tests/learning_v2_lesson1_session_08_checkpoint_gate.ts && npx tsx tests/learning_v2_lesson1_session_09_word_first_gate.ts && npx tsx tests/learning_v2_lesson1_session_10_word_first_gate.ts && npx tsx tests/learning_v2_lesson1_new_lexicon_per_teaching_session_gate.ts && npx tsx tests/learning_v2_lesson1_new_word_before_phrase_gate.ts && npm run learning-v2:task-distractor-gate && npx tsx tests/learning_v2_episode_01_session_12_editorial_gate.ts && npx tsx tests/learning_v2_episode_01_session_13_editorial_gate.ts && npx tsx tests/learning_v2_episode_01_session_14_editorial_gate.ts && npx tsx tests/learning_v2_episode_01_session_15_editorial_gate.ts && npx tsx tests/learning_v2_episode_01_session_16_editorial_gate.ts && npx tsx tests/learning_v2_episode_01_session_17_editorial_gate.ts && npx tsx tests/learning_v2_episode_01_session_18_editorial_gate.ts && npx tsx tests/learning_v2_lesson1_authoring_registry_gate.ts && npx tsx tests/learning_v2_lesson1_review_scope_gate.ts && npx tsx tests/learning_v2_lesson1_target_language_visual_gate.ts",
);
assert.equal(
  packageJson.scripts?.["learning-v2:task-distractor-gate"],
  "npx tsx tests/learning_v2_task_specific_distractors_gate.ts && npx tsx tests/learning_v2_task_specific_distractor_projection_gate.ts && npx tsx tests/learning_v2_task_distractor_authored_range_gate.ts",
);
const startV2 = readFileSync(join(ROOT, "docs", "v2", "СТАРТ В2.md"), "utf8");
assert.match(
  startV2,
  /npm run learning-v2:lesson1-authoring-preflight/u,
  "СТАРТ В2 must give every future LLM the exact preflight command",
);
assert.match(
  startV2,
  /npm run learning-v2:lesson1-authoring-gate/u,
  "СТАРТ В2 must give every future LLM the exact closing gate command",
);

process.stdout.write("LESSON 1 AUTHORING REGISTRY GATE: PASS\n");
