import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-08";
const atomicPath = path.join(ROOT, "sessions/en/l01/s08/practice.atomic.json");
const ledgerPath = path.join(ROOT, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));

const localized = {
  i07: {
    ru: "Вставьте слово — вы поели, поэтому отказываетесь от перекуса",
    uk: "Вставте слово — ви поїли, тому відмовляєтеся від перекусу",
    options: ["hungry", "sure", "done"],
    correct: "hungry",
    feedback: {
      hungry: { ru: "Верно: после еды вы говорите `I am not hungry` — «я не голоден».", uk: "Правильно: після їжі ви кажете `I am not hungry` — «я не голодний»." },
      sure: { ru: "`I am not sure` значит «я не уверен», это не ответ про еду.", uk: "`I am not sure` означає «я не впевнений», це не відповідь про їжу." },
      done: { ru: "`I am not done` значит «я не закончил», а здесь речь о голоде.", uk: "`I am not done` означає «я не закінчив», а тут ідеться про голод." },
    },
  },
  i12: {
    ru: "Вставьте слово — вы давно здесь, поэтому говорите, что уже не новичок",
    uk: "Вставте слово — ви давно тут, тому кажете, що вже не новачок",
    options: ["new", "done", "hungry"],
    correct: "new",
    feedback: {
      new: { ru: "Верно: `I am not new` означает «я уже не новичок».", uk: "Правильно: `I am not new` означає «я вже не новачок»." },
      done: { ru: "`I am not done` — «я ещё не закончил», это другой смысл.", uk: "`I am not done` — «я ще не закінчив», це інший зміст." },
      hungry: { ru: "`I am not hungry` — «я не голоден», это не ответ о том, давно ли вы здесь.", uk: "`I am not hungry` — «я не голодний», це не відповідь про те, давно ви тут чи ні." },
    },
  },
};

function gap(id, ordinal, locale) {
  const spec = localized[id];
  const interactionId = `${session}:${id}`;
  const responseOptions = spec.options.map((text, index) => ({ responseId: `${interactionId}:r${index + 1}`, text }));
  const prompt = spec[locale];
  const testedDimension = prompt.slice(0, 48);
  return {
    interactionId, ordinal, purpose: "guided_practice", family: "context_gap_grammar", inputMode: "single_choice",
    prompt, responseOptions, mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: {
      family: "context_gap_grammar", localizedScene: { ru: spec.ru, uk: spec.uk },
      gappedTargetPhrase: "I am not ___ .", gapOptions: responseOptions,
      testedDimension,
      choiceFeedback: spec.options.map((text, index) => ({
        responseId: `${interactionId}:r${index + 1}`, correct: text === spec.correct, testedDimension,
        feedbackByLocale: spec.feedback[text],
      })),
    },
    scriptedAlternate: null,
  };
}

function spoken(template, id, ordinal, prompt, target) {
  const interactionId = `${session}:${id}`;
  const copy = structuredClone(template);
  copy.interactionId = interactionId;
  copy.ordinal = ordinal;
  copy.prompt = prompt;
  copy.accessibilityLabel = prompt;
  copy.audioTargetIds = [`${interactionId}:audio`];
  copy.modePayload.referenceAudio.audioTargetId = `${interactionId}:audio`;
  copy.modePayload.referenceAudio.transcript = target;
  copy.modePayload.targetPhrase = target;
  return copy;
}

