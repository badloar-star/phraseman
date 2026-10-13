import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parsePractice } from "./build_release.mjs";
import { inspectPreJudgeChoreography } from "./prejudge_choreography.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sessions = ["en/l01/s33", "en/l03/s36", "en/l03/s44"];

function markdownRows(markdown) {
  return [...markdown.matchAll(/^\*\*(\d+) · ([^*]+)\*\*\s*\r?\n<!--\s*interaction_id:\s*([^;]+);/gmu)]
    .map(([, ordinal, title, interactionId]) => ({
      ordinal: Number(ordinal),
      title: title.trim(),
      interactionId: interactionId.trim(),
    }));
}

test("native practice ordinals stay contiguous after the three intro pages and follow authored Markdown", () => {
  for (const session of sessions) {
    const dir = path.join(ROOT, "sessions", ...session.split("/"));
    const atomic = JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
    for (const locale of ["ru", "uk"]) {
      const rows = markdownRows(fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8"));
      const interactions = atomic.interactionsByLocale[locale];
      assert.equal(interactions.length, rows.length, `${session}:${locale}:count`);
      for (const [index, row] of rows.entries()) {
        const interaction = interactions[index];
        assert.equal(row.ordinal, index + 1, `${session}:${locale}:markdown:${index + 1}`);
        assert.equal(interaction.interactionId, row.interactionId, `${session}:${locale}:id:${index + 1}`);
        assert.equal(interaction.ordinal, index + 4, `${session}:${locale}:runtime:${index + 1}`);
        assert.equal(interaction.prompt, row.title, `${session}:${locale}:prompt:${index + 1}`);
      }
    }
  }
});

test("L01/S33 declares its opening word card as a word card, so its learner prompt survives projection", () => {
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(ROOT, "sessions/en/l01/s33", `final.${locale}.md`), "utf8");
    assert.equal(parsePractice(markdown)[0].family, "word_card", `l01/s33:${locale}:opening family`);
  }
});

test("the repaired native sessions keep source-authored choice and tile feedback in their atomic learner projections", () => {
  for (const session of sessions) {
    const result = inspectPreJudgeChoreography({
      sessionIdentity: session,
      sessionDir: path.join(ROOT, "sessions", ...session.split("/")),
    });
    const feedbackIssues = result.issues.filter((issue) =>
      typeof issue === "string"
        ? issue.startsWith("atomic_markdown_learner_parity:")
        : /feedback_(?:missing|locale_value_missing)/u.test(issue.reason ?? ""));
    assert.deepEqual(feedbackIssues, [], `${session}:source feedback parity`);
  }
});
