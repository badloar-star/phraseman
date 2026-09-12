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

test("preserved owner-before masters reproduce exactly the five short-answer construction defects", () => {
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
  const markdown = `## Интро 1\n\n### Ответить о себе\n\nТекст.\n\n**Ответьте коротко о себе.**\n\n- ✅ **Yes, I am.**\n- ❌ Yes, you are. — *Не о вас.*\n- ❌ No, I am not. — *Другая полярность.*\n\n---\n\n## Інтро 2\n\n### Коротка відповідь\n\nТекст.\n\n**Дайте коротку відповідь про неї.**\n\n- ✅ **No, she is not.**\n- ❌ Yes, she is. — *Інша полярність.*\n- ❌ No, I am not. — *Інша особа.*\n`;
  const facts = shortAnswerConstructionFacts(markdown, "en/l02/s40");
  assert.equal(facts.length, 2);
  assert.match(facts[0], /Yes, you are/);
  assert.match(facts[1], /Yes, she is/);
});

test("gap reconstruction handles start, middle, and end without rejecting diagnostic errors", () => {
  const markdown = `# Session\n\n## Практика\n\n**1 · Вставьте слова — ответьте коротко о мужчине**\n___ is. → **Yes, he** · Yes, she · Yes, I\n- Yes, she — *Не то лицо.*\n- Yes, I — *После I нужна am.*\n\n**2 · Вставьте слово — ответьте коротко о мужчине**\nYes, ___ is. → **he** · she · I\n- she — *Не то лицо.*\n- I — *После I нужна am.*\n\n**3 · Вставьте слова — ответьте коротко о себе**\nYes, ___ → **I am** · you are · I is\n- you are — *Не то лицо.*\n- I is — *После I нужна am.*\n\n**4 · Вставьте слово — ответьте коротко о себе**\nYes, I ___ → **am** · are · is\n- are — *После I нужна am.*\n- is — *После I нужна am.*\n\nmodes: 1=context_gap_grammar, 2=context_gap_grammar, 3=context_gap_grammar, 4=context_gap_grammar\n`;
  const facts = shortAnswerConstructionFacts(markdown, "en/l02/s40");
  assert.equal(facts.length, 3);
  assert.match(facts[0], /задание 1/);
  assert.match(facts[1], /задание 2/);
  assert.match(facts[2], /задание 3/);
});

test("standard contracted-subject negative be answers count as grammatical alternatives", () => {
  for (const answer of ["No, you're not.", "No, he's not.", "No, she's not.", "No, it's not.", "No, we're not.", "No, they're not."]) {
    assert.equal(isWellFormedBeShortAnswer(answer), true, answer);
  }
  for (const diagnostic of ["Yes, I is.", "Yes, am.", "Yes, am I.", "No, she are not.", "No, she not is."]) {
    assert.equal(isWellFormedBeShortAnswer(diagnostic), false, diagnostic);
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
