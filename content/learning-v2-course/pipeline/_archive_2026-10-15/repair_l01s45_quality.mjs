import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s45/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const id = (suffix) => `en:lesson-01:session-45:${suffix}`;
const text = {
  ru: {
    i02: "Верно: в записи слышно satisfied — «доволен результатом».",
    i04: "Верно: в записи слышно exhausted — «крайне устал».",
    i06: "Верно: в записи слышно settled — «вопрос решён».",
    i08: "Верно: результат своей работы вас устраивает, поэтому подходит satisfied.",
    i10: "Верно: после двух смен сил почти нет, поэтому подходит exhausted.",
    i12: "Верно: It's — это сокращение it is; оно завершает фразу It's settled.",
    i14: "Верно: после I'm для отрицания ставят not: I'm not exhausted.",
    i17s01: "Верно: с I отрицание строится I'm not satisfied.",
    i17s02: "Верно: речь о времени встречи, а не о людях. Поэтому используем It: It isn't settled.",
    slot09: "Лишнее not превратит «я доволен» в противоположное сообщение.",
    slot11: "Лишнее not превратит «я крайне устал» в противоположное сообщение.",
    slot13: "Its без апострофа — форма принадлежности; здесь нужно It's = it is.",
    slot15: "its без апострофа — форма принадлежности; для отрицания нужно isn't.",
    slot17: "isn't сочетается с it/he/she; с they нужно aren't.",
  },
  uk: {
    i02: "Правильно: у записі чути satisfied — «задоволений результатом».",
    i04: "Правильно: у записі чути exhausted — «украй втомлений».",
    i06: "Правильно: у записі чути settled — «питання вирішено».",
    i08: "Правильно: результат власної роботи вас влаштовує, тому підходить satisfied.",
    i10: "Правильно: після двох змін сил майже немає, тому підходить exhausted.",
    i12: "Правильно: It's — це скорочення it is; воно завершує фразу It's settled.",
    i14: "Правильно: після I'm для заперечення ставлять not: I'm not exhausted.",
    i17s01: "Правильно: з I заперечення будується I'm not satisfied.",
    i17s02: "Правильно: ідеться про час зустрічі, а не про людей. Тому вживаємо It: It isn't settled.",
    slot09: "Зайве not перетворить «я задоволений» на протилежне повідомлення.",
    slot11: "Зайве not перетворить «я вкрай втомлений» на протилежне повідомлення.",
    slot13: "Its без апострофа — форма належності; тут потрібно It's = it is.",
    slot15: "its без апострофа — форма належності; для заперечення потрібно isn't.",
    slot17: "isn't уживають з it/he/she; з they потрібно aren't.",
  },
};
const prompts = {
  ru: {
    i08: "Вставьте слово — вы довольны результатом ужина", i09: "Соберите фразу — скажите подруге, что довольны ужином",
    i11: "Соберите фразу — ответьте коллеге после двух смен", i12: "Вставьте форму — все договорились",
    i13: "Послушайте и соберите — Лина сообщает команде итог", i14: "Вставьте слово — ответьте коллеге после перерыва",
    i16: "Послушайте и соберите — Лина предупреждает координатора", "i17:s03": "Соберите фразу — ответьте другу, который сомневается перед походом",
  },
  uk: {
    i08: "Вставте слово — ви задоволені результатом вечері", i09: "Складіть фразу — скажіть подрузі, що задоволені вечерею",
    i11: "Складіть фразу — дайте відповідь колезі після двох змін", i12: "Вставте форму — усі домовилися",
    i13: "Послухайте й складіть — Ліна повідомляє команді підсумок", i14: "Вставте слово — дайте відповідь колезі після перерви",
    i16: "Послухайте і складіть — Ліна попереджає координатора", "i17:s03": "Складіть фразу — дайте відповідь другові, який сумнівається перед походом",
  },
};

const find = (locale, suffix) => {
  const result = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id(suffix));
  if (!result) throw new Error(`missing ${locale}:${suffix}`);
  return result;
};
const choice = (locale, suffix, key, correctKey) => {
  const current = find(locale, suffix);
  const answer = data.answers.find((row) => row.interactionId === current.interactionId);
  if (!answer?.correctResponseId) throw new Error(`missing answer ${locale}:${suffix}`);
  const rows = current.modePayload.choiceFeedback;
  if (!Array.isArray(rows)) throw new Error(`missing feedback ${locale}:${suffix}`);
  const existing = rows.find((row) => row.responseId === answer.correctResponseId);
  const row = { responseId: answer.correctResponseId, correct: true, testedDimension: current.modePayload.testedDimension, feedbackByLocale: { ru: text.ru[key], uk: text.uk[key] } };
  if (existing) Object.assign(existing, row); else rows.unshift(row);
  if (correctKey) current.modePayload.testedDimension = correctKey;
};
const slot = (locale, suffix, key) => {
  const current = find(locale, suffix);
  const traps = current.modePayload.authoredDistractorTokens;
  if (!Array.isArray(traps) || traps.length !== 1) throw new Error(`expected one authored trap ${locale}:${suffix}`);
  current.modePayload.slotFeedback = [{ responseId: `${current.interactionId}:r1`, correct: false, testedDimension: current.modePayload.testedDimension, feedbackByLocale: { ru: text.ru[key], uk: text.uk[key] } }];
};

