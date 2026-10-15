import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const dir = path.resolve(import.meta.dirname, "../sessions/en/l01/s01");
const atomicPath = path.join(dir, "practice.atomic.json");
const ledgerPath = path.resolve(import.meta.dirname, "../migration/single-phrase-2026-10-03/preservation-ledger.json");
const prefix = "en:lesson-01:session-01";
const snapshot = "656c688a59344bd0c9d11f89fe4f8bec05ccd83eadff4b7a6c9d342769369d14";

const copy = (value) => structuredClone(value);
const choices = (interactionId, texts) => texts.map((text, index) => ({ responseId: `${interactionId}:r${index + 1}`, text }));
const feedback = (interactionId, testedDimension, rows) => rows.map(([correct, byLocale], index) => ({
  responseId: `${interactionId}:r${index + 1}`,
  correct,
  ...(testedDimension ? { testedDimension } : {}),
  feedbackByLocale: byLocale,
}));

const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
if (atomic.sourceSnapshotSha256 !== snapshot) throw new Error("S01 snapshot differs; refuse to rewrite preservation evidence");
for (const locale of ["ru", "uk"]) {
  const i08 = atomic.interactionsByLocale[locale].find((item) => item.interactionId === `${prefix}:i08`);
  if (i08?.family !== "speed_match" || i08.modePayload?.pairGrid?.length !== 4) throw new Error(`S01 i08 preservation shape differs in ${locale}`);
}

const text = {
  ru: {
    i13: "Вставьте слово — Мира ждёт вас в комнате; войдите и скажите, что вы здесь",
    i15: "Соберите фразу — Мира говорит, что ваше рабочее место готово; вы рады",
    i17s01: "Вставьте слово — Антон говорит, что вы отлично справились с первым заданием; вы рады",
    i06Dimension: "Вы отвечаете, что у вас всё хорошо",
    i13Dimension: "Вы сообщаете Мире, что уже в комнате",
    i17s03Dimension: "Вы отвечаете, что у вас всё хорошо",
  },
  uk: {
    i13: "Вставте слово — Міра чекає на вас у кімнаті; зайдіть і скажіть, що ви тут",
    i15: "Складіть фразу — Міра каже, що ваше робоче місце готове; ви раді",
    i17s01: "Вставте слово — Антон каже, що ви чудово впоралися з першим завданням; ви раді",
    i06Dimension: "Ви відповідаєте, що у вас усе добре",
    i13Dimension: "Ви повідомляєте Мірі, що вже в кімнаті",
    i17s03Dimension: "Ви відповідаєте, що у вас усе добре",
  },
};

