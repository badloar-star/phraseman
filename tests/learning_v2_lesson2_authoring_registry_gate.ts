import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { authoredLearningV2Episode02SessionSource } from "../modules/learning-v2/content/source/authored_episode_02_sessions_v1";
import {
  LESSON2_AUTHORING_REGISTRY_V1,
  lesson2AuthoringPreflightV1,
} from "../modules/learning-v2/content/source/lesson2_authoring_registry_v1";
import { learningV2SessionContentFingerprint } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const directory = join(__dirname, "../modules/learning-v2/content/source");
const current = LESSON2_AUTHORING_REGISTRY_V1.find((entry) => entry.status !== "LOCKED")?.sessionOrdinal;
const actual = Object.freeze(Object.fromEntries(
  LESSON2_AUTHORING_REGISTRY_V1.map((entry) => {
    if (entry.status === "LOCKED" || entry.sessionOrdinal === current) {
      const source = authoredLearningV2Episode02SessionSource(entry.sessionOrdinal);
      return [entry.sessionOrdinal, source ? learningV2SessionContentFingerprint(source) : null];
    }
    const prefix = `episode_02_session_${String(entry.sessionOrdinal).padStart(2, "0")}`;
    const files = readdirSync(directory).filter((name) => name.startsWith(prefix) && name.endsWith(".ts")).sort();
    return [entry.sessionOrdinal, hashCanonicalBody(files.map((name) => [
      name,
      createHash("sha256").update(readFileSync(join(directory, name))).digest("hex"),
    ]))];
  }),
));

assert.equal(LESSON2_AUTHORING_REGISTRY_V1.length, 56);
const preflight = lesson2AuthoringPreflightV1(current, actual);
assert.equal(preflight.currentSessionOrdinal, current ?? null);
assert.equal(preflight.lockedThrough, (current ?? 57) - 1);
assert.equal(preflight.forbiddenFrom, current && current < 56 ? current + 1 : null);
assert.throws(
  () => lesson2AuthoringPreflightV1(current && current < 56 ? current + 1 : 1, actual),
  /lesson2_authoring_out_of_order/,
);

process.stdout.write("LEARNING V2 LESSON 2 AUTHORING REGISTRY GATE: PASS\n");

