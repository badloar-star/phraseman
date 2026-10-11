import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const dir = path.resolve(import.meta.dirname, "../sessions/en/l01/s01");
const atomicPath = path.join(dir, "practice.atomic.json");
const prefix = "en:lesson-01:session-01";

function renumberId(value) {
  return String(value).replace(/:i(\d\d)(?=\D|$)/gu, (_, digits) => {
    const ordinal = Number(digits);
    return ordinal >= 8 ? `:i${String(ordinal + 1).padStart(2, "0")}` : `:i${digits}`;
  });
}

function rewriteStrings(value) {
  if (typeof value === "string") return renumberId(value);
  if (Array.isArray(value)) return value.map(rewriteStrings);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, rewriteStrings(entry)]));
  return value;
}

function updateMarkdown(locale) {
  const file = path.join(dir, `final.${locale}.md`);
  let source = fs.readFileSync(file, "utf8");
  const card = locale === "ru"
    ? "**7 · Карточка слова — happy**\n<!-- interaction_id: en:lesson-01:session-01:i07; family: listen_choose -->\n> **happy** — «рад, доволен». Так говорят, когда радует новость или результат; `fine` значит, что всё в порядке."
    : "**7 · Картка слова — happy**\n<!-- interaction_id: en:lesson-01:session-01:i07; family: listen_choose -->\n> **happy** — «радісний, задоволений». Так кажуть, коли тішить новина або результат; `fine` означає, що все гаразд.";
  const listening = locale === "ru"
    ? "**8 · Послушайте и выберите**\n<!-- interaction_id: en:lesson-01:session-01:i08; family: listen_choose -->\n🔊 *happy* → **happy** · hobby · heavy\n- hobby — *Это «хобби», а не «рад». В записи нужно выбрать `happy`.*\n- heavy — *Это «тяжёлый». В середине `heavy` есть /v/, а в `happy` его нет.*"
    : "**8 · Послухайте і виберіть**\n<!-- interaction_id: en:lesson-01:session-01:i08; family: listen_choose -->\n🔊 *happy* → **happy** · hobby · heavy\n- hobby — *Це «хобі», а не «радісний». У записі потрібно вибрати `happy`.*\n- heavy — *Це «важкий». У середині `heavy` є /v/, а в `happy` його немає.*";
  const old = /\*\*7 · (?:Послушайте и выберите|Послухайте і виберіть)\*\*[\s\S]*?(?=\r?\n\r?\n\*\*8 · )/u;
  if (!old.test(source)) throw new Error(`cannot find old happy listening task in ${file}`);
  source = source.replace(old, `${card}\n\n${listening}`);
  source = source.replace(/\*\*(\d+) ·/gu, (whole, digits) => {
    const ordinal = Number(digits);
    return `**${ordinal >= 8 ? ordinal + 1 : ordinal} ·`;
  });
  source = source.replace(/:i(\d\d)(?=\D|$)/gu, (_, digits) => {
    const ordinal = Number(digits);
    return ordinal >= 8 ? `:i${String(ordinal + 1).padStart(2, "0")}` : `:i${digits}`;
  });
  source = source.replace(/## (Практика|Практика) \(19 (заданий|завдань)\)/u, "## $1 (20 $2)");
  return { file, source };
}

function card(locale) {
  const label = locale === "ru" ? "Карточка слова — happy" : "Картка слова — happy";
  const definition = locale === "ru"
    ? "«рад, доволен». Так говорят, когда радует новость или результат; fine значит, что всё в порядке."
    : "«радісний, задоволений». Так кажуть, коли тішить новина або результат; fine означає, що все гаразд.";
  return {
    interactionId: `${prefix}:i07`, ordinal: 7, purpose: "supported_practice", family: "listen_choose", inputMode: "single_choice",
    prompt: label, responseOptions: [], mediaIds: [], audioTargetIds: [`${prefix}:i07:audio`], accessibilityLabel: label,
    modePayload: {
      family: "listen_choose", referenceAudio: { audioTargetId: `${prefix}:i07:audio`, transcript: "happy" }, slowReferenceAudio: null,
      localizedMeaningChoices: [{ responseId: `${prefix}:i07:r1`, targetText: "happy", meaningByLocale: { ru: "«рад, доволен». Так говорят, когда радует новость или результат; fine значит, что всё в порядке.", uk: "«радісний, задоволений». Так кажуть, коли тішить новина або результат; fine означає, що все гаразд." } }],
      transcriptRevealPolicy: "after_first_attempt", choiceFeedback: [], isWordCard: true,
      wordCard: { word: "happy", definitionByLocale: { ru: "«рад, доволен». Так говорят, когда радует новость или результат; fine значит, что всё в порядке.", uk: "«радісний, задоволений». Так кажуть, коли тішить новина або результат; fine означає, що все гаразд." } },
    },
    scriptedAlternate: null,
  };
}

const markdown = ["ru", "uk"].map(updateMarkdown);
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
if (atomic.interactionsByLocale.ru?.length !== 19 || atomic.interactionsByLocale.uk?.length !== 19) throw new Error("expected 19 interactions before repair");
for (const locale of ["ru", "uk"]) {
  const source = atomic.interactionsByLocale[locale];
  const oldListening = source.find((entry) => entry.interactionId === `${prefix}:i07`);
  if (!oldListening?.modePayload?.isWordCard || oldListening.responseOptions?.length !== 3) throw new Error(`expected hybrid happy task in ${locale}`);
  const movedListening = rewriteStrings(structuredClone(oldListening));
  movedListening.ordinal = 8;
  movedListening.modePayload.isWordCard = false;
  movedListening.modePayload.wordCard = null;
  movedListening.purpose = "guided_practice";
  const rebuilt = source.flatMap((entry) => {
    if (entry.interactionId === `${prefix}:i07`) return [card(locale), movedListening];
    const shifted = entry.ordinal >= 8 ? rewriteStrings(structuredClone(entry)) : structuredClone(entry);
    if (shifted.ordinal >= 8) shifted.ordinal += 1;
    return [shifted];
  });
  atomic.interactionsByLocale[locale] = rebuilt;
  const listening = atomic.interactionsByLocale[locale][7];
  Object.assign(listening, rewriteStrings(listening));
  const renameListening = (value) => typeof value === "string" ? value.replaceAll(`${prefix}:i07`, `${prefix}:i08`) : value;
  const renameTree = (value) => Array.isArray(value) ? value.map(renameTree) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, renameTree(entry)])) : renameListening(value);
  Object.assign(listening, renameTree(listening));
}
const oldAnswers = atomic.answers;
atomic.answers = oldAnswers.flatMap((answer) => {
  if (answer.interactionId === `${prefix}:i07`) {
    return [{ interactionId: `${prefix}:i07`, correctText: "happy", correctResponseId: null }, renameListening(rewriteStrings(structuredClone(answer)))];
  }
  return [Number(/:i(\d\d)$/u.exec(answer.interactionId)?.[1] ?? 0) >= 8 ? rewriteStrings(structuredClone(answer)) : structuredClone(answer)];
});
if (atomic.answers.length !== 20) throw new Error("expected 20 answers after repair");

if (!apply) {
  console.log("[L01S01-HAPPY] dry run: add --apply to update Markdown and atomic source");
  process.exit(0);
}
for (const { file, source } of markdown) fs.writeFileSync(file, source);
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
console.log("[L01S01-HAPPY] inserted an independent happy card and listening check; tasks=20");
