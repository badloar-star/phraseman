// зачем ([HOME-SETSTATE] / [HOME-FOCUS-COST] 18.10, координатор): снимок ошибок Главной не должен перерисовывать её при тех же числах; журнал стоимости рендера —
// пара хуков вокруг эффектов корня и только dev.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const home = read('app/(tabs)/home.tsx');

test('снимок ошибок: оба места записи возвращают прежнюю ссылку при тех же числах', () => {
  const successAt = home.indexOf('prev.count === counts.ready && prev.active === counts.active ? prev :');
  const catchAt = home.indexOf('prev.count === 0 && prev.active === 0 ? prev :');
  assert.ok(successAt > 0 && catchAt > successAt, 'функциональный setMistakeReadySnapshot в успехе и в catch');
  assert.ok(home.includes('setMistakeReadySnapshot((prev) => (prev && prev.target === String(studyTarget) && prev.ownerKey === requestOwnerKey'));
  assert.ok(!/setMistakeReadySnapshot\(\{\n/.test(home), 'прямой объект в setMistakeReadySnapshot не вернулся (кроме null)');
});

test('журнал стоимости: Begin раньше остальных эффектов корня, End после useRenderCause', () => {
  const begin = home.indexOf('const homeFocusCost = useHomeFocusCostBegin();');
  const end = home.indexOf("useHomeFocusCostEnd(homeFocusCost, 'home');");
  const cause = home.indexOf("useRenderCause('home'");
  const firstOtherEffect = home.indexOf('useEffect(() => { markHomeFirstPaint(); }, []);');
  assert.ok(begin > 0 && begin < firstOtherEffect, 'Begin до остальных эффектов');
  assert.ok(end > cause && cause > 0, 'End после useRenderCause (последний эффект корня)');
});

test('зонд: только dev и не стор-релиз, порог 30 мс, без данных пользователя', () => {
  const probe = read('app/home_focus_cost_probe.ts');
  assert.ok(probe.includes('const ENABLED = __DEV__ && !IS_STORE_RELEASE;'));
  assert.ok(probe.includes('HOME_FOCUS_COST_THRESHOLD_MS = 30'));
  assert.ok(/\[HOME-FOCUS-COST\]/.test(probe));
});

test('снимок зонда перерисовок получил названные значения вместо parent_or_unlisted', () => {
  for (const key of ['continueMarks', 'continueV2Progress', 'continueV2Launching', 'devMistakesCardOverride', 'devMistakesCount', 'onOpenDevHub']) {
    assert.ok(home.includes(`${key},`) || home.includes(`${key} `), key);
  }
  assert.ok(home.includes('continueMarks, continueV2Progress, continueV2Launching, devMistakesCardOverride, devMistakesCount,'));
});

// зачем (красный экран 18.10, «Property 'opened' doesn't exist», af6044a1f): в снимок зонда попало имя из ДРУГОГО компонента файла, и Главная падала на каждом рендере.
// Сторож: каждое простое имя в снимке useRenderCause('home') объявлено внутри HomeScreen (const/let, деструктуризация или проп) раньше этого вызова.
test('каждое имя в снимке зонда Главной объявлено в HomeScreen до вызова', () => {
  const start = home.indexOf('export default function HomeScreen(');
  const callAt = home.indexOf("useRenderCause('home'");
  assert.ok(start > 0 && callAt > start);
  const body = home.slice(start, callAt);
  const snapshot = home.slice(callAt, home.indexOf('}), homeRuntimeActive, true);', callAt));
  const names = snapshot
    .slice(snapshot.indexOf('({') + 2)
    .split('\n').filter((line) => !line.trim().startsWith('//'))
    .join(' ')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^[A-Za-z_]\w*$/.test(part));
  assert.ok(names.length > 60, `имён в снимке: ${names.length}`);
  const undeclared = names.filter((name) => {
    const decl = new RegExp(String.raw`(?:const|let|var)\s+(?:\[[^\]=]*\b${name}\b[^\]=]*\]|\{[^}=]*\b${name}\b[^}=]*\}|${name}\b)|HomeScreen\(\{[^}]*\b${name}\b`);
    return !decl.test(body);
  });
  assert.deepEqual(undeclared, [], 'имена без объявления в HomeScreen');
});
