import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  bindTasteReceiptToSource,
  isWellFormedBeShortAnswer,
  ownerTasteReceiptIssues,
  scopedOwnerQualityRequired,
  shortAnswerConstructionFacts,
} from "./owner_quality.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const courseRoot = path.resolve(here, "..");

test("owner quality scope starts at English lesson 2 session 33 and includes later lessons", () => {
  assert.equal(scopedOwnerQualityRequired("en/l02/s32"), false);
  assert.equal(scopedOwnerQualityRequired("en/l02/s33"), true);
  assert.equal(scopedOwnerQualityRequired("en/l02/s50"), true);
  assert.equal(scopedOwnerQualityRequired("en/l03/s01"), true);
  assert.equal(scopedOwnerQualityRequired("en/l01/s49"), false);
  assert.equal(scopedOwnerQualityRequired("es/l02/s49"), false);
});

test("preserved owner-before masters retain one semantic construction defect per affected location", () => {
  const s49 = fs.readFileSync(path.join(courseRoot, "sessions/en/l02/s49/owner-before.ru.md"), "utf8");
  const s50 = fs.readFileSync(path.join(courseRoot, "sessions/en/l02/s50/owner-before.ru.md"), "utf8");
  const facts49 = shortAnswerConstructionFacts(s49, "en/l02/s49");
  const facts50 = shortAnswerConstructionFacts(s50, "en/l02/s50");
  assert.equal(facts49.length, 1);
  assert.match(facts49[0], /интро 1/i);
  assert.equal(facts50.length, 4);
  assert.deepEqual(facts50.map((fact) => /интро (\d+)/i.exec(fact)?.[1] ?? /задание (\d+)/i.exec(fact)?.[1]), ["1", "2", "3", "14"]);
});

test("repaired masters and structural Yes I am gap remain clear", () => {
  for (const session of ["s49", "s50"]) {
    const markdown = fs.readFileSync(path.join(courseRoot, `sessions/en/l02/${session}/final.ru.md`), "utf8");
    assert.deepEqual(shortAnswerConstructionFacts(markdown, `en/l02/${session}`), []);
  }
  const structural = `# Session\n\n## Практика\n\n**2 · Вставьте слово — ответьте коротко: «Да»**\nYes, I ___ . → **am** · are · is\n- are — *После I нужно am.*\n- is — *После I нужно am.*\n\nmodes: 2=context_gap_grammar\n`;
  assert.deepEqual(shortAnswerConstructionFacts(structural, "en/l02/s49"), []);
});

test("RU and UK intro checks reject grammatical person or polarity substitutions", () => {
  const markdown = `## Интро 1\n\n### Ответить о себе\n\nТекст.\n\n**На вопрос \`Are you ready?\` ответьте коротко о себе.**\n\n- ✅ **Yes, I am.**\n- ❌ Yes, you are. — *Не о вас.*\n- ❌ No, I am not. — *Другая полярность.*\n\n---\n\n## Інтро 2\n\n### Коротка відповідь\n\nТекст.\n\n**На запитання \`Is she ready?\` дайте коротку відповідь про неї.**\n\n- ✅ **No, she is not.**\n- ❌ Yes, she is. — *Інша полярність.*\n- ❌ No, I am not. — *Інша особа.*\n`;
  const facts = shortAnswerConstructionFacts(markdown, "en/l02/s40");
  assert.equal(facts.length, 2);
  assert.match(facts[0], /Yes, you are/);
  assert.match(facts[1], /Yes, she is/);
});

