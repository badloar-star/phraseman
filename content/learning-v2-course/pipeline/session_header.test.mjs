import assert from "node:assert/strict";
import test from "node:test";

import { parseSessionHeader } from "./session_header.mjs";

test("learner-facing situation and wording headers retain the session metadata", () => {
  const header = parseSessionHeader([
    "# Английский · Урок 3 · Занятие 43",
    "",
    "**Ситуация.** Лина сверяет отложенные книги.",
    "**Как сказать:** конкретная группа получает `the`.",
    "**Новые слова:** book, magazine",
  ].join("\n"));
  assert.equal(header.scene, "Лина сверяет отложенные книги.");
  assert.equal(header.operation, "конкретная группа получает `the`.");
  assert.deepEqual(header.newWords, ["book", "magazine"]);
});

test("learner-facing lesson label preserves a scene without the banned word session", () => {
  const header = parseSessionHeader([
    "# Английский · Урок 1 · Занятие 20",
    "",
    "**Сцена занятия.** Лина сверяет сведения, которые гости сообщили сами.",
    "**Новые слова:** married, single",
  ].join("\n"));
  assert.equal(header.scene, "Лина сверяет сведения, которые гости сообщили сами.");
});

test("today header supplies the learner outcome in Russian and Ukrainian", () => {
  const ru = parseSessionHeader([
    "# Английский · Урок 1 · Занятие 45",
    "",
    "**Сегодня.** Скажете, довольны ли вы результатом.",
    "**Новые слова:** satisfied",
  ].join("\n"));
  const uk = parseSessionHeader([
    "# Англійська · Урок 1 · Заняття 45",
    "",
    "**Сьогодні.** Скажете, чи задоволені ви результатом.",
    "**Нові слова:** satisfied",
  ].join("\n"));

  assert.equal(ru.operation, "Скажете, довольны ли вы результатом.");
  assert.equal(uk.operation, "Скажете, чи задоволені ви результатом.");
});
