import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const courseSessionId = "en:lesson-01:session-51";
const atomicPath = path.join(root, "sessions/en/l01/s51/practice.atomic.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));

for (const locale of ["ru", "uk"]) {
  const items = atomic.interactionsByLocale[locale];
  const replace = (suffix, value) => {
    const id = `${courseSessionId}:${suffix}`;
    const index = items.findIndex((item) => item.interactionId === id);
    if (index < 0) throw new Error(`missing interaction: ${id}`);
    items[index] = { ...items[index], ...value, interactionId: id, ordinal: items[index].ordinal };
  };
  const herePrompt = locale === "ru"
    ? "Соберите фразу — сосед стоит рядом с вами"
    : "Складіть фразу — сусід стоїть поруч із вами";
  replace("i10", {
    purpose: "guided_practice", family: "phrase_builder", inputMode: "ordered_tokens", prompt: herePrompt,
    responseOptions: [], mediaIds: [], audioTargetIds: [], accessibilityLabel: herePrompt,
    modePayload: { family: "phrase_builder", targetPhrase: "He is here.", orderedTokens: ["He", "is", "here."], authoredDistractorTokens: ["there.", "are"], slotFeedback: [] },
    scriptedAlternate: null
  });
  const coldPrompt = locale === "ru"
    ? "Вставьте слово — на улице холодно, и вы это чувствуете"
    : "Вставте слово — надворі холодно, і ви це відчуваєте";
  const testedDimension = locale === "ru" ? "Выберите точное слово по ясной ситуации" : "Оберіть точне слово за зрозумілою ситуацією";
  replace("i15", {
    purpose: "independent_check", family: "context_gap_grammar", inputMode: "single_choice", prompt: coldPrompt,
    responseOptions: [{ responseId: `${courseSessionId}:i15:r1`, text: "cold" }, { responseId: `${courseSessionId}:i15:r2`, text: "tired" }, { responseId: `${courseSessionId}:i15:r3`, text: "outside" }],
    mediaIds: [], audioTargetIds: [], accessibilityLabel: coldPrompt,
    modePayload: {
      family: "context_gap_grammar", localizedScene: { ru: "На улице холодно, и вы это чувствуете.", uk: "Надворі холодно, і ви це відчуваєте." },
      gappedTargetPhrase: "I am ___.", gapOptions: [{ responseId: `${courseSessionId}:i15:r1`, text: "cold" }, { responseId: `${courseSessionId}:i15:r2`, text: "tired" }, { responseId: `${courseSessionId}:i15:r3`, text: "outside" }],
      testedDimension,
      choiceFeedback: [
        { responseId: `${courseSessionId}:i15:r2`, correct: false, testedDimension, feedbackByLocale: { ru: "`Tired` — «устал». Здесь речь о холоде.", uk: "`Tired` — «втомився». Тут ідеться про холод." } },
        { responseId: `${courseSessionId}:i15:r3`, correct: false, testedDimension, feedbackByLocale: { ru: "`Outside` — «на улице». Это место, а нужно ощущение.", uk: "`Outside` — «надворі». Це місце, а потрібне відчуття." } }
      ]
    }, scriptedAlternate: null
  });
  const task = items.find((item) => item.interactionId === `${courseSessionId}:i12`);
  const prompt = locale === "ru" ? "Выберите форму — мама уточняет, дома ли вы" : "Оберіть форму — мама уточнює, чи ви вдома";
  task.prompt = prompt;
  task.accessibilityLabel = prompt;
  task.modePayload.localizedScene = { ru: "Выберите форму — мама уточняет, дома ли вы", uk: "Оберіть форму — мама уточнює, чи ви вдома" };
  task.modePayload.testedDimension = locale === "ru" ? "Выберите форму для I" : "Оберіть форму для I";
  for (const feedback of task.modePayload.choiceFeedback) {
    feedback.testedDimension = task.modePayload.testedDimension;
    if (feedback.responseId.endsWith(":r2")) feedback.feedbackByLocale = { ru: "С `I` говорят `am`, не `is`.", uk: "З `I` кажуть `am`, а не `is`." };
    if (feedback.responseId.endsWith(":r3")) feedback.feedbackByLocale = { ru: "С `I` говорят `am`, не `are`.", uk: "З `I` кажуть `am`, а не `are`." };
  }
}

atomic.answers = atomic.answers.map((answer) => {
  if (answer.interactionId === `${courseSessionId}:i10`) {
    return { interactionId: answer.interactionId, correctText: "He is here.", correctResponseId: null };
  }
  if (answer.interactionId === `${courseSessionId}:i15`) {
    return { interactionId: answer.interactionId, correctText: "cold", correctResponseId: `${courseSessionId}:i15:r1` };
  }
  return answer;
});
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);

