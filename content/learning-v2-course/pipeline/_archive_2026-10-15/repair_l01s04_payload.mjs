import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s04");
const file = path.join(root, "practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const suffix = (id) => id.slice(-3);
for (const locale of ["ru", "uk"]) {
  const markdown = fs.readFileSync(path.join(root, `final.${locale}.md`), "utf8");
  const titles = new Map([...markdown.matchAll(/^\*\*(\d+)\s*·\s*(.*?)\*\*\s*$/gmu)].map((match) => [Number(match[1]), match[2]]));
  for (const item of data.interactionsByLocale[locale]) {
    const identity = suffix(item.interactionId);
    const practiceOrdinal = identity === "i19" ? 18 : identity === "i18" ? 19 : item.ordinal - 3;
    const title = titles.get(practiceOrdinal);
    if (title) { item.prompt = title; item.accessibilityLabel = title; }
  }
}
const textById = {
  i02: { r2: ["Earn значит «зарабатывать»; это не слово из записи.", "Earn означає «заробляти»; це не слово з аудіозапису."], r3: ["Really значит «действительно»; это не слово из записи.", "Really означає «справді»; це не слово з аудіозапису."] },
  i04: { r2: ["White начинается со звука /w/, а запись — со звука /r/.", "White починається зі звука /w/, а запис — зі звука /r/."], r3: ["Ride заканчивается на /d/, а запись — на /t/.", "Ride закінчується на /d/, а запис — на /t/."] },
  i06: { r2: ["Long начинается с /l/; в записи начальный звук /r/. В wrong буква w не произносится.", "Long починається з /l/; у записі початковий звук /r/. У wrong літера w не вимовляється."], r3: ["В ring краткий /ɪ/, как в sit; вслушайтесь в гласный.", "У ring короткий /ɪ/, як у sit; прислухайтеся до голосного."] },
  i08: { r1: ["Right звучит в первой записи; во второй звучит wrong.", "Right звучить у першому записі; у другому звучить wrong."] },
  i09: { r2: ["Three начинается со звука /θ/, а free — со звука /f/.", "Three починається зі звука /θ/, а free — зі звука /f/."], r3: ["Fry заканчивается звуком /aɪ/, а free — /iː/.", "Fry закінчується звуком /aɪ/, а free — /iː/."] },
  i13: { r2: ["В I not wrong пропущено am: после I нужна форма am; not не заменяет глагол.", "У I not wrong пропущено am: після I потрібна форма am; not не замінює дієслово."], r3: ["С I нужна форма am; is употребляется с he, she или it.", "З I потрібна форма am; is вживається з he, she або it."] },
  i15: { r2: ["В записи звучит not между am и sure.", "У записі звучить not між am і sure."], r3: ["Вы услышали not, но последнее слово — sure, не free.", "Ви почули not, але останнє слово — sure, не free."], r4: ["Sure начинается со звука /ʃ/; tired — со звука /t/ и имеет два слога.", "Sure починається зі звука /ʃ/; tired — зі звука /t/ і має два склади."] },
  i21: { r2: ["Busy означает отсутствие свободного времени; по условию у вас не осталось задач.", "Busy означає відсутність вільного часу; за умовою у вас не залишилося завдань."], r3: ["Not free значит, что сейчас вы недоступны; по условию вы можете взять задачу.", "Not free означає, що зараз ви не можете взяти завдання; за умовою це можливо."] },
};
const defs = {
  i01: ["«рано». Вы пришли до назначенного времени.", "«рано». Ви прийшли до призначеного часу."],
  i03: ["«верно, правильно». Вы проверили расчёт, и он сошёлся.", "«правильно». Ви перевірили розрахунок, і він зійшовся."],
  i05: ["«неверно, ошибаюсь». В начале слова буква w не произносится.", "«неправильно, помиляюся». На початку слова літера w не вимовляється."],
  i07: ["«свободен/свободна, не занят/не занята». Вы можете взяться за новое дело.", "«вільний/вільна, не зайнятий/не зайнята». Ви можете взятися за нову справу."],
};
const setScene = (item, ru, uk) => { item.modePayload.localizedScene = { ru, uk }; };
for (const locale of ["ru", "uk"]) for (const item of data.interactionsByLocale[locale]) {
  const id = suffix(item.interactionId), p = item.modePayload;
  if (textById[id]) p.choiceFeedback = p.choiceFeedback.filter((row) => row.correct === false).map((row) => {
    const pair = textById[id][row.responseId.slice(-2)];
    if (pair) row.feedbackByLocale = { ru: pair[0], uk: pair[1] };
    row.testedDimension = item.prompt;
    return row;
  });
  if (defs[id]) {
    const pair = defs[id]; p.wordCard.definitionByLocale = { ru: pair[0], uk: pair[1] };
    p.localizedMeaningChoices[0].meaningByLocale = { ru: pair[0], uk: pair[1] };
  }
  if (id === "i08") p.testedPhoneticContrast = item.prompt;
  if (id === "i10") {
    const meanings = [
      { ru: "рано", uk: "рано" },
      { ru: "прав/права", uk: "маю рацію" },
      { ru: "не прав/не права", uk: "помиляюся" },
      { ru: "свободен/свободна", uk: "вільний/вільна" },
    ];
    p.pairGrid.forEach((pair, index) => { pair.meaningByLocale = meanings[index]; });
    p.rightColumn = meanings.map((pair) => pair.ru);
  }
  if (id === "i13") { item.prompt = locale === "ru" ? "Исправьте фразу Антона" : "Виправте фразу Антона"; p.testedDimension = item.prompt; setScene(item, "🗣 Антон признаёт свою ошибку и говорит: **«I wrong.»** Выберите слово, чтобы исправить его фразу.", "🗣 Антон визнає свою помилку й каже: **«I wrong.»** Виберіть слово, щоб виправити його фразу."); }
  if (id === "i17") {
    const meanings = [
      { ru: "занят/занята", uk: "зайнятий/зайнята" },
      { ru: "один/одна", uk: "сам/сама" },
      { ru: "устал/устала", uk: "втомлений/втомлена" },
      { ru: "уверен/уверена", uk: "упевнений/упевнена" },
    ];
    p.pairGrid.forEach((pair, index) => { pair.meaningByLocale = meanings[index]; });
    p.rightColumn = meanings.map((pair) => pair.ru);
  }
  if (id === "i12") for (const row of p.slotFeedback ?? []) { row.testedDimension = item.prompt; row.feedbackByLocale = { ru: "Right здесь означает, что расчёт верен; проверка подтвердила его.", uk: "Right тут означає, що розрахунок правильний; перевірка це підтвердила." }; }
  const builds = {
    i14: ["I am not late.", "I", "am", "not", "late", "early", "Сейчас я не опаздываю.", "Зараз я не запізнююся.", "Лина спрашивает, задержала ли вас дорога. Вы пришли ровно к началу встречи.", "Ліна питає, чи затримала вас дорога. Ви прийшли рівно на початок зустрічі."],
    i16: ["I am not tired.", "I", "am", "not", "tired", "happy", "Я не чувствую усталости.", "Я не відчуваю втоми.", "Мира спрашивает, нужна ли вам передышка после смены. Вы хорошо отдохнули и чувствуете себя бодро.", "Міра питає, чи потрібна вам перерва після зміни. Ви добре відпочили й почуваєтеся бадьоро."],
    i18: ["I am not alone.", "I", "am", "not", "alone", "fine", "Я не один/одна.", "Я не сам/сама.", "Лина спрашивает, ждёте ли вы кого-то в одиночестве у стойки. Рядом с вами стоит коллега.", "Ліна питає, чи чекаєте ви когось наодинці біля стійки. Поруч із вами стоїть колега."],
    i20: ["I am right.", "I", "am", null, "right", "wrong", "Моя версия правильна.", "Я маю рацію.", "Коллега проверил названный вами расчёт и подтвердил его.", "Колега перевірив названий вами розрахунок і підтвердив його."],
  };
  if (builds[id]) {
    const [target, ...v] = builds[id], [i, am, not, word, extra, meaningRu, meaningUk, sceneRu, sceneUk] = v;
    p.targetPhrase = target; p.orderedTokens = not ? [i, am, not, word] : [i, am, word];
    p.authoredDistractorTokens = [extra]; p.localizedMeaning = { ru: meaningRu, uk: meaningUk }; setScene(item, sceneRu, sceneUk);
    const ans = data.answers.find((a) => a.interactionId === item.interactionId); ans.correctText = target;
    for (const row of p.slotFeedback ?? []) {
      row.testedDimension = item.prompt;
      row.feedbackByLocale = id === "i14" ? { ru: "Early означает «раньше времени»; вы пришли ровно к началу.", uk: "Early означає «раніше часу»; ви прийшли рівно на початок." } : id === "i16" ? { ru: "Happy описывает настроение, а здесь речь об усталости.", uk: "Happy описує настрій, а тут ідеться про втому." } : id === "i18" ? { ru: "Fine означает, что всё хорошо; здесь важно, что рядом коллега.", uk: "Fine означає, що все гаразд; тут важливо, що поруч колега." } : { ru: "Wrong здесь обозначает ошибку в ответе; проверка подтвердила ваш расчёт.", uk: "Wrong тут позначає помилку у відповіді; перевірка підтвердила ваш розрахунок." };
    }
  }
  if (id === "i21") { item.prompt = locale === "ru" ? "Ответьте руководителю о новой задаче" : "Відповідь керівникові про нове завдання"; p.testedDimension = item.prompt; setScene(item, "**У вас не осталось текущих задач. Руководитель спрашивает, можете ли вы взять ещё одну.**", "**У вас не залишилося поточних завдань. Керівник питає, чи можете ви взяти ще одне.**"); }
  if (id === "i11") { p.targetPhrase = "I am early."; p.referenceAudio.transcript = p.targetPhrase; data.answers.find((answer) => answer.interactionId === item.interactionId).correctText = p.targetPhrase; }
  if (id === "i19") {
    item.purpose = "retrieval_practice"; item.family = "phrase_builder"; item.inputMode = "ordered_tokens";
    item.audioTargetIds = []; item.responseOptions = [];
    item.modePayload = {
      family: "phrase_builder", targetPhrase: "I am free.", orderedTokens: ["I", "am", "free"],
      authoredDistractorTokens: ["busy"],
      localizedMeaning: { ru: "Я свободен/свободна в пятницу.", uk: "Я вільний/вільна в п'ятницю." },
      localizedScene: {
        ru: "**Лина просит вас подменить коллегу в пятницу. Вы проверили календарь — в этот день вы свободны.**",
        uk: "**Ліна просить вас підмінити колегу в п'ятницю. Ви перевірили календар — цього дня ви вільні.**",
      },
      slotFeedback: [{ responseId: `${item.interactionId}:tile:d1`, correct: false, testedDimension: item.prompt,
        feedbackByLocale: {
          ru: "Busy обозначает текущую занятость; по календарю вы можете подменить коллегу.",
          uk: "Busy означає, що зараз у вас є поточні справи; за календарем ви можете підмінити колегу.",
        } }],
    };
    data.answers.find((answer) => answer.interactionId === item.interactionId).correctText = "I am free.";
  }
}
for (const locale of ["ru", "uk"]) {
  const items = data.interactionsByLocale[locale];
  const retrievalIndex = items.findIndex((item) => item.interactionId.endsWith(":i19"));
  const independentIndex = items.findIndex((item) => item.interactionId.endsWith(":i18"));
  if (retrievalIndex > independentIndex) {
    const [retrieval] = items.splice(retrievalIndex, 1);
    items.splice(independentIndex, 0, retrieval);
  }
  items.find((item) => item.interactionId.endsWith(":i19")).ordinal = 21;
  items.find((item) => item.interactionId.endsWith(":i18")).ordinal = 22;
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
