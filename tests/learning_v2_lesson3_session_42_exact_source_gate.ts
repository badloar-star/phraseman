import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(
  "modules/learning-v2/content/source/episode_03_session_42_v1.ts",
);
const source = fs.readFileSync(sourcePath, "utf8");

if (/episode_03_session_17_v1/.test(source)) {
  throw new Error(
    "lesson3_session42_must_not_inherit_session17: author a dedicated exact learner-facing package",
  );
}

if (!/That is a bathroom\./.test(source)) {
  throw new Error("lesson3_session42_missing_exact_canonical_example");
}

console.log("LEARNING V2 LESSON 3 SESSION 42 EXACT SOURCE GATE: PASS");