for (const locale of ["ru", "uk"]) {
  const byId = new Map(atomic.interactionsByLocale[locale].map((item) => [item.interactionId, item]));
  const answerById = new Map(atomic.answers.map((item) => [item.interactionId, item]));

  const i06 = byId.get(`${prefix}:i06`);
  i06.responseOptions = choices(i06.interactionId, ["fine", "here", "ready"]);
  i06.modePayload.gapOptions = copy(i06.responseOptions);
  i06.modePayload.choiceFeedback = feedback(i06.interactionId, text[locale].i06Dimension, [
    [true, {
      ru: "Верно: fine означает «хорошо, в порядке». На вопрос о том, как у вас дела, вы говорите I am fine.",
      uk: "Правильно: fine означає «добре, гаразд». На запитання про ваші справи ви кажете I am fine.",
    }],
    [false, {
      ru: "Here означает «здесь»: это о месте, а не о самочувствии. Здесь: I am fine.",
      uk: "Here означає «тут»: це про місце, а не про самопочуття. Тут: I am fine.",
    }],
    [false, {
      ru: "Ready означает «готов»: это о готовности, а не о самочувствии. Здесь: I am fine.",
      uk: "Ready означає «готовий»: це про готовність, а не про самопочуття. Тут: I am fine.",
    }],
  ]);

  const i11 = byId.get(`${prefix}:i11`);
  i11.modePayload.authoredDistractorTokens = ["happy"];
  i11.modePayload.slotFeedback[0].feedbackByLocale = {
    ru: "Happy означает «рад». Здесь нужно сказать, что вы готовы: I am ready.",
    uk: "Happy означає «радий». Тут треба сказати, що ви готові: I am ready.",
  };

  const i13 = byId.get(`${prefix}:i13`);
  i13.modePayload.gappedTargetPhrase = "I am ___.";
  i13.responseOptions = choices(i13.interactionId, ["here", "ready", "fine"]);
  i13.modePayload.gapOptions = copy(i13.responseOptions);
  i13.modePayload.testedDimension = text[locale].i13Dimension;
  i13.modePayload.choiceFeedback = feedback(i13.interactionId, text[locale].i13Dimension, [
    [true, {
      ru: "Верно: here означает «здесь», поэтому I am here сообщает Мире, что вы уже в комнате.",
      uk: "Правильно: here означає «тут», тому I am here повідомляє Мірі, що ви вже в кімнаті.",
    }],
    [false, {
      ru: "Ready означает «готов». Это подходит перед началом дела, но здесь вы сообщаете, где вы: I am here.",
      uk: "Ready означає «готовий». Це доречно перед початком справи, але тут ви повідомляєте, де ви: I am here.",
    }],
    [false, {
      ru: "Fine означает «всё хорошо». Это ответ на «как дела?», а здесь нужно назвать место: I am here.",
      uk: "Fine означає «усе добре». Це відповідь на «як справи?», а тут треба назвати місце: I am here.",
    }],
  ]);
  answerById.get(i13.interactionId).correctText = "here";

  const i15 = byId.get(`${prefix}:i15`);
  i15.prompt = text[locale].i15;
  i15.accessibilityLabel = text[locale].i15;
  i15.modePayload.localizedMeaning = { ru: text.ru.i15, uk: text.uk.i15 };
  i15.modePayload.authoredDistractorTokens = ["ready"];
  i15.modePayload.slotFeedback[0].testedDimension = text[locale].i15;
  i15.modePayload.slotFeedback[0].feedbackByLocale = {
    ru: "Ready означает «готов». Здесь нужна эмоция после хорошей новости о рабочем месте: happy — «рад». ",
    uk: "Ready означає «готовий». Тут потрібна емоція після доброї новини про робоче місце: happy — «радий».",
  };

  const i17s01 = byId.get(`${prefix}:i17:s01`);
  i17s01.prompt = text[locale].i17s01;
  i17s01.accessibilityLabel = text[locale].i17s01;
  i17s01.modePayload.localizedScene = { ru: text.ru.i17s01, uk: text.uk.i17s01 };
  i17s01.modePayload.testedDimension = locale === "ru" ? "Вы говорите, что рады успеху" : "Ви кажете, що раді успіху";
  i17s01.modePayload.choiceFeedback = feedback(i17s01.interactionId, i17s01.modePayload.testedDimension, [
    [true, { ru: "Верно: happy означает «рад». После такой похвалы вы говорите I am happy.", uk: "Правильно: happy означає «радий». Після такої похвали ви кажете I am happy." }],
    [false, { ru: "Fine означает «всё хорошо», но здесь вы рады своему успеху: I am happy.", uk: "Fine означає «усе добре», але тут ви раді своєму успіху: I am happy." }],
    [false, { ru: "Ready означает «готов». Здесь Антон хвалит уже сделанное задание, поэтому подходит happy: I am happy.", uk: "Ready означає «готовий». Тут Антон хвалить уже виконане завдання, тому підходить happy: I am happy." }],
  ]);

  const i17s03 = byId.get(`${prefix}:i17:s03`);
  i17s03.modePayload.gappedTargetPhrase = "I am ___.";
  i17s03.responseOptions = choices(i17s03.interactionId, ["fine", "ready", "here"]);
  i17s03.modePayload.gapOptions = copy(i17s03.responseOptions);
  i17s03.modePayload.testedDimension = text[locale].i17s03Dimension;
  i17s03.modePayload.choiceFeedback = feedback(i17s03.interactionId, text[locale].i17s03Dimension, [
    [true, { ru: "Верно: fine означает «всё хорошо». На вопрос «как вы?» вы отвечаете I am fine.", uk: "Правильно: fine означає «усе добре». На запитання «як ви?» ви відповідаєте I am fine." }],
    [false, { ru: "Ready означает «готов». Это о готовности, а вопрос здесь о самочувствии: I am fine.", uk: "Ready означає «готовий». Це про готовність, а запитання тут про самопочуття: I am fine." }],
    [false, { ru: "Here означает «здесь». Это о месте, а вопрос здесь о самочувствии: I am fine.", uk: "Here означає «тут». Це про місце, а запитання тут про самопочуття: I am fine." }],
  ]);
  answerById.get(i17s03.interactionId).correctText = "fine";
}

