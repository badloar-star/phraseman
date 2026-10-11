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
