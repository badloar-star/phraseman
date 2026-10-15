import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const gate = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1))), "progression_quality_gate.mjs");
const buildRelease = path.join(path.dirname(gate), "build_release.mjs");

function writeSession(root, ordinal, body) {
  const dir = path.join(root, `s${String(ordinal).padStart(2, "0")}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "final.ru.md"), body, "utf8");
}

function writeLocale(root, ordinal, locale, body) {
  const dir = path.join(root, `s${String(ordinal).padStart(2, "0")}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `final.${locale}.md`), body, "utf8");
}

function writeAtomic(root, ordinal, value) {
  const dir = path.join(root, `s${String(ordinal).padStart(2, "0")}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "practice.atomic.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(root) {
  return spawnSync(process.execPath, [gate, "--sessions-root", root, "--from", "25"], { encoding: "utf8" });
}

test("accepts unique new words and exact localized audio meanings", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-valid-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Стол.

**Операция:** this

## Интро 1
phone: \`This is a phone.\`
**Назовите телефон.**
- ✅ **This is a phone.**
## Интро 2
charger: \`This is a charger.\`
**Назовите зарядку.**
- ✅ **This is a charger.**
## Интро 3
cable: \`This is a cable.\`
**Назовите провод.**
- ✅ **This is a cable.**
## Практика
Значения вариантов: This is a phone. — Это телефон · That is a phone. — Вон там телефон
**1 · Фраза** → **This is a phone.**
**2 · Фраза** → **This is a charger.**
**3 · Фраза** → **This is a cable.**
**17 · Финал**
🎙 **This is a cable.**
new_words: phone — телефон — связь
new_words: charger — зарядка — питание
new_words: cable — провод — соединение
`);
  writeSession(root, 26, `# S26

**Сцена сессии.** Галерея.

**Операция:** that

## Интро 1
picture: \`That is a picture.\`
**Назовите картину.**
- ✅ **That is a picture.**
## Интро 2
screen: \`That is a screen.\`
**Назовите экран.**
- ✅ **That is a screen.**
## Интро 3
speaker: \`That is a speaker.\`
**Назовите колонку.**
- ✅ **That is a speaker.**
## Практика
**1 · Фраза** → **That is a picture.**
**2 · Фраза** → **That is a screen.**
**3 · Фраза** → **That is a speaker.**
**17 · Финал**
🎙 **That is a screen.**
new_words: picture — картина — изображение
new_words: screen — экран — изображение
new_words: speaker — колонка — звук
`);
  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS/);
});

