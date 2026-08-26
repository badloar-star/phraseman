import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const start = read("docs/v2/СТАРТ В2.md");
assert.match(start, /3 \/ 2 \/ 1 \/ 0/);
assert.match(start, /stars_10\.webp/);
assert.match(start, /сама показывает\s+оборот через 3 секунды/);
assert.match(start, /semantic strike-through[\s\S]*только у явно размеченного `targetWrong`/);
assert.match(start, /Instruction|Инструкция и материал действия — разные визуальные слои/);

const styleBible = read("docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md");
assert.match(styleBible, /Запоминающаяся ловушка остаётся диагностической/);
assert.match(styleBible, /Перевод русского каламбура не считается локализацией/);
assert.match(styleBible, /ровно один грамматически, семантически и контекстно допустимый ответ/);

const cardSpec = read(
  "docs/superpowers/specs/2026-08-24-learning-v2-premium-new-word-card-design.md",
);
assert.match(cardSpec, /flip работает сразу/);
assert.match(cardSpec, /сама показывает перевод через 3 секунды/);
assert.match(cardSpec, /practice entrance начинается после `Продолжить`/);

console.log("LEARNING V2 OWNER CORRECTIONS 2026-08-26 CONTRACT GATE: PASS");
