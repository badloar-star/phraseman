#!/usr/bin/env node
// Целевая, воспроизводимая правка исторического дефекта S43: шесть независимых
// «финальных» действий заменяются одной проверкой смысла артикля. Скрипт
// намеренно откажется от записи, если исходная форма отличается от аудита.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const APPLY = process.argv.includes("--apply");
const directory = path.join(ROOT, "sessions", "en", "l03", "s43");
const file = path.join(directory, "practice.atomic.json");
const source = JSON.parse(fs.readFileSync(file, "utf8"));
const id = "en:lesson-03:session-43:i17";
const retired = Array.from({ length: 6 }, (_, index) => `${id}:s${String(index + 1).padStart(2, "0")}`);

function replacement(locale) {
  const ru = locale === "ru";
  const prompt = ru
    ? "Вставьте начало — помощник указывает на отложенные газеты"
    : "Вставте початок — помічник указує на відкладені газети";
  const scene = ru
    ? "Помощник уже отложил эти газеты и показывает на них. Вставьте начало фразы."
    : "Помічник уже відклав ці газети й указує на них. Вставте початок фрази.";
  const labels = ["The", "без артикля", "A", "An"];
  const feedback = [
    { ru: "Форма без артикля бывает с множественным числом, поэтому вариант выглядит возможным. Но без `the` речь шла бы о газетах вообще, а помощник показывает на конкретную отложенную группу. В новой фразе спросите себя: собеседник уже знает именно эти предметы? Тогда нужен `the`.", uk: "Форма без артикля буває з множиною, тому варіант виглядає можливим. Але без `the` ішлося б про газети взагалі, а помічник указує на конкретну відкладену групу. У новій фразі запитайте себе: співрозмовник уже знає саме ці предмети? Тоді потрібне `the`." },
    { ru: "`a` знакомо как артикль перед предметом, поэтому его легко выбрать по привычке. Но `a` бывает только перед одним предметом, а `newspapers` — несколько газет. В новой фразе сначала проверьте число: перед множественным числом `a` не ставится.", uk: "`a` знайоме як артикль перед предметом, тому його легко обрати за звичкою. Але `a` буває лише перед одним предметом, а `newspapers` — кілька газет. У новій фразі спершу перевірте число: перед множиною `a` не ставиться." },
    { ru: "`an` тоже бывает перед одним предметом и потому может казаться знакомым началом. Но `newspapers` — множественное число, а не один предмет с гласным звуком. В новой фразе сначала определите число, затем решайте между `a` и `an`.", uk: "`an` теж буває перед одним предметом і тому може здаватися знайомим початком. Але `newspapers` — множина, а не один предмет із голосним звуком. У новій фразі спершу визначте число, а вже потім обирайте між `a` та `an`." },
  ];
  const options = labels.map((text, index) => ({ responseId: `${id}:r${index + 1}`, text }));
  return {
    interactionId: id,
    ordinal: 20,
    purpose: "independent_check",
    family: "context_gap_grammar",
    inputMode: "single_choice",
    prompt,
    responseOptions: options,
    mediaIds: [],
    audioTargetIds: [],
    accessibilityLabel: prompt,
    modePayload: {
      family: "context_gap_grammar",
      localizedScene: { ru: locale === "ru" ? scene : "Помощник уже отложил эти газеты и показывает на них. Вставьте начало фразы.", uk: locale === "uk" ? scene : "Помічник уже відклав ці газети й указує на них. Вставте початок фрази." },
      gappedTargetPhrase: "___ newspapers are here.",
      gapOptions: options,
      testedDimension: ru ? "Артикль перед newspapers при конкретном значении" : "Артикль перед newspapers при конкретному значенні",
      choiceFeedback: feedback.map((text, index) => ({
        responseId: `${id}:r${index + 2}`,
        correct: false,
        testedDimension: ru ? "Артикль перед newspapers при конкретном значении" : "Артикль перед newspapers при конкретному значенні",
      feedbackByLocale: feedback[index],
      })),
    },
    scriptedAlternate: null,
  };
}