test("accepts migrated atomic practice and split final interactions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-atomic-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Мастерская.
## Интро 1
phone: \`This is a phone.\`
**Назовите телефон.**
- ✅ **This is a phone.**
## Интро 2
charger: \`This is a charger.\`
**Назовите зарядку.**
- ✅ **This is a charger.**
## Интро 3
cable: \`This is a cable.\`
**Назовите провод.**
- ✅ **This is a cable.**
## Практика — по одной целевой фразе
**1 · Соберите одну фразу**
Цель: \`This is a phone.\`
**2 · Соберите одну фразу**
Цель: \`This is a charger.\`
**3 · Соберите одну фразу**
Цель: \`This is a cable.\`
## Для сборщика
new_words: phone — телефон — связь
new_words: charger — зарядка — питание
new_words: cable — провод — соединение
`);
  const interaction = (id, targetPhrase) => ({ interactionId: id, family: "phrase_builder", modePayload: { targetPhrase } });
  writeAtomic(root, 25, {
    interactionsByLocale: {
      ru: [
        interaction("en:lesson-03:session-25:i01", "This is a phone."),
        interaction("en:lesson-03:session-25:i02", "This is a charger."),
        interaction("en:lesson-03:session-25:i03", "This is a cable."),
        interaction("en:lesson-03:session-25:i17:s01", "This is a phone."),
        interaction("en:lesson-03:session-25:i17:s02", "This is a charger."),
        interaction("en:lesson-03:session-25:i17:s03", "This is a cable."),
      ],
    },
    answers: [],
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("blocks an intro answer when atomic practice has only the same operation with different words", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-intro-exact-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Первый рабочий день.
## Интро 1
here: \`I am here.\`
**Скажите, что вы на месте.**
- ✅ **I am here.**
## Интро 2
ready: \`I am ready.\`
**Скажите, что вы готовы.**
- ✅ **I am ready.**
## Интро 3
early: \`I am early.\`
**Скажите, что вы пришли рано.**
- ✅ **I am early.**
## Практика — по одной целевой фразе
**1 · Соберите одну фразу**
Цель: \`I am here.\`
**2 · Соберите одну фразу**
Цель: \`I am ready.\`
**3 · Соберите одну фразу**
Цель: \`I am early.\`
## Для сборщика
new_words: here — здесь — место
new_words: ready — готов — состояние
new_words: early — рано — время
`);
  const interaction = (id, targetPhrase, purpose = "guided_practice") => ({
    interactionId: id,
    purpose,
    family: "phrase_builder",
    modePayload: { targetPhrase },
  });
  writeAtomic(root, 25, {
    interactionsByLocale: {
      ru: [
        interaction("en:lesson-03:session-25:i01", "I am ready."),
        interaction("en:lesson-03:session-25:i02", "I am ready."),
        interaction("en:lesson-03:session-25:i03", "I am early."),
        interaction("en:lesson-03:session-25:i12", "I am early.", "independent_check"),
      ],
    },
    answers: [],
  });
  const result = run(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /интро 1: правильный ответ I am here\. не является дословным target/);
  assert.doesNotMatch(result.stdout, /интро 2: правильный ответ .* не является дословным target/);
  assert.doesNotMatch(result.stdout, /интро 3: правильный ответ .* не является дословным target/);
});

test("accepts a 12-task atomic session with an independent-check final stage", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-atomic-12-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Городская карта.
## Интро 1
laundrette: \`There is a laundrette near the hotel.\`
**Назовите место рядом с отелем.**
- ✅ **There is a laundrette near the hotel.**
## Интро 2
laundrette: \`Is there a laundrette nearby?\`
**Спросите об одном месте рядом с магазином.**
- ✅ **Is there a laundrette nearby?**
## Интро 3
laundrettes: \`Are there laundrettes nearby?\`
**Спросите о нескольких местах рядом со зданием.**
- ✅ **Are there laundrettes nearby?**
## Практика — по одной целевой фразе
**1 · Соберите сообщение**
Цель: \`There is a laundrette near the hotel.\`
**2 · Соберите вопрос**
Цель: \`Is there a laundrette near the shop?\`
**3 · Соберите вопрос**
Цель: \`Are there laundrettes near the building?\`
**12 · Финал — спросите о местах рядом с отелем**
Цель: \`Are there laundrettes near the hotel?\`
## Для сборщика
new_words: laundrette — прачечная самообслуживания — место для стирки
`);
  writeLocale(root, 25, "uk", `# S25

## Інтро 1
laundrette: \`There is a laundrette near the hotel.\`
**Назвіть місце біля готелю.**
- ✅ **There is a laundrette near the hotel.**
## Інтро 2
laundrette: \`Is there a laundrette nearby?\`
**Запитайте про одне місце біля магазину.**
- ✅ **Is there a laundrette nearby?**
## Інтро 3
laundrettes: \`Are there laundrettes nearby?\`
**Запитайте про кілька місць біля будівлі.**
- ✅ **Are there laundrettes nearby?**
## Практика — по одній цільовій фразі
**1 · Складіть повідомлення**
Ціль: \`There is a laundrette near the hotel.\`
**2 · Складіть питання**
Ціль: \`Is there a laundrette near the shop?\`
**3 · Складіть питання**
Ціль: \`Are there laundrettes near the building?\`
**12 · Фінал — запитайте про місця біля готелю**
Ціль: \`Are there laundrettes near the hotel?\`
## Для збирача
`);
  const interaction = (ordinal, targetPhrase, purpose = "guided_practice") => ({
    interactionId: `en:lesson-03:session-25:i${String(ordinal).padStart(2, "0")}`,
    purpose,
    family: "phrase_builder",
    modePayload: { targetPhrase },
  });
  const interactions = [
    interaction(1, "There is a laundrette near the hotel."),
    interaction(2, "Is there a laundrette nearby?"),
    interaction(3, "Are there laundrettes nearby?"),
    ...Array.from({ length: 7 }, (_, index) => interaction(index + 4, `Practice target ${index + 4}.`)),
    interaction(11, "There are two laundrettes near the platform.", "independent_check"),
    interaction(12, "Are there laundrettes near the hotel?", "independent_check"),
  ];
  writeAtomic(root, 25, {
    interactionsByLocale: {
      ru: interactions,
      uk: interactions,
    },
    answers: [],
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS/);
});

