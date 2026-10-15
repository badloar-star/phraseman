import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

test("run machine facts makes the preserved short-answer defect blocking and clears the repaired master", () => {
  const runUrl = pathToFileURL(path.join(here, "run.mjs")).href;
  const before = path.join(here, "../sessions/en/l02/s49/owner-before.ru.md");
  const repaired = path.join(here, "../sessions/en/l02/s49/final.ru.md");
  const program = `import { HARD_FACT_RE, machineFacts } from ${JSON.stringify(runUrl)};
const before = machineFacts(${JSON.stringify(before)}).split('\\n').filter(line => HARD_FACT_RE.test(line));
const repaired = machineFacts(${JSON.stringify(repaired)}).split('\\n').filter(line => HARD_FACT_RE.test(line));
console.log(JSON.stringify({ before: before.filter(line => line.includes('КОРОТКИЙ ОТВЕТ')), repaired: repaired.filter(line => line.includes('КОРОТКИЙ ОТВЕТ')) }));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", program], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const output = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(output.before.length, 1);
  assert.equal(output.repaired.length, 0);
});

test("run machine facts blocks an intro whose explanation switches away from its checked answer", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-intro-grounding-"));
  const sessionDir = path.join(root, "sessions", "en", "l03", "s25");
  fs.mkdirSync(sessionDir, { recursive: true });
  const broken = path.join(sessionDir, "broken.ru.md");
  const repaired = path.join(sessionDir, "repaired.ru.md");
  const page = (body, answer) => `## Интро 1\n\n### Понятие\n\n${body}\n\n**Назовите вещь.**\n\n- ✅ **${answer}**\n- ❌ This a key. — *Нужно is.*\n- ❌ This is key. — *Нужно a.*\n`;
  fs.writeFileSync(broken, page("Полная фраза: `This is a phone.` — «Это телефон». Ключ по-английски — `key`.", "This is a key."));
  fs.writeFileSync(repaired, page("Полная фраза: `This is a key.` — «Это ключ». Все четыре слова нужны.", "This is a key."));
  const runUrl = pathToFileURL(path.join(here, "run.mjs")).href;
  const program = `import { HARD_FACT_RE, machineFacts } from ${JSON.stringify(runUrl)};
const broken = machineFacts(${JSON.stringify(broken)}).split('\\n').filter(line => HARD_FACT_RE.test(line));
const repaired = machineFacts(${JSON.stringify(repaired)}).split('\\n').filter(line => HARD_FACT_RE.test(line));
console.log(JSON.stringify({ broken: broken.filter(line => line.includes('ИНТРО НЕ ОБЪЯСНЯЕТ ОТВЕТ')), repaired: repaired.filter(line => line.includes('ИНТРО НЕ ОБЪЯСНЯЕТ ОТВЕТ')) }));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", program], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const output = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(output.broken.length, 1);
  assert.equal(output.repaired.length, 0);
});

test("run machine facts recognizes both Russian and Ukrainian intro headers", async () => {
  const run = await import(`${pathToFileURL(path.join(here, "run.mjs")).href}?intro-headers=${Date.now()}`);
  const page = (header) => `${header}\n\n### Пояснение\n\nЗдесь разобрана другая фраза: \`This is a phone.\`\n\n**Назовите вещь.**\n\n- ✅ **This is a key.**\n- ❌ This a key. — *Нужна связка.*\n\n## Практика\n`;
  const factsFor = (header, locale) => run.machineFacts(
    `C:/tmp/sessions/en/l03/s25/final.${locale}.md`,
    "en/l03/s25",
    page(header),
  ).split("\n").filter((line) => line.includes("ИНТРО НЕ ОБЪЯСНЯЕТ ОТВЕТ"));

  assert.equal(factsFor("## Интро 1", "ru").length, 1);
  assert.equal(factsFor("## Інтро 1", "uk").length, 1);
});

