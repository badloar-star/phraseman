import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const start = readFileSync(resolve(root, "docs/v2/СТАРТ В2.md"), "utf8");
const mode = readFileSync(
  resolve(root, "docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md"),
  "utf8",
);
const combined = `${start}\n${mode}`;

for (const required of [
  "Назад | hold-to-talk микрофон | карман слов | Далее",
  "bookmark-outline",
  "только уже разблокированные слова",
  "карточка уменьшается и перемещается в карман",
  "будущие слова не показываются",
]) {
  assert.ok(
    combined.includes(required),
    `owner contract must contain: ${required}`,
  );
}

assert.doesNotMatch(
  mode,
  /Нижний футер до верного ответа содержит только центральный hold-to-talk микрофон/,
  "the superseded mic-only footer contract must be removed",
);

process.stdout.write(
  "LEARNING V2 WORD POCKET OWNER CONTRACT 2026-08-26 GATE: PASS\n",
);