test("ignores only locative near-the while preserving article and auxiliary distinctions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-locative-signature-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Городская карта.
## Интро 1
laundrette: \`Is there a laundrette nearby?\`
**Спросите об одном месте.**
- ✅ **Is there a laundrette nearby?**
## Интро 2
laundrette: \`Is there the laundrette nearby?\`
**Спросите об определённом месте.**
- ✅ **Is there the laundrette nearby?**
## Интро 3
laundrettes: \`Are there laundrettes nearby?\`
**Спросите о нескольких местах.**
- ✅ **Are there laundrettes nearby?**
## Практика
**1 · Соберите вопрос**
Цель: \`Is there a laundrette near the shop?\`
**12 · Финал — спросите об одном месте**
Цель: \`Is there a laundrette near the hotel?\`
## Для сборщика
new_words: laundrette — прачечная самообслуживания — место для стирки
`);
  const interaction = (ordinal, targetPhrase, purpose = "guided_practice") => ({
    interactionId: `en:lesson-03:session-25:i${String(ordinal).padStart(2, "0")}`,
    purpose,
    family: "phrase_builder",
    modePayload: { targetPhrase },
  });
  writeAtomic(root, 25, {
    interactionsByLocale: {
      ru: [
        interaction(1, "Is there a laundrette nearby?"),
        ...Array.from({ length: 9 }, (_, index) => interaction(index + 2, "Is there a laundrette near the shop?")),
        interaction(11, "Is there a laundrette near the platform?", "independent_check"),
        interaction(12, "Is there a laundrette near the hotel?", "independent_check"),
      ],
    },
    answers: [],
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout, /интро 1: правильный ответ .* не является дословным target/);
  assert.match(result.stdout, /интро 2: правильный ответ Is there the laundrette nearby\? не является дословным target/);
  assert.match(result.stdout, /интро 3: правильный ответ Are there laundrettes nearby\? не является дословным target/);
});

test("reports the supported-practice range before a 12-task independent-check stage", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-atomic-range-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Городская карта.
## Интро 1
laundrette: \`Is there a laundrette near the hotel?\`
**Спросите о месте рядом с отелем.**
- ✅ **Is there a laundrette near the hotel?**
## Интро 2
laundrette: \`There is a laundrette near the hotel.\`
**Назовите место рядом с отелем.**
- ✅ **There is a laundrette near the hotel.**
## Интро 3
laundrette: \`There is a laundrette near the shop.\`
**Назовите место рядом с магазином.**
- ✅ **There is a laundrette near the shop.**
## Практика
**12 · Финал — спросите о месте рядом с отелем**
Цель: \`Is there a laundrette near the hotel?\`
## Для сборщика
new_words: laundrette — прачечная самообслуживания — место для стирки
`);
  const interaction = (ordinal, targetPhrase, purpose = "guided_practice") => ({
    interactionId: `en:lesson-03:session-25:i${String(ordinal).padStart(2, "0")}`,
    purpose,
    family: "phrase_builder",
    modePayload: { targetPhrase },
  });
  writeAtomic(root, 25, {
    interactionsByLocale: {
      ru: [
        ...Array.from({ length: 10 }, (_, index) => interaction(index + 1, `Practice target ${index + 1}.`)),
        interaction(11, "There is a laundrette near the hotel.", "independent_check"),
        interaction(12, "Is there a laundrette near the hotel?", "independent_check"),
      ],
    },
    answers: [],
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /не является дословным target в заданиях 1–10/);
  assert.doesNotMatch(result.stdout, /заданиях 1–16/);
});