for (const locale of ["ru", "uk"]) {
  for (const [suffix, prompt] of Object.entries(prompts[locale])) {
    const current = find(locale, suffix);
    current.prompt = prompt;
    current.accessibilityLabel = prompt;
  }
  choice(locale, "i02", "i02"); choice(locale, "i04", "i04"); choice(locale, "i06", "i06");
  choice(locale, "i08", "i08"); choice(locale, "i10", "i10"); choice(locale, "i12", "i12");
  choice(locale, "i14", "i14"); choice(locale, "i17:s01", "i17s01"); choice(locale, "i17:s02", "i17s02");
  slot(locale, "i09", "slot09"); slot(locale, "i11", "slot11"); slot(locale, "i13", "slot13"); slot(locale, "i15", "slot15"); slot(locale, "i17:s03", "slot17");
  const finalBuilder = find(locale, "i17:s03");
  finalBuilder.modePayload.localizedMeaning = { ...finalBuilder.modePayload.localizedMeaning, ru: "не изнурены", uk: "не виснажені" };
  finalBuilder.modePayload.localizedScene = {
    ru: "Друг волнуется, не слишком ли Мира и Илья устали для похода после выходных.",
    uk: "Друг хвилюється, чи не надто Міра та Ілля втомилися для походу після вихідних.",
  };
  const waitingFriends = find(locale, "i16");
  waitingFriends.modePayload.localizedScene = {
    ru: "Мира и Илья ещё собираются перед походом. Лина предупреждает координатора, что они пока не готовы.",
    uk: "Міра та Ілля ще збираються перед походом. Ліна попереджає координатора, що вони поки не готові.",
  };
  const satisfied = find(locale, "i08");
  satisfied.modePayload.localizedScene = {
    ru: "Вы закончили готовить ужин. Подруга спрашивает, устраивает ли вас результат.",
    uk: "Ви закінчили готувати вечерю. Подруга питає, чи влаштовує вас результат.",
  };
  const cardScenes = {
    i01: { ru: "«доволен, удовлетворён»: Мира закончила готовить и довольна тем, как всё получилось.", uk: "«задоволений»: Міра закінчила готувати й задоволена тим, як усе вийшло." },
    i03: { ru: "«изнурён, крайне устал»: Илья после двух смен почти не чувствует сил.", uk: "«виснажений, украй втомлений»: Ілля після двох змін майже не має сил." },
    i05: { ru: "«решено, улажено»: Лина и коллеги выбрали время встречи и все согласились.", uk: "«вирішено, домовилися»: Ліна та колеги обрали час зустрічі й усі погодилися." },
  };
  for (const [suffix, definitions] of Object.entries(cardScenes)) {
    const card = find(locale, suffix).modePayload;
    card.localizedMeaningChoices[0].meaningByLocale = definitions;
    card.wordCard.definitionByLocale = definitions;
  }
  const exhausted = find(locale, "i10");
  exhausted.modePayload.localizedScene = {
    ru: "После второй смены Илья отвечает коллеге, который зовёт его на встречу: сил почти не осталось.",
    uk: "Після другої зміни Ілля відповідає колезі, який кличе його на зустріч: сил майже не лишилося.",
  };
  const settledForm = find(locale, "i12");
  settledForm.modePayload.localizedScene = {
    ru: "Лина пишет коллегам в рабочем чате, чтобы подтвердить: все согласовали время и место встречи.",
    uk: "Ліна пише колегам у робочому чаті, щоб підтвердити: усі погодили час і місце зустрічі.",
  };
  const settledAudio = find(locale, "i13");
  const settledAudioPrompt = locale === "ru"
    ? "Послушайте и соберите — Лина пишет коллегам о времени встречи"
    : "Послухайте й складіть — Ліна пише колегам про час зустрічі";
  settledAudio.prompt = settledAudioPrompt;
  settledAudio.accessibilityLabel = settledAudioPrompt;
  const notSettled = find(locale, "i15");
  notSettled.modePayload.localizedMeaning = {
    ru: "В рабочем чате коллеги ещё не выбрали время встречи.",
    uk: "У робочому чаті колеги ще не вибрали час зустрічі.",
  };
  const disappointed = find(locale, "i17:s01");
  disappointed.modePayload.localizedScene = {
    ru: "Подруга спрашивает, довольны ли вы ужином. Ответьте, что нет: результат вас разочаровал.",
    uk: "Подруга питає, чи задоволені ви вечерею. Відповідайте, що ні: результат вас розчарував.",
  };
  const negative = find(locale, "i14");
  negative.modePayload.localizedScene = {
    ru: "Коллега спрашивает: «Вы всё ещё изнурены?» Ответьте, что нет.",
    uk: "Колега питає: «Ви все ще виснажені?» Відповідайте, що ні.",
  };
  const meeting = find(locale, "i17:s02");
  const they = meeting.modePayload.choiceFeedback.find((row) => row.responseId.endsWith(":r3"));
  they.feedbackByLocale = { ru: "Здесь речь о времени встречи, а не о людях. Для времени используем It: It isn't settled.", uk: "Тут ідеться про час зустрічі, а не про людей. Для часу вживаємо It: It isn't settled." };
  const firstPart = find(locale, "i17:s01");
  for (const row of firstPart.modePayload.choiceFeedback) row.testedDimension = firstPart.modePayload.testedDimension;
}

if (!apply) {
  console.log("[L01S45-REPAIR] dry run: add --apply to write practice.atomic.json");
  process.exit(0);
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log("[L01S45-REPAIR] applied practice atomic feedback and semantic repairs");