test("gap reconstruction flags person changes while accepting malformed auxiliary choices", () => {
  const markdown = `# Session\n\n## Практика\n\n**1 · Вставьте слова — ответьте коротко о мужчине**\n___ is. → **Yes, he** · Yes, she · Yes, I\n- Yes, she — *Не то лицо.*\n- Yes, I — *После I нужна am.*\n\n**2 · Вставьте слово — ответьте коротко о мужчине**\nYes, ___ is. → **he** · she · I\n- she — *Не то лицо.*\n- I — *После I нужна am.*\n\n**3 · Вставьте слова — ответьте коротко о себе**\nYes, ___ → **I am** · you are · I is\n- you are — *Не то лицо.*\n- I is — *После I нужна am.*\n\n**4 · Вставьте слово — ответьте коротко о себе**\nYes, I ___ → **am** · are · is\n- are — *После I нужна am.*\n- is — *После I нужна am.*\n\nmodes: 1=context_gap_grammar, 2=context_gap_grammar, 3=context_gap_grammar, 4=context_gap_grammar\n`;
  const facts = shortAnswerConstructionFacts(markdown, "en/l02/s40");
  assert.equal(facts.length, 3);
  for (const ordinal of [1, 2, 3]) assert.ok(facts.some((fact) => new RegExp(`задание ${ordinal}`, "u").test(fact)));
});

test("standard contracted-subject negative be answers count as grammatical alternatives", () => {
  for (const answer of ["No, you're not.", "No, he's not.", "No, she's not.", "No, it's not.", "No, we're not.", "No, they're not."]) {
    assert.equal(isWellFormedBeShortAnswer(answer), true, answer);
  }
  for (const diagnostic of ["Yes, I is.", "Yes, am.", "Yes, am I.", "No, she are not.", "No, she not is."]) {
    assert.equal(isWellFormedBeShortAnswer(diagnostic), false, diagnostic);
  }
});

test("finite existential be replies include contracted and uncontracted negatives", () => {
  for (const answer of [
    "Yes, there is.", "Yes, there are.",
    "No, there isn't.", "No, there is not.",
    "No, there aren't.", "No, there are not.",
  ]) assert.equal(isWellFormedBeShortAnswer(answer), true, answer);
});

test("short construction guard scans early English intros and requires a matching English question", () => {
  const fullCorrect = `## Интро 1\n\n### Короткий ответ\n\n**На вопрос \`Is there a hotel nearby?\` выберите короткий ответ.**\n\n- ✅ **No, there is not a hotel nearby.**\n- ❌ No, there not. — *Ошибка порядка.*\n`;
  assert.match(shortAnswerConstructionFacts(fullCorrect, "en/l02/s03").join("\n"), /верный вариант не является коротким ответом/iu);

  const missingQuestion = `## Інтро 2\n\n### Коротка відповідь\n\n**Дайте коротку відповідь.**\n\n- ✅ **No, there isn't.**\n- ❌ No, there not. — *Пропущено is.*\n`;
  assert.match(shortAnswerConstructionFacts(missingQuestion, "en/l02/s15").join("\n"), /нет согласованного английского вопроса/iu);

  const mismatchedQuestion = missingQuestion.replace("Дайте коротку відповідь.", "На `Are there hotels nearby?` дайте коротку відповідь.");
  assert.match(shortAnswerConstructionFacts(mismatchedQuestion, "en/l02/s15").join("\n"), /нет согласованного английского вопроса/iu);

  const licensed = missingQuestion.replace("Дайте коротку відповідь.", "На `Is there a hotel nearby?` дайте коротку відповідь.");
  assert.deepEqual(shortAnswerConstructionFacts(licensed, "en/l02/s15"), []);
});

test("a short ordinary statement heading does not declare a yes-no short-answer construction", () => {
  const ordinaryStatement = `## Интро 1\n\n### Короткий ответ\n\n\`I am glad.\` — короткая фраза о состоянии.\n\n**Выберите подходящую фразу.**\n\n- ✅ **I am glad.**\n- ❌ I glad. — *Пропущено am.*\n`;
  assert.deepEqual(shortAnswerConstructionFacts(ordinaryStatement, "en/l01/s07"), []);
});

