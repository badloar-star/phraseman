import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorSource = fs.readFileSync(
  path.join(root, "scripts", "build_learning_v2_factory_native_manifest.mjs"),
  "utf8",
);

function loadIntroMetadata() {
  const start = generatorSource.indexOf("function stripInlineMarkdown");
  const end = generatorSource.indexOf("function learningOutcome");
  assert.notEqual(start, -1, "stripInlineMarkdown helper must remain discoverable");
  assert.notEqual(end, -1, "learningOutcome boundary must remain discoverable");
  const context = {};
  vm.runInNewContext(
    `${generatorSource.slice(start, end)}\nglobalThis.introMetadata = introMetadata;`,
    context,
  );
  return context.introMetadata;
}

function loadPracticeTitles() {
  const start = generatorSource.indexOf("function practiceTitles");
  const end = generatorSource.indexOf("function lessonTitle");
  assert.notEqual(start, -1, "practiceTitles helper must remain discoverable");
  assert.notEqual(end, -1, "lessonTitle boundary must remain discoverable");
  const context = {};
  vm.runInNewContext(
    `${generatorSource.slice(start, end)}\nglobalThis.practiceTitles = practiceTitles;`,
    context,
  );
  return context.practiceTitles;
}

test("intro page 3 parsing stops before the practice section", () => {
  const introMetadata = loadIntroMetadata();
  const markdown = `# Fixture

## Интро 1

**Question one?**

- ✅ **One.**
- ❌ Two. — *Wrong two.*
- ❌ Three. — *Wrong three.*

## Интро 2

**Question two?**

- ❌ One. — *Wrong one.*
- ✅ **Two.**
- ❌ Three. — *Wrong three.*

## Интро 3

**Question three?**

- ❌ One. — *Wrong one.*
- ❌ Two. — *Wrong two.*
- ✅ **Three.**

## Практика — по одной цели

**1 · Practice prompt**
Цель: \`There is a post office.\`
`;

  const pages = introMetadata(markdown, "fixture/ru");

  assert.equal(pages.length, 3);
  assert.deepEqual(
    Array.from(pages[2].options, (option) => option.choice),
    ["One.", "Two.", "Three."],
  );
});

test("practice title projection accepts the three-intro atomic ordinal offset", () => {
  const practiceTitles = loadPracticeTitles();
  const markdown = `# Fixture

## Интро 1

One.

## Интро 2

Two.

## Интро 3

Three.

## Практика — по одной цели

**1 · Карточка слова — week**
<!-- interaction_id: en:lesson-01:session-52:i01; family: listen_choose -->
`;
  const atomicSource = {
    interactionsByLocale: {
      ru: [{
        interactionId: "en:lesson-01:session-52:i01",
        ordinal: 4,
        prompt: "Карточка слова",
        modePayload: { wordCard: { word: "week" } },
      }],
    },
  };

  assert.deepEqual(
    Array.from(practiceTitles(markdown, "fixture/ru", atomicSource, "ru"), (row) => ({ ...row })),
    [{ ordinal: 1, title: "Карточка слова — week" }],
  );
});

test("practice title projection uses a word-card word when its answer record is intentionally empty", () => {
  const practiceTitles = loadPracticeTitles();
  const markdown = `# Fixture

## Интро 1

One.

## Интро 2

Two.

## Интро 3

Three.

## Практика — по одной цели

**1 · Карточка слова — week**
<!-- interaction_id: en:lesson-01:session-52:i01; family: listen_choose -->
`;
  const atomicSource = {
    interactionsByLocale: {
      ru: [{
        interactionId: "en:lesson-01:session-52:i01",
        ordinal: 4,
        prompt: "Карточка слова",
        modePayload: { wordCard: { word: "week" } },
      }],
    },
    answers: [{
      interactionId: "en:lesson-01:session-52:i01",
      correctText: "",
      correctResponseId: null,
    }],
  };

  assert.deepEqual(
    Array.from(practiceTitles(markdown, "fixture/ru", atomicSource, "ru"), (row) => ({ ...row })),
    [{ ordinal: 1, title: "Карточка слова — week" }],
  );
});

test("practice title projection rejects a genuine atomic ordinal mismatch", () => {
  const practiceTitles = loadPracticeTitles();
  const markdown = `# Fixture

## Интро 1

One.

## Интро 2

Two.

## Интро 3

Three.

## Практика — по одной цели

**1 · Послушайте и выберите**
<!-- interaction_id: en:lesson-01:session-52:i01; family: listen_choose -->
`;
  const atomicSource = {
    interactionsByLocale: {
      ru: [{
        interactionId: "en:lesson-01:session-52:i01",
        ordinal: 5,
        prompt: "Послушайте и выберите",
      }],
    },
  };

  assert.throws(
    () => practiceTitles(markdown, "fixture/ru", atomicSource, "ru"),
    /Markdown\/atomic practice differs at 1/u,
  );
});

test("practice title projection rejects a genuine learner prompt mismatch", () => {
  const practiceTitles = loadPracticeTitles();
  const markdown = `# Fixture

## Интро 1

One.

## Интро 2

Two.

## Интро 3

Three.

## Практика — по одной цели

**1 · Карточка слова — week**
<!-- interaction_id: en:lesson-01:session-52:i01; family: listen_choose -->
`;
  const atomicSource = {
    interactionsByLocale: {
      ru: [{
        interactionId: "en:lesson-01:session-52:i01",
        ordinal: 4,
        prompt: "Другой текст задания",
        modePayload: { wordCard: { word: "week" } },
      }],
    },
  };

  assert.throws(
    () => practiceTitles(markdown, "fixture/ru", atomicSource, "ru"),
    /Markdown\/atomic practice differs at 1/u,
  );
});