function restoreI12(locale, ordinal) {
  const ru = locale === "ru";
  const interactionId = "en:lesson-03:session-43:i12";
  const prompt = ru ? "Вставьте начало — помощник выбирает газеты как вид изданий" : "Вставте початок — помічник обирає газети як вид видань";
  const options = ["без артикля", "The", "A", "An"].map((text, index) => ({ responseId: `${interactionId}:r${index + 1}`, text }));
  return { interactionId, ordinal, purpose: "retrieval_practice", family: "context_gap_grammar", inputMode: "single_choice", prompt, responseOptions: options, mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt, modePayload: { family: "context_gap_grammar", localizedScene: { ru: "Помощник выбирает газеты как вид изданий, а не конкретную отложенную группу. Вставьте начало фразы.", uk: "Помічник обирає газети як вид видань, а не конкретну відкладену групу. Вставте початок фрази." }, gappedTargetPhrase: "___ newspapers are fine.", gapOptions: options, testedDimension: "Артикль перед newspapers при общем значении", choiceFeedback: [
    { responseId: `${interactionId}:r2`, correct: false, testedDimension: "Артикль перед newspapers при общем значении", feedbackByLocale: { ru: "`the newspapers` может казаться подходящим, потому что газет несколько. Но `the` называет уже известную конкретную группу, а здесь выбирают вид изданий вообще. В новой фразе используйте `the` только если собеседник уже понимает, о каких именно газетах речь.", uk: "`the newspapers` може здаватися доречним, бо газет кілька. Але `the` називає вже відому конкретну групу, а тут обирають вид видань узагалі. У новій фразі використовуйте `the` лише якщо співрозмовник уже розуміє, про які саме газети йдеться." } },
    { responseId: `${interactionId}:r3`, correct: false, testedDimension: "Артикль перед newspapers при общем значении", feedbackByLocale: { ru: "`a` знакомо как начало существительного, поэтому его легко выбрать автоматически. Но `a` бывает только перед одним предметом, а `newspapers` — несколько газет. В новой фразе сначала проверьте число: перед множественным числом `a` не ставится.", uk: "`a` знайоме як початок іменника, тому його легко обрати автоматично. Але `a` буває лише перед одним предметом, а `newspapers` — кілька газет. У новій фразі спершу перевірте число: перед множиною `a` не ставиться." } },
    { responseId: `${interactionId}:r4`, correct: false, testedDimension: "Артикль перед newspapers при общем значении", feedbackByLocale: { ru: "`an` тоже относится к одному предмету и может казаться обычным артиклем. Но `newspapers` — множественное число, а не один предмет с гласным звуком. В новой фразе сначала определите число, затем выбирайте артикль.", uk: "`an` теж стосується одного предмета й може здаватися звичайним артиклем. Але `newspapers` — множина, а не один предмет із голосним звуком. У новій фразі спершу визначте число, а потім обирайте артикль." } },
  ] }, scriptedAlternate: null };
}