const markdown = {
  ru: [
    ["`I am fine` — «у меня всё хорошо». Меняется", "`I am fine` — «у меня всё хорошо». `I am happy` — «я рад»: happy говорит о радости, а fine — о том, что всё в порядке. Меняется"],
    ["**Мира спрашивает, как вы себя чувствуете. У вас всё хорошо — скажите это.**", "**Мира сообщает хорошую новость. Вы рады — скажите это.**"],
    ["✅ **I am fine.**", "✅ **I am happy.**"],
    ["❌ I fine. — *Не хватает `am`: правильно `I am fine`.*", "❌ I happy. — *Не хватает `am`: правильно `I am happy`.*"],
    ["❌ I is fine. — *С `I` используют `am`, а не `is`.*", "❌ I is happy. — *С `I` используют `am`, а не `is`.*"],
    ["I am ___. → **fine** · fan · fun", "I am ___. → **fine** · here · ready"],
    ["- fan — *Fan — это «вентилятор» или «болельщик», а не ответ о самочувствии. Здесь: I am fine — «у меня всё хорошо».*", "- here — *Here означает «здесь»: это о месте, а не о самочувствии. Здесь: I am fine.*"],
    ["- fun — *Fun — это «веселье, удовольствие», а не «у меня всё хорошо». На вопрос о самочувствии подходит fine: I am fine.*", "- ready — *Ready означает «готов»: это о готовности, а не о самочувствии. Здесь: I am fine.*"],
    ["Плитки: `I` `am` `ready` `is` → **I am ready.**", "Плитки: `I` `am` `ready` `happy` → **I am ready.**"],
    ["*(плитка `is` лишняя: С I нужна форма am, поэтому is здесь лишнее.)*", "*(плитка `happy` лишняя: Happy означает «рад». Здесь нужно сказать, что вы готовы: I am ready.)*"],
    ["___ am here. → **I** · am · here", "I am ___. → **here** · ready · fine"],
    ["- ✅ **I** — *Верно: I называет говорящего; получается полная фраза I am here.*\n- am — *Сначала нужно назвать того, о ком речь: `I am here`.*\n- here — *Here — это «здесь»; в этой фразе `here` стоит после `am`.*", "- ✅ **here** — *Верно: here означает «здесь», поэтому I am here сообщает Мире, что вы уже в комнате.*\n- ready — *Ready означает «готов». Это подходит перед началом дела, но здесь вы сообщаете, где вы: I am here.*\n- fine — *Fine означает «всё хорошо». Это ответ на «как дела?», а здесь нужно назвать место: I am here.*"],
    ["Соберите фразу — Антон впустил вас в кабинет, и вы этому рады", text.ru.i15],
    ["Плитки: `happy` `is` `I` `am` → **I am happy.**", "Плитки: `happy` `ready` `I` `am` → **I am happy.**"],
    ["*(плитка `is` лишняя: С I нужна форма am, поэтому is здесь лишнее.)*", "*(плитка `ready` лишняя: Ready означает «готов». Здесь нужна эмоция после хорошей новости о рабочем месте: happy — «рад».)*"],
    ["Вставьте слово — Антон впустил вас в кабинет, и вы этому рады", text.ru.i17s01],
    ["I ___ fine. → **am** · ready · here", "I am ___. → **fine** · ready · here"],
    ["- ✅ **am** — *Верно: после I нужна форма am; I am fine означает «у меня всё хорошо».*\n- ready — *Ready значит «готов». Здесь нужно сказать, что у вас всё хорошо, поэтому после I ставьте am: I am fine.*\n- here — *Here значит «здесь». Оно не соединяет I с fine; нужна форма am: I am fine.*", "- ✅ **fine** — *Верно: fine означает «всё хорошо». На вопрос «как вы?» вы отвечаете I am fine.*\n- ready — *Ready означает «готов». Это о готовности, а вопрос здесь о самочувствии: I am fine.*\n- here — *Here означает «здесь». Это о месте, а вопрос здесь о самочувствии: I am fine.*"],
  ],
  uk: [
    ["`I am fine` — «у мене все добре». Змінюється", "`I am fine` — «у мене все добре». `I am happy` — «я радий»: happy говорить про радість, а fine — про те, що все гаразд. Змінюється"],
    ["**Міра питає, як ви почуваєтеся. У вас усе гаразд — скажіть це.**", "**Міра повідомляє хорошу новину. Ви раді — скажіть це.**"],
    ["✅ **I am fine.**", "✅ **I am happy.**"],
    ["❌ I fine. — *Бракує `am`: правильно `I am fine`.*", "❌ I happy. — *Бракує `am`: правильно `I am happy`.*"],
    ["❌ I is fine. — *З `I` використовують `am`, а не `is`.*", "❌ I is happy. — *З `I` використовують `am`, а не `is`.*"],
    ["I am ___. → **fine** · fan · fun", "I am ___. → **fine** · here · ready"],
    ["- fan — *Fan — це «вентилятор» або «вболівальник», а не відповідь про самопочуття. Тут: I am fine — «у мене все добре».*", "- here — *Here означає «тут»: це про місце, а не про самопочуття. Тут: I am fine.*"],
    ["- fun — *Fun — це «веселощі, задоволення», а не «у мене все добре». На запитання про самопочуття підходить fine: I am fine.*", "- ready — *Ready означає «готовий»: це про готовність, а не про самопочуття. Тут: I am fine.*"],
    ["Плитки: `I` `am` `ready` `is` → **I am ready.**", "Плитки: `I` `am` `ready` `happy` → **I am ready.**"],
    ["*(плитка `is` зайва: З I потрібна форма am, тому is тут зайве.)*", "*(плитка `happy` зайва: Happy означає «радий». Тут треба сказати, що ви готові: I am ready.)*"],
    ["___ am here. → **I** · am · here", "I am ___. → **here** · ready · fine"],
    ["- ✅ **I** — *Правильно: I називає мовця; виходить повна фраза I am here.*\n- am — *Спершу треба назвати того, про кого йдеться: `I am here`.*\n- here — *Here — це «тут»; у цій фразі `here` стоїть після `am`.*", "- ✅ **here** — *Правильно: here означає «тут», тому I am here повідомляє Мірі, що ви вже в кімнаті.*\n- ready — *Ready означає «готовий». Це доречно перед початком справи, але тут ви повідомляєте, де ви: I am here.*\n- fine — *Fine означає «усе добре». Це відповідь на «як справи?», а тут треба назвати місце: I am here.*"],
    ["Складіть фразу — Антон впустив вас до кабінету, і ви цьому раді", text.uk.i15],
    ["Плитки: `happy` `is` `I` `am` → **I am happy.**", "Плитки: `happy` `ready` `I` `am` → **I am happy.**"],
    ["*(плитка `is` зайва: З I потрібна форма am, тому is тут зайве.)*", "*(плитка `ready` зайва: Ready означає «готовий». Тут потрібна емоція після доброї новини про робоче місце: happy — «радий».)*"],
    ["Вставте слово — Антон впустив вас до кабінету, і ви цьому раді", text.uk.i17s01],
    ["I ___ fine. → **am** · ready · here", "I am ___. → **fine** · ready · here"],
    ["- ✅ **am** — *Правильно: після I потрібна форма am; I am fine означає «у мене все добре».*\n- ready — *Ready означає «готовий». Тут треба сказати, що у вас усе добре, тому після I ставте am: I am fine.*\n- here — *Here означає «тут». Воно не з'єднує I з fine; потрібна форма am: I am fine.*", "- ✅ **fine** — *Правильно: fine означає «усе добре». На запитання «як ви?» ви відповідаєте I am fine.*\n- ready — *Ready означає «готовий». Це про готовність, а запитання тут про самопочуття: I am fine.*\n- here — *Here означає «тут». Це про місце, а запитання тут про самопочуття: I am fine.*"],
  ],
};
for (const locale of ["ru", "uk"]) {
  const file = path.join(dir, `final.${locale}.md`);
  let source = fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n");
  for (const [from, to] of markdown[locale]) {
    if (source.includes(from)) source = source.replace(from, to);
    else if (!source.includes(to)) throw new Error(`missing expected ${locale} Markdown fragment: ${from}`);
  }
  markdown[locale] = { file, source };
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const amendments = ledger.amendments ?? (ledger.amendments = []);
const required = [
  ["i02", 1, "here", "I am ___."],
  ["i04", 1, "ready", "I am ___."],
  ["i06", 1, "fine", "I am ___."],
  ["i13", 1, "___ am here.", "I am ___."],
  ["i14", 1, "I am happy.", "I am here."],
  ["i16", 1, "I am fine.", "I am happy."],
  ["i17", 1, "I am here.", "I am ___."],
  ["i17", 3, "I am fine.", "I am ___."],
];
for (const [suffix, segmentIndex, from, to] of required) {
  const oldInteractionId = `${prefix}:${suffix}`;
  const existing = amendments.find((item) => item.courseSessionId === prefix && item.oldInteractionId === oldInteractionId && item.segmentIndex === segmentIndex);
  const amendment = { courseSessionId: prefix, oldInteractionId, segmentIndex, from, to, reason: "Recorded the original-to-current S01 content substitution for preservation review (2026-10-12)." };
  if (existing) {
    Object.assign(existing, amendment);
    delete existing.action;
    delete existing.newInteractionId;
  } else amendments.push(amendment);
}

if (!apply) {
  console.log("[L01S01-BOUNDARY-V5] dry run: add --apply to write S01 source and keyed ledger amendments");
  process.exit(0);
}
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
for (const locale of ["ru", "uk"]) fs.writeFileSync(markdown[locale].file, markdown[locale].source);
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log("[L01S01-BOUNDARY-V5] applied source-only S01 boundary repair; i08 and source snapshot preserved");
