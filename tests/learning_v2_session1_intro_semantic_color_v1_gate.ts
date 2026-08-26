import assert from "node:assert/strict";
import { EPISODE_01_SESSION_01_WORD_FIRST_INTRO } from "../modules/learning-v2/content/source/episode_01_session_01_intro_word_first_v1";

const runs = EPISODE_01_SESSION_01_WORD_FIRST_INTRO.flatMap((page) =>
  Object.values(page.bodyRuns ?? {}).flat(),
);

for (const validCompetitor of ["an", "An", "m", "hear", "Hair"]) {
  assert.ok(
    runs
      .filter((run) => run.text === validCompetitor)
      .every((run) => run.semantic === "targetCorrect"),
    `${validCompetitor} is a valid English form and must use target-language styling, not red strike-through`,
  );
}
assert.ok(runs.some((run) => run.text === "am" && run.semantic === "targetCorrect"));
assert.ok(runs.some((run) => run.text === "here" && run.semantic === "targetCorrect"));

process.stdout.write("LEARNING V2 SESSION 1 INTRO SEMANTIC COLOR V1 GATE: PASS\n");
