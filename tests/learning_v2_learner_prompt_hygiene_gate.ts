import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { sanitizeLearningV2LearnerPromptV1 } from "../modules/learning-v2/content/learner_prompt_hygiene_v1";

const root = process.cwd();

const cases: [string, string][] = [
  ["Соберите фразу — «я рад», среди плиток чужая скрепка", "Соберите фразу — «я рад»"],
  ["Соберите фразу — она молчит, среди плиток лишняя скрепка", "Соберите фразу — она молчит"],
  ["Соберите фразу — спросите про улицу, есть лишняя плитка", "Соберите фразу — спросите про улицу"],
  ["Соберите без подсказки — среди плиток есть лишняя", "Соберите фразу"],
  ["Соберите фразу без подсказки — «я готов»", "Соберите фразу — «я готов»"],
  ["Соберите без подсказки — «она устала»", "Соберите фразу — «она устала»"],
  ["Соберите фразу самостоятельно — «мы дома»", "Соберите фразу — «мы дома»"],
  ["Соберите вопрос самостоятельно — уточните, диван ли это", "Соберите вопрос — уточните, диван ли это"],
  ["Проверьте себя: соберите фразу — «он здесь»", "Соберите фразу — «он здесь»"],
  ["Складіть фразу без підказки — «вона готова»", "Складіть фразу — «вона готова»"],
  ["Финал — выберите свитер рядом без подсказки", "Финал — выберите свитер рядом"],
  ["Build the phrase without hints — “I am ready”", "Build the phrase — “I am ready”"],
  ["Build the phrase — “I am ready”, with an extra tile", "Build the phrase — “I am ready”"],
  ["Соберите фразу — «я готов»", "Соберите фразу — «я готов»"],
];

for (const [input, expected] of cases) {
  assert.equal(sanitizeLearningV2LearnerPromptV1(input), expected, input);
}

const forbiddenLearnerMeta =
  /(?:(?:среди|серед).{0,48}(?:чуж|лишн|зайв).{0,32}(?:скреп|скріп|плит)|(?:есть|є).{0,32}(?:лишн|зайв).{0,24}плит|(?:с|із|зі).{0,32}(?:лишн|зайв).{0,24}плит)/iu;
const forbiddenDifficultyMeta =
  /(?:без\s+(?:подсказк|підказк|опор)|самостоятельно|самостійно|проверьте\s+себя|перевірте\s+себе|without\s+(?:a\s+)?hints?|on\s+your\s+own|sin\s+(?:pistas?|ayuda)|sem\s+(?:dicas?|ajuda)|bez\s+podpowiedzi|samodzielnie)/iu;

function filesNamed(directory: string, basename: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesNamed(absolute, basename);
    return entry.isFile() && entry.name === basename ? [absolute] : [];
  });
}

let sanitizedLegacyPromptCount = 0;
for (const learnerFile of filesNamed(
  path.join(root, "content/learning-v2-course/release"),
  "learner.json",
)) {
  const learner = JSON.parse(fs.readFileSync(learnerFile, "utf8")) as {
    interactions?: { prompt?: string; modePayload?: { localizedScene?: Record<string, string> } }[];
  };
  for (const interaction of learner.interactions ?? []) {
    const values = [
      interaction.prompt ?? "",
      ...Object.values(interaction.modePayload?.localizedScene ?? {}),
    ];
    for (const value of values) {
      const sanitized = sanitizeLearningV2LearnerPromptV1(value);
      if (sanitized !== value) sanitizedLegacyPromptCount += 1;
      assert.doesNotMatch(sanitized, forbiddenLearnerMeta, `${learnerFile}: ${value}`);
      assert.doesNotMatch(sanitized, forbiddenDifficultyMeta, `${learnerFile}: ${value}`);
    }
  }
}
assert.ok(sanitizedLegacyPromptCount > 0, "fixture must cover at least one legacy leaked prompt");

const player = fs.readFileSync(path.join(root, "app/learning_v2_direct_session_player_v1.tsx"), "utf8");
assert.match(player, /sanitizeLearningV2LearnerPromptV1\(practice\.prompt\)/u);
assert.doesNotMatch(player, /prompt=\{practice\.prompt\}/u);

const legacyPlayer = fs.readFileSync(path.join(root, "app/learning-v2/session/[id].tsx"), "utf8");
assert.match(legacyPlayer, /const prompt = sanitizeLearningV2LearnerPromptV1\(/u);
assert.doesNotMatch(legacyPlayer, /<Text style=\{styles\.prompt\}>\{releasedPackageTask\?\.learner\.prompt\}/u);
assert.doesNotMatch(legacyPlayer, /repeatTarget[^]{0,180}\{releasedPackageTask\?\.learner\.prompt/u);

const builder = fs.readFileSync(path.join(root, "content/learning-v2-course/pipeline/build_release.mjs"), "utf8");
assert.match(builder, /sanitizeLearnerPrompt\(prompt\)/u);

const mockup = fs.readFileSync(path.join(root, "content/learning-v2-course/pipeline/build_mockup.mjs"), "utf8");
assert.match(mockup, /task-prompt[\s\S]{0,100}sanitizeLearnerPrompt\(it\.prompt\)/u);
const generatedMockup = fs.readFileSync(path.join(root, "content/learning-v2-course/mockup/app.js"), "utf8");
assert.match(generatedMockup, /task-prompt[\s\S]{0,100}sanitizeLearnerPrompt\(it\.prompt\)/u);

const start = fs.readFileSync(path.join(root, "docs/v2/СТАРТ В2.md"), "utf8");
const authorPrompt = fs.readFileSync(path.join(root, "content/learning-v2-course/pipeline/prompts/author.md"), "utf8");
for (const [name, text] of [["СТАРТ В2", start], ["author prompt", authorPrompt]] as const) {
  assert.match(
    text,
    /не (?:раскрывает|подсказывает)[\s\S]{0,160}(?:лишн|дистрактор|ловуш)/iu,
    `${name}: missing ban on revealing distractor tiles in learner-facing instructions`,
  );
  assert.match(
    text,
    /(?:без подсказки|самостоятельно|проверьте себя)[\s\S]{0,240}запрещ/iu,
    `${name}: missing ban on learner-facing difficulty/meta labels`,
  );
}

console.log("LEARNING V2 LEARNER PROMPT HYGIENE GATE: PASS");
