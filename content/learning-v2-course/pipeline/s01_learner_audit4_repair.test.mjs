import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const COURSE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATE = path.join(COURSE, "outputs/s01-source-projection-fixed-20261013");
const sessionFile = (name) => path.join(CANDIDATE, "en/l01/s01", name);
const read = (name) => JSON.parse(fs.readFileSync(sessionFile(name), "utf8"));
const readPreview = () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(CANDIDATE, "data.js"), "utf8"), context);
  return context.window.__DATA__[0];
};

test("S01 learner-audit4 repair keeps Ukrainian ready wording and the intro3 incomplete-answer explanation in scope", () => {
  const ukrainian = read("learner.uk.json");
  const ready = ukrainian.interactions.find((item) => item.interactionId.endsWith(":i03"));
  assert.equal(ready.modePayload.wordCard.definitionByLocale.uk, "«готовий / готова». Шнурки зав'язані, куртка вже на вас, можна виходити.");

  const auxiliary = read("auxiliary.json");
  const intro3 = auxiliary.entries.find((entry) => entry.interactionId.endsWith(":intro3:q"));
  const responseId = "en:lesson-01:session-01:intro3:r3";
  const diagnostic = intro3.responseDiagnosticsById[responseId];
  const analysis = intro3.responseAnalysisById[responseId].ru;
  assert.equal(diagnostic.errorType, "meaning_incomplete");
  assert.doesNotMatch(JSON.stringify({ diagnostic, analysis }), /Are you ready\?|Yes, I am/u);
  assert.match(analysis.explanationByLocale.ru, /I am без happy не называет нужную эмоцию/u);
  assert.match(analysis.explanationByLocale.uk, /I am без happy не називає потрібну емоцію/u);

  const previewIntro3 = readPreview().auxiliary.entries.find((entry) => entry.interactionId.endsWith(":intro3:q"));
  assert.equal(previewIntro3.responseDiagnosticsById[responseId].errorType, "meaning_incomplete");
  assert.doesNotMatch(JSON.stringify(previewIntro3), /Are you ready\?|Yes, I am/u);
});

test("S01 learner-audit4 repair binds bilingual and localized analyses to the exact retained source anchors", () => {
  const serialized = ["learner.json", "learner.uk.json", "auxiliary.json"]
    .map((name) => fs.readFileSync(sessionFile(name), "utf8"))
    .concat(fs.readFileSync(path.join(CANDIDATE, "data.js"), "utf8"))
    .join("\n");
  assert.doesNotMatch(serialized, /#pronoun-i(?:["\\])/u);
  for (const anchor of [
    "#i-pronoun-ru-uk",
    "#be-i-am-ru-uk",
    "#localized-fine-preposition-u-ru-uk",
    "#localized-fine-pronoun-menya-mene",
    "#localized-fine-pronoun-vsyo-vse",
    "#localized-fine-adverb-khorosho-dobre",
  ]) assert.match(serialized, new RegExp(anchor, "u"));
});

test("S01 source projection uses exact claim anchors and has no Russian уже in Ukrainian fields", () => {
  const auxiliary = read("auxiliary.json");
  const all = [read("learner.json"), read("learner.uk.json"), auxiliary, readPreview()];
  const hasExactRef = (units, text, anchor) => {
    const unit = units.find((value) => value.text === text);
    assert.ok(unit, `missing unit ${text}`);
    assert.deepEqual(unit.sourceRefs, [`judgements/2026-10-13_l01_s01_source_evidence.md#${anchor}`]);
  };
  const fine = read("learner.json").interactions.find((entry) => entry.interactionId.endsWith(":i17:s03"));
  const phrase = fine.modePayload.explanationV1.phrase;
  hasExactRef(phrase.units, "I", "i-pronoun-ru-uk");
  hasExactRef(phrase.units, "am", "be-i-am-ru-uk");
  hasExactRef(phrase.units, "fine", "fine-adjective-ru-uk");
  hasExactRef(phrase.units, ".", "punctuation-full-stop");

  const local = read("learner.uk.json").interactions.find((entry) => entry.interactionId.endsWith(":i13"));
  const localAnalysis = local.modePayload.choiceFeedback.find((value) => value.analysisV1.text === "У мене все добре.").analysisV1;
  hasExactRef(localAnalysis.units, "У", "localized-fine-preposition-u-ru-uk");
  hasExactRef(localAnalysis.units, "мене", "localized-fine-pronoun-menya-mene");
  hasExactRef(localAnalysis.units, "все", "localized-fine-pronoun-vsyo-vse");
  hasExactRef(localAnalysis.units, "добре", "localized-fine-adverb-khorosho-dobre");

  const visit = (value, key = "") => {
    if (Array.isArray(value)) return value.forEach((item) => visit(item, key));
    if (!value || typeof value !== "object") return;
    for (const [childKey, child] of Object.entries(value)) {
      if (childKey === "uk" && typeof child === "string") assert.doesNotMatch(child, /(?:^|[^\p{L}])уже(?:$|[^\p{L}])/iu);
      visit(child, childKey);
    }
  };
  all.forEach((value) => visit(value));
});
