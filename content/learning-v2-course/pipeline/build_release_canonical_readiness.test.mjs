import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const session = "en/l01/s06";
const source = `# Проверка

**Как сказать:** короткий ответ
**Новые слова:** —

## Интро 1

### Форма

Вопрос \`Are you ready?\` просит подтвердить готовность.

**На вопрос \`Are you ready?\` ответьте коротко.**

- ✅ **Yes, I am.** — *This short answer confirms readiness.*
- ❌ Yes, I are. — *После I нужно am.*
- ❌ Yes, am I. — *Неверный порядок вопроса.*

---

## Интро 2

### Порядок слов

В коротком ответе сначала идёт \`Yes\`, затем местоимение и форма \`am\`.

**Выберите короткий ответ на вопрос \`Are you ready?\`**

- ✅ **Yes, I am.** — *This word order forms a short answer.*
- ❌ Yes, I is. — *С I нужна форма am.*
- ❌ Am I yes. — *Неверный порядок вопроса, а не ответа.*

---

## Интро 3

### Одна форма

После \`I\` в этой модели всегда остаётся \`am\`.

**Закончите ответ: \`Yes, I ___ .\`**

- ✅ **am** — *After I, this pattern uses am.*
- ❌ are — *Are сочетается с you, а не с I.*
- ❌ is — *Is сочетается с he, she или it, а не с I.*

---

## Практика

**1 · Вставьте слово — ответьте коротко**
<!-- interaction_id: en:lesson-01:session-06:i01; family: context_gap_grammar -->
Yes, I ___ . → **am** · are · is
- am — *After I, use am.*
- are — *После I нужно am.*
- is — *После I нужно am.*

modes: 1=context_gap_grammar
`;

function fixture() {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-canonical-readiness-"));
  fs.mkdirSync(path.join(root, "pipeline"));
  for (const name of [
    "build_release.mjs",
    "single_phrase_release.mjs",
    "session_readiness.mjs",
    "session_header.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs",
    "audit_actor_clarity.mjs",
    "write_mockup_file.mjs",
  ]) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
  const visibleTextModule = path.resolve(here, "../../../modules/learning-v2/content/learner_visible_text_v1.js");
  const fixtureVisibleTextModule = path.join(root, "modules/learning-v2/content/learner_visible_text_v1.js");
  fs.mkdirSync(path.dirname(fixtureVisibleTextModule), { recursive: true });
  fs.copyFileSync(visibleTextModule, fixtureVisibleTextModule);

  const sessionDir = path.join(root, "sessions", session);
  fs.mkdirSync(sessionDir, { recursive: true });
  const ukPath = path.join(sessionDir, "final.uk.md");
  fs.writeFileSync(ukPath, source);
  fs.utimesSync(ukPath, new Date(0), new Date(0));
  fs.writeFileSync(path.join(sessionDir, "final.ru.md"), source);

  const run = (...extra) => spawnSync(process.execPath, [
    path.join(root, "pipeline/build_release.mjs"),
    "--session", session,
    "--locales", "ru,uk",
    ...extra,
  ], { encoding: "utf8" });
  return { root, run };
}

function createDirectoryAlias(target, alias) {
  fs.symlinkSync(target, alias, process.platform === "win32" ? "junction" : "dir");
}

function assertCanonicalReadinessHold(root, result) {
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 1, output);
  assert.match(output, /final\.judge_learner\.json/u);
  assert.match(output, /status\.json/u);
  assert.match(output, /locales\.judge\.json/u);
  assert.match(output, /final\.uk\.md старше мастера/u);
  assert.equal(
    fs.readFileSync(path.join(root, "release/en/l01/s06/learner.json"), "utf8"),
    "published-sentinel",
  );
}

test("every canonical release requires current session readiness before writing", () => {
  const { root, run } = fixture();
  try {
    const existing = path.join(root, "release/en/l01/s06/learner.json");
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "published-sentinel");

    assertCanonicalReadinessHold(root, run());
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an explicit output path equal to canonical release cannot bypass readiness", () => {
  const { root, run } = fixture();
  try {
    const existing = path.join(root, "release/en/l01/s06/learner.json");
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "published-sentinel");

    assertCanonicalReadinessHold(root, run("--out", path.join(root, "release")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a filesystem alias of canonical release cannot bypass readiness", () => {
  const { root, run } = fixture();
  try {
    const canonicalRelease = path.join(root, "release");
    const existing = path.join(canonicalRelease, "en/l01/s06/learner.json");
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "published-sentinel");
    const alias = path.join(root, "release-alias");
    createDirectoryAlias(canonicalRelease, alias);

    assertCanonicalReadinessHold(root, run("--out", alias));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a filesystem alias ancestor identifies canonical release before it exists", () => {
  const { root, run } = fixture();
  try {
    const rootAlias = path.join(root, "course-root-alias");
    createDirectoryAlias(root, rootAlias);

    const result = run("--out", path.join(rootAlias, "release"));

    assert.equal(result.status, 1, result.stderr + result.stdout);
    assert.match(`${result.stdout}\n${result.stderr}`, /final\.judge_learner\.json/u);
    assert.equal(fs.existsSync(path.join(root, "release")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("migration mode remains forbidden through a canonical release alias", () => {
  const { root, run } = fixture();
  try {
    const canonicalRelease = path.join(root, "release");
    const existing = path.join(canonicalRelease, "en/l01/s06/learner.json");
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "published-sentinel");
    const alias = path.join(root, "release-migration-alias");
    createDirectoryAlias(canonicalRelease, alias);

    const result = run("--out", alias, "--migration-composite-source");

    assert.equal(result.status, 1, result.stderr + result.stdout);
    assert.match(`${result.stdout}\n${result.stderr}`, /migration-composite-source/u);
    assert.equal(fs.readFileSync(existing, "utf8"), "published-sentinel");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a private review output remains buildable without release receipts", () => {
  const { root, run } = fixture();
  try {
    const reviewRoot = path.join(root, "private-review");
    const result = run("--out", reviewRoot);

    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(fs.existsSync(path.join(reviewRoot, "en/l01/s06/learner.json")), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
