import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

test("ignores a blueprint-only language that has no learner sessions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-lang-iso-"));
  try {
    fs.mkdirSync(path.join(root, "pipeline", "prompts"), { recursive: true });
    fs.copyFileSync(path.join(here, "check_lang_isolation.mjs"), path.join(root, "pipeline", "check_lang_isolation.mjs"));
    for (const [name, tokens] of Object.entries({
      "author.md": ["{{ЯЗЫК_КУРСА}}", "{{ОСОБЕННОСТИ_ЯЗЫКА}}"],
      "judge_nonsense.md": ["{{ЯЗЫК_КУРСА}}", "{{ОСОБЕННОСТИ_ЯЗЫКА}}"],
      "editor.md": ["{{ЯЗЫК_КУРСА}}", "{{ОСОБЕННОСТИ_ЯЗЫКА}}"],
      "judge_learner.md": ["{{ЯЗЫК_КУРСА}}"],
      "judge_taste.md": ["{{ЯЗЫК_КУРСА}}"],
    })) fs.writeFileSync(path.join(root, "pipeline", "prompts", name), tokens.join("\n"));
    fs.writeFileSync(path.join(root, "pipeline", "run.mjs"), "const x = /_([a-z]{2})_l\\d{2}_s\\d{2}|m[1] === lang/;\n");
    fs.writeFileSync(path.join(root, "pipeline", "check_new_words.mjs"), "const alphabet = /à-ö/;\n");
    fs.mkdirSync(path.join(root, "curriculum", "en"), { recursive: true });
    fs.writeFileSync(path.join(root, "curriculum", "en", "ОСОБЕННОСТИ_ЯЗЫКА.md"), "x".repeat(501));
    fs.writeFileSync(path.join(root, "curriculum", "en", "ПЛАН_КУРСА.md"), "# plan\n");
    fs.mkdirSync(path.join(root, "curriculum", "de"), { recursive: true });
    fs.writeFileSync(path.join(root, "curriculum", "de", "REQUIREMENT_MANIFEST_V1.json"), "{}\n");
    fs.mkdirSync(path.join(root, "sessions", "en", "l01", "s01"), { recursive: true });
    fs.writeFileSync(path.join(root, "sessions", "en", "l01", "s01", "final.ru.md"), "# Английский · Урок 1 · Занятие 1\n");

    const result = spawnSync(process.execPath, [path.join(root, "pipeline", "check_lang_isolation.mjs")], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /языков с курсом: en/u);
    assert.doesNotMatch(result.stdout + result.stderr, /язык «de»/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