const changes = {
  "final.ru.md": [
    ["*Скрепка `am` выпала. Без неё между `I` и `here` пустота, и фраза рассыпается.*", "*В английском между `I` и `here` нужно `am`: `I am here`.*"],
    ["**10 · Вставьте слово — мама зовёт соседа к телефону, а он рядом с вами**\n<!-- interaction_id: en:lesson-01:session-51:i10; family: context_gap_grammar -->\nЦель: `He is ___ .`\nВарианты: `here` · `there` · `upstairs`", "**10 · Соберите фразу — сосед стоит рядом с вами**\n<!-- interaction_id: en:lesson-01:session-51:i10; family: phrase_builder -->\nЦель: `He is here.`"],
    ["**12 · Вставьте скрепку — мама уточняет, дома ли вы**", "**12 · Выберите форму — мама уточняет, дома ли вы**"],
    ["**15 · Соберите фразу — на улице холодно, и вы это чувствуете**\n<!-- interaction_id: en:lesson-01:session-51:i15; family: phrase_builder -->\nЦель: `I am cold.`", "**15 · Вставьте слово — на улице холодно, и вы это чувствуете**\n<!-- interaction_id: en:lesson-01:session-51:i15; family: context_gap_grammar -->\nЦель: `I am ___.`\nВарианты: `cold` · `tired` · `outside`"],
    ["задание 12 (пропуск скрепки)", "задание 12 (выбор формы am/is/are)"]
  ],
  "final.uk.md": [
    ["*Скріпка `am` випала. Без неї між `I` і `here` порожнеча, і фраза розсипається.*", "*В англійській між `I` і `here` потрібне `am`: `I am here`.*"],
    ["**10 · Вставте слово — мама кличе сусіда до телефона, а він поруч із вами**\n<!-- interaction_id: en:lesson-01:session-51:i10; family: context_gap_grammar -->\nЦіль: `He is ___ .`\nВаріанти: `here` · `there` · `upstairs`", "**10 · Складіть фразу — сусід стоїть поруч із вами**\n<!-- interaction_id: en:lesson-01:session-51:i10; family: phrase_builder -->\nЦіль: `He is here.`"],
    ["**12 · Вставте скріпку — мама уточнює, чи ви вдома**", "**12 · Оберіть форму — мама уточнює, чи ви вдома**"],
    ["**15 · Складіть фразу — надворі холодно, і ви це відчуваєте**\n<!-- interaction_id: en:lesson-01:session-51:i15; family: phrase_builder -->\nЦіль: `I am cold.`", "**15 · Вставте слово — надворі холодно, і ви це відчуваєте**\n<!-- interaction_id: en:lesson-01:session-51:i15; family: context_gap_grammar -->\nЦіль: `I am ___.`\nВаріанти: `cold` · `tired` · `outside`"],
    ["завдання 12 (пропуск скріпки)", "завдання 12 (вибір форми am/is/are)"]
  ]
};

for (const [file, fileChanges] of Object.entries(changes)) {
  const filePath = path.join(root, "sessions/en/l01/s51", file);
  let text = fs.readFileSync(filePath, "utf8");
  for (const [before, after] of fileChanges) {
    if (text.includes(before)) text = text.replace(before, after);
    else if (!text.includes(after)) throw new Error(`expected source text missing: ${file}`);
  }
  text = text
    .replace(/(^|,\s*)10=context_gap_grammar(?=,|$)/m, "$1" + "10=phrase_builder")
    .replace(/(^|,\s*)15=phrase_builder(?=,|$)/m, "$1" + "15=context_gap_grammar");
  fs.writeFileSync(filePath, text);
}

const ledgerPath = path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const row = ledger.rows.find((entry) => entry.courseSessionId === courseSessionId && entry.oldInteractionId === `${courseSessionId}:i10` && entry.segmentIndex === 1);
if (!row) throw new Error("missing preservation row: i10");
Object.assign(row, { newTargetSegment: "He is here.", correctText: "He is here.", audioTranscript: null });
const coldRow = ledger.rows.find((entry) => entry.courseSessionId === courseSessionId && entry.oldInteractionId === `${courseSessionId}:i15` && entry.segmentIndex === 1);
if (!coldRow) throw new Error("missing preservation row: i15");
Object.assign(coldRow, { newTargetSegment: "I am ___.", correctText: "cold", audioTranscript: null });
ledger.amendments ??= [];
const amendments = [{
  courseSessionId,
  oldInteractionId: `${courseSessionId}:i10`,
  segmentIndex: 1,
  from: "He is ___ .",
  to: "He is here.",
  reason: "Replaced an adjacent gap choice with full-phrase construction in the same clear neighbour-at-the-door situation (2026-10-10)."
}, {
  courseSessionId,
  oldInteractionId: `${courseSessionId}:i15`,
  segmentIndex: 1,
  from: "I am cold.",
  to: "I am ___.",
  reason: "Replaced an adjacent phrase assembly with one-word retrieval in the same cold-outside situation; `cold` remains the sole accepted answer (2026-10-10)."
}];
for (const amendment of amendments) {
  const amendmentIndex = ledger.amendments.findIndex((entry) => entry.courseSessionId === amendment.courseSessionId && entry.oldInteractionId === amendment.oldInteractionId && entry.segmentIndex === amendment.segmentIndex);
  if (amendmentIndex >= 0) ledger.amendments[amendmentIndex] = amendment;
  else ledger.amendments.push(amendment);
}
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
