#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildInteraction, parseIntro, parsePractice } from "./build_release.mjs";
import { validatePracticeExplanationsV1 } from "./practice_explanations_v1.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";

const apply = process.argv.includes("--apply");
const dir = path.resolve(import.meta.dirname, "../sessions/en/l01/s02");
const atomicPath = path.join(dir, "practice.atomic.json");
const sidecarPath = path.join(dir, "practice.explanations.v1.json");
const locales = ["ru", "uk"];
const sessionId = "en:lesson-01:session-02";
const L = (ru, uk) => ({ ru, uk });
const ref = (anchor) => `judgements/2026-10-13_l01_s02_source_evidence.md#${anchor}`;
const s01Ref = (anchor) => `judgements/2026-10-13_l01_s01_source_evidence.md#${anchor}`;
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const source = Object.fromEntries(locales.map((locale) => [locale, fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8")]));
const tasks = Object.fromEntries(locales.map((locale) => [locale, parsePractice(source[locale])]));
const intros = Object.fromEntries(locales.map((locale) => [locale, parseIntro(source[locale])]));
const previous = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
if (tasks.ru.length !== 21 || tasks.uk.length !== 21 || intros.ru.length !== 3 || intros.uk.length !== 3) throw new Error("s02_inventory_changed");

const purposes = [
  ...Array(6).fill("supported_practice"),
  ...Array(5).fill("guided_practice"),
  ...Array(4).fill("retrieval_practice"),
  ...Array(6).fill("independent_check"),
];
const interactionsByLocale = Object.fromEntries(locales.map((locale) => [locale, tasks[locale].map((task, index) => {
  const interaction = buildInteraction(
    task,
    Object.fromEntries(locales.map((other) => [other, tasks[other].find((candidate) => candidate.ordinal === task.ordinal)])),
    sessionId,
    index,
    21,
  );
  interaction.ordinal = index + 1;
  interaction.purpose = purposes[index];
  if (interaction.family === "speed_match") delete interaction.modePayload.localizedScene;
  if (["phrase_builder", "listen_build_dictation"].includes(interaction.family)) delete interaction.modePayload.completionFeedbackByLocale;
  return interaction;
})]));
const atomic = {
  ...previous,
  interactionsByLocale,
  answers: tasks.ru.map((task) => {
    const id = task.interactionId || `${sessionId}:i${String(task.ordinal).padStart(2, "0")}`;
    const generated = interactionsByLocale.ru.find((interaction) => interaction.interactionId === id);
    if (generated?.family === "speed_match") {
      return { interactionId: id, correctText: generated.modePayload.pairGrid.map((pair) => `${pair.pairId}=${pair.target}`).join("\n"), correctResponseId: null };
    }
    const index = task.options.findIndex((option) => option.correct);
    return { interactionId: id, correctText: task.target ?? task.speak ?? task.options[index]?.text ?? task.card?.word ?? "", correctResponseId: index < 0 ? null : `${id}:r${index + 1}` };
  }),
};

const lex = Object.freeze({
  I: ["I", "personal_pronoun", L("личное местоимение", "особовий займенник"), L("я", "я"), L("Называет говорящего и служит подлежащим.", "Називає мовця й слугує підметом."), [ref("pronoun-i")]],
  am: ["be", "linking_verb", L("глагол-связка", "дієслово-зв'язка"), L("форма be с I", "форма be з I"), L("Связывает I с описанием состояния или места в этой фразе.", "Поєднує I з описом стану або місця в цій фразі."), [ref("be-present-i-am")]],
  is: ["be", "linking_verb", L("глагол-связка", "дієслово-зв'язка"), L("форма be с he/she/it", "форма be з he/she/it"), L("С I нужна форма am, а не is.", "З I потрібна форма am, а не is."), [ref("is-third-person")]],
  tired: ["tired", "adjective", L("прилагательное", "прикметник"), L("устал / устала", "втомився / втомилася"), L("После I am называет состояние усталости.", "Після I am називає стан утоми."), [ref("tired-adjective")]],
  tire: ["tire", "noun_or_verb", L("существительное или глагол", "іменник або дієслово"), L("шина; утомлять(ся)", "шина; втомлювати(ся)"), L("Не является прилагательным tired и не называет требуемое состояние.", "Не є прикметником tired і не називає потрібний стан."), [ref("tire-noun-verb")]],
  busy: ["busy", "adjective", L("прилагательное", "прикметник"), L("занят / занята", "зайнятий / зайнята"), L("После I am сообщает о занятости говорящего.", "Після I am повідомляє про зайнятість мовця."), [ref("busy-adjective")]],
  late: ["late", "adjective", L("прилагательное", "прикметник"), L("опоздал / опоздала", "запізнився / запізнилася"), L("После I am сообщает об опоздании.", "Після I am повідомляє про запізнення."), [ref("late-adjective")]],
  sorry: ["sorry", "adjective", L("прилагательное", "прикметник"), L("мне жаль; извините", "мені шкода; вибачте"), L("После I am выражает сожаление или извинение.", "Після I am виражає жаль або вибачення."), [ref("sorry-adjective")]],
  tide: ["tide", "noun", L("существительное", "іменник"), L("прилив", "приплив"), L("Называет движение уровня моря, а не состояние человека.", "Називає зміну рівня моря, а не стан людини."), [ref("distractor-words")]],
  tie: ["tie", "noun_or_verb", L("существительное или глагол", "іменник або дієслово"), L("галстук; завязывать", "краватка; зав'язувати"), L("Не называет состояние усталости.", "Не називає стан утоми."), [ref("distractor-words")]],
  bus: ["bus", "noun", L("существительное", "іменник"), L("автобус", "автобус"), L("Называет транспорт, а не занятость.", "Називає транспорт, а не зайнятість."), [ref("distractor-words")]],
  buzzy: ["buzzy", "adjective", L("прилагательное", "прикметник"), L("жужжащий; оживлённый", "той, що дзижчить; жвавий"), L("Описывает жужжание или оживлённость, а не занятость.", "Описує дзижчання або жвавість, а не зайнятість."), [ref("distractor-words")]],
  here: ["here", "adverb", L("наречие", "прислівник"), L("здесь", "тут"), L("После I am сообщает о месте говорящего.", "Після I am повідомляє про місце мовця."), [s01Ref("here-adverb-ru-uk")]],
  ready: ["ready", "adjective", L("прилагательное", "прикметник"), L("готов / готова", "готовий / готова"), L("После I am сообщает о готовности.", "Після I am повідомляє про готовність."), [s01Ref("ready-adjective-ru-uk")]],
  fine: ["fine", "adjective", L("прилагательное", "прикметник"), L("всё хорошо", "усе добре"), L("После I am сообщает, что у говорящего всё хорошо.", "Після I am повідомляє, що в мовця все добре."), [s01Ref("fine-adjective-ru-uk")]],
  happy: ["happy", "adjective", L("прилагательное", "прикметник"), L("рад / рада", "радий / рада"), L("После I am сообщает о радости.", "Після I am повідомляє про радість."), [s01Ref("happy-adjective-ru-uk")]],
  ".": [".", "punctuation", L("знак препинания", "розділовий знак"), L("конец утверждения", "кінець твердження"), L("Завершает предложение.", "Завершує речення."), [ref("punctuation-full-stop")]],
});

const meanings = Object.freeze({
  "I am tired.": L("Я устал / устала.", "Я втомився / втомилася."), "I tired.": L("Задумано как «я устал / устала», но пропущено am.", "Задумано як «я втомився / втомилася», але пропущено am."), "I am tire.": L("Для состояния «устал / устала» нужно tired.", "Для стану «втомився / втомилася» потрібне tired."),
  "I am late.": L("Я опоздал / опоздала.", "Я запізнився / запізнилася."), "I late.": L("Задумано как «я опоздал / опоздала», но пропущено am.", "Задумано як «я запізнився / запізнилася», але пропущено am."), "I am here.": L("Я здесь.", "Я тут."),
  "I am sorry.": L("Мне жаль; извините.", "Мені шкода; вибачте."), "I sorry.": L("Задумано как извинение, но пропущено am.", "Задумано як вибачення, але пропущено am."), "I am sorry am.": L("Задумано как извинение, но am повторено.", "Задумано як вибачення, але am повторено."),
  "I am busy.": L("Я занят / занята.", "Я зайнятий / зайнята."), "I am fine.": L("У меня всё хорошо.", "У мене все добре."), "I am happy.": L("Я рад / рада.", "Я радий / рада."),
});
const explanations = Object.freeze({
  "I am tired.": L("I называет говорящего, am связывает его с описанием, а tired называет усталость.", "I називає мовця, am поєднує його з описом, а tired називає втому."),
  "I am late.": L("I называет говорящего, am связывает его с описанием, а late сообщает об опоздании.", "I називає мовця, am поєднує його з описом, а late повідомляє про запізнення."),
  "I am here.": L("I называет говорящего, am связывает его с местом, а here означает «здесь».", "I називає мовця, am поєднує його з місцем, а here означає «тут»."),
  "I am sorry.": L("I называет того, кто извиняется, am связывает его с sorry, а sorry выражает сожаление.", "I називає того, хто перепрошує, am поєднує його із sorry, а sorry виражає жаль."),
  "I am busy.": L("I называет говорящего, am связывает его с описанием, а busy сообщает о занятости.", "I називає мовця, am поєднує його з описом, а busy повідомляє про зайнятість."),
  "I am fine.": L("I называет говорящего, am связывает его с описанием, а fine сообщает, что у него всё хорошо.", "I називає мовця, am поєднує його з описом, а fine повідомляє, що в нього все добре."),
  "I am happy.": L("I называет говорящего, am связывает его с описанием, а happy сообщает о радости.", "I називає мовця, am поєднує його з описом, а happy повідомляє про радість."),
  "I tired.": L("I называет говорящего, а tired — его состояние; между ними пропущена связка am.", "I називає мовця, а tired — його стан; між ними пропущено зв'язку am."),
  "I am tire.": L("I am начинает описание говорящего, но tire не является прилагательным состояния; здесь нужно tired.", "I am починає опис мовця, але tire не є прикметником стану; тут потрібне tired."),
  "I late.": L("I называет говорящего, а late сообщает об опоздании; между ними пропущена связка am.", "I називає мовця, а late повідомляє про запізнення; між ними пропущено зв'язку am."),
  "I sorry.": L("I называет того, кто извиняется, а sorry выражает сожаление; между ними пропущена связка am.", "I називає того, хто перепрошує, а sorry виражає жаль; між ними пропущено зв'язку am."),
  "I am sorry am.": L("Первое am уже связывает I с sorry; второе am в конце ошибочно повторяет связку.", "Перше am уже поєднує I із sorry; друге am наприкінці помилково повторює зв'язку."),
});

const standaloneFunctions = Object.freeze({
  tired: L("Само слово называет состояние усталости; в полной фразе I am tired оно стоит после I am.", "Саме слово називає стан утоми; у повній фразі I am tired воно стоїть після I am."),
  tire: L("Само слово может быть существительным «шина» или глаголом «утомлять(ся)»; это не прилагательное tired.", "Саме слово може бути іменником «шина» або дієсловом «втомлювати(ся)»; це не прикметник tired."),
  tide: L("Само слово называет прилив; оно не называет состояние человека.", "Саме слово називає приплив; воно не називає стан людини."),
  tie: L("Само слово означает «галстук» или «завязывать»; оно не называет состояние усталости.", "Саме слово означає «краватка» або «зав'язувати»; воно не називає стану втоми."),
  busy: L("Само слово называет занятость; в полной фразе I am busy оно стоит после I am.", "Саме слово називає зайнятість; у повній фразі I am busy воно стоїть після I am."),
  bus: L("Само слово называет автобус; оно не сообщает о занятости.", "Саме слово називає автобус; воно не повідомляє про зайнятість."),
  buzzy: L("Само слово описывает жужжание или оживлённость; оно не сообщает о занятости.", "Саме слово описує дзижчання або жвавість; воно не повідомляє про зайнятість."),
  late: L("Само слово сообщает об опоздании; в полной фразе I am late оно стоит после I am.", "Саме слово повідомляє про запізнення; у повній фразі I am late воно стоїть після I am."),
  sorry: L("Самостоятельно sorry служит кратким извинением; в полной фразе I am sorry оно стоит после I am.", "Самостійно sorry слугує коротким вибаченням; у повній фразі I am sorry воно стоїть після I am."),
  here: L("Само слово сообщает о месте; в полной фразе I am here оно стоит после I am.", "Саме слово повідомляє про місце; у повній фразі I am here воно стоїть після I am."),
  ready: L("Само слово называет готовность; в полной фразе I am ready оно стоит после I am.", "Саме слово називає готовність; у повній фразі I am ready воно стоїть після I am."),
  fine: L("Само слово сообщает, что всё хорошо; в полной фразе I am fine оно стоит после I am.", "Саме слово повідомляє, що все гаразд; у повній фразі I am fine воно стоїть після I am."),
  happy: L("Само слово называет радость; в полной фразе I am happy оно стоит после I am.", "Саме слово називає радість; у повній фразі I am happy воно стоїть після I am."),
  is: L("Это форма be для he, she или it; в полной фразе с I нужна форма am.", "Це форма be для he, she або it; у повній фразі з I потрібна форма am."),
});

const occurrenceFunctions = Object.freeze({
  "I tired.": { 1: L("Без am слово tired называет задуманное состояние, но не образует здесь фразу I am tired.", "Без am слово tired називає задуманий стан, але не утворює тут фрази I am tired.") },
  "I late.": { 1: L("Без am слово late называет задуманное опоздание, но не образует здесь фразу I am late.", "Без am слово late називає задумане запізнення, але не утворює тут фрази I am late.") },
  "I sorry.": { 1: L("Без am слово sorry не завершает начатую с I полную фразу; самостоятельно употребляется Sorry.", "Без am слово sorry не завершує почату з I повну фразу; самостійно вживається Sorry.") },
  "I am sorry am.": { 3: L("Второе am ошибочно повторяет связку, которая уже стоит после I.", "Друге am помилково повторює зв'язку, яка вже стоїть після I.") },
});

function analysis(text) {
  const fact = lex[text]; const meaning = meanings[text] ?? fact?.[3];
  if (!meaning) throw new Error(`s02_analysis_meaning_missing:${text}`);
  const explanation = explanations[text] ?? L(`${text} — ${fact[2].ru}; здесь означает «${fact[3].ru}».`, `${text} — ${fact[2].uk}; тут означає «${fact[3].uk}».`);
  const units = [...text.matchAll(/[A-Za-z']+|[.!?]/gu)].map((match) => {
    const row = lex[match[0]] ?? lex[match[0].toLocaleLowerCase("en-US")];
    if (!row) throw new Error(`s02_analysis_token_missing:${match[0]}`);
    return { text: match[0], start: match.index, end: match.index + match[0].length, lemma: row[0], partOfSpeech: row[1], partOfSpeechLabelByLocale: row[2], meaningByLocale: row[3], functionByLocale: row[4], sourceRefs: row[5] };
  });
  if (units.length === 1 && standaloneFunctions[units[0].text.toLocaleLowerCase("en-US")]) {
    units[0].functionByLocale = standaloneFunctions[units[0].text.toLocaleLowerCase("en-US")];
  }
  for (const [index, functionByLocale] of Object.entries(occurrenceFunctions[text] ?? {})) {
    units[Number(index)].functionByLocale = functionByLocale;
  }
  return { text, meaningByLocale: meaning, explanationByLocale: explanation, units };
}
const lastWord = (text) => [...text.matchAll(/[A-Za-z']+/gu)].at(-1)?.[0].toLocaleLowerCase("en-US") ?? text;
const context = Object.freeze({ tired: L("при сообщении об усталости", "коли повідомляють про втому"), tide: L("при разговоре о приливе", "коли йдеться про приплив"), tie: L("при разговоре о галстуке или завязывании", "коли йдеться про краватку або зав'язування"), busy: L("при сообщении о занятости", "коли повідомляють про зайнятість"), bus: L("при разговоре об автобусе", "коли йдеться про автобус"), buzzy: L("при описании жужжания или оживлённости", "коли описують дзижчання або жвавість"), late: L("при сообщении об опоздании", "коли повідомляють про запізнення"), sorry: L("при извинении", "під час вибачення"), here: L("при сообщении о месте", "коли повідомляють про місце"), ready: L("при сообщении о готовности", "коли повідомляють про готовність"), fine: L("при ответе о самочувствии", "у відповіді про самопочуття"), happy: L("при сообщении о радости", "коли повідомляють про радість"), is: L("с he, she или it", "з he, she або it"), tire: L("как существительное или глагол", "як іменник або дієслово") });

function temptation({ text, correctText, selected, kind, picked, target }) {
  const exact = {
    tide: L("tide и tired начинаются с букв ti, поэтому их легко спутать при быстром чтении.", "tide і tired починаються з літер ti, тому їх легко сплутати під час швидкого читання."),
    tie: L("tie и tired начинаются с букв ti, поэтому взгляд может остановиться на знакомом начале.", "tie і tired починаються з літер ti, тому погляд може зупинитися на знайомому початку."),
    bus: L("bus — начало слова busy, поэтому короткий вариант можно принять за нужное слово.", "bus — початок слова busy, тому короткий варіант можна прийняти за потрібне слово."),
    buzzy: L("buzzy похоже на busy буквами b, u и y, но это другое слово с другим значением.", "buzzy схоже на busy літерами b, u та y, але це інше слово з іншим значенням."),
  }[selected];
  if (exact) return exact;
  if (kind === "listening" && text.startsWith("I am ") && correctText.startsWith("I am ")) {
    return L(`Все варианты начинаются с I am; легко выбрать знакомую фразу, не сверив последнее слово ${selected}.`, `Усі варіанти починаються з I am; легко вибрати знайому фразу, не звіривши останнє слово ${selected}.`);
  }
  if (correctText === "busy" && selected === "tired") return L("tired может описывать реальное состояние человека, но в задании просят сказать, что вы заняты срочной работой.", "tired може описувати реальний стан людини, але в завданні просять сказати, що ви зайняті терміновою роботою.");
  if (correctText === "busy" && selected === "late") return L("late подходит к ситуации с опозданием, но в задании просят сказать, что вы заняты срочной работой.", "late підходить до ситуації із запізненням, але в завданні просять сказати, що ви зайняті терміновою роботою.");
  if (kind === "builder") return L(`Плитка ${text} дана среди вариантов и уже знакома, но она передаёт «${picked.ru}», а нужна фраза со смыслом «${target.ru}».`, `Плитку ${text} подано серед варіантів і вона вже знайома, але передає «${picked.uk}», а потрібна фраза зі змістом «${target.uk}».`);
  return L(`${text} передаёт понятный смысл «${picked.ru}», но ситуация требует «${target.ru}».`, `${text} передає зрозумілий зміст «${picked.uk}», але ситуація вимагає «${target.uk}».`);
}

const malformedIntroDiagnostics = Object.freeze({
  "I tired.": {
    whyTemptingByLocale: L("В русском утверждении связка в настоящем времени не видна отдельным словом, поэтому am легко пропустить.", "В українському твердженні зв'язка в теперішньому часі не виражена окремим словом, тому am легко пропустити."),
    minimalContrastByLocale: L("I tired. пропускает am; I am tired. — полная форма со значением «я устал / устала».", "I tired. пропускає am; I am tired. — повна форма зі значенням «я втомився / втомилася»."),
    acceptabilityBoundaryByLocale: L("В значении «я устал / устала» I tired. не подходит: нужна фраза I am tired.", "У значенні «я втомився / втомилася» I tired. не підходить: потрібна фраза I am tired."),
  },
  "I am tire.": {
    whyTemptingByLocale: L("tire похоже на tired по написанию, поэтому окончание -d легко пропустить.", "tire схоже на tired за написанням, тому закінчення -d легко пропустити."),
    minimalContrastByLocale: L("tire — существительное или глагол; tired — прилагательное состояния в I am tired.", "tire — іменник або дієслово; tired — прикметник стану в I am tired."),
    acceptabilityBoundaryByLocale: L("I am tire. не выражает состояние «я устал / устала»: после I am здесь нужно прилагательное tired. Слово tire употребляется как существительное или глагол в других фразах.", "I am tire. не виражає стану «я втомився / втомилася»: після I am тут потрібен прикметник tired. Слово tire вживається як іменник або дієслово в інших фразах."),
  },
  "I late.": {
    whyTemptingByLocale: L("В русском утверждении связка в настоящем времени не видна отдельным словом, поэтому am легко пропустить.", "В українському твердженні зв'язка в теперішньому часі не виражена окремим словом, тому am легко пропустити."),
    minimalContrastByLocale: L("I late. пропускает am; I am late. — полная форма со значением «я опоздал / опоздала».", "I late. пропускає am; I am late. — повна форма зі значенням «я запізнився / запізнилася»."),
    acceptabilityBoundaryByLocale: L("Для значения «я опоздал / опоздала» I late. — неправильная полная фраза; нужна I am late.", "Для значення «я запізнився / запізнилася» I late. — неправильна повна фраза; потрібна I am late."),
  },
  "I sorry.": {
    whyTemptingByLocale: L("Слово sorry может звучать как самостоятельное извинение, поэтому к нему легко ошибочно добавить I без am.", "Слово sorry може звучати як самостійне вибачення, тому до нього легко помилково додати I без am."),
    minimalContrastByLocale: L("Sorry. может быть самостоятельным извинением; после I нужна форма I am sorry.", "Sorry. може бути самостійним вибаченням; після I потрібна форма I am sorry."),
    acceptabilityBoundaryByLocale: L("I sorry. — неправильная полная фраза. Уместны самостоятельное Sorry. или полная фраза I am sorry.", "I sorry. — неправильна повна фраза. Доречні самостійне Sorry. або повна фраза I am sorry."),
  },
  "I am sorry am.": {
    whyTemptingByLocale: L("am уже знакомо как форма be с I, поэтому его можно по ошибке повторить после sorry.", "am уже знайоме як форма be з I, тому його можна помилково повторити після sorry."),
    minimalContrastByLocale: L("В I am sorry. связка am стоит один раз после I; второе am в конце лишнее.", "В I am sorry. зв'язка am стоїть один раз після I; друге am наприкінці зайве."),
    acceptabilityBoundaryByLocale: L("I am sorry am. — неправильная фраза с повтором am; нужна I am sorry.", "I am sorry am. — неправильна фраза з повтором am; потрібна I am sorry."),
  },
});

const malformedWholeForms = new Set(Object.keys(malformedIntroDiagnostics));

function response({ id, text, correct, correctText, feedback, kind }) {
  const selected = lastWord(text); const target = analysis(correctText).meaningByLocale; const picked = analysis(text).meaningByLocale;
  const exactDiagnostic = malformedIntroDiagnostics[text];
  return { responseId: id, correct, textByLocale: L(text, text), analysisByLocale: { ru: analysis(text), uk: analysis(text) }, ...(correct ? {} : {
    errorType: selected === "is" ? "wrong_be_form" : malformedWholeForms.has(text) ? "incomplete_or_misordered_phrase" : kind === "listening" ? "listening_lexical_confusion" : "scene_meaning_mismatch",
    whyTemptingByLocale: exactDiagnostic?.whyTemptingByLocale ?? (selected === "is" ? L("is — другая форма be, поэтому её можно ошибочно поставить вместо am.", "is — інша форма be, тому її можна помилково поставити замість am.") : temptation({ text, correctText, selected, kind, picked, target })),
    whyWrongHereByLocale: feedback ?? L(`${text} не передаёт требуемый смысл; здесь нужен ${correctText}.`, `${text} не передає потрібного змісту; тут потрібне ${correctText}.`),
    minimalContrastByLocale: exactDiagnostic?.minimalContrastByLocale ?? L(`${text} — «${picked.ru}»; ${correctText} — «${target.ru}».`, `${text} — «${picked.uk}»; ${correctText} — «${target.uk}».`),
    acceptabilityBoundaryByLocale: exactDiagnostic?.acceptabilityBoundaryByLocale ?? (selected === "is"
      ? L("is используется с he, she или it; с I в этой фразе нужна форма am.", "is уживається з he, she або it; з I в цій фразі потрібна форма am.")
      : L(`${text} уместно ${context[selected]?.ru ?? "в другой конструкции"}; здесь нужен смысл «${target.ru}».`, `${text} доречне, ${context[selected]?.uk ?? "коли вживається в іншій конструкції"}; тут потрібен зміст «${target.uk}».`)),
  }) };
}

const completion = Object.freeze({ "I am tired.": L("Верно: I am tired. — «Я устал / устала».", "Правильно: I am tired. — «Я втомився / втомилася»."), "I am late.": L("Верно: I am late. — «Я опоздал / опоздала».", "Правильно: I am late. — «Я запізнився / запізнилася»."), "I am sorry.": L("Верно: I am sorry. — «Мне жаль; извините».", "Правильно: I am sorry. — «Мені шкода; вибачте»."), "I am busy.": L("Верно: I am busy. — «Я занят / занята».", "Правильно: I am busy. — «Я зайнятий / зайнята»."), "I am happy.": L("Верно: I am happy. — «Я рад / рада».", "Правильно: I am happy. — «Я радий / рада».") });

function interactionEntry(item) {
  const p = item.modePayload;
  if (["phrase_builder", "listen_build_dictation"].includes(item.family)) {
    const target = item.family === "phrase_builder" ? p.targetPhrase : p.hiddenTargetPhrase;
    return { family: item.family, completionFeedbackByLocale: completion[target], phrase: analysis(target), responses: (p.slotFeedback ?? []).map((fb, index) => response({ id: fb.responseId, text: p.authoredDistractorTokens[index], correct: false, correctText: target, feedback: fb.feedbackByLocale, kind: "builder" })) };
  }
  if (item.family === "scripted_repeat_compare") return { family: item.family, phrase: analysis(p.targetPhrase) };
  if (item.family === "speed_match") return { family: item.family, pairs: p.pairGrid.map((pair) => { const word = lex[pair.target]; return { pairId: pair.pairId, target: pair.target, analysisV1: { lemma: word[0], partOfSpeech: word[1], partOfSpeechLabelByLocale: word[2], meaningByLocale: pair.meaningByLocale, functionByLocale: word[4], matchExplanationByLocale: L(`${pair.target} соответствует «${pair.meaningByLocale.ru}».`, `${pair.target} відповідає «${pair.meaningByLocale.uk}».`), sourceRefs: word[5], phrase: analysis(pair.target) } }; }) };
  const rows = item.family === "listen_choose" ? p.localizedMeaningChoices : p.gapOptions;
  const byId = new Map((p.choiceFeedback ?? []).map((fb) => [fb.responseId, fb]));
  const only = item.family === "listen_choose" && rows.length === 1;
  const correctRow = rows.find((row) => byId.get(row.responseId)?.correct) ?? (only ? rows[0] : null);
  if (!correctRow) throw new Error(`s02_correct_response_missing:${item.interactionId}`);
  const text = (row) => row.targetText ?? row.text;
  return { family: item.family, responses: rows.map((row) => { const fb = byId.get(row.responseId); return response({ id: row.responseId, text: text(row), correct: fb?.correct ?? only, correctText: text(correctRow), feedback: fb?.feedbackByLocale, kind: item.family === "listen_choose" && !p.isWordCard ? "listening" : "scene" }); }) };
}

const sidecar = {
  schemaVersion: "learning_v2_practice_explanations_v1",
  courseSessionId: sessionId,
  sourceBindings: Object.fromEntries(locales.map((locale) => [locale, { path: `final.${locale}.md`, sha256: sha(source[locale]) }])),
  interactions: Object.fromEntries(atomic.interactionsByLocale.ru.map((item) => [item.interactionId, interactionEntry(item)])),
  introResponses: intros.ru.flatMap((page, pageIndex) => page.options.map((option, optionIndex) => response({ id: `${sessionId}:intro${pageIndex + 1}:r${optionIndex + 1}`, text: option.text, correct: option.correct, correctText: page.options.find((candidate) => candidate.correct).text, feedback: L(option.feedback, intros.uk[pageIndex].options[optionIndex].feedback), kind: "scene" }))),
};
const issues = validatePracticeExplanationsV1({ sidecar, atomicSource: atomic, sessionDir: dir });
if (issues.length) throw new Error(`s02_explanation_contract_hold:${issues.join("|")}`);
if (!apply) { console.log(JSON.stringify({ mode: "dry-run", interactions: Object.keys(sidecar.interactions).length, introResponses: sidecar.introResponses.length, issues })); process.exit(0); }
await writeMockupFile(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
await writeMockupFile(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`);
await writeMockupFile(path.join(dir, "locales_batch.md"), `===LOCALE: uk===\n${source.uk}`);
console.log(JSON.stringify({ mode: "apply", interactions: 21, introResponses: 9 }));