const spokenSpecs = {
  ru: [
    ["i15:s01", "Скажите вслух — после длинного дня вы отвечаете Олегу, что устали", "I am tired."],
    ["i15:s02", "Скажите вслух — после еды вы отвечаете Олегу, что не голодны", "I am not hungry."],
    ["i17:s01", "Скажите вслух — Нина спрашивает, готовы ли вы идти; ответьте полной фразой", "I am ready."],
    ["i17:s02", "Скажите вслух — вы нашли дорогу и сообщаете, что не заблудились", "I am not lost."],
    ["i17:s03", "Скажите вслух — после еды вы отвечаете, что не голодны", "I am not hungry."],
    ["i17:s04", "Скажите вслух — вы закончили дела и сообщаете об этом", "I am done."],
  ],
  uk: [
    ["i15:s01", "Скажіть уголос — після довгого дня ви відповідаєте Олегові, що втомилися", "I am tired."],
    ["i15:s02", "Скажіть уголос — після їжі ви відповідаєте Олегові, що не голодні", "I am not hungry."],
    ["i17:s01", "Скажіть уголос — Ніна питає, чи готові ви йти; відповідайте повною фразою", "I am ready."],
    ["i17:s02", "Скажіть уголос — ви знайшли дорогу й кажете, що не заблукали", "I am not lost."],
    ["i17:s03", "Скажіть уголос — після їжі ви відповідаєте, що не голодні", "I am not hungry."],
    ["i17:s04", "Скажіть уголос — ви закінчили справи й повідомляєте про це", "I am done."],
  ],
};

for (const locale of ["ru", "uk"]) {
  const prior = atomic.interactionsByLocale[locale];
  if (prior.length !== 17 || !prior.some((item) => item.interactionId === `${session}:i15`)) {
    throw new Error(`unexpected L01/S08 atomic state for ${locale}; recovery refuses to overwrite it`);
  }
  const byId = new Map(prior.map((item) => [item.interactionId, item]));
  const take = (id) => structuredClone(byId.get(`${session}:${id}`));
  const [s15a, s15b, s17a, s17b, s17c, s17d] = spokenSpecs[locale];
  atomic.interactionsByLocale[locale] = [
    ...["i01", "i02", "i03", "i04", "i05", "i06"].map(take),
    gap("i07", 10, locale),
    ...["i08", "i09", "i10", "i11"].map(take),
    gap("i12", 15, locale),
    ...["i13", "i14"].map(take),
    spoken(byId.get(`${session}:i15`), s15a[0], 18, s15a[1], s15a[2]),
    spoken(byId.get(`${session}:i15`), s15b[0], 19, s15b[1], s15b[2]),
    take("i16"),
    spoken(byId.get(`${session}:i17`), s17a[0], 21, s17a[1], s17a[2]),
    spoken(byId.get(`${session}:i17`), s17b[0], 22, s17b[1], s17b[2]),
    spoken(byId.get(`${session}:i17`), s17c[0], 23, s17c[1], s17c[2]),
    spoken(byId.get(`${session}:i17`), s17d[0], 24, s17d[1], s17d[2]),
  ].map((item, index) => ({ ...item, ordinal: index + 4 }));
}

const splitAnswers = [
  ["i15:s01", "I am tired."], ["i15:s02", "I am not hungry."],
  ["i17:s01", "I am ready."], ["i17:s02", "I am not lost."],
  ["i17:s03", "I am not hungry."], ["i17:s04", "I am done."],
];
atomic.answers = atomic.answers.filter((entry) => !["i07", "i12", "i15", "i17"].includes(entry.interactionId.slice(session.length + 1)) && !entry.interactionId.startsWith(`${session}:i15:`) && !entry.interactionId.startsWith(`${session}:i17:`));
atomic.answers.push(
  { interactionId: `${session}:i07`, correctText: "hungry", correctResponseId: `${session}:i07:r1` },
  { interactionId: `${session}:i12`, correctText: "new", correctResponseId: `${session}:i12:r1` },
  ...splitAnswers.map(([id, correctText]) => ({ interactionId: `${session}:${id}`, correctText, correctResponseId: null })),
);

for (const id of ["i07", "i12"]) {
  const row = ledger.rows.find((entry) => entry.courseSessionId === session && entry.oldInteractionId === `${session}:${id}` && entry.segmentIndex === 1);
  if (!row) throw new Error(`missing preservation row ${id}`);
  Object.assign(row, { newInteractionId: `${session}:${id}`, newTargetSegment: "I am not ___ .", correctText: localized[id].correct, audioTranscript: null });
}
ledger.amendments = (ledger.amendments ?? []).filter((entry) => entry.courseSessionId !== session);

fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
