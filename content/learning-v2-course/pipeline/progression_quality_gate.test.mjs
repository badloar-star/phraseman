import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const gate = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1))), "progression_quality_gate.mjs");

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
  assert.match(result.stdout, /интро 1: операция .* не является правильным target в заданиях 1–16/);
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