test("build release checks progression beginning at the current session ordinal", () => {
  const source = fs.readFileSync(buildRelease, "utf8");
  assert.match(source, /progressionIssues\(path\.dirname\(dir\), Number\(session\)\)/u);
  assert.doesNotMatch(source, /progressionIssues\(path\.dirname\(dir\), 25\)/u);
});

test("accepts an inflected form of the current new word on an intro page", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-inflection-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** План квартиры.

## Интро 1
bedroom: \`This is a bedroom.\`
**Назовите одну комнату.**
- ✅ **This is a bedroom.**
## Интро 2
bedrooms: \`These are bedrooms.\`
**Назовите несколько комнат.**
- ✅ **These are bedrooms.**
## Интро 3
bedrooms: \`Where are the bedrooms?\`
**Спросите о комнатах.**
- ✅ **Where are the bedrooms?**
## Практика
**1 · Фраза** → **This is a bedroom.**
**2 · Фраза** → **These are bedrooms.**
**3 · Фраза** → **Where are the bedrooms?**
**17 · Финал**
🎙 **This is a bedroom. These are bedrooms. Where are the bedrooms?**
new_words: bedroom — спальня — комната для сна
`);
  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("blocks empty and repeated new words", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-lexicon-"));
  writeSession(root, 25, "# S25\n\n**Сцена сессии.** Стол.\n\n**Операция:** this\n\nnew_words: phone — телефон — связь\n");
  writeSession(root, 26, "# S26\n\n**Сцена сессии.** Полка.\n\n**Операция:** that\n\nnew_words: phone — телефон — связь\n");
  writeSession(root, 27, "# S27\n\n**Сцена сессии.** Панель.\n\n**Операция:** question\n\nnew_words: —\n");
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /s26: повтор new_words phone/);
  assert.match(result.stdout, /s27: нет новых слов/);
});

test("blocks a planned new word that was already learner-visible as a distractor", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-prior-exposure-"));
  writeSession(root, 1, `# S01

**Сцена сессии.** Коробки.

## Практика

**1 · Послушайте и выберите**
🔊 *table* → **table** · cable · label
- cable — *В cable первым слышно k.*

new_words: table — стол — мебель
`);
  writeLocale(root, 1, "uk", `# S01

## Практика
🔊 *table* → **table** · cable · label
- cable — *У cable першим чути k.*
`);
  writeSession(root, 25, `# S25

**Сцена сессии.** Мастерская.

new_words: phone — телефон — связь
new_words: charger — зарядка — питание
new_words: cable — провод — соединение
`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /s25: new_words cable уже показывалось ученику в s01\/final\.ru\.md/);
  assert.match(result.stdout, /s25: new_words cable уже показывалось ученику в s01\/final\.uk\.md/);
});

test("blocks localized listen choices that add nearby words absent from target", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-meaning-"));
  writeSession(root, 25, "# S25\n\n**Сцена сессии.** Стол.\n\n**Операция:** this\n\nЗначения вариантов: This is a phone. — Это телефон рядом · That is a phone. — Вон там телефон\n\nnew_words: phone — телефон — связь\n");
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /добавлено пространственное слово/);
});

test("checks Ukrainian localized audio meanings too", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-uk-"));
  writeSession(root, 25, "# S25\n\n**Сцена сессии.** Стол.\n\n**Операция:** this\n\nnew_words: phone — телефон — связь\n");
  writeLocale(root, 25, "uk", "Значення варіантів: This is a phone. — Це телефон поруч · That is a phone. — То телефон\n");
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /final\.uk\.md.*добавлено пространственное слово/);
});

