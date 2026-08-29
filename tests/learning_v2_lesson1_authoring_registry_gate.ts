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
  ["LOCKED", "LOCKED", "LOCKED", ...Array.from({ length: 53 }, () => "DRAFT")],
);
assert.match(
  registryModule.LESSON1_AUTHORING_REGISTRY_V1[0]?.unlockDecisionRef ?? "",
  /owner-reopened-en-lesson-01-sessions-01-03-for-strict-gates-2026-08-28/u,
);
assert.equal(
  registryModule.LESSON1_AUTHORING_REGISTRY_V1[0]?.lockedFingerprint,
  "a275efa0823ed7520c40bda1709e65ddb0387f6729eb7fa6ccccd75ea791dd56",
);
assert.equal(
  registryModule.LESSON1_AUTHORING_REGISTRY_V1[1]?.lockedFingerprint,
  "b62808281db481b8bc7563d7d5c7447ae54d99c929124111776723ad2bc2d961",
);
assert.equal(
  registryModule.LESSON1_AUTHORING_REGISTRY_V1[2]?.lockedFingerprint,
  "059c616af0ad12f959f58f7845ee6620a9b66b380986d1073ce20cf98fb129be",
);
assert.equal(
  registryModule.LESSON1_AUTHORING_REGISTRY_V1[3]?.forbiddenFutureFingerprint,
  "203a283824a0453677dd38ca4a0c34eb6d556ee58776106a008a3f84ca15c049",
);

const actualFingerprints = Object.fromEntries(
  Array.from({ length: 56 }, (_, index) => [index + 1, null as string | null]),
) as Record<number, string | null>;
for (const source of AUTHORED_EPISODE_01_SESSIONS) {
  actualFingerprints[source.requiredSessionOrdinal] =
    learningV2SessionContentFingerprint(source);
}
assert.deepEqual(
  registryModule.lesson1AuthoringPreflightV1(4, actualFingerprints),
  {
    lockedThrough: 3,
    currentSessionOrdinal: 4,
    forbiddenFrom: 5,
  },
);
assert.deepEqual(
  registryModule.lesson1AuthoringPreflightV1(undefined, actualFingerprints),
  {
    lockedThrough: 3,
    currentSessionOrdinal: 4,
    forbiddenFrom: 5,
  },
);
assert.throws(
  () => registryModule.lesson1AuthoringPreflightV1(2, actualFingerprints),
  /lesson1_authoring_out_of_order:requested=2:current=4:lockedThrough=3/u,
);

const driftedRegistry = registryModule.LESSON1_AUTHORING_REGISTRY_V1.map(
  (entry) =>
    entry.sessionOrdinal === 4
      ? {
          ...entry,
          forbiddenFutureFingerprint: "deliberate-drift-for-red-green-proof",
        }
      : entry,
);
assert.throws(
  () =>
    registryModule.lesson1AuthoringPreflightV1(
      4,
      actualFingerprints,
      driftedRegistry,
    ),
  /lesson1_forbidden_future_fingerprint_drift:range=5-56/u,
);

const futureDraftDrift = {
  ...actualFingerprints,
  5: "deliberate-future-draft-drift-for-red-green-proof",
};
assert.throws(
  () => registryModule.lesson1AuthoringPreflightV1(4, futureDraftDrift),
  /lesson1_forbidden_future_fingerprint_drift:range=5-56/u,
);

const packageJson = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
) as { readonly scripts?: Readonly<Record<string, string>> };
assert.match(
  packageJson.scripts?.["learning-v2:lesson1-authoring-preflight"] ?? "",
  /learning_v2_lesson1_authoring_preflight\.ts/u,
);
assert.equal(
  packageJson.scripts?.["learning-v2:mode-native-authoring-gate"],
  "npx tsx tests/learning_v2_mode_native_authoring_gate.ts",
);
assert.match(
  packageJson.scripts?.["learning-v2:lesson1-authoring-gate"] ?? "",
  /npm run learning-v2:mode-native-authoring-gate/u,
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