test("short construction wrong choices must be malformed and preserve polarity and person", () => {
  const markdown = `## Интро 1\n\n### Короткий ответ\n\n**На \`Is there a hotel nearby?\` ответьте коротко.**\n\n- ✅ **No, there isn't.**\n- ❌ No, there is not. — *Та же форма без сокращения.*\n- ❌ No, there isn't a hotel nearby. — *Полный грамматический ответ.*\n- ❌ Yes, there is. — *Другая полярность.*\n- ❌ No, not there is. — *Ошибка порядка.*\n`;
  const facts = shortAnswerConstructionFacts(markdown, "en/l04/s10");
  assert.equal(facts.length, 2);
  assert.ok(facts.some((fact) => /No, there is not/u.test(fact)));
  assert.ok(facts.some((fact) => /No, there isn't a hotel nearby/u.test(fact)));
  assert.ok(facts.some((fact) => /МЕНЯЕТ СМЫСЛ.*Yes, there is/iu.test(fact)));
});

test("an explicit short-answer question permits determinate polarity and existential-number diagnostics", () => {
  for (const markdown of [
    `# Session\n\n## Практика\n\n**12 · Финал — на схеме у отеля отмечены две платформы. На вопрос \`Are there platforms near the hotel?\` выберите короткий ответ.**\n___ → **Yes, there are.** · No, there aren't. · Yes, there is.\n- No, there aren't. — *\`No\` говорит, что платформ нет, а на схеме они есть, поэтому нужен \`Yes, there are.\`.*\n- Yes, there is. — *\`Is\` отвечает об одном месте, а для нескольких нужна форма \`there are\`.*\n\nmodes: 12=context_gap_grammar\n`,
    `# Session\n\n## Практика\n\n**12 · Фінал — на схемі біля готелю позначено дві платформи. На питання \`Are there platforms near the hotel?\` оберіть коротку відповідь.**\n___ → **Yes, there are.** · No, there aren't. · Yes, there is.\n- No, there aren't. — *\`No\` говорить, що платформ немає, а на схемі вони є, тому потрібна відповідь \`Yes, there are.\`.*\n- Yes, there is. — *\`Is\` відповідає про одне місце, а для кількох потрібна форма \`there are\`.*\n\nmodes: 12=context_gap_grammar\n`,
  ]) {
    assert.deepEqual(shortAnswerConstructionFacts(markdown, "en/l04/s12"), []);
  }
});

test("short-answer diagnostics still reject same-answer alternatives or choices without an explicit question", () => {
  const sameAnswer = `# Session\n\n## Практика\n\n**12 · На схеме у отеля отмечены две платформы. На вопрос \`Are there platforms near the hotel?\` выберите короткий ответ.**\n___ → **Yes, there are.** · Yes, there are platforms near the hotel. · Yes, are there.\n- Yes, there are platforms near the hotel. — *Это полный ответ с тем же смыслом.*\n- Yes, are there. — *Неверный порядок слов.*\n\nmodes: 12=context_gap_grammar\n`;
  assert.match(shortAnswerConstructionFacts(sameAnswer, "en/l04/s12").join("\n"), /Yes, there are platforms near the hotel/iu);

  const missingQuestion = `# Session\n\n## Практика\n\n**12 · На схеме у отеля отмечены две платформы. Выберите короткий ответ.**\n___ → **Yes, there are.** · No, there aren't. · Yes, there is.\n- No, there aren't. — *Другая полярность.*\n- Yes, there is. — *Форма для одного места.*\n\nmodes: 12=context_gap_grammar\n`;
  const facts = shortAnswerConstructionFacts(missingQuestion, "en/l04/s12").join("\n");
  assert.match(facts, /No, there aren't/iu);
  assert.match(facts, /Yes, there is/iu);

  const unexplainedDiagnostics = missingQuestion.replace("Выберите короткий ответ.", "На вопрос `Are there platforms near the hotel?` выберите короткий ответ.");
  const unexplainedFacts = shortAnswerConstructionFacts(unexplainedDiagnostics, "en/l04/s12").join("\n");
  assert.match(unexplainedFacts, /No, there aren't/iu);
  assert.match(unexplainedFacts, /Yes, there is/iu);
});

test("actual early RU and UK intros are scanned without changing non-construction tasks", () => {
  for (const locale of ["ru", "uk"]) {
    const s03 = fs.readFileSync(new URL(`../sessions/en/l02/s03/final.${locale}.md`, import.meta.url), "utf8");
    const s15 = fs.readFileSync(new URL(`../sessions/en/l02/s15/final.${locale}.md`, import.meta.url), "utf8");
    assert.deepEqual(shortAnswerConstructionFacts(s03, "en/l02/s03"), []);
    const mutated = s15.replace(/- ❌ Yes, she\. —/u, "- ❌ Yes, he is. —");
    assert.match(shortAnswerConstructionFacts(mutated, "en/l02/s15").join("\n"), /Yes, he is/iu);
  }
});

test("listening, builders, voice, and semantic choices keep their own distractor rules", () => {
  const markdown = `# Session\n\n## Интро 1\n\n### Значение\n\nТекст.\n\n**Что прозвучало?**\n- ✅ **Yes, I am.**\n- ❌ Yes, you are. — *Другая реплика.*\n\n## Практика\n\n**1 · Послушайте и выберите — какая реплика прозвучала**\n🔊 *Yes, I am.* → **Yes, I am.** · Yes, you are. · No, I am not.\n- Yes, you are. — *Другая реплика.*\n- No, I am not. — *Другая реплика.*\n\n**2 · Соберите короткий ответ**\nПлитки: \`Yes\` \`I\` \`am\` → **Yes, I am.**\n\n**3 · Скажите короткий ответ вслух**\n🎙 **Yes, I am.**\n\n**4 · Выберите подходящий по смыслу ответ**\nYes, ___ → **I am** · you are · I is\n- you are — *Другой смысл.*\n- I is — *Ошибка.*\n\nmodes: 1=listen_choose, 2=phrase_builder, 3=scripted_repeat_compare, 4=context_gap_grammar\n`;
  assert.deepEqual(shortAnswerConstructionFacts(markdown, "en/l02/s40"), []);
});

function validTaste(master) {
  return {
    sourceSha256: crypto.createHash("sha256").update(master).digest("hex"),
    pairwise: "equal",
    pairwise_reason: "Голос и ясность держатся на уровне эталона; формулировки конкретны.",
    voice: { score: 4, evidence: ["«маленькая скрепка» — живой образ из самого правила"] },
    humor: { present: true, on_topic: true, examples: ["«маленькая скрепка» — образ помогает увидеть форму"], misfires: [] },
    ai_text_or_nonsense: [],
    must_fix: [],
    verdict: "PASS",
    verdict_reason: "Текст чистый, живой и не уступает эталону.",
  };
}

test("verbatim humor may contain internal quotation marks", () => {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-owner-quality-"));
  try {
    const master = "Услышать «близко» приятно, но куда идти — всё ещё загадка.";
    const sourcePath = path.join(dir, "final.ru.md");
    const receiptPath = path.join(dir, "final.judge_taste.json");
    const receipt = validTaste(master);
    receipt.humor.examples = [master];
    fs.writeFileSync(sourcePath, master);
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    assert.deepEqual(ownerTasteReceiptIssues({ sessionId: "en/l02/s49", sourcePath, receiptPath }), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("current taste receipt binds PASS and substantive humor evidence to exact RU bytes", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-owner-quality-"));
  try {
    const master = "Текст с образом «маленькая скрепка».\n";
    const sourcePath = path.join(dir, "final.ru.md");
    const receiptPath = path.join(dir, "final.judge_taste.json");
    fs.writeFileSync(sourcePath, master);
    fs.writeFileSync(receiptPath, JSON.stringify(validTaste(master)));
    assert.deepEqual(ownerTasteReceiptIssues({ sessionId: "en/l02/s49", sourcePath, receiptPath }), []);

    fs.writeFileSync(sourcePath, `${master}правка`);
    assert.match(ownerTasteReceiptIssues({ sessionId: "en/l02/s49", sourcePath, receiptPath }).join("\n"), /SHA-256/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("factory-bound taste receipt records the exact source byte hash", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-owner-quality-"));
  try {
    const sourcePath = path.join(dir, "final.ru.md");
    fs.writeFileSync(sourcePath, Buffer.from([0xd0, 0xa2, 0x0d, 0x0a]));
    const bound = bindTasteReceiptToSource({ verdict: "PASS" }, sourcePath);
    assert.equal(bound.verdict, "PASS");
    assert.equal(bound.sourceSha256, crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("factory-bound taste receipt rejects a path changed after bytes were captured", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-owner-quality-"));
  try {
    const sourcePath = path.join(dir, "final.ru.md");
    const captured = Buffer.from("version A\n", "utf8");
    const expectedSourceSha256 = crypto.createHash("sha256").update(captured).digest("hex");
    fs.writeFileSync(sourcePath, captured);
    fs.writeFileSync(sourcePath, "version B\n");
    assert.throws(
      () => bindTasteReceiptToSource({ verdict: "PASS" }, sourcePath, { expectedSourceSha256, sourceBytes: captured }),
      /source_digest_changed/u,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("taste receipt rejects missing, failing, hollow, and self-approved evidence", () => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-owner-quality-"));
  try {
    const master = "Текст с образом «маленькая скрепка».\n";
    const sourcePath = path.join(dir, "final.ru.md");
    const receiptPath = path.join(dir, "final.judge_taste.json");
    fs.writeFileSync(sourcePath, master);
    assert.match(ownerTasteReceiptIssues({ sessionId: "en/l02/s49", sourcePath, receiptPath }).join("\n"), /нет final\.judge_taste\.json/);

    const cases = [
      { verdict: "REVISE" },
      { pairwise: "worse" },
      { pairwise_reason: "ok" },
      { voice: { score: 4, evidence: [] } },
      { best_lines: ["После него можно задать вопрос, когда вас слушают."] },
      { best_lines: ["Несуществующая строка про «маленькая скрепка» из другой сессии."] },
      { humor: { present: false, on_topic: true, examples: ["пример"], misfires: [] } },
      { humor: { present: true, on_topic: false, examples: ["пример"], misfires: [] } },
      { humor: { present: true, on_topic: true, examples: [], misfires: [] } },
      { humor: { present: true, on_topic: true, examples: ["пример"], misfires: ["натужно"] } },
      { humor: { present: true, on_topic: true, examples: ["«несуществующая очень смешная строка» — якобы цитата из текста"], misfires: [] } },
      { ai_text_or_nonsense: [{ quote: "бред" }] },
      { must_fix: ["починить"] },
      { verdict_reason: "mock self-approved placeholder" },
    ];
    fs.writeFileSync(receiptPath, JSON.stringify({ ...validTaste(master), best_lines: [master.trim()] }));
    assert.deepEqual(ownerTasteReceiptIssues({ sessionId: "en/l02/s49", sourcePath, receiptPath }), []);
    for (const change of cases) {
      fs.writeFileSync(receiptPath, JSON.stringify({ ...validTaste(master), ...change }));
      assert.notDeepEqual(ownerTasteReceiptIssues({ sessionId: "en/l02/s49", sourcePath, receiptPath }), [], JSON.stringify(change));
    }

    fs.writeFileSync(receiptPath, "not json");
    assert.match(ownerTasteReceiptIssues({ sessionId: "en/l02/s49", sourcePath, receiptPath }).join("\n"), /нечитаем/);
    assert.deepEqual(ownerTasteReceiptIssues({ sessionId: "en/l02/s32", sourcePath, receiptPath }), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