test("blocks intros built from old universal examples instead of current new words", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-intro-"));
  writeSession(root, 25, "# S25\n\n**Сцена сессии.** Мастерская.\n\n**Операция:** this\n\n## Интро 1\nThis is a key.\n\n## Интро 2\nThis is a box.\n\n## Практика\nnew_words: phone — телефон — связь\nnew_words: charger — зарядка — питание\n");
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /интро не готовит новое слово phone/);
  assert.match(result.stdout, /интро не готовит новое слово charger/);
  assert.match(result.stdout, /интро 1 не использует новое слово текущей сессии/);
});

test("blocks an intro question whose correct answer was not explained above it", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-intro-question-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Мастерская.

**Операция:** this
**Новые слова:** phone

## Интро 1

\`this\` показывает на один предмет перед вами.

**Назовите телефон на стойке.**

- ✅ **This is a phone.**
- ❌ This a phone.

## Практика

**1 · Соберите фразу** → **This is a phone.**

new_words: phone — телефон — связь
`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /интро 1: правильный ответ .* не разобран над вопросом/);
});

test("blocks an intro target that disappears from practice", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-intro-practice-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Мастерская.

**Операция:** this
**Новые слова:** phone

## Интро 1

\`phone\` — «телефон». Назовите его: \`This is a phone.\`

**Назовите телефон на стойке.**

- ✅ **This is a phone.**
- ❌ This a phone.

## Практика

**1 · Карточка слова — charger**

new_words: phone — телефон — связь
`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /интро 1: правильный ответ .* не является дословным target в заданиях 1–1/);
});

test("requires exactly three intro pages", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-intro-count-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Мастерская.
## Интро 1
phone: \`This is a phone.\`
**Назовите телефон.**
- ✅ **This is a phone.**
## Практика
**1 · Фраза** → **This is a phone.**
**17 · Финал**
This is a phone.
new_words: phone — телефон — связь
`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /требуется ровно 3 интро, найдено 1/);
});

test("blocks a foreign universal example used as the intro correct answer", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-foreign-intro-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Мастерская.
## Интро 1
Сегодня новое слово phone, но пример старый.
**Назовите ключ.**
- ✅ **This is a key.**
## Интро 2
phone: \`This is a phone.\`
**Назовите телефон.**
- ✅ **This is a phone.**
## Интро 3
phone: \`This is a phone.\`
**Назовите телефон.**
- ✅ **This is a phone.**
## Практика
**1 · Фраза** → **This is a key.**
**2 · Фраза** → **This is a phone.**
**17 · Финал**
This is a phone.
new_words: phone — телефон — связь
`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /интро 1: правильный ответ .* не использует новое слово текущей сессии/);
});

test("blocks an intro action that is not required by the final task", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-intro-final-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Мастерская.

**Операция:** this
**Новые слова:** phone

## Интро 1

\`phone\` — «телефон». Спросите о нём: \`Is this a phone?\`

**Спросите о телефоне на стойке.**

- ✅ **Is this a phone?**
- ❌ This is a phone.

## Практика

**1 · Соберите вопрос** → **Is this a phone?**

**2 · Финал — назовите предмет**
🎙 **This is a phone.**

## Для сборщика
new_words: phone — телефон — связь
`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /интро 1: действие question не требуется в финале/);
});

test("blocks a final task without any current new word", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-progression-final-words-"));
  writeSession(root, 25, `# S25

**Сцена сессии.** Мастерская.

**Операция:** this
**Новые слова:** phone

## Интро 1

\`phone\` — «телефон». Назовите его: \`This is a phone.\`

**Назовите телефон на стойке.**

- ✅ **This is a phone.**
- ❌ This a phone.

## Практика

**1 · Соберите фразу** → **This is a phone.**

**2 · Финал — назовите старый предмет**
🎙 **This is a key.**

## Для сборщика
new_words: phone — телефон — связь
`);
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /финал не требует ни одного нового слова текущей сессии/);
});
