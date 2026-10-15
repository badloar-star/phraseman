import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { parseIntro } from "./build_release.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

test("canonical release intro page 3 stops before the practice section", (t) => {
  const tempParent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(tempParent, "learning-v2-intro-boundary-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const pipeline = path.join(root, "pipeline");
  fs.mkdirSync(pipeline);
  for (const name of [
    "build_release.mjs",
    "single_phrase_release.mjs",
    "session_readiness.mjs",
    "session_header.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs",
    "write_mockup_file.mjs",
    "practice_explanations_v1.mjs",
    "audit_actor_clarity.mjs",
  ]) {
    fs.copyFileSync(path.join(here, name), path.join(pipeline, name));
  }
  const visibleTextModule = path.resolve(here, "../../../modules/learning-v2/content/learner_visible_text_v1.js");
  const fixtureVisibleTextModule = path.join(root, "modules/learning-v2/content/learner_visible_text_v1.js");
  fs.mkdirSync(path.dirname(fixtureVisibleTextModule), { recursive: true });
  fs.copyFileSync(visibleTextModule, fixtureVisibleTextModule);

  const session = "en/l04/s04";
  const sourceDir = path.resolve(here, "..", "sessions", ...session.split("/"));
  const sessionDir = path.join(root, "sessions", ...session.split("/"));
  fs.mkdirSync(sessionDir, { recursive: true });
  const sourceMarkdown = fs.readFileSync(path.join(sourceDir, "final.ru.md"), "utf8");
  const introOnly = sourceMarkdown.slice(0, sourceMarkdown.indexOf("## Практика"));
  fs.writeFileSync(path.join(sessionDir, "final.ru.md"), `${introOnly}## Практика\n\n**1 · Вставьте слово**\n<!-- interaction_id: en:lesson-04:session-04:i01; family: context_gap_grammar -->\nI ___ ready. → **am** · is · are\n- am — *Верно.*\n- is — *После I нужна форма am.*\n- are — *После I нужна форма am.*\n\n## Для сборщика\n\nmodes: 1=context_gap_grammar\n`);

  const out = path.join(root, "private-review");
  const result = spawnSync(
    process.execPath,
    [
      path.join(pipeline, "build_release.mjs"),
      "--session", session,
      "--locales", "ru",
      "--out", out,
      "--migration-composite-source",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const intro = JSON.parse(
    fs.readFileSync(path.join(out, ...session.split("/"), "intro.json"), "utf8"),
  );
  assert.deepEqual(
    intro.pages.map((page) => page.question.choicesByLocale.ru.length),
    [3, 3, 3],
  );
});

test("intro source rejects duplicate marked choices before projection", () => {
  const markdown = `## Интро 1

### Короткий ответ

Текст над вопросом.

**На вопрос \`Is she pretty?\` ответьте коротко.**

- ✅ **Yes, she is.**
- ❌ Yes, she. — *Пропущено is.*
- ❌ Yes, she. — *После she нужен is.*
`;

  assert.throws(
    () => parseIntro(markdown),
    /intro_choice_duplicate:page=1:choice=yes, she\./u,
  );
});

test("requested RU and UK intros with a lost question fail before creating release output", (t) => {
  const tempParent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(tempParent, "learning-v2-intro-question-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const pipeline = path.join(root, "pipeline");
  fs.mkdirSync(pipeline);
  for (const name of [
    "build_release.mjs",
    "single_phrase_release.mjs",
    "session_readiness.mjs",
    "session_header.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs",
    "write_mockup_file.mjs",
    "practice_explanations_v1.mjs",
    "audit_actor_clarity.mjs",
  ]) {
    fs.copyFileSync(path.join(here, name), path.join(pipeline, name));
  }
  const visibleTextModule = path.resolve(here, "../../../modules/learning-v2/content/learner_visible_text_v1.js");
  const fixtureVisibleTextModule = path.join(root, "modules/learning-v2/content/learner_visible_text_v1.js");
  fs.mkdirSync(path.dirname(fixtureVisibleTextModule), { recursive: true });
  fs.copyFileSync(visibleTextModule, fixtureVisibleTextModule);

  const session = "en/l04/s04";
  const sourceDir = path.resolve(here, "..", "sessions", ...session.split("/"));
  const removeFirstQuestionBoundary = (markdown) => {
    const malformed = markdown.replace(
      /\r?\n\r?\n(\*\*[^\r\n]+\*\*\r?\n\r?\n-\s+✅)/u,
      "\n$1",
    );
    assert.notEqual(malformed, markdown, "fixture must remove one question paragraph boundary");
    assert.equal(parseIntro(malformed)[0].question, "", "parser compatibility keeps warning-only behavior");
    return malformed;
  };

  for (const malformedLocale of ["ru", "uk"]) {
    const sessionDir = path.join(root, "sessions", ...session.split("/"));
    fs.mkdirSync(sessionDir, { recursive: true });
    const statusPath = path.join(sessionDir, "status.json");
    const statusBefore = '{"sentinel":"unchanged"}\n';
    fs.writeFileSync(statusPath, statusBefore);
    for (const locale of ["ru", "uk"]) {
      const markdown = fs.readFileSync(path.join(sourceDir, `final.${locale}.md`), "utf8");
      fs.writeFileSync(
        path.join(sessionDir, `final.${locale}.md`),
        locale === malformedLocale ? removeFirstQuestionBoundary(markdown) : markdown,
      );
    }

    const out = path.join(root, `private-review-${malformedLocale}`);
    const result = spawnSync(
      process.execPath,
      [
        path.join(pipeline, "build_release.mjs"),
        "--session", session,
        "--locales", "ru,uk",
        "--out", out,
        "--migration-composite-source",
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      new RegExp(`intro_question_missing:${session}:${malformedLocale}:page=1`, "u"),
    );
    assert.equal(fs.existsSync(path.join(out, ...session.split("/"))), false);
    assert.equal(fs.readFileSync(statusPath, "utf8"), statusBefore);
  }
});
