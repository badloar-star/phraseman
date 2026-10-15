#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-09";
const atomicPath = path.join(root, "sessions/en/l01/s09/practice.atomic.json");
const ledgerPath = path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));

const prompts = {
  ru: [
    ["i18:s01", "Скажите вслух — Мира сверила время собрания по календарю, и вы подтверждаете её расчёт", "You are right."],
    ["i18:s02", "Скажите вслух — вы знакомитесь с Мирой в первый рабочий день", "I am new."],
    ["i18:s03", "Скажите вслух — после перерыва вы отвечаете Мире, что уже не устали", "I am not tired."],
    ["i18:s04", "Скажите вслух — Мира помогла вам найти нужный кабинет, и вы говорите ей, что она добрая", "You are kind."],
  ],
  uk: [
    ["i18:s01", "Скажіть уголос — Міра звірила час зустрічі за календарем, і ви підтверджуєте її розрахунок", "You are right."],
    ["i18:s02", "Скажіть уголос — ви знайомитеся з Мірою в перший робочий день", "I am new."],
    ["i18:s03", "Скажіть уголос — після перерви ви відповідаєте Мірі, що вже не втомилися", "I am not tired."],
    ["i18:s04", "Скажіть уголос — Міра допомогла вам знайти потрібний кабінет, і ви кажете їй, що вона добра", "You are kind."],
  ],
};

const feedback = {
  "i02:r1": { ru: "Верно: `welcome` — ответ на «спасибо». Услышали «уэл-кам» — выбирайте это слово.", uk: "Правильно: `welcome` — відповідь на «дякую». Почули «уел-кам» — обирайте це слово." },
  "i04:r1": { ru: "Верно: `kind` — «добрый». В слове слышно длинное «ай»: «кайнд».", uk: "Правильно: `kind` — «добрий». У слові чути довге «ай»: «кайнд»." },
  "i06:r1": { ru: "Верно: после `you` ставят `are`: `You are tired`.", uk: "Правильно: після `you` ставлять `are`: `You are tired`." },
  "i08:r1": { ru: "Верно: `right` звучит как «райт» и значит «прав».", uk: "Правильно: `right` звучить як «райт» і означає «має рацію»." },
  "i11:r1": { ru: "Верно: смешная шутка — `funny`, поэтому `You are funny`.", uk: "Правильно: смішний жарт — `funny`, тому `You are funny`." },
  "i17:r1": { ru: "Верно: если вы случайно пролили кофе, говорите `I am sorry` — «извините».", uk: "Правильно: якщо ви випадково розлили каву, кажете `I am sorry` — «вибачте»." },
};
const tileFeedback = {
  i13: [
    { ru: "`am` ставят только после `I`, а здесь подлежащее `You`.", uk: "`am` ставлять лише після `I`, а тут підмет `You`." },
    { ru: "Вы подтверждаете, что Мира права, поэтому отрицание не нужно.", uk: "Ви підтверджуєте, що Міра має рацію, тому заперечення не потрібне." },
  ],
  i16: [{ ru: "После `I` используют `am`, поэтому `are` в этой фразе не подходит.", uk: "Після `I` використовують `am`, тому `are` у цій фразі не підходить." }],
};

function spoken(template, id, prompt, target) {
  const interactionId = `${session}:${id}`;
  const item = structuredClone(template);
  item.interactionId = interactionId;
  item.prompt = prompt;
  item.accessibilityLabel = prompt;
  item.audioTargetIds = [`${interactionId}:audio`];
  item.modePayload.referenceAudio.audioTargetId = `${interactionId}:audio`;
  item.modePayload.referenceAudio.transcript = target;
  item.modePayload.targetPhrase = target;
  return item;
}

for (const locale of ["ru", "uk"]) {
  const interactions = atomic.interactionsByLocale[locale];
  const collapsed = interactions.length === 18 && interactions.some((item) => item.interactionId === `${session}:i18`);
  const restored = interactions.length === 21 && prompts[locale].every(([id]) => interactions.some((item) => item.interactionId === `${session}:${id}`));
  if (!collapsed && !restored) {
    throw new Error(`unexpected L01/S09 atomic state for ${locale}; recovery refuses to overwrite it`);
  }
  const original = new Map(interactions.map((item) => [item.interactionId, item]));
  if (collapsed) {
    const finalTemplate = original.get(`${session}:i18`);
    atomic.interactionsByLocale[locale] = [
      ...interactions.filter((item) => item.interactionId !== `${session}:i18`),
      ...prompts[locale].map(([id, prompt, target]) => spoken(finalTemplate, id, prompt, target)),
    ].map((item, index) => ({ ...item, ordinal: index + 4 }));
  }

  for (const [suffix, localizedFeedback] of Object.entries(feedback)) {
    const [task, response] = suffix.split(":");
    const item = original.get(`${session}:${task}`);
    const option = item?.modePayload?.choiceFeedback ?? [];
    if (!item) throw new Error(`missing ${locale}:${task}`);
    const responseId = `${session}:${task}:${response}`;
    item.modePayload.choiceFeedback = [
      ...option.filter((entry) => entry.responseId !== responseId),
      { responseId, correct: true, testedDimension: item.prompt, feedbackByLocale: localizedFeedback },
    ];
  }
  for (const [task, rows] of Object.entries(tileFeedback)) {
    const item = original.get(`${session}:${task}`);
    if (!item) throw new Error(`missing ${locale}:${task}`);
    item.modePayload.slotFeedback = rows.map((feedbackByLocale, index) => ({
      responseId: `${session}:${task}:tile:d${index + 1}`,
      correct: false,
      testedDimension: item.prompt,
      feedbackByLocale,
    }));
    if (task === "i16") item.modePayload.authoredDistractorTokens = ["are"];
  }
}

atomic.answers = atomic.answers.filter((entry) => entry.interactionId !== `${session}:i18`);
atomic.answers.push(...prompts.ru.map(([id, , correctText]) => ({ interactionId: `${session}:${id}`, correctText, correctResponseId: null })));
ledger.amendments = (ledger.amendments ?? []).filter((entry) => !(entry.courseSessionId === session && (entry.action === "retire" || entry.action === "replacement")));

fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
