import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const digest = fs.readFileSync(
  fileURLToPath(new URL("../СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md", import.meta.url)),
  "utf8",
);

test("Cambridge digest fixes the existential there boundary for L4 S04", () => {
  assert.match(digest, /^## `there is` \/ `there are` — наличие$/m);
  assert.match(digest, /https:\/\/dictionary\.cambridge\.org\/grammar\/british-grammar\/there-is-there-are/);
  assert.match(digest, /https:\/\/dictionary\.cambridge\.org\/grammar\/british-grammar\/be(?:\)|,|\s)/);

  assert.match(digest, /`there is` и `there are` вводят существование или наличие/);
  assert.match(digest, /`there is` \+ исчисляемое существительное в единственном числе/);
  assert.match(digest, /`a\/an`[^\n]+когда применимо/);
  assert.match(digest, /`there are` \+ существительное во множественном числе/);
  assert.match(digest, /В S04[^\n]+выбирается по числу существительного/);

  assert.match(digest, /разговорное `there’s`[^\n]+множественн/);
  assert.match(digest, /запрещено[^\n]+до L4 S41/i);
  assert.match(digest, /existential `there is\/are`[\s\S]{0,240}`it is`[\s\S]{0,120}`the X is`/i);
  assert.match(digest, /Граница S04:[\s\S]{0,180}вопросы[\s\S]{0,80}отрицания[\s\S]{0,80}`some\/any`[\s\S]{0,80}будущие предлоги/);
});