test("return-word facts block RU and UK declarations used only as distractors", async () => {
  const run = await import(`${pathToFileURL(path.join(here, "run.mjs")).href}?return-word-answers=${Date.now()}`);
  const page = (header, word, practice, separator = " ") => `${header}${separator}${word}\n\n## Практика\n\n${practice}\n\n## Для сборщика\n\nmodes: 1=context_gap_grammar, 2=context_gap_grammar\n`;
  const brokenPractice = "**1 · Выберите место**\nclinic · bakery\n\n**2 · Выберите место**\nclinic · library";
  const validPractice = "**1 · Выберите место**\n→ **library**\n\n**2 · Выберите место**\nlibrary · bakery";

  const observed = {};
  for (const [locale, header, separator] of [["ru", "**Возвращаются:**", " "], ["uk", "**Повертаються:**", "\t"]]) {
    const factsFor = (word, practice) => run.machineFacts(
      `C:/tmp/sessions/en/l01/s01/final.${locale}.md`,
      "en/l01/s01",
      page(header, word, practice, separator),
    ).split("\n");
    const brokenLine = factsFor("clinic", brokenPractice).find((line) => line.startsWith("clinic:"));
    const validLine = factsFor("library", validPractice).find((line) => line.startsWith("library:"));

    observed[locale] = {
      reportsBrokenPromise: /касаний в практике 2, из них правильным ответом 0.*ни разу правильным ответом/u.test(brokenLine ?? ""),
      blocksBrokenPromise: run.HARD_FACT_RE.test(brokenLine),
      reportsValidPromise: /касаний в практике 2, из них правильным ответом 1/u.test(validLine ?? "")
        && !/ни разу правильным ответом/u.test(validLine ?? ""),
      blocksValidPromise: run.HARD_FACT_RE.test(validLine),
    };
  }
  assert.deepEqual(observed, {
    ru: { reportsBrokenPromise: true, blocksBrokenPromise: true, reportsValidPromise: true, blocksValidPromise: false },
    uk: { reportsBrokenPromise: true, blocksBrokenPromise: true, reportsValidPromise: true, blocksValidPromise: false },
  });

  const metadataOnly = `**Возвращаются:**\n**Операция:** clinic\n\n## Практика\n\n${brokenPractice}`;
  const metadataFacts = run.machineFacts(
    "C:/tmp/sessions/en/l01/s01/final.ru.md",
    "en/l01/s01",
    metadataOnly,
  ).split("\n");
  assert.equal(metadataFacts.some((line) => line.startsWith("clinic:")), false);
});

test("return-word facts count RU and UK builder and dictation targets as correct answers", async () => {
  const run = await import(`${pathToFileURL(path.join(here, "run.mjs")).href}?return-word-targets=${Date.now()}`);
  const observed = {};

  for (const [locale, header, targetLabel] of [
    ["ru", "**Возвращаются:**", "Цель"],
    ["uk", "**Повертаються:**", "Ціль"],
  ]) {
    const source = `${header} garden, bakery, clinic

## Практика

**1 · Соберите фразу**
${targetLabel}: \`There is a garden.\`

**2 · Соберите услышанное**
${targetLabel}: \`There is a bakery.\`

**3 · Выберите место**
garden · clinic

**4 · Выберите место**
bakery · clinic

**5 · Выберите место**
clinic · library

## Для сборщика

modes: 1=phrase_builder, 2=listen_build_dictation, 3=context_gap_grammar, 4=context_gap_grammar, 5=context_gap_grammar
`;
    const facts = run.machineFacts(
      `C:/tmp/sessions/en/l01/s01/final.${locale}.md`,
      "en/l01/s01",
      source,
    ).split("\n");
    const lineFor = (word) => facts.find((line) => line.startsWith(`${word}:`)) ?? "";
    observed[locale] = {
      garden: lineFor("garden"),
      bakery: lineFor("bakery"),
      clinic: lineFor("clinic"),
    };
  }

  for (const locale of ["ru", "uk"]) {
    assert.match(observed[locale].garden, /касаний в практике 2, из них правильным ответом 1$/u, locale);
    assert.equal(run.HARD_FACT_RE.test(observed[locale].garden), false, locale);
    assert.match(observed[locale].bakery, /касаний в практике 2, из них правильным ответом 1$/u, locale);
    assert.equal(run.HARD_FACT_RE.test(observed[locale].bakery), false, locale);
    assert.match(observed[locale].clinic, /из них правильным ответом 0.*ни разу правильным ответом/u, locale);
    assert.equal(run.HARD_FACT_RE.test(observed[locale].clinic), true, locale);
  }
});

