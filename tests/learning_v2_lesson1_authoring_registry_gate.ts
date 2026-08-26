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
  Array.from({ length: 56 }, () => "DRAFT"),
);
assert.match(
  registryModule.LESSON1_AUTHORING_REGISTRY_V1[0]?.unlockDecisionRef ?? "",
  /owner-unlocked-all-learning-v2-mode-native-rewrite-2026-08-25/u,
);

const actualFingerprints = Object.fromEntries(
  Array.from({ length: 56 }, (_, index) => [index + 1, null as string | null]),
) as Record<number, string | null>;
for (const source of AUTHORED_EPISODE_01_SESSIONS) {
  actualFingerprints[source.requiredSessionOrdinal] =
    learningV2SessionContentFingerprint(source);
}
assert.deepEqual(
  registryModule.lesson1AuthoringPreflightV1(1, actualFingerprints),
  {
    lockedThrough: 0,
    currentSessionOrdinal: 1,
    forbiddenFrom: 2,
  },
);
assert.deepEqual(
  registryModule.lesson1AuthoringPreflightV1(undefined, actualFingerprints),
  {
    lockedThrough: 0,
    currentSessionOrdinal: 1,
    forbiddenFrom: 2,
  },
);
assert.throws(
  () => registryModule.lesson1AuthoringPreflightV1(2, actualFingerprints),
  /lesson1_authoring_out_of_order:requested=2:current=1:lockedThrough=0/u,
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
  /lesson1_authoring_out_of_order|lesson1_forbidden_future_fingerprint_drift/u,
);

const futureDraftDrift = {
  ...actualFingerprints,
  2: "deliberate-future-draft-drift-for-red-green-proof",
};
assert.throws(
  () => registryModule.lesson1AuthoringPreflightV1(1, futureDraftDrift),
  /lesson1_forbidden_future_fingerprint_drift:range=2-56/u,
);

const packageJson = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
) as { readonly scripts?: Readonly<Record<string, string>> };
assert.equal(
  packageJson.scripts?.["learning-v2:lesson1-authoring-preflight"],
  "npx tsx scripts/learning_v2_lesson1_authoring_preflight.ts",
);
assert.equal(
  packageJson.scripts?.["learning-v2:mode-native-authoring-gate"],
  "npx tsx tests/learning_v2_mode_native_authoring_gate.ts",
);
assert.match(
  packageJson.scripts?.["learning-v2:lesson1-authoring-gate"] ?? "",
  /^npm run learning-v2:mode-native-authoring-gate && /u,
);
assert.match(
  packageJson.scripts?.["learning-v2:lesson1-authoring-gate"] ?? "",
  /learning_v2_lesson1_no_repeated_target_family_gate\.ts/u,
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