// Every wrong choice must teach a usable contrast: why it can look tempting,
// why it fails here, and the clue the learner can use in the next sentence.
// Keep these repairs deterministic so rebuilding the atomic source never
// silently discards the learner-facing explanations.
function enrichLearnerFeedback(entries) {
  const byId = new Map(entries.map((entry) => [entry.interactionId, entry]));
  const setFeedback = (interactionId, textByResponseId) => {
    const entry = byId.get(interactionId);
    if (!entry?.modePayload) throw new Error(`s43_feedback_interaction_missing:${interactionId}`);
    entry.modePayload.choiceFeedback = Object.entries(textByResponseId).map(([responseId, feedbackByLocale]) => ({
      responseId,
      correct: false,
      testedDimension: entry.modePayload.testedDimension,
      feedbackByLocale,
    }));
  };
  setFeedback("en:lesson-03:session-43:i05", {
    "en:lesson-03:session-43:i05:r2": { ru: "`magazine` тоже печатное издание, поэтому вариант может показаться подходящим. Но `magazine` — журнал, а в ситуации нужна газета: `newspaper`. В новой фразе различайте новостное издание и журнал со статьями и фотографиями.", uk: "`magazine` теж друковане видання, тому варіант може здатися доречним. Але `magazine` — журнал, а в ситуації потрібна газета: `newspaper`. У новій фразі розрізняйте новинне видання і журнал зі статтями та фотографіями." },
    "en:lesson-03:session-43:i05:r3": { ru: "`book` тоже лежит в стопке печатных изданий, поэтому его легко выбрать по привычке. Но `book` — книга, а нужна газета: `newspaper`. Сначала назовите предмет по виду, а не просто любой предмет из стопки.", uk: "`book` теж може лежати в стопці друкованих видань, тому його легко вибрати за звичкою. Але `book` — книжка, а потрібна газета: `newspaper`. Спочатку назвіть предмет за видом, а не просто будь-який предмет зі стосу." },
  });
  setFeedback("en:lesson-03:session-43:i09", {
    "en:lesson-03:session-43:i09:r2": { ru: "`a` знакомо как артикль перед предметом, поэтому вариант может казаться правильным. Но `a` бывает только перед одним предметом, а `books` — несколько книг. В новой фразе сначала проверьте: один предмет или много.", uk: "`a` знайоме як артикль перед предметом, тому варіант може здаватися правильним. Але `a` буває лише перед одним предметом, а `books` — кілька книжок. У новій фразі спершу перевірте: один предмет чи багато." },
    "en:lesson-03:session-43:i09:r3": { ru: "`an` тоже относится к одному предмету и поэтому не подходит к `books`. Оно выбирается перед единственным существительным с гласным звуком, а здесь несколько уже отложенных книг. Для известной группе нужен `The books`.", uk: "`an` теж стосується одного предмета й тому не підходить до `books`. Його обирають перед одниною з голосним звуком, а тут кілька вже відкладених книжок. Для відомої групи потрібно `The books`." },
    "en:lesson-03:session-43:i09:r4": { ru: "Форма без артикля бывает с множественным числом, поэтому вариант выглядит правдоподобно. Но без артикля речь шла бы о книгах вообще; здесь показана конкретная отложенная группа. В следующей фразе спросите себя: собеседник уже видит именно эти предметы? Тогда нужен `the`.", uk: "Форма без артикля буває з множиною, тому варіант виглядає правдоподібно. Але без артикля йшлося б про книжки взагалі; тут показано конкретну відкладену групу. У наступній фразі запитайте себе: співрозмовник уже бачить саме ці предмети? Тоді потрібен `the`." },
  });
  setFeedback("en:lesson-03:session-43:i15", {
    "en:lesson-03:session-43:i15:r2": { ru: "`the books` подходит, когда говорят о знакомой конкретной группе, поэтому вариант может казаться естественным. Но здесь выбирают книги как вид вообще, не указывая на отложенные экземпляры. В новой фразе используйте `the` только если группа уже определена для обоих.", uk: "`the books` підходить, коли говорять про знайому конкретну групу, тому варіант може здаватися природним. Але тут обирають книжки як вид узагалі, не вказуючи на відкладені примірники. У новій фразі використовуйте `the` лише якщо групу вже визначено для обох." },
    "en:lesson-03:session-43:i15:r3": { ru: "`a` может казаться обычным началом существительного. Но после него нужен один предмет, а `books` — множественное число. В следующей фразе окончание `-s` — сигнал, что `a` не подходит.", uk: "`a` може здаватися звичайним початком іменника. Але після нього потрібен один предмет, а `books` — множина. У наступній фразі закінчення `-s` — сигнал, що `a` не підходить." },
    "en:lesson-03:session-43:i15:r4": { ru: "`an` тоже ставят только перед одним предметом, поэтому перед `books` оно не работает. Здесь множественное число без конкретной группы: просто `Books are fine.` В новой фразе сначала определите число, затем решайте нужен ли артикль.", uk: "`an` теж ставлять лише перед одним предметом, тому перед `books` воно не працює. Тут множина без конкретної групи: просто `Books are fine.` У новій фразі спершу визначте число, а потім вирішуйте, чи потрібен артикль." },
  });
  setFeedback("en:lesson-03:session-43:i16", {
    "en:lesson-03:session-43:i16:r2": { ru: "Вариант похож теми же книгами, поэтому его легко спутать с записью. Но `These books are here` говорит о конкретных книгах на месте; в аудио `Books are fine` — книги вообще подойдут. В следующей фразе слушайте не только существительное, но и `fine` или `here`.", uk: "Варіант схожий тими самими книжками, тому його легко сплутати із записом. Але `These books are here` говорить про конкретні книжки на місці; в аудіо `Books are fine` — книжки загалом підійдуть. У наступній фразі слухайте не лише іменник, а й `fine` або `here`." },
    "en:lesson-03:session-43:i16:r3": { ru: "`Журналы подойдут` сохраняет смысл «подойдут», поэтому вариант может звучать близко. Но в записи произносят `books`, а не `magazines`. В новой фразе проверяйте и предмет, и оценку — оба слова меняют сообщение.", uk: "`Журнали підійдуть` зберігає зміст «підійдуть», тому варіант може звучати близько. Але в записі вимовляють `books`, а не `magazines`. У новій фразі перевіряйте і предмет, і оцінку — обидва слова змінюють повідомлення." },
    "en:lesson-03:session-43:i16:r4": { ru: "Слово `books` есть и здесь, поэтому вариант может отвлечь от смысла. Но `Where are books?` — вопрос о месте, а в аудио утверждение `Books are fine.` В следующей фразе слушайте начало и порядок слов: вопрос просит информацию, утверждение сообщает решение.", uk: "Слово `books` є і тут, тому варіант може відвернути від змісту. Але `Where are books?` — запитання про місце, а в аудіо твердження `Books are fine.` У наступній фразі слухайте початок і порядок слів: запитання просить інформацію, твердження повідомляє рішення." },
  });
  for (const entry of entries) if (entry.interactionId === "en:lesson-03:session-43:i04") {
    entry.modePayload.wordCard.definitionByLocale = {
      ru: "«журнал» — печатное издание со статьями и фотографиями, которое выходит отдельными номерами.",
      uk: "«журнал» — друковане видання зі статтями й фотографіями, що виходить окремими номерами.",
    };
  }
}