test("return-word facts count atomic correct choices when Markdown contains only a gap", async () => {
  const run = await import(`${pathToFileURL(path.join(here, "run.mjs")).href}?return-word-atomic-choice=${Date.now()}`);
  const source = `**Возвращаются:** fine

## Практика

**1 · Вставьте слово**
Цель: \`I am ___ .\`

**2 · Вставьте слово**
Цель: \`I am ___ .\`

## Для сборщика

modes: 1=context_gap_grammar, 2=context_gap_grammar
`;
  const atomic = {
    schemaVersion: "learning_v2_atomic_practice_source_v1",
    interactionsByLocale: {
      ru: [
        { interactionId: "en:lesson-01:session-01:i01", responseOptions: [{ responseId: "i01:r1", text: "fine" }] },
        { interactionId: "en:lesson-01:session-01:i02", responseOptions: [{ responseId: "i02:r1", text: "fine" }] },
      ],
    },
    answers: [
      { interactionId: "en:lesson-01:session-01:i01", correctText: "fine", correctResponseId: "i01:r1" },
      { interactionId: "en:lesson-01:session-01:i02", correctText: "fine", correctResponseId: "i02:r1" },
    ],
  };
  const facts = run.machineFacts(
    "C:/tmp/sessions/en/l01/s01/final.ru.md",
    "en/l01/s01",
    source,
    JSON.stringify(atomic),
  ).split("\n");
  const fine = facts.find((line) => line.startsWith("fine:")) ?? "";
  assert.match(fine, /касаний в практике 2, из них правильным ответом 2$/u);
  assert.equal(run.HARD_FACT_RE.test(fine), false);
});

test("judge input composition carries full RU, full UK, and only the current learner projection", async () => {
  const run = await import(`${pathToFileURL(path.join(here, "run.mjs")).href}?judge-input=${Date.now()}`);
  assert.equal(typeof run.composeCurrentJudgeInputs, "function");
  const ru = "RU FULL\nsecond line";
  const uk = "UK FULL\nдругий рядок";
  const inputs = run.composeCurrentJudgeInputs({
    ru,
    uk,
    atomic: JSON.stringify({
      schemaVersion: "learning_v2_atomic_practice_source_v1",
      courseSessionId: "en:lesson-04:session-12",
      interactionsByLocale: { ru: [{ interactionId: "i1" }], uk: [{ interactionId: "i1" }] },
      answers: [{ interactionId: "i1", correctText: "there" }],
      handbook: "MUST NOT LEAK",
      history: ["MUST NOT LEAK"],
    }),
  });
  assert.equal(inputs.СЕССИЯ, ru);
  assert.equal(inputs.СЕССИЯ_UK, uk);
  const projection = JSON.parse(inputs.ФАКТИЧЕСКАЯ_LEARNER_PROJECTION);
  assert.deepEqual(Object.keys(projection), ["schemaVersion", "courseSessionId", "interactionsByLocale", "answers"]);
  assert.equal(inputs.ФАКТИЧЕСКАЯ_LEARNER_PROJECTION.includes("MUST NOT LEAK"), false);

  const runSource = fs.readFileSync(path.join(here, "run.mjs"), "utf8");
  assert.match(runSource, /composeCurrentJudgeInputs\(snapshot\.text\)/u);
  assert.doesNotMatch(runSource, /excerptForLocaleJudge/u);
  assert.match(runSource, /СЕССИЯ_RU:\s*ru,\s*СЕССИИ_ЛОКАЛЕЙ:\s*parts\.join/u);
  assert.match(runSource, /===LOCALE: \$\{locale\}===\\n\$\{currentBatch\[locale\]\.trim\(\)\}/u);
  for (const name of ["judge_learner.md", "judge_taste.md", "judge_pedagogy.md", "judge_nonsense.md", "judge_reader.md"]) {
    const prompt = fs.readFileSync(path.join(here, "prompts", name), "utf8");
    assert.match(prompt, /\{\{СЕССИЯ_UK\}\}/u, name);
    assert.match(prompt, /\{\{ФАКТИЧЕСКАЯ_LEARNER_PROJECTION\}\}/u, name);
  }
});
