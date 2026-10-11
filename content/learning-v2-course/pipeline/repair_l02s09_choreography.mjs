import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "sessions", "en", "l02", "s09", "practice.atomic.json");
const atomic = JSON.parse(fs.readFileSync(file, "utf8"));
for (const [locale, interactions] of Object.entries(atomic.interactionsByLocale)) {
  const task = interactions.find((item) => item.interactionId.endsWith(":i10"));
  if (!task) throw new Error(`missing i10 for ${locale}`);
  const scene = locale === "ru"
    ? "Соберите фразу — Мира за столиком читает меню и без конца поглядывает на соседний столик"
    : "Складіть фразу — Міра за столиком читає меню і безперестанку позирає на сусідній столик";
  task.family = "phrase_builder";
  task.inputMode = "ordered_tokens";
  task.prompt = scene;
  task.accessibilityLabel = scene;
  task.responseOptions = [];
  task.modePayload = {
    family: "phrase_builder",
    targetPhrase: "Is she curious?",
    localizedMeaning: { ru: "Соберите фразу — спросите, любопытна ли Мира", uk: "Складіть фразу — запитайте, чи Міра допитлива" },
    orderedTokens: ["Is", "she", "curious"],
    authoredDistractorTokens: ["he"],
    slotFeedback: [],
  };
}
const answer = atomic.answers.find((item) => item.interactionId.endsWith(":i10"));
if (!answer) throw new Error("missing i10 answer");
answer.correctText = "Is she curious?";
delete answer.correctResponseId;
fs.writeFileSync(file, JSON.stringify(atomic, null, 2) + "\n", "utf8");
