import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

import { taskInstructionIssues } from "./owner_quality.mjs";

// зачем: владелец 2026-09-20 потребовал убрать из курса инструкции, которые
// выдают диагностическую лишнюю плитку до ответа («среди плиток чужая
// скрепка») и которые обещают «без подсказок», хотя подсказка стоит в той же
// строке. Правила лежали в pipeline/prompts/author.md, но их никто не
// проверял — накопилось 130 нарушений в 96 сессиях. Этот сторож закрывает
// возврат обоих классов.

const here = path.dirname(url.fileURLToPath(import.meta.url));
const sessionsRoot = path.join(here, "..", "sessions", "en");

function practice(...tasks) {
  return ["## Практика", "", ...tasks].join("\n");
}

test("ловит объявление лишней плитки в инструкции", () => {
  const issues = taskInstructionIssues(practice(
    "**15 · Соберите фразу — «я рад», среди плиток чужая скрепка**",
    "Плитки: `happy` `is` `I` `am` → **I am happy.**",
  ));
  assert.equal(issues.length, 1);
  assert.match(issues[0], /задание 15/u);
  assert.match(issues[0], /объявляет лишнюю плитку/u);
});

test("ловит локализованное объявление ловушки", () => {
  for (const heading of [
    "**11 · Складіть фразу — «я запізнююся», серед плиток чужа скріпка**",
    "**12 · Соберите фразу — «она смешная», среди плиток лишняя**",
    "**13 · Соберите фразу — турист кивнул, `not` тут лишний**",
    "**14 · Соберите фразу — «мы не дома», лишняя плитка внутри**",
    "**15 · Соберите фразу — «они не шумные», среди плиток лишнее сокращение**",
  ]) {
    const issues = taskInstructionIssues(practice(heading));
    assert.equal(issues.length, 1, heading);
    assert.match(issues[0], /объявляет лишнюю плитку/u, heading);
  }
});

test("ловит обещание отсутствия помощи", () => {
  for (const heading of [
    "**16 · Соберите фразу без подсказки — «у меня всё хорошо»**",
    "**17 · Финал сцены — четыре фразы подряд, без подсказок**",
    "**18 · Соберите фразу самостоятельно — друг спрашивает, что это**",
    "**19 · Складіть фразу без підказки — «я готовий»**",
    "**20 · Соберите фразу — три реплики голосом без опоры**",
  ]) {
    const issues = taskInstructionIssues(practice(heading));
    assert.equal(issues.length, 1, heading);
    assert.match(issues[0], /уровень помощи/u, heading);
  }
});

test("не трогает нормальные инструкции", () => {
  const issues = taskInstructionIssues(practice(
    "**15 · Соберите фразу — вас впустили, и вы этому рады**",
    "Плитки: `happy` `is` `I` `am` → **I am happy.**",
    "*(плитка `is` остаётся лишней — это ловушка, не ошибка ученика)*",
    "",
    "**16 · Соберите вопрос — гость сидит в одной рубашке у окна; спросите, не холодно ли ему**",
    "",
    "**17 · Финал сцены — четыре фразы подряд о том, как вы себя чувствуете**",
  ));
  assert.deepEqual(issues, []);
});

test("авторская пометка под заданием не считается нарушением", () => {
  // Строка «Лишняя плитка: `am`.» — служебная заметка для автора и озвучки,
  // ученику она не показывается; нарушением является только сам заголовок.
  const issues = taskInstructionIssues(practice(
    "**17 · Соберите фразу — брат принял столик за табурет; возразите**",
    "Плитки: `It` `is` `not` `a` `stool` `am` → **It is not a stool.**",
    "Лишняя плитка: `am`.",
  ));
  assert.deepEqual(issues, []);
});

test("весь написанный курс свободен от обоих классов", () => {
  const dirty = [];
  for (const lesson of fs.readdirSync(sessionsRoot)) {
    const lessonDir = path.join(sessionsRoot, lesson);
    if (!fs.statSync(lessonDir).isDirectory()) continue;
    for (const session of fs.readdirSync(lessonDir)) {
      for (const name of ["final.ru.md", "final.uk.md"]) {
        const file = path.join(lessonDir, session, name);
        if (!fs.existsSync(file)) continue;
        const issues = taskInstructionIssues(fs.readFileSync(file, "utf8"));
        if (issues.length) dirty.push(`${lesson}/${session}/${name}: ${issues[0]}`);
      }
    }
  }
  assert.deepEqual(dirty, [], `инструкции с нарушениями:\n${dirty.join("\n")}`);
});