const replacements = {};
for (const locale of ["ru", "uk"]) {
  const entries = source.interactionsByLocale?.[locale];
  const old = entries?.filter((entry) => retired.includes(entry.interactionId)) ?? [];
  const existing = entries?.filter((entry) => entry.interactionId === id) ?? [];
  if (old.length === 6 && old.every((entry) => entry.purpose === "independent_check")) {
    const first = entries.findIndex((entry) => entry.interactionId === retired[0]);
    replacements[locale] = [...entries.slice(0, first), replacement(locale), ...entries.slice(first + 6)];
  } else if (old.length === 0 && existing.length === 1 && entries.length === 17) {
    replacements[locale] = entries.map((entry) => entry.interactionId === id ? replacement(locale) : entry);
  } else throw new Error(`s43_final_shape_unexpected:${locale}`);
  if (replacements[locale].length !== 17) throw new Error(`s43_task_count_unexpected:${locale}`);
  const i12Index = replacements[locale].findIndex((entry) => entry.interactionId === "en:lesson-03:session-43:i12");
  if (i12Index < 0) throw new Error(`s43_i12_missing:${locale}`);
  replacements[locale][i12Index] = restoreI12(locale, replacements[locale][i12Index].ordinal);
  const i13Index = replacements[locale].findIndex((entry) => entry.interactionId === "en:lesson-03:session-43:i13");
  const i12 = replacements[locale].splice(i12Index, 1)[0];
  const targetIndex = replacements[locale].findIndex((entry) => entry.interactionId === "en:lesson-03:session-43:i13");
  if (i13Index < 0 || targetIndex < 0) throw new Error(`s43_i13_missing:${locale}`);
  replacements[locale].splice(targetIndex + 1, 0, i12);
  enrichLearnerFeedback(replacements[locale]);
  replacements[locale].forEach((entry, index) => { entry.ordinal = index + 4; });
}
const answers = source.answers.filter((answer) => !retired.includes(answer.interactionId) && answer.interactionId !== id && answer.interactionId !== "en:lesson-03:session-43:i12");
if (![source.answers.length - 7, source.answers.length - 2].includes(answers.length)) throw new Error("s43_answer_shape_unexpected");
answers.push({ interactionId: "en:lesson-03:session-43:i12", correctText: "без артикля", correctResponseId: "en:lesson-03:session-43:i12:r1" });
answers.push({ interactionId: id, correctText: "The", correctResponseId: `${id}:r1` });
const next = { ...source, interactionsByLocale: replacements, answers };
if (!APPLY) {
  console.log(JSON.stringify({ verdict: "READY", locales: Object.fromEntries(Object.entries(replacements).map(([locale, entries]) => [locale, entries.length])), retired }));
} else {
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ verdict: "APPLIED", locales: Object.fromEntries(Object.entries(replacements).map(([locale, entries]) => [locale, entries.length])), retired }));
}
